/**
 * WebSocket signaling + matchmaking for the video-duel roulette.
 *
 * Responsibilities:
 *  - queue random players and pair them into a room (assigning a shared board seed),
 *  - relay opaque WebRTC signalling payloads (offer / answer / ICE) between the pair,
 *  - relay each player's wish, collect both duel scores, then resolve the winner —
 *    the loser must perform the winner's wish.
 *
 * State is ephemeral (in-memory); rooms disappear when a player leaves.
 */
import type { FastifyInstance } from 'fastify';

interface Sock {
  readyState: number;
  send(data: string): void;
  on(ev: string, cb: (...a: unknown[]) => void): void;
}
interface Client {
  id: string;
  socket: Sock;
  name: string;
  region?: string;
  joinedAt?: number;
  roomId?: string;
}
interface Room {
  id: string;
  a: Client;
  b: Client;
  seed: number;
  wishes: Record<string, string>;
  scores: Record<string, number>;
}

const OPEN = 1;
// Pair players from the same region first; after this wait, allow a cross-region
// match so a lone player never waits forever (there are no bots here).
const REGION_FALLBACK_MS = 12_000;

export function registerSignaling(app: FastifyInstance): void {
  let counter = 0;
  const uid = (): string => `c${++counter}_${Math.floor(Math.random() * 1e6)}`;
  const queue: Client[] = [];
  const rooms = new Map<string, Room>();

  const send = (c: Client, msg: unknown): void => {
    try {
      if (c.socket.readyState === OPEN) c.socket.send(JSON.stringify(msg));
    } catch {
      /* ignore */
    }
  };
  const peerOf = (room: Room, c: Client): Client => (room.a.id === c.id ? room.b : room.a);
  const dequeue = (c: Client): void => {
    const i = queue.findIndex((q) => q.id === c.id);
    if (i >= 0) queue.splice(i, 1);
  };

  const regionKey = (c: Client): string => (c.region || '').trim().toLowerCase();

  function pair(a: Client, b: Client): void {
    dequeue(a);
    dequeue(b);
    const room: Room = {
      id: uid(),
      a,
      b,
      seed: Math.floor(Math.random() * 2 ** 31),
      wishes: {},
      scores: {},
    };
    a.roomId = b.roomId = room.id;
    rooms.set(room.id, room);
    // The caller creates the WebRTC offer; the callee answers.
    send(a, { t: 'matched', role: 'caller', seed: room.seed, peerName: b.name });
    send(b, { t: 'matched', role: 'callee', seed: room.seed, peerName: a.name });
  }

  // Make one match if possible: same region first, else cross-region once the
  // oldest waiter has passed REGION_FALLBACK_MS. Returns true when it paired.
  function tryPairOnce(): boolean {
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].socket.readyState !== OPEN) queue.splice(i, 1);
    }
    if (queue.length < 2) return false;

    // 1) same-region pair
    for (let i = 0; i < queue.length; i++) {
      for (let j = i + 1; j < queue.length; j++) {
        const r = regionKey(queue[i]);
        if (r && r === regionKey(queue[j])) {
          pair(queue[i], queue[j]);
          return true;
        }
      }
    }

    // 2) fallback: if the longest waiter has waited long enough, pair oldest two
    const sorted = [...queue].sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0));
    if (Date.now() - (sorted[0].joinedAt ?? 0) >= REGION_FALLBACK_MS) {
      pair(sorted[0], sorted[1]);
      return true;
    }
    return false;
  }

  function tryMatch(): void {
    while (tryPairOnce()) {
      /* keep pairing everyone we can */
    }
  }

  function leaveRoom(c: Client, notify = true): void {
    const rid = c.roomId;
    if (!rid) return;
    c.roomId = undefined;
    const room = rooms.get(rid);
    if (!room) return;
    rooms.delete(rid);
    const peer = peerOf(room, c);
    peer.roomId = undefined;
    if (notify) send(peer, { t: 'peerLeft' });
  }

  function maybeResolve(room: Room): void {
    const sa = room.scores[room.a.id];
    const sb = room.scores[room.b.id];
    if (sa == null || sb == null) return;
    const wa = room.wishes[room.a.id] ?? '';
    const wb = room.wishes[room.b.id] ?? '';
    const report = (me: Client, my: number, opp: number, oppWish: string): void => {
      const outcome = my > opp ? 'win' : my < opp ? 'lose' : 'draw';
      // The loser performs the winner's (opponent's) wish.
      send(me, { t: 'result', outcome, myScore: my, oppScore: opp, dare: outcome === 'lose' ? oppWish : '' });
    };
    report(room.a, sa, sb, wb);
    report(room.b, sb, sa, wa);
  }

  app.get('/rtc', { websocket: true }, (socket: Sock) => {
    const client: Client = { id: uid(), socket, name: 'Player' };

    socket.on('message', (raw: unknown) => {
      let msg: { t?: string; [k: string]: unknown };
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      const room = client.roomId ? rooms.get(client.roomId) : undefined;
      switch (msg.t) {
        case 'join':
          client.name = (typeof msg.name === 'string' && msg.name.trim().slice(0, 24)) || 'Player';
          client.region = (typeof msg.region === 'string' ? msg.region : '').slice(0, 64);
          client.joinedAt = Date.now();
          leaveRoom(client);
          dequeue(client);
          queue.push(client);
          send(client, { t: 'waiting' });
          tryMatch();
          break;
        case 'signal':
          if (room) send(peerOf(room, client), { t: 'signal', payload: msg.payload });
          break;
        case 'wish':
          if (room) {
            const text = String(msg.text ?? '').slice(0, 200);
            room.wishes[client.id] = text;
            send(peerOf(room, client), { t: 'peerWish', text });
          }
          break;
        case 'score':
          if (room) {
            room.scores[client.id] = Number(msg.score) || 0;
            maybeResolve(room);
          }
          break;
        case 'next':
          client.joinedAt = Date.now();
          leaveRoom(client);
          dequeue(client);
          queue.push(client);
          send(client, { t: 'waiting' });
          tryMatch();
          break;
        case 'leave':
          leaveRoom(client);
          dequeue(client);
          break;
      }
    });

    socket.on('close', () => {
      leaveRoom(client);
      dequeue(client);
    });
  });

  // Re-run pairing periodically so the cross-region fallback fires for players
  // who've been waiting alone in their region.
  const sweep = setInterval(tryMatch, 3_000);
  sweep.unref?.();
  app.addHook('onClose', () => clearInterval(sweep));
}

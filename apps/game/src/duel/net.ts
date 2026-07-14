/**
 * Client for the video-duel roulette: WebSocket signaling + a WebRTC peer
 * connection carrying camera/mic. The UI drives it via `join`, `sendWish`,
 * `sendScore`, `next`, `leave` and listens through the callback fields.
 */
export type DuelPhase = 'idle' | 'searching' | 'connecting' | 'playing' | 'waiting' | 'result';

export interface DuelResult {
  outcome: 'win' | 'lose' | 'draw';
  myScore: number;
  oppScore: number;
  dare: string;
}

// STUN discovers your public address; TURN relays media when a direct P2P path
// is blocked by NAT/firewall (essential for real cross-network users). Uses the
// free Open Relay TURN project — swap for your own (e.g. Metered) for scale.
// Override at build time with VITE_TURN_URL / VITE_TURN_USER / VITE_TURN_CRED.
const env = import.meta.env as Record<string, string | undefined>;
const ICE: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    ...(env.VITE_TURN_URL
      ? [
          {
            urls: env.VITE_TURN_URL.split(','),
            username: env.VITE_TURN_USER ?? '',
            credential: env.VITE_TURN_CRED ?? '',
          },
        ]
      : []),
  ],
};

export class DuelNet {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private local: MediaStream | null = null;
  private role: 'caller' | 'callee' = 'caller';

  seed = 0;
  peerName = '';

  onPhase: (p: DuelPhase) => void = () => {};
  onLocalStream: (s: MediaStream) => void = () => {};
  onRemoteStream: (s: MediaStream) => void = () => {};
  onMatched: (seed: number, peerName: string) => void = () => {};
  onPeerWish: (text: string) => void = () => {};
  onResult: (r: DuelResult) => void = () => {};
  onPeerLeft: () => void = () => {};

  /** Requests the camera + mic. Throws if the user denies permission. */
  async initMedia(): Promise<MediaStream> {
    if (this.local) return this.local;
    this.local = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true,
    });
    this.onLocalStream(this.local);
    return this.local;
  }

  private wsUrl(): string {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}/rtc`;
  }

  private send(msg: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  /** Connects (if needed) and enters the matchmaking queue. */
  join(name: string, region = ''): void {
    this.onPhase('searching');
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) {
      this.send({ t: 'join', name, region });
      return;
    }
    this.ws = new WebSocket(this.wsUrl());
    this.ws.onopen = () => this.send({ t: 'join', name, region });
    this.ws.onmessage = (e) => this.onMessage(JSON.parse(e.data));
    this.ws.onclose = () => {};
  }

  private async onMessage(m: { t: string; [k: string]: unknown }): Promise<void> {
    switch (m.t) {
      case 'waiting':
        this.onPhase('searching');
        break;
      case 'matched':
        this.role = m.role as 'caller' | 'callee';
        this.seed = m.seed as number;
        this.peerName = (m.peerName as string) || 'Player';
        this.onPhase('connecting');
        await this.setupPeer();
        this.onMatched(this.seed, this.peerName);
        break;
      case 'signal':
        await this.handleSignal(m.payload as SignalPayload);
        break;
      case 'peerWish':
        this.onPeerWish((m.text as string) || '');
        break;
      case 'result':
        this.onPhase('result');
        this.onResult({
          outcome: m.outcome as DuelResult['outcome'],
          myScore: (m.myScore as number) ?? 0,
          oppScore: (m.oppScore as number) ?? 0,
          dare: (m.dare as string) ?? '',
        });
        break;
      case 'peerLeft':
        this.teardownPeer();
        this.onPeerLeft();
        break;
    }
  }

  private async setupPeer(): Promise<void> {
    this.teardownPeer();
    const pc = new RTCPeerConnection(ICE);
    this.pc = pc;
    const stream = await this.initMedia();
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    pc.ontrack = (e) => {
      const s = e.streams[0];
      if (s) this.onRemoteStream(s);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) this.send({ t: 'signal', payload: { candidate: e.candidate } });
    };
    if (this.role === 'caller') {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.send({ t: 'signal', payload: { sdp: pc.localDescription } });
    }
  }

  private async handleSignal(payload: SignalPayload): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    if (payload.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      if (payload.sdp.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.send({ t: 'signal', payload: { sdp: pc.localDescription } });
      }
    } else if (payload.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {
        /* ignore late candidates */
      }
    }
  }

  sendWish(text: string): void {
    this.send({ t: 'wish', text });
  }
  sendScore(score: number): void {
    this.onPhase('waiting');
    this.send({ t: 'score', score });
  }
  next(): void {
    this.teardownPeer();
    this.send({ t: 'next' });
    this.onPhase('searching');
  }
  leave(): void {
    this.send({ t: 'leave' });
    this.teardownPeer();
  }

  private teardownPeer(): void {
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.close();
      this.pc = null;
    }
  }

  destroy(): void {
    this.teardownPeer();
    this.local?.getTracks().forEach((t) => t.stop());
    this.local = null;
    this.ws?.close();
    this.ws = null;
  }
}

interface SignalPayload {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

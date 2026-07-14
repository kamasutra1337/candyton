import { useEffect, useRef, useState } from 'react';
import { duelLevel, DUEL_SECONDS, type GameState } from '@candyblast/engine';
import { GameController } from '../game/GameController';
import { DuelNet, type DuelPhase, type DuelResult } from '../duel/net';
import { useStore } from '../state/store';
import { useT } from '../i18n';
import { sfx } from '../audio/sfx';

const DISCUSS_SECONDS = 20;
const fmt = (s: number): string => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

type Stage = 'lobby' | 'discuss' | 'wish' | 'game';

export function Roulette() {
  const t = useT();
  const openHome = useStore((s) => s.openHome);
  const resolveName = useStore((s) => s.resolveName);

  const netRef = useRef<DuelNet | null>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const myWishRef = useRef('');
  const timerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<DuelPhase>('idle');
  const [stage, setStage] = useState<Stage>('lobby');
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);
  const [peerName, setPeerName] = useState('');
  const [wish, setWish] = useState(
    () => new URLSearchParams(location.search).get('wish')?.slice(0, 200) ?? '',
  );
  const [live, setLive] = useState<GameState | null>(null);
  const [discussLeft, setDiscussLeft] = useState(DISCUSS_SECONDS);
  const [timeLeft, setTimeLeft] = useState(DUEL_SECONDS);
  const [result, setResult] = useState<DuelResult | null>(null);

  const clearTimer = () => {
    if (timerRef.current != null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // Create the net manager once.
  useEffect(() => {
    const net = new DuelNet();
    netRef.current = net;
    net.onPhase = setPhase;
    net.onLocalStream = (s) => {
      if (localVideo.current) {
        localVideo.current.srcObject = s;
        void localVideo.current.play().catch(() => {});
      }
    };
    net.onRemoteStream = (s) => {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = s;
        void remoteVideo.current.play().catch(() => {}); // audible: not muted
      }
    };
    net.onMatched = (sd, pn) => {
      setSeed(sd);
      setPeerName(pn);
      setResult(null);
      setLive(null);
      setTimeLeft(DUEL_SECONDS);
      setDiscussLeft(DISCUSS_SECONDS);
      setStage('discuss');
      sfx.play('special');
    };
    net.onResult = (r) => {
      clearTimer();
      setResult(r);
      sfx.play(r.outcome === 'win' ? 'win' : r.outcome === 'lose' ? 'lose' : 'coin');
    };
    net.onPeerLeft = () => {
      clearTimer();
      controllerRef.current?.destroy();
      controllerRef.current = null;
      setError(t('duel.peerLeft'));
      setStage('lobby');
      setPhase('idle');
    };
    return () => {
      clearTimer();
      net.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Camera on + matchmaking automatically on entry.
  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 20s discussion countdown → then the wish window.
  useEffect(() => {
    if (stage !== 'discuss') return;
    clearTimer();
    timerRef.current = window.setInterval(() => {
      setDiscussLeft((d) => {
        if (d <= 1) {
          clearTimer();
          sfx.play('coin');
          setStage('wish');
          return 0;
        }
        return d - 1;
      });
    }, 1000);
    return clearTimer;
  }, [stage]);

  // Start the board + 90s clock when the wish is submitted (stage === 'game').
  useEffect(() => {
    if (stage !== 'game' || !canvasRef.current || controllerRef.current) return;
    const net = netRef.current!;
    const controller = new GameController(duelLevel(seed), canvasRef.current, setLive, () => {});
    controllerRef.current = controller;
    setTimeLeft(DUEL_SECONDS);
    clearTimer();
    timerRef.current = window.setInterval(() => {
      setTimeLeft((tl) => {
        if (tl <= 1) {
          clearTimer();
          controller.stop();
          net.sendScore(controller.getScore());
          return 0;
        }
        if (tl <= 11) sfx.play('click');
        return tl - 1;
      });
    }, 1000);
    const onResize = () => controller.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimer();
      controller.destroy();
      controllerRef.current = null;
    };
  }, [stage, seed]);

  const start = async () => {
    setError(null);
    sfx.unlock();
    const net = netRef.current;
    if (!net) return;
    try {
      await net.initMedia();
    } catch {
      setError(t('duel.camDenied'));
      setPhase('idle');
      setStage('lobby');
      return;
    }
    const region = new URLSearchParams(location.search).get('region')?.slice(0, 64) ?? '';
    net.join(resolveName(), region);
  };

  const submitWish = () => {
    sfx.play('click');
    myWishRef.current = wish.trim();
    netRef.current!.sendWish(myWishRef.current);
    setStage('game');
  };

  const nextOpponent = () => {
    sfx.play('click');
    clearTimer();
    controllerRef.current?.destroy();
    controllerRef.current = null;
    setResult(null);
    setLive(null);
    setStage('lobby');
    netRef.current!.next();
  };

  const quit = () => {
    clearTimer();
    controllerRef.current?.destroy();
    controllerRef.current = null;
    netRef.current!.leave();
    openHome();
  };

  const connected = phase === 'connecting' || phase === 'playing' || phase === 'waiting' || phase === 'result';

  return (
    <div className={`roulette stage-${connected ? stage : 'lobby'}`}>
      <div className="rl-top">
        <button className="icon-btn" onClick={quit} aria-label="Back">‹</button>
        <span className="rl-title">🎥 {t('duel.title')}</span>
        <span style={{ width: 40 }} />
      </div>

      {/* Big game board (fills the screen during the game) */}
      {connected && (
        <div className="rl-board-wrap">
          <canvas ref={canvasRef} className="rl-canvas" />
        </div>
      )}

      {/* Camera tiles — big while discussing, small top-left during the game */}
      <div className="rl-cams">
        <video ref={remoteVideo} className="rl-remote" autoPlay playsInline />
        <video ref={localVideo} className="rl-local" autoPlay playsInline muted />
        {connected && peerName && <div className="rl-peer-name">{peerName}</div>}
        {!connected && (
          <div className="rl-remote-placeholder">
            {phase === 'searching' ? (
              <>
                <div className="rl-spinner" />
                <p>{t('duel.searching')}</p>
              </>
            ) : (
              <p className="rl-tagline">{t('duel.tagline')}</p>
            )}
          </div>
        )}
      </div>

      {/* Timer + score during the game */}
      {stage === 'game' && connected && !result && (
        <div className="rl-timerbar">
          <span className={`rl-timer ${timeLeft <= 10 ? 'danger' : ''}`}>⏱ {fmt(timeLeft)}</span>
          <span className="rl-livescore">🎯 {(live?.score ?? 0).toLocaleString()}</span>
        </div>
      )}

      {/* Discussion banner */}
      {stage === 'discuss' && connected && (
        <div className="rl-discuss">
          <span className="rl-discuss-title">💬 {t('duel.discuss')}</span>
          <span className="rl-discuss-timer">{discussLeft}</span>
        </div>
      )}

      {/* Idle / camera denied */}
      {phase === 'idle' && (
        <div className="rl-idle">
          <p className="rl-lead">{t('duel.lead')}</p>
          {error && <p className="rl-error">{error}</p>}
          <button className="btn primary rl-start" onClick={start}>🎥 {t('duel.start')}</button>
          <p className="rl-note">{t('duel.camNote')}</p>
        </div>
      )}

      {/* Wish window (pops after the 20s discussion) */}
      {stage === 'wish' && connected && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-emoji">💭</div>
            <h2>{t('duel.wishTitle')}</h2>
            <p className="onboarding-body">{t('duel.wishBody')}</p>
            <input
              className="rl-input"
              value={wish}
              onChange={(e) => setWish(e.target.value)}
              maxLength={200}
              placeholder={t('duel.wishPlaceholder')}
              autoFocus
            />
            <button className="btn primary" onClick={submitWish} disabled={!wish.trim()}>
              {t('duel.wishGo')}
            </button>
          </div>
        </div>
      )}

      {/* Waiting for opponent to finish */}
      {phase === 'waiting' && !result && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="rl-spinner" />
            <h2>{t('duel.waiting')}</h2>
          </div>
        </div>
      )}

      {/* Result — bottom sheet, video stays visible for the on-camera dare */}
      {result && (
        <div className={`rl-result ${result.outcome}`}>
          <div className="rl-result-head">
            <span className="rl-result-emoji">
              {result.outcome === 'win' ? '🏆' : result.outcome === 'lose' ? '😅' : '🤝'}
            </span>
            <span className="rl-result-title">
              {result.outcome === 'win' ? t('duel.win') : result.outcome === 'lose' ? t('duel.lose') : t('duel.draw')}
            </span>
            <span className="rl-result-score">
              {result.myScore.toLocaleString()} : {result.oppScore.toLocaleString()}
            </span>
          </div>
          {result.outcome === 'win' && myWishRef.current && (
            <p className="rl-dare win">🎥 {t('duel.oppMust')}: <b>{myWishRef.current}</b></p>
          )}
          {result.outcome === 'lose' && result.dare && (
            <p className="rl-dare">🎥 {t('duel.youMust')}: <b>{result.dare}</b></p>
          )}
          <div className="rl-result-actions">
            <button className="btn ghost" onClick={quit}>{t('duel.exit')}</button>
            <button className="btn primary" onClick={nextOpponent}>{t('duel.next')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { duelLevel, type GameState } from '@candyton/engine';
import { GameController } from '../game/GameController';
import { DuelNet, type DuelPhase, type DuelResult } from '../duel/net';
import { useStore } from '../state/store';
import { useT } from '../i18n';
import { sfx } from '../audio/sfx';

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

  const [phase, setPhase] = useState<DuelPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);
  const [peerName, setPeerName] = useState('');
  const [wishSent, setWishSent] = useState(false);
  const [wish, setWish] = useState('');
  const [live, setLive] = useState<GameState | null>(null);
  const [result, setResult] = useState<DuelResult | null>(null);

  // Create the net manager once.
  useEffect(() => {
    const net = new DuelNet();
    netRef.current = net;
    net.onPhase = setPhase;
    net.onLocalStream = (s) => {
      if (localVideo.current) localVideo.current.srcObject = s;
    };
    net.onRemoteStream = (s) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = s;
    };
    net.onMatched = (sd, pn) => {
      setSeed(sd);
      setPeerName(pn);
      setWishSent(false);
      setWish('');
      setResult(null);
      setLive(null);
      sfx.play('special');
    };
    net.onResult = (r) => {
      setResult(r);
      sfx.play(r.outcome === 'win' ? 'win' : r.outcome === 'lose' ? 'lose' : 'coin');
    };
    net.onPeerLeft = () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
      setError(t('duel.peerLeft'));
      setPhase('idle');
    };
    return () => net.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start the duel board once a match is live and the wish is submitted.
  useEffect(() => {
    if (phase !== 'connecting' && phase !== 'playing') return;
    if (!wishSent || !canvasRef.current || controllerRef.current) return;
    const net = netRef.current!;
    const controller = new GameController(
      duelLevel(seed),
      canvasRef.current,
      setLive,
      (s) => {
        net.sendScore(s.score);
      },
    );
    controllerRef.current = controller;
    const onResize = () => controller.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      controller.destroy();
      controllerRef.current = null;
    };
  }, [phase, wishSent, seed]);

  const start = async () => {
    setError(null);
    sfx.unlock();
    const net = netRef.current!;
    try {
      await net.initMedia();
    } catch {
      setError(t('duel.camDenied'));
      return;
    }
    net.join(resolveName());
  };

  const submitWish = () => {
    sfx.play('click');
    myWishRef.current = wish.trim();
    netRef.current!.sendWish(myWishRef.current);
    setWishSent(true);
  };

  const nextOpponent = () => {
    sfx.play('click');
    controllerRef.current?.destroy();
    controllerRef.current = null;
    setResult(null);
    setLive(null);
    setWishSent(false);
    netRef.current!.next();
  };

  const quit = () => {
    controllerRef.current?.destroy();
    controllerRef.current = null;
    netRef.current!.leave();
    openHome();
  };

  const connected = phase === 'connecting' || phase === 'playing' || phase === 'waiting' || phase === 'result';

  return (
    <div className="roulette">
      <div className="rl-top">
        <button className="icon-btn" onClick={quit} aria-label="Back">‹</button>
        <span className="rl-title">🎥 {t('duel.title')}</span>
        <span style={{ width: 40 }} />
      </div>

      {/* Video stage */}
      <div className={`rl-stage ${connected ? 'live' : ''}`}>
        <video ref={remoteVideo} className="rl-remote" autoPlay playsInline />
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
        {connected && <div className="rl-peer-name">{peerName}</div>}
        <video ref={localVideo} className="rl-local" autoPlay playsInline muted />
      </div>

      {/* Duel board area */}
      {connected && (
        <div className="rl-board-wrap">
          {live && (
            <div className="rl-hud">
              <span>🎯 {live.score.toLocaleString()}</span>
              <span className={live.movesLeft <= 3 ? 'danger' : ''}>♟ {live.movesLeft}</span>
            </div>
          )}
          <canvas ref={canvasRef} className="rl-canvas" />
        </div>
      )}

      {/* Idle / start */}
      {phase === 'idle' && (
        <div className="rl-idle">
          <p className="rl-lead">{t('duel.lead')}</p>
          {error && <p className="rl-error">{error}</p>}
          <button className="btn primary rl-start" onClick={start}>
            🎥 {t('duel.start')}
          </button>
          <p className="rl-note">{t('duel.camNote')}</p>
        </div>
      )}

      {/* Wish input overlay after match */}
      {connected && !wishSent && (
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
            />
            <button className="btn primary" onClick={submitWish} disabled={!wish.trim()}>
              {t('duel.wishGo')}
            </button>
          </div>
        </div>
      )}

      {/* Waiting for opponent's score */}
      {phase === 'waiting' && !result && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="rl-spinner" />
            <h2>{t('duel.waiting')}</h2>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="modal-backdrop">
          <div className={`modal ${result.outcome === 'win' ? 'win' : result.outcome === 'lose' ? 'lose' : ''}`}>
            <div className="modal-emoji">
              {result.outcome === 'win' ? '🏆' : result.outcome === 'lose' ? '😅' : '🤝'}
            </div>
            <h2>
              {result.outcome === 'win'
                ? t('duel.win')
                : result.outcome === 'lose'
                  ? t('duel.lose')
                  : t('duel.draw')}
            </h2>
            <p className="modal-score">
              {result.myScore.toLocaleString()} : {result.oppScore.toLocaleString()}
            </p>
            {result.outcome === 'win' && myWishRef.current && (
              <p className="rl-dare win">
                {t('duel.oppMust')}: <b>{myWishRef.current}</b>
              </p>
            )}
            {result.outcome === 'lose' && result.dare && (
              <p className="rl-dare">
                {t('duel.youMust')}: <b>{result.dare}</b>
              </p>
            )}
            <div className="modal-actions">
              <button className="btn ghost" onClick={quit}>{t('duel.exit')}</button>
              <button className="btn primary" onClick={nextOpponent}>{t('duel.next')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

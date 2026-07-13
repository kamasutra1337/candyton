import { useEffect, useRef, useState } from 'react';
import { getLevel, type GameState } from '@candyblast/engine';
import { GameController, type RecordedMove } from '../game/GameController';
import { useStore } from '../state/store';
import { submitRun } from '../net/api';
import { sfx } from '../audio/sfx';
import { HUD } from './HUD';
import { BoosterBar } from './BoosterBar';
import { ResultModal } from './ResultModal';

export function GameScreen({ levelId }: { levelId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [finished, setFinished] = useState<GameState | null>(null);
  const [result, setResult] = useState({ earned: 0, stars: 0 });
  const [attempt, setAttempt] = useState(0);

  const setLive = useStore((s) => s.setLive);
  const finishLevel = useStore((s) => s.finishLevel);
  const openMap = useStore((s) => s.openMap);
  const level = getLevel(levelId)!;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setFinished(null);
    const controller = new GameController(
      getLevel(levelId)!,
      canvas,
      (s) => {
        setState(s);
        setLive(s);
      },
      (s: GameState, moves: RecordedMove[]) => {
        setFinished(s);
        setResult(finishLevel(levelId, s.score, s.status === 'won'));
        // Best-effort authoritative submission under the player's name; no-op offline.
        void submitRun(levelId, moves, s.score, useStore.getState().resolveName());
      },
    );
    controllerRef.current = controller;
    const onResize = () => controller.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      controller.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, attempt]);

  const replay = () => {
    sfx.play('click');
    setFinished(null);
    setAttempt((a) => a + 1);
  };

  const busy = finished != null;

  return (
    <div className="game-screen">
      {state && (
        <HUD
          level={level}
          state={state}
          onBack={openMap}
          onHint={() => controllerRef.current?.showHint()}
        />
      )}
      <div className="board-wrap">
        <canvas ref={canvasRef} className="board-canvas" />
      </div>
      <BoosterBar
        disabled={busy}
        onHint={() => controllerRef.current?.showHint()}
        onShuffle={() => controllerRef.current?.useShuffle()}
        onExtraMoves={() => controllerRef.current?.useExtraMoves(5)}
      />
      {finished && (
        <ResultModal
          won={finished.status === 'won'}
          score={finished.score}
          earned={result.earned}
          stars={result.stars}
          onMap={openMap}
          onReplay={replay}
        />
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { getLevel, type GameState } from '@candyton/engine';
import { GameController } from '../game/GameController';
import { useStore } from '../state/store';
import { HUD } from './HUD';
import { ResultModal } from './ResultModal';

export function GameScreen({ levelId }: { levelId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [finished, setFinished] = useState<GameState | null>(null);
  const [earned, setEarned] = useState(0);

  const setLive = useStore((s) => s.setLive);
  const finishLevel = useStore((s) => s.finishLevel);
  const openMap = useStore((s) => s.openMap);
  const level = getLevel(levelId)!;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new GameController(
      levelId,
      canvas,
      (s) => {
        setState(s);
        setLive(s);
      },
      (s) => {
        setFinished(s);
        setEarned(finishLevel(levelId, s.score, s.status === 'won'));
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
  }, [levelId]);

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
      {finished && (
        <ResultModal
          won={finished.status === 'won'}
          score={finished.score}
          earned={earned}
          onMap={openMap}
        />
      )}
    </div>
  );
}

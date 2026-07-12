import type { GameState, LevelConfig } from '@candyton/engine';
import { objectiveLabel, progressText } from './objectives';

interface Props {
  level: LevelConfig;
  state: GameState;
  onBack: () => void;
  onHint: () => void;
}

export function HUD({ level, state, onBack, onHint }: Props) {
  return (
    <div className="hud">
      <div className="hud-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back to map">
          ‹
        </button>
        <div className="hud-level">
          <span className="hud-level-name">{level.name}</span>
          <span className="hud-level-id">Level {level.id}</span>
        </div>
        <button className="icon-btn" onClick={onHint} aria-label="Hint">
          ?
        </button>
      </div>

      <div className="hud-stats">
        <div className="stat">
          <span className="stat-label">Score</span>
          <span className="stat-value">{state.score.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Moves</span>
          <span className={`stat-value ${state.movesLeft <= 3 ? 'danger' : ''}`}>
            {state.movesLeft}
          </span>
        </div>
      </div>

      <div className="objectives">
        {state.objectives.map((p, i) => (
          <div key={i} className={`objective ${p.done ? 'done' : ''}`}>
            <span className="objective-label">{objectiveLabel(p.objective)}</span>
            <span className="objective-progress">{p.done ? '✓' : progressText(p)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

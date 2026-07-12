import type { GameState, LevelConfig } from '@candyton/engine';
import { objectiveLabel, progressText } from './objectives';
import { useCountUp } from './useCountUp';
import { useT } from '../i18n';

interface Props {
  level: LevelConfig;
  state: GameState;
  onBack: () => void;
  onHint: () => void;
}

export function HUD({ level, state, onBack, onHint }: Props) {
  const shownScore = useCountUp(state.score);
  const t = useT();
  return (
    <div className="hud">
      <div className="hud-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <div className="hud-level">
          <span className="hud-level-name">{level.name}</span>
          <span className="hud-level-id">{t('hud.level', { n: level.id })}</span>
        </div>
        <button className="icon-btn" onClick={onHint} aria-label={t('booster.hint')}>
          ?
        </button>
      </div>

      <div className="hud-stats">
        <div className="stat">
          <span className="stat-label">{t('hud.score')}</span>
          <span className="stat-value">{shownScore.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{t('hud.moves')}</span>
          <span className={`stat-value ${state.movesLeft <= 3 ? 'danger' : ''}`}>
            {state.movesLeft}
          </span>
        </div>
      </div>

      <div className="objectives">
        {state.objectives.map((p, i) => {
          const pct = Math.min(100, Math.round((p.current / p.target) * 100));
          return (
            <div key={i} className={`objective ${p.done ? 'done' : ''}`}>
              <div className="objective-row">
                <span className="objective-label">{objectiveLabel(t, p.objective)}</span>
                <span className="objective-progress">{p.done ? '✓' : progressText(p)}</span>
              </div>
              <div className="objective-bar">
                <div className="objective-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

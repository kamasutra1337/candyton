import { LEVELS } from '@candyton/engine';
import { useStore } from '../state/store';
import { sfx } from '../audio/sfx';
import { objectiveLabel } from './objectives';

export function LevelMap() {
  const unlocked = useStore((s) => s.unlocked);
  const bestScores = useStore((s) => s.bestScores);
  const stars = useStore((s) => s.stars);
  const startLevel = useStore((s) => s.startLevel);

  return (
    <div className="level-map">
      <p className="map-intro">
        Match candies, earn <span className="token">🪙 coins</span>, and chase three stars on every
        level.
      </p>
      <div className="level-grid">
        {LEVELS.map((lvl) => {
          const locked = lvl.id > unlocked;
          const best = bestScores[lvl.id];
          const s = stars[lvl.id] ?? 0;
          return (
            <button
              key={lvl.id}
              className={`level-card ${locked ? 'locked' : ''} ${best ? 'cleared' : ''}`}
              disabled={locked}
              onClick={() => {
                sfx.unlock();
                sfx.play('click');
                startLevel(lvl.id);
              }}
            >
              <div className="level-num">{locked ? '🔒' : lvl.id}</div>
              <div className="level-info">
                <span className="level-title">{lvl.name}</span>
                <span className="level-goal">{objectiveLabel(lvl.objectives[0]!)}</span>
                {best != null && <span className="level-best">Best {best.toLocaleString()}</span>}
              </div>
              {!locked && (
                <div className="card-stars">
                  {[0, 1, 2].map((k) => (
                    <span key={k} className={`star sm ${k < s ? 'lit' : ''}`}>
                      ★
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { LEVELS } from '@candyton/engine';
import { useStore } from '../state/store';
import { objectiveLabel } from './objectives';

export function LevelMap() {
  const unlocked = useStore((s) => s.unlocked);
  const bestScores = useStore((s) => s.bestScores);
  const startLevel = useStore((s) => s.startLevel);

  return (
    <div className="level-map">
      <p className="map-intro">
        Match candies, earn <span className="token">$CANDY</span>, and climb the on-chain
        leaderboard.
      </p>
      <div className="level-grid">
        {LEVELS.map((lvl) => {
          const locked = lvl.id > unlocked;
          const best = bestScores[lvl.id];
          return (
            <button
              key={lvl.id}
              className={`level-card ${locked ? 'locked' : ''} ${best ? 'cleared' : ''}`}
              disabled={locked}
              onClick={() => startLevel(lvl.id)}
            >
              <div className="level-num">{locked ? '🔒' : lvl.id}</div>
              <div className="level-info">
                <span className="level-title">{lvl.name}</span>
                <span className="level-goal">{objectiveLabel(lvl.objectives[0]!)}</span>
                {best != null && <span className="level-best">Best {best.toLocaleString()}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

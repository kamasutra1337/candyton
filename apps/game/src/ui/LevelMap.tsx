import { CHAPTERS, LEVELS } from '@candyton/engine';
import { useStore } from '../state/store';
import { sfx } from '../audio/sfx';
import { objectiveLabel } from './objectives';

export function LevelMap() {
  const unlocked = useStore((s) => s.unlocked);
  const bestScores = useStore((s) => s.bestScores);
  const stars = useStore((s) => s.stars);
  const startLevel = useStore((s) => s.startLevel);

  let cardIndex = 0;

  return (
    <div className="level-map">
      <p className="map-intro">
        Match candies, chase three stars, and climb through five sweet worlds.
      </p>

      {CHAPTERS.map((ch) => {
        const levels = LEVELS.filter((l) => l.id >= ch.from && l.id <= ch.to);
        const earned = levels.reduce((a, l) => a + (stars[l.id] ?? 0), 0);
        const max = levels.length * 3;
        const chapterUnlocked = ch.from <= unlocked;
        return (
          <section key={ch.name} className={`chapter ${chapterUnlocked ? '' : 'locked'}`}>
            <div className="chapter-head">
              <span className="chapter-icon">{ch.icon}</span>
              <span className="chapter-name">{ch.name}</span>
              <span className="chapter-stars">
                ⭐ {earned}/{max}
              </span>
            </div>
            <div className="level-grid">
              {levels.map((lvl) => {
                const locked = lvl.id > unlocked;
                const best = bestScores[lvl.id];
                const s = stars[lvl.id] ?? 0;
                const current = lvl.id === unlocked && !best;
                const delay = cardIndex++ * 0.03;
                return (
                  <button
                    key={lvl.id}
                    className={`level-card ${locked ? 'locked' : ''} ${best ? 'cleared' : ''} ${current ? 'current' : ''}`}
                    style={{ animationDelay: `${delay}s` }}
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
          </section>
        );
      })}
    </div>
  );
}

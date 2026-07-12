import { useEffect } from 'react';
import { useStore, totalStars } from '../state/store';
import { sfx } from '../audio/sfx';
import { LevelMap } from './LevelMap';
import { GameScreen } from './GameScreen';
import { Onboarding } from './Onboarding';

export function App() {
  const screen = useStore((s) => s.screen);
  const coins = useStore((s) => s.coins);
  const currentLevel = useStore((s) => s.currentLevel);
  const stars = useStore((s) => s.stars);
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const seenTutorial = useStore((s) => s.seenTutorial);
  const markTutorialSeen = useStore((s) => s.markTutorialSeen);

  useEffect(() => {
    sfx.setEnabled(sound);
  }, [sound]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-candy">🍬</span>
          <span className="brand-name">
            Candy<span className="brand-ton">TON</span>
          </span>
        </div>
        <div className="header-right">
          <div className="stat-pill" title="Total stars earned">
            <span>⭐</span>
            <span>{totalStars(stars)}</span>
          </div>
          <div className="stat-pill" title="Your coin balance">
            <span>🪙</span>
            <span>{coins.toLocaleString()}</span>
          </div>
          <button
            className="icon-btn small"
            onClick={() => {
              sfx.unlock();
              toggleSound();
            }}
            aria-label="Toggle sound"
          >
            {sound ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      <main className="app-main">
        {screen === 'game' && currentLevel != null ? (
          <GameScreen levelId={currentLevel} />
        ) : (
          <LevelMap />
        )}
      </main>

      {!seenTutorial && <Onboarding onDone={markTutorialSeen} />}
    </div>
  );
}

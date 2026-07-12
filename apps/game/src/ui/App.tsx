import { TonConnectButton } from '@tonconnect/ui-react';
import { useStore } from '../state/store';
import { LevelMap } from './LevelMap';
import { GameScreen } from './GameScreen';

export function App() {
  const screen = useStore((s) => s.screen);
  const coins = useStore((s) => s.coins);
  const currentLevel = useStore((s) => s.currentLevel);

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
          <div className="coin-pill" title="Your $CANDY balance">
            <span className="coin-icon">🪙</span>
            <span>{coins.toLocaleString()}</span>
          </div>
          <TonConnectButton className="ton-btn" />
        </div>
      </header>

      <main className="app-main">
        {screen === 'game' && currentLevel != null ? (
          <GameScreen levelId={currentLevel} />
        ) : (
          <LevelMap />
        )}
      </main>
    </div>
  );
}

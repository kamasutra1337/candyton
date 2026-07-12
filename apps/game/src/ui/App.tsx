import { useEffect } from 'react';
import { useStore, totalStars } from '../state/store';
import { useT } from '../i18n';
import { sfx } from '../audio/sfx';
import { Home } from './Home';
import { LevelMap } from './LevelMap';
import { GameScreen } from './GameScreen';
import { Leaderboard } from './Leaderboard';
import { Roulette } from './Roulette';
import { Onboarding } from './Onboarding';
import { LanguagePicker } from './LanguagePicker';

export function App() {
  const screen = useStore((s) => s.screen);
  const coins = useStore((s) => s.coins);
  const currentLevel = useStore((s) => s.currentLevel);
  const stars = useStore((s) => s.stars);
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const seenTutorial = useStore((s) => s.seenTutorial);
  const markTutorialSeen = useStore((s) => s.markTutorialSeen);
  const openLeaderboard = useStore((s) => s.openLeaderboard);
  const openHome = useStore((s) => s.openHome);
  const resolveName = useStore((s) => s.resolveName);
  const langChosen = useStore((s) => s.langChosen);
  const openLangPicker = useStore((s) => s.openLangPicker);
  const t = useT();

  useEffect(() => {
    sfx.setEnabled(sound);
  }, [sound]);
  useEffect(() => {
    resolveName();
  }, [resolveName]);

  const showHeader = screen === 'home' || screen === 'map' || screen === 'leaderboard';

  return (
    <div className="app">
      {showHeader && (
        <header className="app-header">
          <button className="brand brand-btn" onClick={openHome} aria-label="Home">
            <span className="brand-candy">🍬</span>
            <span className="brand-name">
              Candy<span className="brand-accent">Blast</span>
            </span>
          </button>
          <div className="header-right">
            <div className="stat-pill" title={t('app.stars')}>
              <span>⭐</span>
              <span>{totalStars(stars)}</span>
            </div>
            <div className="stat-pill" title={t('app.coins')}>
              <span>🪙</span>
              <span>{coins.toLocaleString()}</span>
            </div>
            <button className="icon-btn small" onClick={() => { sfx.unlock(); sfx.play('click'); openLeaderboard(); }} aria-label={t('app.leaderboard')}>🏆</button>
            <button className="icon-btn small" onClick={() => { sfx.unlock(); sfx.play('click'); openLangPicker(); }} aria-label={t('app.language')}>🌐</button>
            <button className="icon-btn small" onClick={() => { sfx.unlock(); toggleSound(); }} aria-label={t('app.sound')}>{sound ? '🔊' : '🔇'}</button>
          </div>
        </header>
      )}

      <main className="app-main">
        {screen === 'game' && currentLevel != null ? (
          <GameScreen levelId={currentLevel} />
        ) : screen === 'roulette' ? (
          <Roulette />
        ) : screen === 'leaderboard' ? (
          <Leaderboard />
        ) : screen === 'map' ? (
          <LevelMap />
        ) : (
          <Home />
        )}
      </main>

      {!langChosen && <LanguagePicker />}
      {langChosen && !seenTutorial && <Onboarding onDone={markTutorialSeen} />}
    </div>
  );
}

import { useStore } from '../state/store';
import { useT } from '../i18n';
import { sfx } from '../audio/sfx';

export function Home() {
  const t = useT();
  const openRoulette = useStore((s) => s.openRoulette);
  const openMap = useStore((s) => s.openMap);
  const openLeaderboard = useStore((s) => s.openLeaderboard);

  const go = (fn: () => void) => () => {
    sfx.unlock();
    sfx.play('click');
    fn();
  };

  return (
    <div className="home">
      <div className="home-hero">
        <div className="home-logo">🍬</div>
        <h1 className="home-title">
          Candy<span className="brand-accent">Blast</span>
        </h1>
        <p className="home-tagline">{t('home.tagline')}</p>
      </div>

      <button className="home-card primary" onClick={go(openRoulette)}>
        <span className="home-card-icon">🎥</span>
        <span className="home-card-text">
          <span className="home-card-title">{t('home.duel')}</span>
          <span className="home-card-sub">{t('home.duelSub')}</span>
        </span>
        <span className="home-card-arrow">›</span>
      </button>

      <button className="home-card" onClick={go(openMap)}>
        <span className="home-card-icon">🎮</span>
        <span className="home-card-text">
          <span className="home-card-title">{t('home.solo')}</span>
          <span className="home-card-sub">{t('home.soloSub')}</span>
        </span>
        <span className="home-card-arrow">›</span>
      </button>

      <button className="home-card" onClick={go(openLeaderboard)}>
        <span className="home-card-icon">🏆</span>
        <span className="home-card-text">
          <span className="home-card-title">{t('home.leaderboard')}</span>
          <span className="home-card-sub">{t('home.leaderboardSub')}</span>
        </span>
        <span className="home-card-arrow">›</span>
      </button>
    </div>
  );
}

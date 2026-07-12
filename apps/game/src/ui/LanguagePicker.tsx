import { useStore } from '../state/store';
import { sfx } from '../audio/sfx';

/** First-run (and re-openable) language chooser. Russian is the priority option. */
export function LanguagePicker() {
  const chooseLang = useStore((s) => s.chooseLang);
  const current = useStore((s) => s.lang);

  const pick = (l: 'ru' | 'en') => () => {
    sfx.unlock();
    sfx.play('click');
    chooseLang(l);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal lang-modal">
        <div className="modal-emoji">🍬</div>
        <h2>Выбери язык</h2>
        <p className="lang-sub">Choose your language</p>
        <div className="lang-options">
          <button className={`lang-opt ${current === 'ru' ? 'sel' : ''}`} onClick={pick('ru')}>
            <span className="lang-flag">🇷🇺</span>
            <span className="lang-label">Русский</span>
          </button>
          <button className={`lang-opt ${current === 'en' ? 'sel' : ''}`} onClick={pick('en')}>
            <span className="lang-flag">🇬🇧</span>
            <span className="lang-label">English</span>
          </button>
        </div>
      </div>
    </div>
  );
}

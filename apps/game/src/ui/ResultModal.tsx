import { Confetti } from './Confetti';
import { useT } from '../i18n';

interface Props {
  won: boolean;
  score: number;
  earned: number;
  stars: number;
  onMap: () => void;
  onReplay: () => void;
}

export function ResultModal({ won, score, earned, stars, onMap, onReplay }: Props) {
  const t = useT();
  return (
    <div className="modal-backdrop">
      {won && <Confetti />}
      <div className={`modal ${won ? 'win' : 'lose'}`}>
        <div className="modal-emoji">{won ? '🎉' : '💔'}</div>
        <h2>{won ? t('result.win') : t('result.lose')}</h2>

        {won && (
          <div className="stars-row">
            {[0, 1, 2].map((k) => (
              <span key={k} className={`star ${k < stars ? 'lit' : ''}`}>
                ★
              </span>
            ))}
          </div>
        )}

        <p className="modal-score">{t('result.points', { n: score.toLocaleString() })}</p>
        {won && earned > 0 && (
          <p className="modal-earned">
            +{earned} <span className="token">🪙 {t('result.earned')}</span>
          </p>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onReplay}>
            {t('result.replay')}
          </button>
          <button className="btn primary" onClick={onMap}>
            {won ? t('result.continue') : t('result.map')}
          </button>
        </div>
      </div>
    </div>
  );
}

import { Confetti } from './Confetti';

interface Props {
  won: boolean;
  score: number;
  earned: number;
  stars: number;
  onMap: () => void;
  onReplay: () => void;
}

export function ResultModal({ won, score, earned, stars, onMap, onReplay }: Props) {
  return (
    <div className="modal-backdrop">
      {won && <Confetti />}
      <div className={`modal ${won ? 'win' : 'lose'}`}>
        <div className="modal-emoji">{won ? '🎉' : '💔'}</div>
        <h2>{won ? 'Level Cleared!' : 'Out of Moves'}</h2>

        {won && (
          <div className="stars-row">
            {[0, 1, 2].map((k) => (
              <span key={k} className={`star ${k < stars ? 'lit' : ''}`}>
                ★
              </span>
            ))}
          </div>
        )}

        <p className="modal-score">{score.toLocaleString()} points</p>
        {won && earned > 0 && (
          <p className="modal-earned">
            +{earned} <span className="token">🪙 coins</span>
          </p>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onReplay}>
            Replay
          </button>
          <button className="btn primary" onClick={onMap}>
            {won ? 'Continue' : 'Map'}
          </button>
        </div>
      </div>
    </div>
  );
}

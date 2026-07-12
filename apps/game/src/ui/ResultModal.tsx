interface Props {
  won: boolean;
  score: number;
  earned: number;
  onMap: () => void;
}

export function ResultModal({ won, score, earned, onMap }: Props) {
  return (
    <div className="modal-backdrop">
      <div className={`modal ${won ? 'win' : 'lose'}`}>
        <div className="modal-emoji">{won ? '🎉' : '💔'}</div>
        <h2>{won ? 'Level Cleared!' : 'Out of Moves'}</h2>
        <p className="modal-score">{score.toLocaleString()} points</p>
        {won && earned > 0 && (
          <p className="modal-earned">
            +{earned} <span className="token">$CANDY</span> earned
          </p>
        )}
        <button className="btn primary" onClick={onMap}>
          {won ? 'Continue' : 'Back to Map'}
        </button>
      </div>
    </div>
  );
}

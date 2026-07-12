import { useStore } from '../state/store';
import { useT } from '../i18n';
import { sfx } from '../audio/sfx';

export const BOOSTERS = {
  hint: { icon: '💡', cost: 0 },
  shuffle: { icon: '🔀', cost: 30 },
  moves: { icon: '⏱️', cost: 80 },
} as const;

interface Props {
  onHint: () => void;
  onShuffle: () => void;
  onExtraMoves: () => void;
  disabled: boolean;
}

export function BoosterBar({ onHint, onShuffle, onExtraMoves, disabled }: Props) {
  const coins = useStore((s) => s.coins);
  const spend = useStore((s) => s.spendCoins);
  const t = useT();

  const buy = (cost: number, action: () => void) => () => {
    if (disabled) return;
    if (cost > 0 && !spend(cost)) {
      sfx.play('invalid');
      return;
    }
    sfx.play('click');
    action();
  };

  return (
    <div className="booster-bar">
      <button className="booster" onClick={buy(BOOSTERS.hint.cost, onHint)} disabled={disabled}>
        <span className="booster-icon">{BOOSTERS.hint.icon}</span>
        <span className="booster-label">{t('booster.hint')}</span>
        <span className="booster-cost free">{t('booster.free')}</span>
      </button>
      <button
        className={`booster ${coins < BOOSTERS.shuffle.cost ? 'poor' : ''}`}
        onClick={buy(BOOSTERS.shuffle.cost, onShuffle)}
        disabled={disabled}
      >
        <span className="booster-icon">{BOOSTERS.shuffle.icon}</span>
        <span className="booster-label">{t('booster.shuffle')}</span>
        <span className="booster-cost">🪙 {BOOSTERS.shuffle.cost}</span>
      </button>
      <button
        className={`booster ${coins < BOOSTERS.moves.cost ? 'poor' : ''}`}
        onClick={buy(BOOSTERS.moves.cost, onExtraMoves)}
        disabled={disabled}
      >
        <span className="booster-icon">{BOOSTERS.moves.icon}</span>
        <span className="booster-label">{t('booster.moves')}</span>
        <span className="booster-cost">🪙 {BOOSTERS.moves.cost}</span>
      </button>
    </div>
  );
}

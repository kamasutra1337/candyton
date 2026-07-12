import type { Objective, ObjectiveProgress } from '@candyton/engine';
import { CANDY_STYLES } from '../render/palette';
import type { TFn } from '../i18n';

export function objectiveLabel(t: TFn, o: Objective): string {
  switch (o.kind) {
    case 'score':
      return t('obj.score', { n: o.target.toLocaleString() });
    case 'collect':
      return t('obj.collect', { n: o.count, sym: CANDY_STYLES[o.color]?.symbol ?? '' });
    case 'clearSpecials':
      return t('obj.specials', { n: o.count });
  }
}

export const progressText = (p: ObjectiveProgress): string =>
  `${Math.min(p.current, p.target).toLocaleString()} / ${p.target.toLocaleString()}`;

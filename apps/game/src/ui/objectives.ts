import type { Objective, ObjectiveProgress } from '@candyton/engine';
import { CANDY_STYLES } from '../render/palette';

export function objectiveLabel(o: Objective): string {
  switch (o.kind) {
    case 'score':
      return `Reach ${o.target.toLocaleString()} points`;
    case 'collect':
      return `Collect ${o.count} ${CANDY_STYLES[o.color]?.symbol ?? ''} candies`;
    case 'clearSpecials':
      return `Detonate ${o.count} special candies`;
  }
}

export const progressText = (p: ObjectiveProgress): string =>
  `${Math.min(p.current, p.target).toLocaleString()} / ${p.target.toLocaleString()}`;

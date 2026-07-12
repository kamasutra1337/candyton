import { useState } from 'react';
import { useT } from '../i18n';

const ICONS = ['🍬', '✨', '🎯'];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const steps = [
    { icon: ICONS[0], title: t('ob1.title'), body: t('ob1.body') },
    { icon: ICONS[1], title: t('ob2.title'), body: t('ob2.body') },
    { icon: ICONS[2], title: t('ob3.title'), body: t('ob3.body') },
  ];
  const step = steps[i]!;
  const last = i === steps.length - 1;

  return (
    <div className="modal-backdrop">
      <div className="modal onboarding">
        <div className="modal-emoji">{step.icon}</div>
        <h2>{step.title}</h2>
        <p className="onboarding-body">{step.body}</p>
        <div className="onboarding-dots">
          {steps.map((_, k) => (
            <span key={k} className={`dot ${k === i ? 'active' : ''}`} />
          ))}
        </div>
        <button className="btn primary" onClick={() => (last ? onDone() : setI(i + 1))}>
          {last ? t('ob.play') : t('ob.next')}
        </button>
      </div>
    </div>
  );
}

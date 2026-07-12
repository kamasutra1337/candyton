import { useState } from 'react';

const STEPS = [
  {
    icon: '🍬',
    title: 'Welcome to CandyTON',
    body: 'Swipe a candy toward a neighbour to swap them. Line up 3 or more of the same colour to clear them and score.',
  },
  {
    icon: '✨',
    title: 'Make Special Candies',
    body: 'Match 4 in a row for a Striped candy (clears a line), an L or T shape for a Wrapped candy (3×3 blast), and 5 in a row for a Colour Bomb.',
  },
  {
    icon: '🎯',
    title: 'Beat the Level',
    body: 'Each level has an objective and a move limit. Clear it to earn coins and stars, unlock the next level, and spend coins on boosters.',
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;

  return (
    <div className="modal-backdrop">
      <div className="modal onboarding">
        <div className="modal-emoji">{step.icon}</div>
        <h2>{step.title}</h2>
        <p className="onboarding-body">{step.body}</p>
        <div className="onboarding-dots">
          {STEPS.map((_, k) => (
            <span key={k} className={`dot ${k === i ? 'active' : ''}`} />
          ))}
        </div>
        <button className="btn primary" onClick={() => (last ? onDone() : setI(i + 1))}>
          {last ? "Let's Play" : 'Next'}
        </button>
      </div>
    </div>
  );
}

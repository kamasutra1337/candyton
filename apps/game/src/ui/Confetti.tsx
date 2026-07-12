import { useMemo } from 'react';

const COLORS = ['#ff3b6b', '#ffb020', '#31d0aa', '#3b8bff', '#b56bff', '#ff5ecb', '#f2f24a'];

/** Lightweight CSS confetti burst, rendered once on a win. */
export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 97) % 100,
        color: COLORS[i % COLORS.length]!,
        delay: (i % 10) * 0.12,
        duration: 1.8 + ((i * 37) % 100) / 100,
        size: 6 + ((i * 13) % 8),
        rot: (i * 47) % 360,
      })),
    [count],
  );

  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

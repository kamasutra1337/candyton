import { useEffect, useRef, useState } from 'react';

/** Eases a displayed number toward `target` for a satisfying score roll-up. */
export function useCountUp(target: number, duration = 450): number {
  const [val, setVal] = useState(target);
  const valRef = useRef(target);
  valRef.current = val;
  const raf = useRef(0);

  useEffect(() => {
    const from = valRef.current;
    if (from === target) return;
    let start = 0;
    const tick = (now: number): void => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return val;
}

import { useEffect, useRef, useState } from "react";

/**
 * Steps an index from -1 (nothing active) through `count - 1`, on an
 * interval. Backs the execution-lifecycle diagram's "Replay" control.
 */
export function useStepReplay(count: number, intervalMs = 500) {
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clear = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const play = () => {
    if (count <= 0) return;
    clear();
    setPlaying(true);
    setStep(0);
    let s = 0;
    timerRef.current = window.setInterval(() => {
      s += 1;
      setStep(s);
      if (s >= count - 1) {
        clear();
        setPlaying(false);
      }
    }, intervalMs);
  };

  useEffect(() => clear, []);

  return { step, playing, play };
}

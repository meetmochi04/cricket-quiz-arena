import { useEffect, useState } from 'react';

interface ClockState {
  id: string;
  elapsed: number;
}

/**
 * One master requestAnimationFrame clock.
 *
 * - Restarts from 0 whenever `segmentId` changes.
 * - Runs only while `running` is true, and stops itself at `duration`.
 * - Returns 0 for a segment it has not ticked yet (never leaks the previous segment's time).
 */
export function useSegmentClock(segmentId: string, running: boolean, duration: number): number {
  const [clock, setClock] = useState<ClockState>({ id: segmentId, elapsed: 0 });

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const e = Math.min(now - start, duration);
      setClock({ id: segmentId, elapsed: e });
      if (e < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [segmentId, running, duration]);

  return clock.id === segmentId ? clock.elapsed : 0;
}

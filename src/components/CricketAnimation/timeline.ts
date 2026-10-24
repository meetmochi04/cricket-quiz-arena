/** Small, dependency-free timeline helpers shared by every animation module. */

export type Easing = (t: number) => number;

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const linear: Easing = (t) => t;
export const easeInQuad: Easing = (t) => t * t;
export const easeOutQuad: Easing = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad: Easing = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic: Easing = (t) => t * t * t;
export const easeOutBack: Easing = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Normalised progress (0..1) of `t` inside [start, end], with optional easing. */
export const progress = (t: number, start: number, end: number, ease: Easing = linear): number =>
  ease(clamp01((t - start) / (end - start)));

/** A keyframe: at time `t` the numeric record equals `v`. `ease` shapes the approach INTO this frame. */
export interface Keyframe<T extends Record<string, number>> {
  t: number;
  v: T;
  ease?: Easing;
}

/** Interpolate a table of keyframes at time `t`. Holds first/last values outside the range. */
export function sampleKeyframes<T extends Record<string, number>>(frames: Keyframe<T>[], t: number): T {
  if (frames.length === 0) throw new Error('sampleKeyframes: empty table');
  if (t <= frames[0].t) return { ...frames[0].v };
  const last = frames[frames.length - 1];
  if (t >= last.t) return { ...last.v };
  for (let i = 1; i < frames.length; i++) {
    const b = frames[i];
    if (t <= b.t) {
      const a = frames[i - 1];
      const p = (b.ease ?? easeInOutQuad)(clamp01((t - a.t) / (b.t - a.t)));
      const out: Record<string, number> = {};
      for (const k of Object.keys(b.v)) out[k] = lerp(a.v[k], b.v[k], p);
      return out as T;
    }
  }
  return { ...last.v };
}

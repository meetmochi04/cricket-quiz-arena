/**
 * Reusable ball trajectory system.
 *
 * A ball position is {x, gy, h}:
 *   x  = horizontal screen position
 *   gy = ground position on screen (larger = closer to camera, smaller = deeper in the field)
 *   h  = height above the ground (screen y = gy - h)
 *
 * A BallTrack is a list of timed segments. `sampleTrack(track, t)` gives the ball position at time t.
 */

import { clamp01, easeOutQuad, lerp, linear, type Easing } from './timeline';

export interface BallPoint {
  x: number;
  gy: number;
  h: number;
}

export interface BallPath {
  at(p: number): BallPoint;
}

export interface TrackSegment {
  t0: number;
  t1: number;
  path: BallPath;
}

export interface BallTrack {
  segments: TrackSegment[];
}

/** Simple arc: straight ground line from -> to with an extra sin() lift of `apex`. */
export function arcPath(from: BallPoint, to: BallPoint, apex: number, easeX: Easing = linear): BallPath {
  return {
    at(p) {
      const q = clamp01(p);
      const ex = easeX(q);
      return {
        x: lerp(from.x, to.x, ex),
        gy: lerp(from.gy, to.gy, ex),
        h: lerp(from.h, to.h, q) + apex * Math.sin(Math.PI * q),
      };
    },
  };
}

/** Ground shot: travels from -> to with `hops` decaying bounces of initial height `hop`. */
export function groundRunPath(from: BallPoint, to: BallPoint, hop: number, hops: number, easeX: Easing = easeOutQuad): BallPath {
  return {
    at(p) {
      const q = clamp01(p);
      const ex = easeX(q);
      const decay = (1 - q) * (1 - q);
      const bounce = Math.abs(Math.sin(Math.PI * hops * q)) * hop * decay;
      return {
        x: lerp(from.x, to.x, ex),
        gy: lerp(from.gy, to.gy, ex),
        h: from.h * (1 - q) * (1 - q) + bounce,
      };
    },
  };
}

/** Stay at one point (ball held in a hand, resting on the ground, etc.). */
export function holdPath(at: BallPoint): BallPath {
  return { at: () => ({ ...at }) };
}

export function buildTrack(parts: { start: number; end: number; path: BallPath }[]): BallTrack {
  return { segments: parts.map((s) => ({ t0: s.start, t1: s.end, path: s.path })) };
}

export function sampleTrack(track: BallTrack, t: number): BallPoint {
  const segs = track.segments;
  if (segs.length === 0) return { x: 0, gy: 0, h: 0 };
  if (t <= segs[0].t0) return segs[0].path.at(0);
  for (const s of segs) {
    if (t >= s.t0 && t <= s.t1) return s.path.at((t - s.t0) / (s.t1 - s.t0));
  }
  // Between segments (gap) or after the end -> hold the last known point.
  let last = segs[0];
  for (const s of segs) if (s.t1 <= t) last = s;
  return last.path.at(1);
}

/** Named trajectory presets used by the choreography. Kept here so tuning lives in one place. */
export const TRAJECTORY = {
  /** Height boost while the ball flies from the bowler's hand to the pitch. */
  deliveryArc: 14,
  /** Height the ball reaches after pitching (freeze point height). */
  bounceHeight: 36,
  /** Six: extra apex above the straight line between contact and exit. */
  sixApex: 270,
  /** Four: first hop height along the ground. */
  fourHop: 16,
  /** Two: lofted apex before landing in the outfield. */
  twoApex: 85,
  /** Caught: apex of the skied top edge. */
  catchApex: 215,
  /** Throw from fielder back to the keeper. */
  throwApex: 95,
} as const;

/**
 * Convenience factory so callers can ask for a path by result type.
 * `from` is the contact point; `to` is the destination.
 */
export function calculateBallPath(
  type: 'six' | 'four' | 'two' | 'bowled' | 'caught' | 'throw',
  from: BallPoint,
  to: BallPoint,
): BallPath {
  switch (type) {
    case 'six':
      return arcPath(from, to, TRAJECTORY.sixApex, easeOutQuad);
    case 'four':
      return groundRunPath(from, to, TRAJECTORY.fourHop, 3);
    case 'two':
      return arcPath(from, to, TRAJECTORY.twoApex);
    case 'caught':
      return arcPath(from, to, TRAJECTORY.catchApex);
    case 'throw':
      return arcPath(from, to, TRAJECTORY.throwApex);
    case 'bowled':
      return arcPath(from, to, 0);
  }
}

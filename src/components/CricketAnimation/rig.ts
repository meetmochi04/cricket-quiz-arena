/**
 * A tiny 2D forward-kinematics rig for stylised cricket characters.
 *
 * Every limb angle is in DEGREES, measured from "hanging straight down".
 * Positive = towards the direction the character is facing.
 * Poses are always authored facing RIGHT; `dir = -1` mirrors them to face left.
 */

export interface Pt {
  x: number;
  y: number;
}

export type Pose = {
  /** Height of the hip above the ground line (crouch = smaller). */
  hipH: number;
  /** Torso lean from vertical (+ = forward). */
  lean: number;
  /** Head tilt relative to torso (+ = forward/down, - = looking up). */
  head: number;
  /** Far-side leg (drawn behind). */
  lThigh: number;
  lShin: number;
  /** Near-side leg (drawn in front). */
  rThigh: number;
  rShin: number;
  /** Far-side arm. Forearm angle is relative to the upper arm. */
  lArm: number;
  lFore: number;
  /** Near-side arm. The bat is held in this hand. */
  rArm: number;
  rFore: number;
  /** Absolute bat angle: 0 = hanging down, 90 = forward horizontal, 180 = straight up, -140 = backlift. */
  bat: number;
  /** Extra vertical offset (negative = up). Used for hops and jumps. */
  bob: number;
}

export const LIMB = {
  thigh: 30,
  shin: 30,
  torso: 40,
  upperArm: 24,
  forearm: 22,
  neck: 6,
  headR: 11,
  bat: 50,
} as const;

export const BASE_POSE: Pose = {
  hipH: 60,
  lean: 6,
  head: 0,
  lThigh: -6,
  lShin: -6,
  rThigh: 6,
  rShin: -6,
  lArm: 8,
  lFore: 14,
  rArm: -8,
  rFore: 14,
  bat: 6,
  bob: 0,
};

export const pose = (p: Partial<Pose>): Pose => ({ ...BASE_POSE, ...p });

export function blendPose(a: Pose, b: Pose, t: number): Pose {
  const out: Record<string, number> = {};
  for (const k of Object.keys(a) as (keyof Pose)[]) out[k] = a[k] + (b[k] - a[k]) * t;
  return out as unknown as Pose;
}

export interface FigureGeometry {
  hip: Pt;
  chest: Pt;
  headC: Pt;
  lKnee: Pt;
  lFoot: Pt;
  rKnee: Pt;
  rFoot: Pt;
  lShoulder: Pt;
  rShoulder: Pt;
  lElbow: Pt;
  lHand: Pt;
  rElbow: Pt;
  rHand: Pt;
  batTip: Pt;
  batMid: Pt;
  dir: 1 | -1;
}

const rad = (d: number): number => (d * Math.PI) / 180;
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const down = (deg: number, len: number, dir: number): Pt => ({ x: Math.sin(rad(deg)) * len * dir, y: Math.cos(rad(deg)) * len });
const up = (deg: number, len: number, dir: number): Pt => ({ x: Math.sin(rad(deg)) * len * dir, y: -Math.cos(rad(deg)) * len });

/** Solve joint positions for a pose standing at `x` on ground line `groundY`, facing `dir`. */
export function solveFigure(p: Pose, x: number, groundY: number, dir: 1 | -1): FigureGeometry {
  const hip: Pt = { x, y: groundY - p.hipH + p.bob };
  const chest = add(hip, up(p.lean, LIMB.torso, dir));
  const headC = add(chest, up(p.lean + p.head, LIMB.neck + LIMB.headR, dir));

  const lKnee = add(hip, down(p.lThigh, LIMB.thigh, dir));
  const lFoot = add(lKnee, down(p.lThigh + p.lShin, LIMB.shin, dir));
  const rKnee = add(hip, down(p.rThigh, LIMB.thigh, dir));
  const rFoot = add(rKnee, down(p.rThigh + p.rShin, LIMB.shin, dir));

  // Shoulders sit just below the chest point, slightly apart for depth.
  const shoulderBase = add(chest, down(p.lean, 4, dir));
  const lShoulder = add(shoulderBase, { x: -3 * dir, y: 0 });
  const rShoulder = add(shoulderBase, { x: 3 * dir, y: 0 });

  const lElbow = add(lShoulder, down(p.lArm, LIMB.upperArm, dir));
  const lHand = add(lElbow, down(p.lArm + p.lFore, LIMB.forearm, dir));
  const rElbow = add(rShoulder, down(p.rArm, LIMB.upperArm, dir));
  const rHand = add(rElbow, down(p.rArm + p.rFore, LIMB.forearm, dir));

  const batTip = add(rHand, down(p.bat, LIMB.bat, dir));
  const batMid = add(rHand, down(p.bat, LIMB.bat * 0.64, dir));

  return { hip, chest, headC, lKnee, lFoot, rKnee, rFoot, lShoulder, rShoulder, lElbow, lHand, rElbow, rHand, batTip, batMid, dir };
}

/** Procedural running cycle. `phase` in radians, `amp` scales stride length. */
export function runCycle(phase: number, amp = 1, carryBat = false): Pose {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const kneeL = Math.max(0, -s);
  const kneeR = Math.max(0, s);
  return pose({
    hipH: 58,
    lean: 14,
    lThigh: 38 * amp * s,
    lShin: -18 - 55 * kneeL * amp,
    rThigh: -38 * amp * s,
    rShin: -18 - 55 * kneeR * amp,
    lArm: carryBat ? 30 : -34 * amp * s,
    lFore: carryBat ? 30 : 70,
    rArm: carryBat ? 34 : 34 * amp * s,
    rFore: carryBat ? 26 : 70,
    bat: carryBat ? 84 : 0,
    bob: -3 * Math.abs(c) * amp,
  });
}

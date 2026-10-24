/**
 * Choreography: converts elapsed time into a complete scene Frame.
 *
 *   computeBowlingFrame(t)                -> run-up, release, travel, pitch, freeze
 *   computeResultFrame(kind, t)           -> six / four / two / bowled / caught
 *
 * Everything (poses, ball, stumps, effects, state labels) is a pure function of time,
 * so a single requestAnimationFrame clock keeps every element perfectly in sync.
 */

import {
  easeInCubic,
  easeInOutQuad,
  easeOutCubic,
  easeOutQuad,
  lerp,
  progress,
  sampleKeyframes,
  type Keyframe,
} from './timeline';
import { blendPose, pose, runCycle, solveFigure, type Pose, type Pt } from './rig';
import {
  arcPath,
  buildTrack,
  calculateBallPath,
  groundRunPath,
  holdPath,
  sampleTrack,
  TRAJECTORY,
  type BallPoint,
  type BallTrack,
} from './ballPhysics';
import type { AnimationState, BallResult, ResultStage, WicketType } from './animationTypes';

/* ------------------------------------------------------------------ */
/* Scene layout (viewBox 1000 x 560, side-on, bowler runs left -> right) */
/* ------------------------------------------------------------------ */

export const SCENE = {
  W: 1000,
  H: 560,
  GROUND: 400,
  BOWLER_STUMPS_X: 332,
  STRIKER_STUMPS_X: 768,
  BATSMAN_X: 740,
  NON_STRIKER_X: 296,
  NON_STRIKER_GY: 384,
  KEEPER_X: 814,
  BOWLER_START_X: 80,
  BOWLER_CREASE_X: 300,
  PITCH_POINT: { x: 600, gy: 400, h: 0 } as BallPoint,
  FREEZE_POINT: { x: 660, gy: 400, h: TRAJECTORY.bounceHeight } as BallPoint,
  ROPE_LEFT_X: 30,
  DEEP_FIELDER: { x: 190, gy: 326 },
  CATCH_FIELDER_START: { x: 530, gy: 342 },
  CATCH_FIELDER: { x: 452, gy: 342 },
} as const;

export const BOWLING_T = {
  RUNUP_END: 1300,
  RELEASE: 1760,
  PITCH: 2250,
  QUESTION: 2500,
} as const;

export const RESULT_T = {
  six: { contact: 260, banner: 900, end: 2600 },
  four: { contact: 260, banner: 1500, end: 2500 },
  two: { contact: 260, banner: 2500, end: 3400 },
  bowled: { contact: 240, banner: 750, end: 2600 },
  caught: { contact: 260, banner: 1550, end: 3200 },
} as const;

export type ResultKind = keyof typeof RESULT_T;

export const resultKind = (result: BallResult, wicketType: WicketType): ResultKind =>
  result === 'wicket' ? wicketType : result;

export const resultDuration = (kind: ResultKind): number => RESULT_T[kind].end;

/* ------------------------------------------------------------------ */
/* Frame model                                                          */
/* ------------------------------------------------------------------ */

export interface ActorFrame {
  pose: Pose;
  x: number;
  gy: number;
  dir: 1 | -1;
}

export interface BailFrame {
  dx: number;
  dy: number;
  rot: number;
}

export interface StumpsFrame {
  middleTilt: number;
  offTilt: number;
  bails: [BailFrame, BailFrame];
}

export interface BannerFrame {
  kind: BallResult;
  title: string;
  subtitle: string;
}

export interface Frame {
  state: AnimationState;
  stage: ResultStage;
  bowler: ActorFrame;
  batsman: ActorFrame;
  nonStriker: ActorFrame;
  keeper: ActorFrame;
  fielder: ActorFrame;
  ball: BallPoint;
  ballVisible: boolean;
  trail: BallPoint[];
  stumps: StumpsFrame;
  impact: { x: number; y: number; p: number } | null;
  shake: boolean;
  frozen: boolean;
  banner: BannerFrame | null;
}

const INTACT_STUMPS: StumpsFrame = {
  middleTilt: 0,
  offTilt: 0,
  bails: [
    { dx: 0, dy: 0, rot: 0 },
    { dx: 0, dy: 0, rot: 0 },
  ],
};

const G = SCENE.GROUND;
const toBall = (pt: Pt, gy: number): BallPoint => ({ x: pt.x, gy, h: gy - pt.y });
const handsMid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/* ------------------------------------------------------------------ */
/* Bowler                                                               */
/* ------------------------------------------------------------------ */

const RUN_HZ = 2.7;
const runPhase = (t: number): number => (t / 1000) * Math.PI * 2 * RUN_HZ;

type MovingPose = Pose & { x: number };

const runupEndPose: MovingPose = { ...runCycle(runPhase(BOWLING_T.RUNUP_END), 1), x: SCENE.BOWLER_CREASE_X };

const bowlerActionKF: Keyframe<MovingPose>[] = [
  { t: 1300, v: runupEndPose },
  {
    t: 1420,
    v: { ...pose({ hipH: 62, lean: -8, head: -4, lThigh: -12, lShin: -62, rThigh: 34, rShin: -74, lArm: 165, lFore: -10, rArm: -55, rFore: 20, bob: -16 }), x: 306 },
    ease: easeOutQuad,
  },
  {
    t: 1500,
    v: { ...pose({ hipH: 56, lean: -12, head: -6, lThigh: 36, lShin: -10, rThigh: -26, rShin: -36, lArm: 160, lFore: -10, rArm: -72, rFore: 10, bob: 0 }), x: 310 },
    ease: easeInCubic,
  },
  {
    t: 1760,
    v: { ...pose({ hipH: 58, lean: 22, head: 4, lThigh: 42, lShin: -6, rThigh: -30, rShin: -30, lArm: 10, lFore: 30, rArm: -186, rFore: -6, bob: -2 }), x: 322 },
    ease: easeInCubic,
  },
  {
    t: 2050,
    v: { ...pose({ hipH: 54, lean: 42, head: 6, lThigh: 20, lShin: -22, rThigh: 30, rShin: -32, lArm: -30, lFore: 40, rArm: -300, rFore: 20, bob: 0 }), x: 352 },
    ease: easeOutQuad,
  },
  {
    t: 2300,
    v: { ...pose({ hipH: 58, lean: 18, head: 2, lThigh: -10, lShin: -10, rThigh: 16, rShin: -10, lArm: 10, lFore: 30, rArm: -330, rFore: 30, bob: 0 }), x: 372 },
    ease: easeOutQuad,
  },
];

const splitMoving = (v: MovingPose): { pose: Pose; x: number } => {
  const { x, ...rest } = v;
  return { pose: rest, x };
};

export function bowlerAt(t: number): ActorFrame {
  if (t < BOWLING_T.RUNUP_END) {
    const p = progress(t, 0, BOWLING_T.RUNUP_END);
    const x = lerp(SCENE.BOWLER_START_X, SCENE.BOWLER_CREASE_X, 0.3 * p + 0.7 * p * p);
    const amp = 0.55 + 0.45 * Math.min(1, t / 450);
    return { pose: runCycle(runPhase(t), amp), x, gy: G, dir: 1 };
  }
  const { pose: p, x } = splitMoving(sampleKeyframes(bowlerActionKF, t));
  return { pose: p, x, gy: G, dir: 1 };
}

const BOWLER_REST = bowlerAt(BOWLING_T.QUESTION);

/** Bowler reactions during the result (celebrate a wicket, watch a six). */
function bowlerResultAt(kind: ResultKind, t: number): ActorFrame {
  const base = BOWLER_REST.pose;
  if (kind === 'bowled') {
    const jump = progress(t, 350, 1000);
    const p = blendPose(
      base,
      pose({ hipH: 60, lean: -6, head: -12, lThigh: -8, lShin: -30, rThigh: 10, rShin: -30, lArm: 172, lFore: -10, rArm: -190, rFore: 10 }),
      easeOutQuad(Math.min(1, jump * 2)),
    );
    p.bob = -22 * Math.sin(Math.PI * jump);
    return { ...BOWLER_REST, pose: p };
  }
  if (kind === 'caught') {
    const up = progress(t, 1350, 1700, easeOutQuad);
    const p = blendPose(base, pose({ hipH: 60, lean: -4, head: -12, lArm: 168, lFore: -8, rArm: -192, rFore: 8, lThigh: -8, rThigh: 10 }), up);
    return { ...BOWLER_REST, pose: p };
  }
  if (kind === 'six') {
    const look = progress(t, 500, 1100, easeInOutQuad);
    const p = blendPose(base, pose({ hipH: 60, lean: -6, head: -34, lArm: 30, lFore: 110, rArm: 30, rFore: 110 }), look);
    return { ...BOWLER_REST, pose: p };
  }
  return BOWLER_REST;
}

/* ------------------------------------------------------------------ */
/* Batsman                                                              */
/* ------------------------------------------------------------------ */

const STANCE = pose({ hipH: 50, lean: 26, head: 4, lThigh: 16, lShin: -22, rThigh: -16, rShin: -18, lArm: 40, lFore: 36, rArm: 34, rFore: 44, bat: 14 });
const BACKLIFT = pose({ hipH: 50, lean: 28, head: 6, lThigh: 16, lShin: -22, rThigh: -16, rShin: -18, lArm: 26, lFore: 62, rArm: 22, rFore: 66, bat: -135 });
const READ = pose({ hipH: 50, lean: 30, head: 6, lThigh: 34, lShin: -8, rThigh: -18, rShin: -26, lArm: 30, lFore: 50, rArm: 26, rFore: 56, bat: -120 });
const SLUMP = pose({ hipH: 54, lean: 6, head: 30, lThigh: 12, lShin: -6, rThigh: -10, rShin: -6, lArm: 14, lFore: 10, rArm: 12, rFore: 12, bat: 4 });

export function batsmanBowlingAt(t: number): ActorFrame {
  const tap = 8 * Math.sin(t / 170);
  const toBacklift = progress(t, 1500, 2350, easeInOutQuad);
  const p = blendPose({ ...STANCE, bat: STANCE.bat + tap * (1 - toBacklift) }, BACKLIFT, toBacklift);
  return { pose: p, x: SCENE.BATSMAN_X, gy: G, dir: -1 };
}

const batsmanKF: Record<ResultKind, Keyframe<Pose>[]> = {
  six: [
    { t: 0, v: BACKLIFT },
    { t: 120, v: READ },
    { t: 260, v: pose({ hipH: 48, lean: 34, head: 8, lThigh: 44, lShin: -6, rThigh: -22, rShin: -40, lArm: 62, lFore: 4, rArm: 58, rFore: 6, bat: 88 }), ease: easeInCubic },
    { t: 560, v: pose({ hipH: 50, lean: 12, head: -6, lThigh: 42, lShin: -8, rThigh: -20, rShin: -40, lArm: 150, lFore: -40, rArm: 146, rFore: -36, bat: 215 }), ease: easeOutCubic },
    { t: 1300, v: pose({ hipH: 56, lean: 2, head: -16, lThigh: 20, lShin: -6, rThigh: -12, rShin: -10, lArm: 165, lFore: -10, rArm: 40, rFore: 70, bat: 190 }) },
  ],
  four: [
    { t: 0, v: BACKLIFT },
    { t: 120, v: READ },
    { t: 260, v: pose({ hipH: 44, lean: 38, head: 10, lThigh: 48, lShin: -6, rThigh: -24, rShin: -46, lArm: 66, lFore: 0, rArm: 62, rFore: 2, bat: 76 }), ease: easeInCubic },
    { t: 560, v: pose({ hipH: 46, lean: 20, head: 0, lThigh: 46, lShin: -8, rThigh: -22, rShin: -44, lArm: 140, lFore: -40, rArm: 136, rFore: -36, bat: 205 }), ease: easeOutCubic },
    { t: 1400, v: pose({ hipH: 54, lean: 10, head: -4, lThigh: 18, lShin: -8, rThigh: -12, rShin: -10, lArm: 30, lFore: 50, rArm: 28, rFore: 54, bat: 20 }) },
  ],
  two: [
    { t: 0, v: BACKLIFT },
    { t: 120, v: READ },
    { t: 260, v: pose({ hipH: 50, lean: 30, head: 6, lThigh: 36, lShin: -8, rThigh: -20, rShin: -30, lArm: 52, lFore: 10, rArm: 48, rFore: 14, bat: 62 }), ease: easeInCubic },
    { t: 430, v: pose({ hipH: 52, lean: 20, head: 2, lThigh: 30, lShin: -8, rThigh: -18, rShin: -24, lArm: 70, lFore: 0, rArm: 66, rFore: 4, bat: 92 }), ease: easeOutQuad },
  ],
  bowled: [
    { t: 0, v: BACKLIFT },
    { t: 120, v: READ },
    { t: 380, v: pose({ hipH: 50, lean: 30, head: 10, lThigh: 30, lShin: -8, rThigh: -18, rShin: -30, lArm: 40, lFore: 30, rArm: 36, rFore: 34, bat: 28 }), ease: easeInCubic },
    { t: 700, v: pose({ hipH: 52, lean: 18, head: 18, lThigh: 26, lShin: -8, rThigh: -16, rShin: -20, lArm: 30, lFore: 30, rArm: 28, rFore: 30, bat: 10 }) },
    { t: 1150, v: SLUMP },
    { t: 1800, v: { ...SLUMP, head: 36, lean: 2 } },
  ],
  caught: [
    { t: 0, v: BACKLIFT },
    { t: 120, v: READ },
    { t: 260, v: pose({ hipH: 50, lean: 22, head: -4, lThigh: 34, lShin: -8, rThigh: -22, rShin: -36, lArm: 84, lFore: -10, rArm: 80, rFore: -6, bat: 118 }), ease: easeInCubic },
    { t: 520, v: pose({ hipH: 52, lean: 10, head: -26, lThigh: 32, lShin: -8, rThigh: -20, rShin: -30, lArm: 120, lFore: -30, rArm: 116, rFore: -30, bat: 200 }), ease: easeOutCubic },
    { t: 1350, v: pose({ hipH: 52, lean: 8, head: -24, lThigh: 30, lShin: -8, rThigh: -20, rShin: -28, lArm: 118, lFore: -30, rArm: 114, rFore: -30, bat: 198 }) },
    { t: 1650, v: SLUMP },
  ],
};

/* Running between the wickets (used by the TWO result). */
const RUN1 = { start: 450, end: 1250 };
const TURN = { start: 1250, end: 1450 };
const RUN2 = { start: 1450, end: 2250 };
const STOP = { start: 2250, end: 2500 };
const RESET = { start: 2550, end: 2850 };

const STAND_BAT = pose({ hipH: 58, lean: 12, head: 2, lThigh: 10, lShin: -8, rThigh: -10, rShin: -6, lArm: 26, lFore: 30, rArm: 30, rFore: 30, bat: 60 });
const SLIDE_BAT = pose({ hipH: 48, lean: 34, head: 6, lThigh: 40, lShin: -6, rThigh: -26, rShin: -40, lArm: 70, lFore: 0, rArm: 74, rFore: 0, bat: 96 });

function runnerAt(t: number, home: number, far: number, homeDir: 1 | -1, restPose: Pose, shotPose?: Pose, gy: number = G): ActorFrame {
  const runPose = runCycle(runPhase(t) * 1.15, 1, true);
  const awayDir = (homeDir * -1) as 1 | -1;
  if (t < RUN1.start) return { pose: shotPose ?? restPose, x: home, gy, dir: homeDir };
  if (t < RUN1.end) {
    const p = progress(t, RUN1.start, RUN1.end, easeInOutQuad);
    const blendIn = progress(t, RUN1.start, RUN1.start + 140);
    return { pose: blendPose(shotPose ?? restPose, runPose, blendIn), x: lerp(home, far, p), gy, dir: awayDir };
  }
  if (t < TURN.end) {
    const p = progress(t, TURN.start, TURN.end);
    const flipped = t > (TURN.start + TURN.end) / 2;
    return { pose: blendPose(runPose, STAND_BAT, Math.sin(Math.PI * p)), x: far, gy, dir: flipped ? homeDir : awayDir };
  }
  if (t < RUN2.end) {
    const p = progress(t, RUN2.start, RUN2.end, easeInOutQuad);
    return { pose: runPose, x: lerp(far, home, p), gy, dir: homeDir };
  }
  if (t < STOP.end) {
    const p = progress(t, STOP.start, STOP.end, easeOutCubic);
    return { pose: blendPose(SLIDE_BAT, STAND_BAT, p), x: home, gy, dir: homeDir };
  }
  const p = progress(t, RESET.start, RESET.end, easeInOutQuad);
  const flipped = t > (RESET.start + RESET.end) / 2;
  return { pose: blendPose(STAND_BAT, restPose, p), x: home, gy, dir: flipped ? awayDir : homeDir };
}

export function batsmanResultAt(kind: ResultKind, t: number): ActorFrame {
  if (kind === 'two' && t >= RUN1.start) {
    // Striker runs towards the bowler's end (left) and back.
    return runnerAt(t, SCENE.BATSMAN_X, SCENE.BOWLER_STUMPS_X + 22, -1, STANCE, sampleKeyframes(batsmanKF.two, RUN1.start));
  }
  return { pose: sampleKeyframes(batsmanKF[kind], t), x: SCENE.BATSMAN_X, gy: G, dir: -1 };
}

/* ------------------------------------------------------------------ */
/* Non-striker, keeper, fielder                                         */
/* ------------------------------------------------------------------ */

const NON_STRIKER_IDLE = pose({ hipH: 58, lean: 10, head: 2, lThigh: 8, lShin: -8, rThigh: -8, rShin: -6, lArm: 20, lFore: 30, rArm: 16, rFore: 34, bat: 16 });

function nonStrikerBowlingAt(t: number): ActorFrame {
  const backUp = progress(t, 1500, BOWLING_T.QUESTION, easeInOutQuad);
  return { pose: NON_STRIKER_IDLE, x: lerp(SCENE.NON_STRIKER_X, SCENE.NON_STRIKER_X + 14, backUp), gy: SCENE.NON_STRIKER_GY, dir: 1 };
}

const NON_STRIKER_REST = nonStrikerBowlingAt(BOWLING_T.QUESTION);

function nonStrikerResultAt(kind: ResultKind, t: number): ActorFrame {
  if (kind === 'two') return runnerAt(t, NON_STRIKER_REST.x, SCENE.STRIKER_STUMPS_X - 50, 1, NON_STRIKER_IDLE, undefined, SCENE.NON_STRIKER_GY);
  return NON_STRIKER_REST;
}

const KEEPER_CROUCH = pose({ hipH: 34, lean: 40, head: -10, lThigh: 55, lShin: -105, rThigh: 45, rShin: -95, lArm: 62, lFore: 26, rArm: 58, rFore: 30, bat: 0 });
const KEEPER_COLLECT = pose({ hipH: 52, lean: 20, head: -6, lThigh: 20, lShin: -30, rThigh: -12, rShin: -16, lArm: 72, lFore: 8, rArm: 68, rFore: 12, bat: 0 });
const KEEPER_APPEAL = pose({ hipH: 60, lean: -6, head: -12, lThigh: -8, lShin: -20, rThigh: 8, rShin: -20, lArm: 170, lFore: -10, rArm: 165, rFore: -10, bat: 0 });

const KEEPER_BASE: ActorFrame = { pose: KEEPER_CROUCH, x: SCENE.KEEPER_X, gy: G, dir: -1 };

function keeperResultAt(kind: ResultKind, t: number): ActorFrame {
  if (kind === 'bowled') {
    const p = progress(t, 320, 700, easeOutQuad);
    const hop = progress(t, 320, 900);
    const pz = blendPose(KEEPER_CROUCH, KEEPER_APPEAL, p);
    pz.bob = -16 * Math.sin(Math.PI * hop);
    return { ...KEEPER_BASE, pose: pz };
  }
  if (kind === 'caught') {
    const p = progress(t, 1350, 1750, easeOutQuad);
    return { ...KEEPER_BASE, pose: blendPose(KEEPER_CROUCH, KEEPER_APPEAL, p) };
  }
  if (kind === 'two') {
    const p = progress(t, 2200, 2450, easeInOutQuad);
    return { ...KEEPER_BASE, pose: blendPose(KEEPER_CROUCH, KEEPER_COLLECT, p) };
  }
  return KEEPER_BASE;
}

const FIELDER_IDLE = pose({ hipH: 52, lean: 22, head: 0, lThigh: 22, lShin: -30, rThigh: -18, rShin: -22, lArm: 40, lFore: 40, rArm: 36, rFore: 44, bat: 0 });
const FIELDER_PICK = pose({ hipH: 32, lean: 64, head: 10, lThigh: 40, lShin: -50, rThigh: -30, rShin: -50, lArm: 74, lFore: 16, rArm: 78, rFore: 16, bat: 0 });
const FIELDER_LOAD = pose({ hipH: 56, lean: -8, head: 0, lThigh: 28, lShin: -20, rThigh: -26, rShin: -28, lArm: 120, lFore: -20, rArm: -70, rFore: 10, bat: 0 });
const FIELDER_THROW = pose({ hipH: 54, lean: 30, head: 4, lThigh: 30, lShin: -10, rThigh: -20, rShin: -36, lArm: -20, lFore: 40, rArm: -200, rFore: -6, bat: 0 });
const FIELDER_FOLLOW = pose({ hipH: 54, lean: 34, head: 8, lThigh: 24, lShin: -16, rThigh: 20, rShin: -34, lArm: -20, lFore: 40, rArm: -300, rFore: 20, bat: 0 });
const FIELDER_ARMS_UP = pose({ hipH: 60, lean: -2, head: -30, lThigh: 10, lShin: -10, rThigh: -10, rShin: -8, lArm: 175, lFore: -6, rArm: 170, rFore: -6, bat: 0 });
const FIELDER_HOLD = pose({ hipH: 58, lean: 8, head: 0, lThigh: 10, lShin: -10, rThigh: -10, rShin: -8, lArm: 50, lFore: 96, rArm: 46, rFore: 100, bat: 0 });
const FIELDER_CELEBRATE = pose({ hipH: 60, lean: -6, head: -16, lThigh: -8, lShin: -34, rThigh: 8, rShin: -34, lArm: 172, lFore: -12, rArm: 166, rFore: -12, bat: 0 });
const FIELDER_LOOK_UP = { ...FIELDER_IDLE, head: -32, lean: 6, lArm: 30, lFore: 100, rArm: 30, rFore: 100 };
const FIELDER_LOOK_DOWN = { ...FIELDER_IDLE, head: 26, lean: 30 };

const FIELDER_DEEP: ActorFrame = { pose: FIELDER_IDLE, x: SCENE.DEEP_FIELDER.x, gy: SCENE.DEEP_FIELDER.gy, dir: 1 };

const fielderTwoKF: Keyframe<Pose>[] = [
  { t: 1350, v: FIELDER_IDLE },
  { t: 1470, v: FIELDER_PICK, ease: easeOutQuad },
  { t: 1560, v: FIELDER_LOAD },
  { t: 1650, v: FIELDER_THROW, ease: easeInCubic },
  { t: 1900, v: FIELDER_FOLLOW, ease: easeOutQuad },
  { t: 2400, v: FIELDER_IDLE },
];

function fielderResultAt(kind: ResultKind, t: number): ActorFrame {
  switch (kind) {
    case 'two': {
      const target = { x: 236, gy: 328 };
      if (t < 1000) return FIELDER_DEEP;
      if (t < 1350) {
        const p = progress(t, 1000, 1350, easeInOutQuad);
        const run = runCycle(runPhase(t), 0.7);
        return { pose: blendPose(run, FIELDER_IDLE, progress(t, 1250, 1350)), x: lerp(FIELDER_DEEP.x, target.x, p), gy: lerp(FIELDER_DEEP.gy, target.gy, p), dir: 1 };
      }
      return { pose: sampleKeyframes(fielderTwoKF, t), x: target.x, gy: target.gy, dir: 1 };
    }
    case 'four': {
      const p = progress(t, 320, 1500, easeInOutQuad);
      const run = runCycle(runPhase(t), 0.8);
      const settle = progress(t, 1400, 1650);
      return { pose: blendPose(run, FIELDER_LOOK_DOWN, settle), x: lerp(FIELDER_DEEP.x, 96, p), gy: lerp(FIELDER_DEEP.gy, 372, p), dir: -1 };
    }
    case 'six': {
      const p = progress(t, 400, 900, easeInOutQuad);
      return { ...FIELDER_DEEP, pose: blendPose(FIELDER_IDLE, FIELDER_LOOK_UP, p) };
    }
    case 'caught': {
      const move = progress(t, 350, 950, easeInOutQuad);
      const x = lerp(SCENE.CATCH_FIELDER_START.x, SCENE.CATCH_FIELDER.x, move);
      const gy = lerp(SCENE.CATCH_FIELDER_START.gy, SCENE.CATCH_FIELDER.gy, move);
      let p: Pose;
      if (t < 950) {
        const run = runCycle(runPhase(t), 0.6);
        p = blendPose(run, FIELDER_ARMS_UP, progress(t, 800, 950));
      } else if (t < 1350) {
        p = FIELDER_ARMS_UP;
      } else if (t < 1550) {
        p = blendPose(FIELDER_ARMS_UP, FIELDER_HOLD, progress(t, 1350, 1550, easeOutQuad));
      } else if (t < 2150) {
        const jump = progress(t, 1600, 2150);
        p = blendPose(FIELDER_HOLD, FIELDER_CELEBRATE, easeOutQuad(Math.min(1, jump * 2.5)));
        p.bob = -24 * Math.sin(Math.PI * jump);
      } else {
        p = FIELDER_CELEBRATE;
      }
      return { pose: p, x, gy, dir: 1 };
    }
    case 'bowled':
    default:
      return FIELDER_DEEP;
  }
}

/* ------------------------------------------------------------------ */
/* Key points computed from the poses (guarantees bat-ball contact)     */
/* ------------------------------------------------------------------ */

const releasePoint = (): BallPoint => {
  const b = bowlerAt(BOWLING_T.RELEASE);
  return toBall(solveFigure(b.pose, b.x, b.gy, b.dir).rHand, b.gy);
};

const contactPoint = (kind: ResultKind): BallPoint => {
  const a = batsmanResultAt(kind, RESULT_T[kind].contact);
  return toBall(solveFigure(a.pose, a.x, a.gy, a.dir).batMid, a.gy);
};

const catchPoint = (): BallPoint => {
  const f = fielderResultAt('caught', 1350);
  const g = solveFigure(f.pose, f.x, f.gy, f.dir);
  return toBall(handsMid(g.lHand, g.rHand), f.gy);
};

const throwPoint = (): BallPoint => {
  const f = fielderResultAt('two', 1650);
  return toBall(solveFigure(f.pose, f.x, f.gy, f.dir).rHand, f.gy);
};

const keeperHands = (): BallPoint => {
  const k = keeperResultAt('two', 2500);
  const g = solveFigure(k.pose, k.x, k.gy, k.dir);
  return toBall(handsMid(g.lHand, g.rHand), k.gy);
};

/* ------------------------------------------------------------------ */
/* Ball tracks                                                          */
/* ------------------------------------------------------------------ */

let bowlingTrackCache: BallTrack | null = null;
function bowlingTrack(): BallTrack {
  if (bowlingTrackCache) return bowlingTrackCache;
  const rel = releasePoint();
  bowlingTrackCache = buildTrack([
    { start: BOWLING_T.RELEASE, end: BOWLING_T.PITCH, path: arcPath(rel, SCENE.PITCH_POINT, TRAJECTORY.deliveryArc) },
    {
      start: BOWLING_T.PITCH,
      end: BOWLING_T.QUESTION,
      path: {
        at: (p) => ({
          x: lerp(SCENE.PITCH_POINT.x, SCENE.FREEZE_POINT.x, p),
          gy: G,
          h: SCENE.FREEZE_POINT.h * easeOutQuad(p),
        }),
      },
    },
  ]);
  return bowlingTrackCache;
}

const resultTrackCache: Partial<Record<ResultKind, BallTrack>> = {};
function resultTrack(kind: ResultKind): BallTrack {
  const cached = resultTrackCache[kind];
  if (cached) return cached;
  const F = SCENE.FREEZE_POINT;
  const T = RESULT_T[kind];
  let track: BallTrack;
  switch (kind) {
    case 'six': {
      const C = contactPoint('six');
      track = buildTrack([
        { start: 0, end: T.contact, path: arcPath(F, C, 0) },
        { start: T.contact, end: 1950, path: calculateBallPath('six', C, { x: -70, gy: G, h: 190 }) },
      ]);
      break;
    }
    case 'four': {
      const C = contactPoint('four');
      track = buildTrack([
        { start: 0, end: T.contact, path: arcPath(F, C, 0) },
        { start: T.contact, end: 1500, path: calculateBallPath('four', C, { x: -24, gy: 404, h: 0 }) },
      ]);
      break;
    }
    case 'two': {
      const C = contactPoint('two');
      const LAND: BallPoint = { x: 332, gy: 336, h: 0 };
      const REST: BallPoint = { x: 250, gy: 329, h: 0 };
      track = buildTrack([
        { start: 0, end: T.contact, path: arcPath(F, C, 0) },
        { start: T.contact, end: 960, path: calculateBallPath('two', C, LAND) },
        { start: 960, end: 1320, path: groundRunPath(LAND, REST, 5, 2) },
        { start: 1320, end: 1450, path: holdPath(REST) },
        { start: 1650, end: 2500, path: calculateBallPath('throw', throwPoint(), keeperHands()) },
      ]);
      break;
    }
    case 'bowled': {
      const HIT: BallPoint = { x: SCENE.STRIKER_STUMPS_X, gy: G, h: 18 };
      track = buildTrack([
        { start: 0, end: T.contact, path: calculateBallPath('bowled', F, HIT) },
        { start: T.contact, end: 640, path: arcPath(HIT, { x: 836, gy: 403, h: 0 }, 24) },
      ]);
      break;
    }
    case 'caught':
    default: {
      const C = contactPoint('caught');
      track = buildTrack([
        { start: 0, end: T.contact, path: arcPath(F, C, 0) },
        { start: T.contact, end: 1350, path: calculateBallPath('caught', C, catchPoint()) },
      ]);
      break;
    }
  }
  resultTrackCache[kind] = track;
  return track;
}

/* ------------------------------------------------------------------ */
/* Stumps (bowled)                                                      */
/* ------------------------------------------------------------------ */

function stumpsBowledAt(t: number): StumpsFrame {
  const hit = RESULT_T.bowled.contact;
  if (t < hit) return INTACT_STUMPS;
  const pa = progress(t, hit, hit + 480);
  const pb = progress(t, hit, hit + 380);
  return {
    middleTilt: 58 * easeOutCubic(progress(t, hit, hit + 320)),
    offTilt: 18 * easeOutCubic(progress(t, hit, hit + 280)),
    bails: [
      { dx: 36 * pa, dy: -48 * Math.sin(Math.PI * pa) + 30 * pa, rot: 400 * pa },
      { dx: 18 * pb, dy: -30 * Math.sin(Math.PI * pb) + 30 * pb, rot: -260 * pb },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Banners                                                              */
/* ------------------------------------------------------------------ */

const BANNERS: Record<ResultKind, BannerFrame> = {
  six: { kind: 'six', title: 'SIX!', subtitle: 'Maximum! Into the stands' },
  four: { kind: 'four', title: 'FOUR!', subtitle: 'Races away to the boundary' },
  two: { kind: 'two', title: 'TWO RUNS', subtitle: 'Good running between the wickets' },
  bowled: { kind: 'wicket', title: 'WICKET!', subtitle: 'Bowled him!' },
  caught: { kind: 'wicket', title: 'WICKET!', subtitle: 'Caught in the field' },
};

/* ------------------------------------------------------------------ */
/* Frame builders                                                       */
/* ------------------------------------------------------------------ */

function bowlingState(t: number): AnimationState {
  if (t <= 0) return 'IDLE';
  if (t < BOWLING_T.RUNUP_END) return 'BOWLER_RUNUP';
  if (t < BOWLING_T.RELEASE) return 'BALL_RELEASE';
  if (t < BOWLING_T.PITCH) return 'BALL_TRAVEL';
  if (t < BOWLING_T.QUESTION) return 'BALL_PITCH';
  return 'QUESTION_ACTIVE';
}

/** Frame for the delivery. `t` is clamped to BOWLING_T.QUESTION (the freeze point). */
export function computeBowlingFrame(rawT: number): Frame {
  const t = Math.min(rawT, BOWLING_T.QUESTION);
  const bowler = bowlerAt(t);
  const batsman = batsmanBowlingAt(t);
  let ball: BallPoint;
  if (t < BOWLING_T.RELEASE) {
    const g = solveFigure(bowler.pose, bowler.x, bowler.gy, bowler.dir);
    ball = toBall(g.rHand, bowler.gy);
  } else {
    ball = sampleTrack(bowlingTrack(), t);
  }
  return {
    state: bowlingState(t),
    stage: null,
    bowler,
    batsman,
    nonStriker: nonStrikerBowlingAt(t),
    keeper: KEEPER_BASE,
    fielder: FIELDER_DEEP,
    ball,
    ballVisible: true,
    trail: [],
    stumps: INTACT_STUMPS,
    impact: null,
    shake: false,
    frozen: t >= BOWLING_T.QUESTION,
    banner: null,
  };
}

/** Frame for a result. `t` runs from 0 to resultDuration(kind). */
export function computeResultFrame(kind: ResultKind, rawT: number): Frame {
  const T = RESULT_T[kind];
  const t = Math.min(rawT, T.end);
  const bowler = bowlerResultAt(kind, t);
  const batsman = batsmanResultAt(kind, t);
  const nonStriker = nonStrikerResultAt(kind, t);
  const keeper = keeperResultAt(kind, t);
  const fielder = fielderResultAt(kind, t);

  // Ball: attached to a hand in some windows, otherwise on its track.
  let ball: BallPoint;
  let ballVisible = true;
  if (kind === 'two' && t >= 1450 && t < 1650) {
    const g = solveFigure(fielder.pose, fielder.x, fielder.gy, fielder.dir);
    ball = toBall(g.rHand, fielder.gy);
  } else if (kind === 'two' && t >= 2500) {
    const g = solveFigure(keeper.pose, keeper.x, keeper.gy, keeper.dir);
    ball = toBall(handsMid(g.lHand, g.rHand), keeper.gy);
  } else if (kind === 'caught' && t >= 1350) {
    const g = solveFigure(fielder.pose, fielder.x, fielder.gy, fielder.dir);
    ball = toBall(handsMid(g.lHand, g.rHand), fielder.gy);
  } else {
    ball = sampleTrack(resultTrack(kind), t);
    if (kind === 'six' && t >= 1950) ballVisible = false;
  }

  // Ghost trail for the two boundary shots.
  const trail: BallPoint[] = [];
  if ((kind === 'six' || kind === 'four') && t > T.contact + 40 && ballVisible) {
    for (let k = 1; k <= 5; k++) {
      const tt = t - k * 28;
      if (tt > T.contact) trail.push(sampleTrack(resultTrack(kind), tt));
    }
  }

  // Impact burst + camera shake.
  const impactStart = T.contact;
  let impact: Frame['impact'] = null;
  if (t >= impactStart && t < impactStart + 240) {
    const at = kind === 'bowled' ? { x: SCENE.STRIKER_STUMPS_X, gy: G, h: 18 } : contactPoint(kind);
    impact = { x: at.x, y: at.gy - at.h, p: progress(t, impactStart, impactStart + 240) };
  }
  const shake = (kind === 'six' || kind === 'four' || kind === 'bowled') && t >= impactStart && t < impactStart + 220;

  const stumps = kind === 'bowled' ? stumpsBowledAt(t) : INTACT_STUMPS;

  let state: AnimationState;
  let stage: ResultStage;
  if (t < 120) {
    state = 'ANSWER_RECEIVED';
    stage = null;
  } else if (t >= T.end) {
    state = 'RESULT_COMPLETE';
    stage = null;
  } else {
    state = 'RESULT_ANIMATION';
    if (kind === 'bowled' || kind === 'caught') stage = 'WICKET_ANIMATION';
    else stage = t < T.banner ? 'BATTING_ANIMATION' : 'SHOT_RESULT';
  }

  return {
    state,
    stage,
    bowler,
    batsman,
    nonStriker,
    keeper,
    fielder,
    ball,
    ballVisible,
    trail,
    stumps,
    impact,
    shake,
    frozen: false,
    banner: t >= T.banner ? BANNERS[kind] : null,
  };
}

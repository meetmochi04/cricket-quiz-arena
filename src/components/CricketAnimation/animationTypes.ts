/**
 * Public types for the CricketAnimation system.
 *
 * The parent page (FirstInningsPage / SecondInningsPage) owns ALL game logic.
 * The animation only reacts to `phase` + `result` and reports back through callbacks.
 */

/** What the game is currently doing. Owned by the parent page. */
export type GamePhase = 'bowling' | 'question' | 'result';

/** Result decided by the EXISTING game logic. Never calculated here. */
export type BallResult = 'six' | 'four' | 'two' | 'wicket';

/** Visual variation for a wicket. Picked randomly unless forced through props. */
export type WicketType = 'bowled' | 'caught';

/** Internal animation state machine (also exposed through onStateChange). */
export type AnimationState =
  | 'IDLE'
  | 'BOWLER_RUNUP'
  | 'BALL_RELEASE'
  | 'BALL_TRAVEL'
  | 'BALL_PITCH'
  | 'QUESTION_ACTIVE'
  | 'ANSWER_RECEIVED'
  | 'RESULT_ANIMATION'
  | 'RESULT_COMPLETE';

/** Sub-state while in RESULT_ANIMATION. */
export type ResultStage = 'BATTING_ANIMATION' | 'SHOT_RESULT' | 'WICKET_ANIMATION' | null;

export interface CricketAnimationProps {
  /**
   * Unique value per delivery (ball number, question index, etc.).
   * Changing it restarts the whole sequence from the bowler run-up.
   */
  ballKey: number | string;
  /** "bowling" -> play delivery, "question" -> hold, "result" -> play the result. */
  phase: GamePhase;
  /** Result from the existing game logic. Only used when phase === "result". */
  result: BallResult | null;
  /** Force a wicket style. Omit for a random choice per ball. */
  wicketType?: WicketType;
  /** Fired ONCE per ballKey when the ball reaches the batting area. Start the quiz timer here. */
  onQuestionReady?: () => void;
  /** Fired ONCE per ballKey when the result animation has finished. Start the next ball here. */
  onAnimationComplete?: (result: BallResult) => void;
  /** Optional: observe the internal state machine (debug panels, commentary hooks). */
  onStateChange?: (state: AnimationState, stage: ResultStage) => void;
  /** Shirt colour of the batting side (defaults to blue). */
  battingTeamColor?: string;
  /** Shirt colour of the bowling side (defaults to yellow). */
  bowlingTeamColor?: string;
  /** Show a small state label in the corner (useful while testing). */
  showStateLabel?: boolean;
  className?: string;
}

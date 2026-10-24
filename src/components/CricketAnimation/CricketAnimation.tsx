import { useEffect, useMemo, useRef } from 'react';
import type { AnimationState, BallResult, CricketAnimationProps, ResultStage, WicketType } from './animationTypes';
import { useSegmentClock } from './useSegmentClock';
import {
  BOWLING_T,
  computeBowlingFrame,
  computeResultFrame,
  resultDuration,
  resultKind,
  type Frame,
} from './sequences';
import { CricketScene } from './CricketScene';
import './CricketAnimation.css';

const DEFAULT_BATTING = '#1d4ed8';
const DEFAULT_BOWLING = '#eab308';

/**
 * CricketAnimation
 *
 * A self-contained 2D cricket delivery renderer. The parent owns the game logic and drives this
 * component with `phase` + `result`; the component reports back with `onQuestionReady` and
 * `onAnimationComplete` (each fired exactly once per `ballKey`).
 */
export function CricketAnimation({
  ballKey,
  phase,
  result,
  wicketType,
  onQuestionReady,
  onAnimationComplete,
  onStateChange,
  battingTeamColor = DEFAULT_BATTING,
  bowlingTeamColor = DEFAULT_BOWLING,
  showStateLabel = false,
  className,
}: CricketAnimationProps) {
  const key = String(ballKey);

  /* ---- pick a wicket style once per ball (stable across re-renders / StrictMode) ---- */
  const wicketRef = useRef<{ key: string; type: WicketType } | null>(null);
  if (wicketRef.current === null || wicketRef.current.key !== key) {
    wicketRef.current = { key, type: wicketType ?? (Math.random() < 0.5 ? 'bowled' : 'caught') };
  }
  const chosenWicket: WicketType = wicketType ?? wicketRef.current.type;

  /* ---- which segment is playing ---- */
  const inResult = phase === 'result' && result !== null;
  const kind = inResult ? resultKind(result, chosenWicket) : null;
  const segmentId = inResult ? `${key}:result:${kind}` : `${key}:bowling`;
  const duration = kind ? resultDuration(kind) : BOWLING_T.QUESTION;
  const running = inResult || phase === 'bowling';

  const elapsed = useSegmentClock(segmentId, running, duration);

  /* ---- frame ---- */
  const frame: Frame = useMemo(() => {
    if (kind) return computeResultFrame(kind, elapsed);
    // If the parent says the question is already active (e.g. restored session), jump to the freeze point.
    const t = phase === 'bowling' ? elapsed : BOWLING_T.QUESTION;
    return computeBowlingFrame(t);
  }, [kind, elapsed, phase]);

  /* ---- callbacks: latest refs + once-per-ball guards ---- */
  const questionReadyRef = useRef(onQuestionReady);
  const completeRef = useRef(onAnimationComplete);
  const stateChangeRef = useRef(onStateChange);
  useEffect(() => {
    questionReadyRef.current = onQuestionReady;
    completeRef.current = onAnimationComplete;
    stateChangeRef.current = onStateChange;
  });

  const firedRef = useRef<{ key: string; question: boolean; complete: boolean }>({ key, question: false, complete: false });
  if (firedRef.current.key !== key) firedRef.current = { key, question: false, complete: false };

  useEffect(() => {
    if (kind) return;
    if (phase !== 'bowling') return;
    if (elapsed >= BOWLING_T.QUESTION && !firedRef.current.question) {
      firedRef.current.question = true;
      questionReadyRef.current?.();
    }
  }, [elapsed, kind, phase]);

  useEffect(() => {
    if (!kind || !result) return;
    if (elapsed >= duration && !firedRef.current.complete) {
      firedRef.current.complete = true;
      completeRef.current?.(result);
    }
  }, [elapsed, kind, duration, result]);

  const lastStateRef = useRef<{ state: AnimationState; stage: ResultStage } | null>(null);
  useEffect(() => {
    const prev = lastStateRef.current;
    if (!prev || prev.state !== frame.state || prev.stage !== frame.stage) {
      lastStateRef.current = { state: frame.state, stage: frame.stage };
      stateChangeRef.current?.(frame.state, frame.stage);
    }
  }, [frame.state, frame.stage]);

  const stateLabel = showStateLabel
    ? `${frame.state}${frame.stage ? ` · ${frame.stage}` : ''}${kind ? ` · ${kind.toUpperCase()}` : ''}`
    : null;

  return (
    <CricketScene
      frame={frame}
      battingTeamColor={battingTeamColor}
      bowlingTeamColor={bowlingTeamColor}
      bannerKey={`${key}:${frame.banner?.title ?? ''}`}
      stateLabel={stateLabel}
      className={className}
    />
  );
}

export type { BallResult };

export default CricketAnimation;
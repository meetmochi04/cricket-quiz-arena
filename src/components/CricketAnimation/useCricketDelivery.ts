import { useCallback, useState } from 'react';
import type { BallResult, GamePhase } from './animationTypes';

export interface DeliveryState {
  ballKey: number;
  phase: GamePhase;
  result: BallResult | null;
}

/**
 * Optional helper for the parent page. Keeps ballKey / phase / result consistent so the
 * existing innings logic only has to call three functions at three moments:
 *
 *   startBall()            -> when the next question should be bowled
 *   markQuestionActive()   -> inside onQuestionReady (then start your existing timer)
 *   showResult(result)     -> after the EXISTING game logic decided six/four/two/wicket
 */
export function useCricketDelivery(initialBallKey = 0) {
  const [state, setState] = useState<DeliveryState>({ ballKey: initialBallKey, phase: 'bowling', result: null });

  const startBall = useCallback(() => {
    setState((s) => ({ ballKey: s.ballKey + 1, phase: 'bowling', result: null }));
  }, []);

  const markQuestionActive = useCallback(() => {
    setState((s) => (s.phase === 'bowling' ? { ...s, phase: 'question' } : s));
  }, []);

  const showResult = useCallback((result: BallResult) => {
    setState((s) => ({ ...s, phase: 'result', result }));
  }, []);

  return { ...state, startBall, markQuestionActive, showResult };
}

/**
 * Map the existing game outcome to an animation result.
 * The EXISTING logic still decides runs / wicket; this only translates it.
 */
export function toAnimationResult(runs: number, isWicket: boolean): BallResult {
  if (isWicket) return 'wicket';
  if (runs >= 6) return 'six';
  if (runs >= 4) return 'four';
  return 'two';
}

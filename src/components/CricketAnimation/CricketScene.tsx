import type { Frame } from './sequences';
import { SCENE } from './sequences';
import { CricketField } from './CricketField';
import { Stumps } from './Stumps';
import { Figure, shade, type FigureColors } from './Figure';
import { CricketBall, ImpactBurst } from './CricketBall';
import { ResultBanner } from './ResultBanner';

export interface CricketSceneProps {
  frame: Frame;
  battingTeamColor: string;
  bowlingTeamColor: string;
  bannerKey: string;
  stateLabel?: string | null;
  className?: string;
}

export function teamColors(shirt: string): FigureColors {
  return { shirt, pants: shade(shirt, -0.35), accent: shade(shirt, -0.15) };
}

/** Pure renderer: draws one Frame. No timers, no state. */
export function CricketScene({ frame, battingTeamColor, bowlingTeamColor, bannerKey, stateLabel, className }: CricketSceneProps) {
  const batting = teamColors(battingTeamColor);
  const bowling = teamColors(bowlingTeamColor);
  const rootClass = ['ca-root', frame.shake ? 'ca-shake' : '', frame.frozen ? 'ca-frozen' : '', className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={rootClass} data-state={frame.state}>
      <svg className="ca-svg" viewBox={`0 0 ${SCENE.W} ${SCENE.H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <CricketField />
        <Figure frame={frame.fielder} colors={bowling} cap />
        <Stumps x={SCENE.BOWLER_STUMPS_X} groundY={SCENE.GROUND} />
        <Figure frame={frame.nonStriker} colors={batting} showBat helmet pads />
        <Figure frame={frame.keeper} colors={bowling} cap gloves pads />
        <Stumps x={SCENE.STRIKER_STUMPS_X} groundY={SCENE.GROUND} frame={frame.stumps} />
        <Figure frame={frame.bowler} colors={bowling} cap />
        <Figure frame={frame.batsman} colors={batting} showBat helmet pads gloves />
        {frame.frozen && <rect className="ca-dim" x={0} y={0} width={SCENE.W} height={SCENE.H} />}
        <CricketBall ball={frame.ball} trail={frame.trail} visible={frame.ballVisible} frozen={frame.frozen} />
        <ImpactBurst impact={frame.impact} />
      </svg>
      <ResultBanner banner={frame.banner} bannerKey={bannerKey} />
      {stateLabel ? <div className="ca-state-label">{stateLabel}</div> : null}
    </div>
  );
}

import type { BallPoint } from './ballPhysics';

interface CricketBallProps {
  ball: BallPoint;
  trail: BallPoint[];
  visible: boolean;
  frozen: boolean;
}

export function CricketBall({ ball, trail, visible, frozen }: CricketBallProps) {
  if (!visible) return null;
  const y = ball.gy - ball.h;
  const scale = 1 + Math.min(0.9, Math.max(0, ball.h) / 320);
  const shadowScale = Math.max(0.3, 1 - ball.h / 260);
  const shadowOpacity = Math.max(0.05, 0.3 - ball.h / 700);
  return (
    <g className="ca-ball-layer">
      <ellipse cx={ball.x} cy={ball.gy + 1} rx={6 * shadowScale} ry={2.4 * shadowScale} fill="#000" opacity={shadowOpacity} />
      {trail.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.gy - p.h} r={5 - i * 0.7} fill="#c62828" opacity={0.28 - i * 0.045} />
      ))}
      {frozen && <circle className="ca-freeze-ring" cx={ball.x} cy={y} r={14} fill="none" stroke="#fff" strokeWidth={2} />}
      <g transform={`translate(${ball.x} ${y}) scale(${scale})`}>
        <circle r={6.5} fill="#c62828" stroke="#7f1d1d" strokeWidth={0.8} />
        <path d="M-3.5 -4 Q0 0 -3.5 4" stroke="#fde68a" strokeWidth={0.9} fill="none" opacity={0.9} />
        <circle cx={-2} cy={-2} r={1.6} fill="#fff" opacity={0.45} />
      </g>
    </g>
  );
}

interface ImpactProps {
  impact: { x: number; y: number; p: number } | null;
}

export function ImpactBurst({ impact }: ImpactProps) {
  if (!impact) return null;
  const { x, y, p } = impact;
  const len = 6 + 22 * p;
  const op = 1 - p;
  return (
    <g opacity={op} className="ca-impact">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        const inner = 6 + 10 * p;
        return <line key={a} x1={x + Math.cos(r) * inner} y1={y + Math.sin(r) * inner} x2={x + Math.cos(r) * (inner + len)} y2={y + Math.sin(r) * (inner + len)} stroke="#fff" strokeWidth={3 - 2 * p} strokeLinecap="round" />;
      })}
      <circle cx={x} cy={y} r={4 + 18 * p} fill="none" stroke="#ffe680" strokeWidth={2.5 - 2 * p} />
    </g>
  );
}

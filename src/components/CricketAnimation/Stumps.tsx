import { memo } from 'react';
import type { StumpsFrame } from './sequences';

interface StumpsProps {
  x: number;
  groundY: number;
  frame?: StumpsFrame;
}

const H = 30;
const W = 4;

function StumpsImpl({ x, groundY, frame }: StumpsProps) {
  const middleTilt = frame?.middleTilt ?? 0;
  const offTilt = frame?.offTilt ?? 0;
  const bails = frame?.bails ?? [
    { dx: 0, dy: 0, rot: 0 },
    { dx: 0, dy: 0, rot: 0 },
  ];
  const top = groundY - H;
  const stump = (sx: number, tilt: number, key: string) => (
    <g key={key} transform={`rotate(${tilt} ${sx} ${groundY})`}>
      <rect x={sx - W / 2} y={top} width={W} height={H} rx={1.5} fill="#f3e2b3" stroke="#8b6b3d" strokeWidth={0.8} />
      <rect x={sx - W / 2} y={top} width={W} height={4} fill="#2563eb" opacity={0.85} />
    </g>
  );
  const bail = (bx: number, b: { dx: number; dy: number; rot: number }, key: string) => (
    <g key={key} transform={`translate(${bx + b.dx} ${top - 2 + b.dy}) rotate(${b.rot})`}>
      <rect x={-4.5} y={-1.5} width={9} height={3} rx={1.5} fill="#f6e7c1" stroke="#8b6b3d" strokeWidth={0.6} />
    </g>
  );
  return (
    <g className="ca-stumps">
      {stump(x - 6, offTilt, 'off')}
      {stump(x, middleTilt, 'mid')}
      {stump(x + 6, 0, 'leg')}
      {bail(x - 3, bails[0], 'b1')}
      {bail(x + 3, bails[1], 'b2')}
    </g>
  );
}

export const Stumps = memo(StumpsImpl);

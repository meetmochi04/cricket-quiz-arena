import { memo } from 'react';
import { LIMB, solveFigure, type Pt } from './rig';
import type { ActorFrame } from './sequences';

export interface FigureColors {
  shirt: string;
  pants: string;
  skin?: string;
  accent?: string;
}

interface FigureProps {
  frame: ActorFrame;
  colors: FigureColors;
  showBat?: boolean;
  helmet?: boolean;
  cap?: boolean;
  pads?: boolean;
  gloves?: boolean;
}

/** Darken/lighten a hex colour by `amt` (-1..1). */
export function shade(hex: string, amt: number): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const line = (a: Pt, b: Pt): string => `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
const poly = (...pts: Pt[]): string => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

function FigureImpl({ frame, colors, showBat, helmet, cap, pads, gloves }: FigureProps) {
  const g = solveFigure(frame.pose, frame.x, frame.gy, frame.dir);
  const skin = colors.skin ?? '#d9a071';
  const shirtDark = shade(colors.shirt, -0.28);
  const pantsDark = shade(colors.pants, -0.28);
  const dir = frame.dir;

  // Bat: dark handle (first 30%) + willow blade.
  const handleEnd: Pt = { x: g.rHand.x + (g.batTip.x - g.rHand.x) * 0.3, y: g.rHand.y + (g.batTip.y - g.rHand.y) * 0.3 };

  return (
    <g className="ca-figure">
      <ellipse cx={g.hip.x} cy={frame.gy + 1} rx={17} ry={4.5} fill="rgba(0,0,0,0.22)" />

      {/* far leg */}
      <path d={poly(g.hip, g.lKnee, g.lFoot)} stroke={pantsDark} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pads && <path d={line(g.lKnee, g.lFoot)} stroke="#e8e6dd" strokeWidth={11} fill="none" strokeLinecap="round" />}
      <circle cx={g.lFoot.x + 3 * dir} cy={g.lFoot.y + 1} r={5} fill="#2b2b2b" />

      {/* far arm */}
      <path d={poly(g.lShoulder, g.lElbow, g.lHand)} stroke={shirtDark} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={g.lHand.x} cy={g.lHand.y} r={4.5} fill={gloves ? '#f2f2f2' : skin} />

      {/* torso */}
      <path d={line(g.hip, g.chest)} stroke={colors.shirt} strokeWidth={18} fill="none" strokeLinecap="round" />
      <path d={line(g.hip, { x: g.hip.x + (g.chest.x - g.hip.x) * 0.35, y: g.hip.y + (g.chest.y - g.hip.y) * 0.35 })} stroke={colors.pants} strokeWidth={18} fill="none" strokeLinecap="round" />

      {/* head */}
      <circle cx={g.headC.x} cy={g.headC.y} r={LIMB.headR} fill={skin} />
      {helmet && (
        <g>
          <path
            d={`M${g.headC.x - 12 * dir} ${g.headC.y + 2} A12 12 0 0 ${dir === 1 ? 1 : 0} ${g.headC.x + 12 * dir} ${g.headC.y + 2} Z`}
            fill={colors.accent ?? colors.shirt}
            stroke={shade(colors.accent ?? colors.shirt, -0.3)}
            strokeWidth={1}
          />
          <path d={`M${g.headC.x + 4 * dir} ${g.headC.y + 2} L${g.headC.x + 16 * dir} ${g.headC.y + 2}`} stroke={shade(colors.accent ?? colors.shirt, -0.3)} strokeWidth={3} strokeLinecap="round" />
          <path d={`M${g.headC.x + 7 * dir} ${g.headC.y + 4} L${g.headC.x + 7 * dir} ${g.headC.y + 12} M${g.headC.x + 11 * dir} ${g.headC.y + 4} L${g.headC.x + 11 * dir} ${g.headC.y + 11}`} stroke="#333" strokeWidth={1.4} />
        </g>
      )}
      {cap && (
        <path
          d={`M${g.headC.x - 11 * dir} ${g.headC.y - 1} A11 11 0 0 ${dir === 1 ? 1 : 0} ${g.headC.x + 11 * dir} ${g.headC.y - 1} L${g.headC.x + 17 * dir} ${g.headC.y} L${g.headC.x - 11 * dir} ${g.headC.y} Z`}
          fill={colors.accent ?? shade(colors.shirt, -0.2)}
        />
      )}

      {/* near leg */}
      <path d={poly(g.hip, g.rKnee, g.rFoot)} stroke={colors.pants} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pads && <path d={line(g.rKnee, g.rFoot)} stroke="#f7f5ec" strokeWidth={11} fill="none" strokeLinecap="round" />}
      <circle cx={g.rFoot.x + 3 * dir} cy={g.rFoot.y + 1} r={5} fill="#2b2b2b" />

      {/* bat (behind the near arm so the hands wrap it) */}
      {showBat && (
        <g>
          <path d={line(g.rHand, g.batTip)} stroke="#6b4a1e" strokeWidth={9} fill="none" strokeLinecap="round" />
          <path d={line(handleEnd, g.batTip)} stroke="#e7c893" strokeWidth={7.5} fill="none" strokeLinecap="round" />
          <path d={line(g.rHand, handleEnd)} stroke="#2a2a2a" strokeWidth={5} fill="none" strokeLinecap="round" />
        </g>
      )}

      {/* near arm */}
      <path d={poly(g.rShoulder, g.rElbow, g.rHand)} stroke={colors.shirt} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={g.rHand.x} cy={g.rHand.y} r={4.5} fill={gloves ? '#f2f2f2' : skin} />
    </g>
  );
}

export const Figure = memo(FigureImpl);

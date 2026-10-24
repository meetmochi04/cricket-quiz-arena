import { memo, useMemo } from 'react';
import { SCENE } from './sequences';

/** Deterministic pseudo random so the crowd never flickers between renders. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const CROWD_COLORS = ['#f4d35e', '#ee964b', '#f95738', '#9ad1d4', '#e0aaff', '#ffffff', '#80ffdb', '#ffadad'];

function CricketFieldImpl() {
  const crowd = useMemo(() => {
    const rnd = seeded(42);
    const dots: { x: number; y: number; c: string; r: number }[] = [];
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 78; i++) {
        const x = 12 + i * 12.7 + rnd() * 5;
        const y = 168 + row * 15 + rnd() * 4;
        dots.push({ x, y, c: CROWD_COLORS[Math.floor(rnd() * CROWD_COLORS.length)], r: 3 + rnd() * 1.5 });
      }
    }
    return dots;
  }, []);

  const G = SCENE.GROUND;

  return (
    <g className="ca-field">
      <defs>
        <linearGradient id="ca-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5fb2ef" />
          <stop offset="1" stopColor="#cfeaff" />
        </linearGradient>
        <linearGradient id="ca-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4fae4f" />
          <stop offset="1" stopColor="#2f8b3a" />
        </linearGradient>
        <linearGradient id="ca-stand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5d6b8a" />
          <stop offset="1" stopColor="#2f3a52" />
        </linearGradient>
        <linearGradient id="ca-pitch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2cd9a" />
          <stop offset="1" stopColor="#cdb37c" />
        </linearGradient>
        <clipPath id="ca-outfield-clip">
          <ellipse cx={500} cy={395} rx={470} ry={168} />
        </clipPath>
      </defs>

      {/* sky */}
      <rect x={0} y={0} width={SCENE.W} height={240} fill="url(#ca-sky)" />
      <circle cx={700} cy={58} r={26} fill="#fff4b0" opacity={0.9} />

      {/* drifting clouds (cosmetic CSS loop) */}
      <g className="ca-cloud ca-cloud--a" opacity={0.9}>
        <ellipse cx={150} cy={70} rx={46} ry={16} fill="#fff" />
        <ellipse cx={180} cy={60} rx={30} ry={20} fill="#fff" />
        <ellipse cx={120} cy={64} rx={26} ry={16} fill="#fff" />
      </g>
      <g className="ca-cloud ca-cloud--b" opacity={0.85}>
        <ellipse cx={560} cy={96} rx={40} ry={13} fill="#fff" />
        <ellipse cx={585} cy={88} rx={26} ry={17} fill="#fff" />
      </g>

      {/* floodlights */}
      {[120, 880].map((x) => (
        <g key={x}>
          <rect x={x - 3} y={60} width={6} height={110} fill="#8b95a8" />
          <rect x={x - 22} y={46} width={44} height={20} rx={3} fill="#e8eef7" stroke="#8b95a8" strokeWidth={2} />
          <g fill="#fff9c4">
            {[0, 1, 2, 3].map((i) => (
              <circle key={i} cx={x - 15 + i * 10} cy={56} r={3} />
            ))}
          </g>
        </g>
      ))}

      {/* stands */}
      <path d={`M0 240 L0 160 Q500 128 ${SCENE.W} 160 L${SCENE.W} 240 Z`} fill="url(#ca-stand)" />
      <path d={`M0 160 Q500 128 ${SCENE.W} 160`} stroke="#c9d2e4" strokeWidth={5} fill="none" />
      <g>
        {crowd.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y - (Math.abs(d.x - 500) / 500) * -14} r={d.r} fill={d.c} opacity={0.85} />
        ))}
      </g>
      {/* advertising boards */}
      <rect x={0} y={228} width={SCENE.W} height={16} fill="#1f2a44" />
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={i * 100 + 6} y={231} width={88} height={10} rx={2} fill={i % 2 ? '#3b82f6' : '#f59e0b'} opacity={0.85} />
      ))}

      {/* outer grass (beyond the rope) */}
      <rect x={0} y={244} width={SCENE.W} height={SCENE.H - 244} fill="#2b7a33" />

      {/* outfield with mowing stripes */}
      <g clipPath="url(#ca-outfield-clip)">
        <rect x={0} y={200} width={SCENE.W} height={400} fill="url(#ca-grass)" />
        {Array.from({ length: 17 }).map((_, i) => (
          <rect key={i} x={i * 60} y={200} width={30} height={400} fill="#000" opacity={0.06} />
        ))}
      </g>

      {/* boundary rope */}
      <ellipse cx={500} cy={395} rx={470} ry={168} fill="none" stroke="#123" strokeWidth={7} opacity={0.35} />
      <ellipse cx={500} cy={395} rx={470} ry={168} fill="none" stroke="#fff" strokeWidth={4} />
      <ellipse cx={500} cy={395} rx={470} ry={168} fill="none" stroke="#ef4444" strokeWidth={4} strokeDasharray="22 26" opacity={0.8} />

      {/* pitch strip with slight perspective */}
      <path d={`M300 ${G - 15} L${SCENE.W - 200} ${G - 15} L${SCENE.W - 194} ${G + 17} L294 ${G + 17} Z`} fill="url(#ca-pitch)" stroke="#b79b62" strokeWidth={1} />
      <rect x={300} y={G - 6} width={500} height={12} fill="#fff" opacity={0.1} />

      {/* creases */}
      <g stroke="#fff" strokeWidth={2.2} strokeLinecap="round" opacity={0.95}>
        <path d={`M${SCENE.BOWLER_STUMPS_X} ${G - 13} L${SCENE.BOWLER_STUMPS_X} ${G + 13}`} />
        <path d={`M380 ${G - 15} L380 ${G + 16}`} />
        <path d={`M${SCENE.STRIKER_STUMPS_X} ${G - 13} L${SCENE.STRIKER_STUMPS_X} ${G + 13}`} />
        <path d={`M720 ${G - 15} L720 ${G + 16}`} />
        <path d={`M380 ${G - 15} L332 ${G - 15} M380 ${G + 16} L332 ${G + 16}`} />
        <path d={`M720 ${G - 15} L768 ${G - 15} M720 ${G + 16} L768 ${G + 16}`} />
      </g>
    </g>
  );
}

export const CricketField = memo(CricketFieldImpl);

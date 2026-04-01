import React from 'react';

interface WindCompassProps {
  direction: number;
  speed: number;
}

export function WindCompass({ direction: fromDirection, speed }: WindCompassProps) {
  const direction = (fromDirection + 180) % 360;
  const cardinals = [
    { label: 'N', angle: 0 },
    { label: 'NE', angle: 45 },
    { label: 'E', angle: 90 },
    { label: 'SE', angle: 135 },
    { label: 'S', angle: 180 },
    { label: 'SW', angle: 225 },
    { label: 'W', angle: 270 },
    { label: 'NW', angle: 315 },
  ];

  const r = 82;

  return (
    <div className="relative w-44 h-44">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <radialGradient id="compass-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0fdfa" />
            <stop offset="100%" stopColor="#f8fafc" />
          </radialGradient>
          <filter id="arrow-glow">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00afd7" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Background disc */}
        <circle cx="100" cy="100" r="92" fill="url(#compass-bg)" stroke="#e2e8f0" strokeWidth="1" />

        {/* Degree ticks */}
        {Array.from({ length: 72 }).map((_, i) => {
          const angle = i * 5;
          const isMajor = angle % 90 === 0;
          const isMid = angle % 45 === 0 && !isMajor;
          const isMinor = angle % 15 === 0 && !isMajor && !isMid;
          if (!isMajor && !isMid && !isMinor && angle % 5 !== 0) return null;
          const len = isMajor ? 12 : isMid ? 8 : isMinor ? 6 : 3;
          const r1 = 92 - len;
          const r2 = 92;
          const rad = (angle - 90) * Math.PI / 180;
          const opacity = isMajor ? 0.6 : isMid ? 0.4 : 0.2;
          const width = isMajor ? 2 : 1;
          return (
            <line
              key={i}
              x1={100 + r1 * Math.cos(rad)}
              y1={100 + r1 * Math.sin(rad)}
              x2={100 + r2 * Math.cos(rad)}
              y2={100 + r2 * Math.sin(rad)}
              stroke="#94a3b8"
              strokeWidth={width}
              opacity={opacity}
            />
          );
        })}

        {/* Inner ring */}
        <circle cx="100" cy="100" r="62" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />

        {/* Cardinal & intercardinal labels */}
        {cardinals.map(({ label, angle }) => {
          const rad = (angle - 90) * Math.PI / 180;
          const labelR = label.length === 1 ? 74 : 72;
          const x = 100 + labelR * Math.cos(rad);
          const y = 100 + labelR * Math.sin(rad);
          const isMajor = label.length === 1;
          return (
            <text
              key={label}
              x={x}
              y={y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              className={isMajor ? 'fill-gray-600' : 'fill-gray-400'}
              fontSize={isMajor ? 13 : 10}
              fontWeight={isMajor ? 700 : 500}
            >
              {label}
            </text>
          );
        })}

        {/* Wind arc trail */}
        {(() => {
          const rad = (direction - 90) * Math.PI / 180;
          const arcR = 50;
          const startAngle = direction - 25;
          const endAngle = direction + 25;
          const start = (startAngle - 90) * Math.PI / 180;
          const end = (endAngle - 90) * Math.PI / 180;
          return (
            <path
              d={`M ${100 + arcR * Math.cos(start)} ${100 + arcR * Math.sin(start)} A ${arcR} ${arcR} 0 0 1 ${100 + arcR * Math.cos(end)} ${100 + arcR * Math.sin(end)}`}
              fill="none"
              stroke="#00afd7"
              strokeWidth="2"
              opacity="0.15"
              strokeLinecap="round"
            />
          );
        })()}

        {/* Arrow */}
        <g transform={`rotate(${direction}, 100, 100)`} filter="url(#arrow-glow)">
          {/* Arrow shaft */}
          <line x1="100" y1="58" x2="100" y2="140" stroke="#00afd7" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
          <line x1="100" y1="58" x2="100" y2="100" stroke="#00afd7" strokeWidth="2.5" strokeLinecap="round" />
          {/* Arrow head */}
          <polygon points="100,34 93,56 100,50 107,56" fill="#00afd7" />
          {/* Tail */}
          <circle cx="100" cy="140" r="2.5" fill="#00afd7" opacity="0.3" />
        </g>

        {/* Center circle with speed */}
        <circle cx="100" cy="100" r="22" fill="white" stroke="#e2e8f0" strokeWidth="1" />
        <text x="100" y="96" textAnchor="middle" dominantBaseline="central" className="fill-gray-900" fontSize="16" fontWeight="800">
          {speed}
        </text>
        <text x="100" y="111" textAnchor="middle" dominantBaseline="central" className="fill-gray-400" fontSize="8" fontWeight="600">
          KTS
        </text>
      </svg>
    </div>
  );
}

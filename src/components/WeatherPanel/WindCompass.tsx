import React from 'react';

interface WindCompassProps {
  direction: number;
  speed: number;
}

export function WindCompass({ direction, speed }: WindCompassProps) {
  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Outer circle */}
        <circle cx="100" cy="100" r="88" fill="none" stroke="#e5e7eb" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4 4" />

        {/* Cardinal labels */}
        <text x="100" y="22" textAnchor="middle" className="fill-gray-400 font-bold" fontSize="14">N</text>
        <text x="100" y="190" textAnchor="middle" className="fill-gray-400 font-bold" fontSize="14">S</text>
        <text x="15" y="105" textAnchor="middle" className="fill-gray-400 font-bold" fontSize="14">W</text>
        <text x="185" y="105" textAnchor="middle" className="fill-gray-400 font-bold" fontSize="14">E</text>

        {/* Ticks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = i * 10;
          const isMajor = angle % 90 === 0;
          const isMinor = angle % 30 === 0;
          if (!isMajor && !isMinor) return null;
          const len = isMajor ? 10 : 6;
          const r1 = 88 - len;
          const r2 = 88;
          const rad = (angle - 90) * Math.PI / 180;
          return (
            <line
              key={i}
              x1={100 + r1 * Math.cos(rad)}
              y1={100 + r1 * Math.sin(rad)}
              x2={100 + r2 * Math.cos(rad)}
              y2={100 + r2 * Math.sin(rad)}
              stroke={isMajor ? '#9ca3af' : '#d1d5db'}
              strokeWidth={isMajor ? 2 : 1}
            />
          );
        })}

        {/* Wind arrow */}
        <g transform={`rotate(${direction}, 100, 100)`}>
          <line x1="100" y1="100" x2="100" y2="38" stroke="#00afd7" strokeWidth="3" strokeLinecap="round" />
          <polygon points="100,30 94,46 106,46" fill="#00afd7" />
        </g>

        {/* Center dot */}
        <circle cx="100" cy="100" r="4" fill="#1f2937" />
      </svg>
    </div>
  );
}

import React from 'react';
import { TideDay } from '../../types/weather';

interface TideChartProps {
  day: TideDay;
}

export function TideChart({ day }: TideChartProps) {
  if (!day.points.length) return <p className="text-sm text-gray-400 text-center py-4">No tide data</p>;

  // Generate smooth curve from tide points across 24h
  const W = 320;
  const H = 100;
  const PAD_X = 30;
  const PAD_Y = 15;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;

  // Find min/max heights
  const heights = day.points.map(p => p.height);
  const minH = Math.min(...heights) - 0.1;
  const maxH = Math.max(...heights) + 0.1;
  const rangeH = maxH - minH || 1;

  // Convert tide points to coordinates
  const coords = day.points.map(p => {
    const t = new Date(p.time);
    const minutes = t.getHours() * 60 + t.getMinutes();
    const x = PAD_X + (minutes / 1440) * chartW;
    const y = PAD_Y + chartH - ((p.height - minH) / rangeH) * chartH;
    return { x, y, point: p, time: t };
  });

  // Build smooth SVG path using cubic bezier
  let pathD = '';
  if (coords.length >= 2) {
    // Add virtual start/end points for smooth curve
    const allCoords = [
      { x: PAD_X, y: coords[0].y + (coords[0].y - (coords[1]?.y ?? coords[0].y)) * 0.3 },
      ...coords,
      { x: PAD_X + chartW, y: coords[coords.length - 1].y },
    ];

    pathD = `M ${allCoords[0].x} ${allCoords[0].y}`;
    for (let i = 0; i < allCoords.length - 1; i++) {
      const p0 = allCoords[Math.max(0, i - 1)];
      const p1 = allCoords[i];
      const p2 = allCoords[i + 1];
      const p3 = allCoords[Math.min(allCoords.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
  }

  // Current time marker
  const now = new Date();
  const nowDate = day.date;
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = nowDate === todayStr;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowX = PAD_X + (nowMinutes / 1440) * chartW;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
      {/* Grid lines */}
      {[0, 6, 12, 18, 24].map(hour => {
        const x = PAD_X + (hour / 24) * chartW;
        return (
          <g key={hour}>
            <line x1={x} y1={PAD_Y} x2={x} y2={H - PAD_Y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={x} y={H - 3} textAnchor="middle" fontSize="8" className="fill-gray-400">
              {hour.toString().padStart(2, '0')}:00
            </text>
          </g>
        );
      })}

      {/* Water fill under curve */}
      {pathD && (
        <path
          d={`${pathD} L ${PAD_X + chartW},${H - PAD_Y} L ${PAD_X},${H - PAD_Y} Z`}
          fill="url(#tideGradient)"
          opacity="0.3"
        />
      )}

      {/* Curve */}
      {pathD && (
        <path d={pathD} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
      )}

      {/* Tide point markers */}
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="3" fill={c.point.type === 'high' ? '#3b82f6' : '#f59e0b'} />
          <text x={c.x} y={c.y - 7} textAnchor="middle" fontSize="7" fontWeight="bold"
            className={c.point.type === 'high' ? 'fill-blue-500' : 'fill-amber-500'}>
            {c.point.height}m
          </text>
        </g>
      ))}

      {/* Current time line */}
      {isToday && (
        <line x1={nowX} y1={PAD_Y} x2={nowX} y2={H - PAD_Y}
          stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" />
      )}

      {/* Gradient definition */}
      <defs>
        <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

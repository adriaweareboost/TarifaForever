import React from 'react';
import { TideDay } from '../../types/weather';

interface TideChartProps {
  day: TideDay;
}

export function TideChart({ day }: TideChartProps) {
  if (!day.points.length && !day.hourly?.length) {
    return <p className="text-sm text-gray-400 text-center py-4">No tide data</p>;
  }

  const W = 320;
  const H = 120;
  const PAD_X = 30;
  const PAD_Y = 20;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;

  // Use real hourly data if available, otherwise fall back to peak points
  const hourly = day.hourly ?? [];
  const allHeights: number[] = [
    ...hourly.map(h => h.height),
    ...day.points.map(p => p.height),
  ];

  const minH = Math.min(...allHeights) - 0.05;
  const maxH = Math.max(...allHeights) + 0.05;
  const rangeH = maxH - minH || 1;

  // Helper: convert a time + height to SVG coordinates
  const toXY = (time: Date, height: number) => {
    const minutes = time.getHours() * 60 + time.getMinutes();
    const x = PAD_X + (minutes / 1440) * chartW;
    const y = PAD_Y + chartH - ((height - minH) / rangeH) * chartH;
    return { x, y };
  };

  // Build smooth curve from hourly data (real tide curve)
  let pathD = '';
  if (hourly.length >= 2) {
    const coords = hourly.map(h => toXY(h.time, h.height));
    pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx = (prev.x + curr.x) / 2;
      pathD += ` Q ${prev.x},${prev.y} ${cx},${(prev.y + curr.y) / 2}`;
      pathD += ` T ${curr.x},${curr.y}`;
    }
  }

  // Peak markers (high/low)
  const peakCoords = day.points.map(p => ({
    ...toXY(p.time, p.height),
    point: p,
  }));

  // Current time marker
  const now = new Date();
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = day.date === todayStr;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowX = PAD_X + (nowMinutes / 1440) * chartW;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
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

      {/* Peak markers */}
      {peakCoords.map((c, i) => {
        const timeStr = c.point.time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        return (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="3" fill={c.point.type === 'high' ? '#3b82f6' : '#f59e0b'} />
            <text
              x={c.x}
              y={c.point.type === 'high' ? c.y - 13 : c.y + 12}
              textAnchor="middle"
              fontSize="7"
              fontWeight="bold"
              className={c.point.type === 'high' ? 'fill-blue-500' : 'fill-amber-500'}
            >
              {timeStr}
            </text>
            <text
              x={c.x}
              y={c.point.type === 'high' ? c.y - 6 : c.y + 19}
              textAnchor="middle"
              fontSize="7"
              fontWeight="bold"
              className={c.point.type === 'high' ? 'fill-blue-500' : 'fill-amber-500'}
            >
              {c.point.height}m
            </text>
          </g>
        );
      })}

      {/* Current time line */}
      {isToday && (
        <g>
          <line
            x1={nowX}
            y1={PAD_Y}
            x2={nowX}
            y2={H - PAD_Y}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <rect
            x={nowX - 12}
            y={PAD_Y - 11}
            width="24"
            height="11"
            rx="2"
            fill="#ef4444"
          />
          <text
            x={nowX}
            y={PAD_Y - 3}
            textAnchor="middle"
            fontSize="7"
            fontWeight="bold"
            fill="#ffffff"
          >
            NOW
          </text>
        </g>
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

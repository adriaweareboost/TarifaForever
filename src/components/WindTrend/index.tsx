import { useEffect, useState, useCallback, useRef } from 'react';
import type { WeatherData } from '../../types/weather';
import { LOCALE } from '../../config';
import { useScrollFade } from '../../hooks/useScrollFade';

interface WindTrendProps {
  history: WeatherData[];
  live?: WeatherData;
}

const LABEL_W = 36;
const CELL_W = 24;
const CHART_H = 180;
const PAD_Y = 8;

function formatHour(d: Date): string {
  return `${d.getHours()}h`;
}

function formatDay(d: Date): string {
  return d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric' });
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

function buildAreaPath(points: { x: number; y: number }[], baseline: number): string {
  if (points.length === 0) return '';
  const line = buildPath(points);
  return `${line} L${points[points.length - 1].x},${baseline} L${points[0].x},${baseline} Z`;
}

/** Sample hourly from 15-min data — pick the entry closest to each full hour */
function sampleHourly(history: WeatherData[]): WeatherData[] {
  const byHour = new Map<string, WeatherData>();
  for (const h of history) {
    const t = h.timestamp;
    const key = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}-${t.getHours()}`;
    const existing = byHour.get(key);
    if (!existing || Math.abs(t.getMinutes()) < Math.abs(existing.timestamp.getMinutes())) {
      byHour.set(key, h);
    }
  }
  return Array.from(byHour.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/** Windguru-style color interpolation */
const WG_STOPS: [number, string][] = [
  [0,  '#ffffff'], [2,  '#f0f4ff'], [5,  '#c5d9fc'],
  [8,  '#8ec3f7'], [12, '#59d4b0'], [16, '#6ade6a'],
  [20, '#c2f05a'], [25, '#f7f056'], [30, '#f7b84e'],
  [35, '#f26a38'], [40, '#e03030'], [50, '#b01080'],
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function windBgStyle(speed: number): React.CSSProperties {
  if (speed <= WG_STOPS[0][0]) return { backgroundColor: WG_STOPS[0][1] };
  if (speed >= WG_STOPS[WG_STOPS.length - 1][0]) return { backgroundColor: WG_STOPS[WG_STOPS.length - 1][1] };
  for (let i = 0; i < WG_STOPS.length - 1; i++) {
    const [s0, c0] = WG_STOPS[i];
    const [s1, c1] = WG_STOPS[i + 1];
    if (speed >= s0 && speed <= s1) {
      const t = (speed - s0) / (s1 - s0);
      const [r0, g0, b0] = hexToRgb(c0);
      const [r1, g1, b1] = hexToRgb(c1);
      return { backgroundColor: `rgb(${Math.round(r0 + (r1 - r0) * t)},${Math.round(g0 + (g1 - g0) * t)},${Math.round(b0 + (b1 - b0) * t)})` };
    }
  }
  return {};
}

/** Reusable Row component matching WindForecast pattern */
function Row({
  label, cells, bg, last,
}: {
  label: string;
  cells: React.ReactNode[];
  bg?: string;
  last?: boolean;
}) {
  const numCells = cells.length;
  return (
    <div
      className={`grid ${!last ? 'border-b border-gray-200' : ''}`}
      style={{ gridTemplateColumns: `${LABEL_W}px 1fr`, minHeight: 24 }}
    >
      <div className={`flex items-center px-2 text-[10px] font-semibold text-gray-600 ${bg ?? 'bg-white'} border-r border-gray-200`}>
        {label}
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${numCells}, 1fr)` }}>
        {cells.map((c, i) => (
          <div key={i} className="border-l border-gray-100 first:border-l-0">
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WindTrend({ history, live }: WindTrendProps) {
  const { scrollRef, wrapClass } = useScrollFade();

  // Auto-scroll to end (most recent) on mount / data change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollLeft = el.scrollWidth;
      });
    }
  }, [history.length, scrollRef]);

  if (history.length < 2) {
    return (
      <div className="metric-card">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Wind Trend — Last 48h</span>
        <p className="text-sm text-gray-400 mt-2">Not enough data yet</p>
      </div>
    );
  }

  // Sample history hourly, then append live as the last point
  const sampledHistory = sampleHourly(history);
  // Remove last entry if it's in the same hour as live, to avoid duplicates
  if (live && sampledHistory.length > 0) {
    const lastH = sampledHistory[sampledHistory.length - 1].timestamp;
    if (lastH.getHours() === live.timestamp.getHours() && lastH.getDate() === live.timestamp.getDate()) {
      sampledHistory.pop();
    }
  }
  const sampled = live ? [...sampledHistory, live] : sampledHistory;
  const numHours = sampled.length;
  const speeds = sampled.map(h => h.windSpeed);
  const gusts = sampled.map(h => h.windGust);
  const maxVal = Math.max(...speeds, ...gusts, 10);
  const minVal = 0;

  // Day groups
  const dayGroups: { label: string; startIdx: number; count: number }[] = [];
  let currentDay = '';
  for (let i = 0; i < numHours; i++) {
    const day = formatDay(sampled[i].timestamp);
    if (day !== currentDay) {
      if (dayGroups.length > 0) {
        dayGroups[dayGroups.length - 1].count = i - dayGroups[dayGroups.length - 1].startIdx;
      }
      dayGroups.push({ label: day, startIdx: i, count: 1 });
      currentDay = day;
    }
  }
  if (dayGroups.length > 0) {
    dayGroups[dayGroups.length - 1].count = numHours - dayGroups[dayGroups.length - 1].startIdx;
  }

  // Chart points — no LABEL_W offset, chart SVG only covers data area
  const chartW = numHours * CELL_W;
  const scaleY = (v: number) => PAD_Y + (CHART_H - 2 * PAD_Y) - ((v - minVal) / (maxVal - minVal)) * (CHART_H - 2 * PAD_Y);
  const speedPoints = sampled.map((_, i) => ({ x: i * CELL_W + CELL_W / 2, y: scaleY(speeds[i]) }));
  const gustPoints = sampled.map((_, i) => ({ x: i * CELL_W + CELL_W / 2, y: scaleY(gusts[i]) }));

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    val: Math.round(minVal + pct * (maxVal - minVal)),
    y: scaleY(minVal + pct * (maxVal - minVal)),
  }));

  // Heights for the header rows (to align the fixed Y-axis)
  const DAY_ROW_H = 26;
  const HOUR_ROW_H = 22;

  // Tooltip state
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const getIdxFromX = useCallback((clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = clientX - rect.left;
    const idx = Math.floor(x / CELL_W);
    if (idx < 0 || idx >= numHours) return null;
    return idx;
  }, [numHours]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    setHoverIdx(getIdxFromX(e.clientX));
  }, [getIdxFromX]);

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length > 0) {
      setHoverIdx(getIdxFromX(e.touches[0].clientX));
    }
  }, [getIdxFromX]);

  const handleLeave = useCallback(() => setHoverIdx(null), []);

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Wind Trend — Last 48h</span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-sky-500 rounded inline-block" /> Wind
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-400 rounded inline-block opacity-60" /> Gusts
          </span>
        </div>
      </div>

      {/* Outer flex: fixed Y-axis + scrollable data */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {/* Fixed Y-axis column */}
        <div className="flex-shrink-0 bg-white border-r border-gray-200" style={{ width: LABEL_W }}>
          {/* Empty space for day + hour headers */}
          <div className="bg-gray-50 border-b border-gray-200" style={{ height: DAY_ROW_H }} />
          <div className="bg-gray-50 border-b border-gray-200" style={{ height: HOUR_ROW_H }} />
          {/* Y-axis labels */}
          <div className="relative" style={{ height: CHART_H }}>
            <span className="absolute text-[9px] text-gray-400 font-semibold" style={{ top: 2, left: 6 }}>kts</span>
            {yTicks.map((t) => (
              <span
                key={t.val}
                className="absolute text-[9px] text-gray-400 right-2"
                style={{ top: t.y - 5 }}
              >
                {t.val}
              </span>
            ))}
          </div>
        </div>

        {/* Scrollable data area with fade */}
        <div className={`${wrapClass} flex-1 min-w-0`}>
          <div ref={scrollRef} className="overflow-x-auto">
            <div style={{ minWidth: chartW }}>
              {/* Day group headers */}
              <div className="flex bg-gray-50 border-b border-gray-200" style={{ height: DAY_ROW_H }}>
                {dayGroups.map((g) => (
                  <div
                    key={g.startIdx}
                    style={{ width: g.count * CELL_W }}
                    className="text-center text-[11px] font-bold text-gray-700 flex items-center justify-center border-l border-gray-200 first:border-l-0 whitespace-nowrap overflow-hidden"
                  >
                    {g.label}
                  </div>
                ))}
              </div>

              {/* Hour row */}
              <div className="flex bg-gray-50 border-b border-gray-200" style={{ height: HOUR_ROW_H }}>
                {sampled.map((h, i) => {
                  const hr = h.timestamp.getHours();
                  const isNight = hr < 6 || hr >= 22;
                  return (
                    <div
                      key={i}
                      style={{ width: CELL_W }}
                      className={`text-center text-[10px] font-semibold flex items-center justify-center border-l border-gray-100 first:border-l-0 ${isNight ? 'text-gray-400' : 'text-gray-700'}`}
                    >
                      {formatHour(h.timestamp)}
                    </div>
                  );
                })}
              </div>

              {/* SVG Chart */}
              <div className="bg-white relative">
                <svg
                  ref={svgRef}
                  width={chartW}
                  height={CHART_H}
                  className="block"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleLeave}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleLeave}
                  style={{ touchAction: 'pan-x' }}
                >
                  {/* Horizontal grid lines */}
                  {yTicks.map((t) => (
                    <line key={t.val} x1={0} y1={t.y} x2={chartW} y2={t.y} stroke="#f3f4f6" strokeWidth={0.5} />
                  ))}

                  {/* Vertical grid per column */}
                  {sampled.map((_, i) => (
                    <line
                      key={i}
                      x1={i * CELL_W}
                      y1={0}
                      x2={i * CELL_W}
                      y2={CHART_H}
                      stroke="#f3f4f6"
                      strokeWidth={0.5}
                    />
                  ))}

                  {/* Gust area */}
                  <path d={buildAreaPath(gustPoints, CHART_H)} fill="#fef2f2" opacity={0.5} />

                  {/* Wind area */}
                  <path d={buildAreaPath(speedPoints, CHART_H)} fill="url(#windTrendGrad)" />

                  {/* Gust line */}
                  <path d={buildPath(gustPoints)} fill="none" stroke="#f87171" strokeWidth={1} strokeDasharray="3,2" opacity={0.5} />

                  {/* Wind line */}
                  <path d={buildPath(speedPoints)} fill="none" stroke="#0ea5e9" strokeWidth={1.5} />

                  {/* Current dot */}
                  <circle
                    cx={speedPoints[speedPoints.length - 1].x}
                    cy={speedPoints[speedPoints.length - 1].y}
                    r={3.5}
                    fill="#0ea5e9"
                    stroke="#fff"
                    strokeWidth={1.5}
                  />

                  {/* Hover crosshair + tooltip */}
                  {hoverIdx !== null && hoverIdx >= 0 && hoverIdx < numHours && (
                    <>
                      {/* Vertical line */}
                      <line
                        x1={speedPoints[hoverIdx].x}
                        y1={0}
                        x2={speedPoints[hoverIdx].x}
                        y2={CHART_H}
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray="4,3"
                      />
                      {/* Wind dot */}
                      <circle cx={speedPoints[hoverIdx].x} cy={speedPoints[hoverIdx].y} r={4} fill="#0ea5e9" stroke="#fff" strokeWidth={1.5} />
                      {/* Gust dot */}
                      <circle cx={gustPoints[hoverIdx].x} cy={gustPoints[hoverIdx].y} r={3} fill="#f87171" stroke="#fff" strokeWidth={1.5} />
                      {/* Tooltip background */}
                      {(() => {
                        const tx = speedPoints[hoverIdx].x;
                        const tooltipW = 90;
                        const tooltipH = 42;
                        const tooltipX = tx + tooltipW + 8 > chartW ? tx - tooltipW - 8 : tx + 8;
                        const tooltipY = Math.max(4, Math.min(speedPoints[hoverIdx].y - tooltipH / 2, CHART_H - tooltipH - 4));
                        return (
                          <g>
                            <rect
                              x={tooltipX}
                              y={tooltipY}
                              width={tooltipW}
                              height={tooltipH}
                              rx={6}
                              fill="white"
                              stroke="#e5e7eb"
                              strokeWidth={1}
                              filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))"
                            />
                            <text x={tooltipX + 8} y={tooltipY + 14} fontSize={10} fill="#64748b" fontWeight={600}>
                              {formatHour(sampled[hoverIdx].timestamp)}
                            </text>
                            <text x={tooltipX + 8} y={tooltipY + 26} fontSize={10} fill="#0ea5e9" fontWeight={700}>
                              Wind: {speeds[hoverIdx]} kts
                            </text>
                            <text x={tooltipX + 8} y={tooltipY + 38} fontSize={10} fill="#f87171" fontWeight={700}>
                              Gust: {gusts[hoverIdx]} kts
                            </text>
                          </g>
                        );
                      })()}
                    </>
                  )}

                  <defs>
                    <linearGradient id="windTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-1.5">
        Recorded wind · Hourly data from ICON model
      </p>
    </div>
  );
}

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
const DAY_ROW_H = 26;
const HOUR_ROW_H = 22;

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
  return `${buildPath(points)} L${points[points.length - 1].x},${baseline} L${points[0].x},${baseline} Z`;
}

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

function computeDayGroups(sampled: WeatherData[]): { label: string; startIdx: number; count: number }[] {
  const groups: { label: string; startIdx: number; count: number }[] = [];
  let current = '';
  for (let i = 0; i < sampled.length; i++) {
    const day = formatDay(sampled[i].timestamp);
    if (day !== current) {
      if (groups.length > 0) groups[groups.length - 1].count = i - groups[groups.length - 1].startIdx;
      groups.push({ label: day, startIdx: i, count: 1 });
      current = day;
    }
  }
  if (groups.length > 0) groups[groups.length - 1].count = sampled.length - groups[groups.length - 1].startIdx;
  return groups;
}

export function WindTrend({ history, live }: WindTrendProps) {
  // ALL hooks must be called before any conditional returns
  const { scrollRef, wrapClass } = useScrollFade();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const sampled = useMemo(() => {
    const hourly = sampleHourly(history);
    if (!live) return hourly;
    // Replace last entry if same hour as live, otherwise append
    if (hourly.length > 0) {
      const last = hourly[hourly.length - 1].timestamp;
      if (last.getHours() === live.timestamp.getHours() && last.getDate() === live.timestamp.getDate()) {
        return [...hourly.slice(0, -1), live];
      }
    }
    return [...hourly, live];
  }, [history, live]);

  const numHours = sampled.length;
  const speeds = useMemo(() => sampled.map(h => h.windSpeed), [sampled]);
  const gusts = useMemo(() => sampled.map(h => h.windGust), [sampled]);
  const maxVal = Math.max(...speeds, ...gusts, 10);
  const chartW = numHours * CELL_W;

  const scaleY = useCallback(
    (v: number) => PAD_Y + (CHART_H - 2 * PAD_Y) * (1 - v / maxVal),
    [maxVal],
  );

  const speedPoints = useMemo(() => speeds.map((s, i) => ({ x: i * CELL_W + CELL_W / 2, y: scaleY(s) })), [speeds, scaleY]);
  const gustPoints = useMemo(() => gusts.map((g, i) => ({ x: i * CELL_W + CELL_W / 2, y: scaleY(g) })), [gusts, scaleY]);
  const yTicks = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map(pct => ({ val: Math.round(pct * maxVal), y: scaleY(pct * maxVal) })), [maxVal, scaleY]);
  const dayGroups = useMemo(() => computeDayGroups(sampled), [sampled]);

  // Auto-scroll to end on data change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth; });
  }, [numHours, scrollRef]);

  // Reset hover when data changes
  useEffect(() => { setHoverIdx(null); }, [numHours]);

  const getIdxFromX = useCallback((clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const x = clientX - svg.getBoundingClientRect().left;
    const idx = Math.floor(x / CELL_W);
    return (idx >= 0 && idx < numHours) ? idx : null;
  }, [numHours]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => setHoverIdx(getIdxFromX(e.clientX)), [getIdxFromX]);
  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => { if (e.touches.length > 0) setHoverIdx(getIdxFromX(e.touches[0].clientX)); }, [getIdxFromX]);
  const handleLeave = useCallback(() => setHoverIdx(null), []);

  // Early return AFTER all hooks
  if (sampled.length < 2) {
    return (
      <div className="metric-card">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Wind Trend — Last 48h</span>
        <p className="text-sm text-gray-400 mt-2">Not enough data yet</p>
      </div>
    );
  }

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

      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {/* Fixed Y-axis */}
        <div className="flex-shrink-0 bg-white border-r border-gray-200" style={{ width: LABEL_W }}>
          <div className="bg-gray-50 border-b border-gray-200" style={{ height: DAY_ROW_H }} />
          <div className="bg-gray-50 border-b border-gray-200" style={{ height: HOUR_ROW_H }} />
          <div className="relative" style={{ height: CHART_H }}>
            <span className="absolute text-[9px] text-gray-400 font-semibold" style={{ top: 2, left: 6 }}>kts</span>
            {yTicks.map(t => (
              <span key={t.val} className="absolute text-[9px] text-gray-400 right-2" style={{ top: t.y - 5 }}>{t.val}</span>
            ))}
          </div>
        </div>

        {/* Scrollable data */}
        <div className={`${wrapClass} flex-1 min-w-0`}>
          <div ref={scrollRef} className="overflow-x-auto">
            <div style={{ minWidth: chartW }}>
              {/* Day headers */}
              <div className="flex bg-gray-50 border-b border-gray-200" style={{ height: DAY_ROW_H }}>
                {dayGroups.map(g => (
                  <div key={g.startIdx} style={{ width: g.count * CELL_W }} className="text-center text-[11px] font-bold text-gray-700 flex items-center justify-center border-l border-gray-200 first:border-l-0 whitespace-nowrap overflow-hidden">
                    {g.label}
                  </div>
                ))}
              </div>

              {/* Hour labels */}
              <div className="flex bg-gray-50 border-b border-gray-200" style={{ height: HOUR_ROW_H }}>
                {sampled.map((h, i) => {
                  const hr = h.timestamp.getHours();
                  return (
                    <div key={i} style={{ width: CELL_W }} className={`text-center text-[10px] font-semibold flex items-center justify-center border-l border-gray-100 first:border-l-0 ${hr < 6 || hr >= 22 ? 'text-gray-400' : 'text-gray-700'}`}>
                      {formatHour(h.timestamp)}
                    </div>
                  );
                })}
              </div>

              {/* Chart */}
              <div className="bg-white relative">
                <svg ref={svgRef} width={chartW} height={CHART_H} className="block" onMouseMove={handleMouseMove} onMouseLeave={handleLeave} onTouchMove={handleTouchMove} onTouchEnd={handleLeave} style={{ touchAction: 'pan-x' }}>
                  {yTicks.map(t => <line key={t.val} x1={0} y1={t.y} x2={chartW} y2={t.y} stroke="#f3f4f6" strokeWidth={0.5} />)}
                  {sampled.map((_, i) => <line key={i} x1={i * CELL_W} y1={0} x2={i * CELL_W} y2={CHART_H} stroke="#f3f4f6" strokeWidth={0.5} />)}

                  <path d={buildAreaPath(gustPoints, CHART_H)} fill="#fef2f2" opacity={0.5} />
                  <path d={buildAreaPath(speedPoints, CHART_H)} fill="url(#windTrendGrad)" />
                  <path d={buildPath(gustPoints)} fill="none" stroke="#f87171" strokeWidth={1} strokeDasharray="3,2" opacity={0.5} />
                  <path d={buildPath(speedPoints)} fill="none" stroke="#0ea5e9" strokeWidth={1.5} />

                  <circle cx={speedPoints[speedPoints.length - 1].x} cy={speedPoints[speedPoints.length - 1].y} r={3.5} fill="#0ea5e9" stroke="#fff" strokeWidth={1.5} />

                  {hoverIdx !== null && hoverIdx < numHours && (() => {
                    const tx = speedPoints[hoverIdx].x;
                    const tooltipW = 90;
                    const tooltipH = 42;
                    const tooltipX = tx + tooltipW + 8 > chartW ? tx - tooltipW - 8 : tx + 8;
                    const tooltipY = Math.max(4, Math.min(speedPoints[hoverIdx].y - tooltipH / 2, CHART_H - tooltipH - 4));
                    return (
                      <>
                        <line x1={tx} y1={0} x2={tx} y2={CHART_H} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
                        <circle cx={tx} cy={speedPoints[hoverIdx].y} r={4} fill="#0ea5e9" stroke="#fff" strokeWidth={1.5} />
                        <circle cx={tx} cy={gustPoints[hoverIdx].y} r={3} fill="#f87171" stroke="#fff" strokeWidth={1.5} />
                        <rect x={tooltipX} y={tooltipY} width={tooltipW} height={tooltipH} rx={6} fill="white" stroke="#e5e7eb" strokeWidth={1} filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))" />
                        <text x={tooltipX + 8} y={tooltipY + 14} fontSize={10} fill="#64748b" fontWeight={600}>{formatHour(sampled[hoverIdx].timestamp)}</text>
                        <text x={tooltipX + 8} y={tooltipY + 26} fontSize={10} fill="#0ea5e9" fontWeight={700}>Wind: {speeds[hoverIdx]} kts</text>
                        <text x={tooltipX + 8} y={tooltipY + 38} fontSize={10} fill="#f87171" fontWeight={700}>Gust: {gusts[hoverIdx]} kts</text>
                      </>
                    );
                  })()}

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

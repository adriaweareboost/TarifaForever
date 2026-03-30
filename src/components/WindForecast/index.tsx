import React from 'react';
import type { ModelForecast, ForecastDay, WaveForecastDay } from '../../utils/forecastService';

interface WindForecastProps {
  forecasts: ModelForecast[];
  waves: WaveForecastDay[];
  loading: boolean;
}

/* ── Wind intensity thresholds (kts) ── */
const WIND_RANGES = [
  { max: 8,  label: 'Light',     bg: 'bg-gray-100',    text: 'text-gray-400' },
  { max: 14, label: 'Moderate',  bg: 'bg-emerald-50',  text: 'text-emerald-600' },
  { max: 22, label: 'Good kite', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { max: 30, label: 'Strong',    bg: 'bg-amber-50',    text: 'text-amber-600' },
  { max: 45, label: 'Extreme',   bg: 'bg-red-50',      text: 'text-red-600' },
  { max: Infinity, label: 'Danger', bg: 'bg-red-100',  text: 'text-red-700' },
] as const;

function getWindRange(speed: number) {
  return WIND_RANGES.find((r) => speed <= r.max) ?? WIND_RANGES[WIND_RANGES.length - 1];
}

function windColor(speed: number): string {
  if (speed <= 8) return '#9ca3af';
  if (speed <= 14) return '#059669';
  if (speed <= 22) return '#047857';
  if (speed <= 30) return '#d97706';
  return '#dc2626';
}

function cellBg(speed: number): string {
  return getWindRange(speed).bg;
}

/* ── Direction arrow ── */
function DirectionArrow({ degrees, size = 14, color = '#64748b' }: { degrees: number; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className="shrink-0">
      <g transform={`rotate(${degrees}, 10, 10)`}>
        <line x1="10" y1="4" x2="10" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
        <polygon points="10,2 7,7 10,5 13,7" fill={color} />
      </g>
    </svg>
  );
}

/* ── Mini bar ── */
const BAR_MAX = 45;

function MiniBar({ speed, gust, color }: { speed: number; gust: number; color: string }) {
  const speedPct = Math.min((speed / BAR_MAX) * 100, 100);
  const gustPct = Math.min((gust / BAR_MAX) * 100, 100);

  return (
    <div className="relative h-1 rounded-full bg-gray-100 overflow-hidden w-full mt-0.5">
      <div className="absolute inset-y-0 left-0 rounded-full opacity-20" style={{ width: `${gustPct}%`, backgroundColor: color }} />
      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${speedPct}%`, backgroundColor: color }} />
    </div>
  );
}

/* ── Wind model cell ── */
function ModelCell({ day, model }: { day: ForecastDay | undefined; model: ModelForecast }) {
  if (!day) return <div className="text-[10px] text-gray-300 text-center py-2">—</div>;

  const wColor = windColor(day.windSpeed);

  return (
    <div className="flex flex-col items-center gap-0.5 py-1.5">
      <div className="flex items-baseline gap-0.5">
        <span className="text-sm font-bold tabular-nums leading-none" style={{ color: wColor }}>{day.windSpeed}</span>
        <span className="text-[9px] text-gray-400 leading-none">/{day.windGust}</span>
      </div>
      <div className="flex items-center gap-0.5">
        <DirectionArrow degrees={day.windDirection} color={model.color} />
        <span className="text-[9px] text-gray-500 leading-none">{day.windDirectionLabel}</span>
      </div>
      <MiniBar speed={day.windSpeed} gust={day.windGust} color={model.color} />
    </div>
  );
}

/* ── Wave cell ── */
function waveColor(height: number): string {
  if (height <= 0.5) return '#9ca3af';
  if (height <= 1.2) return '#0891b2';
  if (height <= 2.0) return '#0e7490';
  if (height <= 3.0) return '#d97706';
  return '#dc2626';
}

function WaveCell({ day }: { day: WaveForecastDay | undefined }) {
  if (!day) return <div className="text-[10px] text-gray-300 text-center py-2">—</div>;

  const hColor = waveColor(day.waveHeight);

  return (
    <div className="flex flex-col items-center gap-0.5 py-1.5">
      <div className="flex items-baseline gap-0.5">
        <span className="text-sm font-bold tabular-nums leading-none" style={{ color: hColor }}>{day.waveHeight}</span>
        <span className="text-[9px] text-gray-400 leading-none">m</span>
      </div>
      <div className="flex items-center gap-1">
        <DirectionArrow degrees={day.waveDirection} color="#0891b2" />
        <span className="text-[9px] text-gray-500 leading-none">{day.wavePeriod}s</span>
      </div>
    </div>
  );
}

/* ── Consensus ── */
function ConsensusCell({ dayIdx, forecasts }: { dayIdx: number; forecasts: ModelForecast[] }) {
  const speeds = forecasts.map((f) => f.days[dayIdx]?.windSpeed ?? 0).filter(Boolean);
  if (speeds.length < 2) return null;

  const maxDiff = Math.max(...speeds) - Math.min(...speeds);
  const agreement = maxDiff <= 3 ? 'High' : maxDiff <= 7 ? 'Med' : 'Low';
  const agColor = maxDiff <= 3 ? 'text-emerald-500' : maxDiff <= 7 ? 'text-amber-500' : 'text-red-400';

  return (
    <div className="flex flex-col items-center pt-0.5">
      <div className={`text-[8px] font-semibold ${agColor} leading-none`}>{agreement}</div>
    </div>
  );
}

/* ── Main component ── */
export function WindForecast({ forecasts, waves, loading }: WindForecastProps) {
  if (loading) {
    return (
      <div className="metric-card animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (forecasts.length === 0) {
    return (
      <div className="metric-card text-center text-sm text-gray-400 py-8">
        Forecast unavailable
      </div>
    );
  }

  const days = forecasts[0].days;
  const numDays = days.length;
  const hasWaves = waves.length > 0;

  return (
    <div className="metric-card">
      {/* Header */}
      <div className="mb-3">
        <p className="text-sm font-bold text-gray-900">7-Day Forecast</p>
        <p className="text-[10px] text-gray-400">Wind (3 models) {hasWaves ? '+ waves' : ''} · kts</p>
      </div>

      {/* Scrollable grid */}
      <div className="scroll-fade overflow-x-auto -mx-5 px-5">
        <div
          className="grid gap-px bg-gray-100 rounded-xl overflow-hidden"
          style={{
            gridTemplateColumns: `56px repeat(${numDays}, minmax(64px, 1fr))`,
            minWidth: numDays > 3 ? `${numDays * 76 + 56}px` : undefined,
          }}
        >
          {/* ── Column headers: days ── */}
          <div className="bg-white" />
          {days.map((day, i) => {
            const isToday = i === 0;
            const avgSpeed = Math.round(
              forecasts.reduce((sum, f) => sum + (f.days[i]?.windSpeed ?? 0), 0) / forecasts.length
            );
            const bg = cellBg(avgSpeed);
            return (
              <div key={day.date} className={`${bg} px-2 py-2 text-center`}>
                <div className={`text-xs font-bold ${isToday ? 'text-brand-500' : 'text-gray-700'}`}>
                  {isToday ? 'Today' : day.dayLabel}
                </div>
                <div className="text-[10px] text-gray-400 leading-tight">{day.dateLabel}</div>
              </div>
            );
          })}

          {/* ── Wind model rows ── */}
          {forecasts.map((model) => (
            <React.Fragment key={model.model}>
              <div className="bg-white flex items-center px-2 py-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: model.color }} />
                  <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap">{model.label}</span>
                </div>
              </div>
              {days.map((_, dayIdx) => {
                const day = model.days[dayIdx];
                const bg = day ? cellBg(day.windSpeed) : 'bg-white';
                return (
                  <div key={dayIdx} className={`${bg} px-1`}>
                    <ModelCell day={day} model={model} />
                  </div>
                );
              })}
            </React.Fragment>
          ))}

          {/* ── Consensus row ── */}
          <div className="bg-white flex items-center px-2 py-1">
            <span className="text-[9px] font-semibold text-gray-400 whitespace-nowrap">Agree</span>
          </div>
          {days.map((_, dayIdx) => (
            <div key={dayIdx} className="bg-white px-1 py-0.5">
              <ConsensusCell dayIdx={dayIdx} forecasts={forecasts} />
            </div>
          ))}

          {/* ── Waves row ── */}
          {hasWaves && (
            <>
              {/* Separator label */}
              <div className="bg-white flex items-center px-2 py-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-6 rounded-full shrink-0 bg-cyan-500" />
                  <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap">Waves</span>
                </div>
              </div>
              {days.map((_, dayIdx) => {
                const waveDay = waves[dayIdx];
                return (
                  <div key={dayIdx} className="bg-cyan-50/50 px-1">
                    <WaveCell day={waveDay} />
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Wind scale legend ── */}
      <div className="mt-3 flex items-center gap-1 flex-wrap">
        <span className="text-[9px] text-gray-400 mr-1">Wind:</span>
        {WIND_RANGES.filter((r) => r.max !== Infinity).map((r) => (
          <span key={r.label} className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${r.bg} ${r.text}`}>
            ≤{r.max} {r.label}
          </span>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          {forecasts.map((f) => (
            <p key={f.model} className="text-[9px] text-gray-400">
              <span className="font-semibold" style={{ color: f.color }}>{f.label}</span> — {f.description}
            </p>
          ))}
          {hasWaves && (
            <p className="text-[9px] text-gray-400">
              <span className="font-semibold text-cyan-600">Waves</span> — Open-Meteo Marine API
            </p>
          )}
        </div>
        <p className="text-[9px] text-gray-300 mt-1">
          Wind: sustained/gust (kts) · Waves: height (m) + period (s) · arrow = direction
        </p>
      </div>
    </div>
  );
}

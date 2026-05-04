import React from 'react';
import type {
  ModelForecast, WaveForecastHour, Granularity,
} from '../../utils/forecastService';
import { computeDayGroups } from '../../utils/forecastService';
import { useScrollFade } from '../../hooks/useScrollFade';
import { calcWaveridingScore } from '../../utils/quality';

interface WindForecastProps {
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  forecast1km: ModelForecast | null;
  forecast3km: ModelForecast | null;
  forecast9km: ModelForecast | null;
  waves1km: WaveForecastHour[];
  waves3km: WaveForecastHour[];
  waves9km: WaveForecastHour[];
  loading: boolean;
  shoreNormal: number;
}

/* ── Windguru-style color scale (kts) ── */
const WG_STOPS: [number, string][] = [
  [0,  '#ffffff'],
  [2,  '#f0f4ff'],
  [5,  '#c5d9fc'],
  [8,  '#8ec3f7'],
  [12, '#59d4b0'],
  [16, '#6ade6a'],
  [20, '#c2f05a'],
  [25, '#f7f056'],
  [30, '#f7b84e'],
  [35, '#f26a38'],
  [40, '#e03030'],
  [50, '#b01080'],
];

const WIND_LEGEND = [
  { max: 8,  label: 'Light',     color: '#8ec3f7' },
  { max: 16, label: 'Moderate',  color: '#6ade6a' },
  { max: 25, label: 'Good kite', color: '#f7f056' },
  { max: 35, label: 'Strong',    color: '#f26a38' },
  { max: 50, label: 'Extreme',   color: '#e03030' },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function interpolateColor(speed: number): string {
  if (speed <= WG_STOPS[0][0]) return WG_STOPS[0][1];
  if (speed >= WG_STOPS[WG_STOPS.length - 1][0]) return WG_STOPS[WG_STOPS.length - 1][1];
  for (let i = 0; i < WG_STOPS.length - 1; i++) {
    const [s0, c0] = WG_STOPS[i];
    const [s1, c1] = WG_STOPS[i + 1];
    if (speed >= s0 && speed <= s1) {
      const t = (speed - s0) / (s1 - s0);
      const [r0, g0, b0] = hexToRgb(c0);
      const [r1, g1, b1] = hexToRgb(c1);
      return `rgb(${Math.round(r0 + (r1 - r0) * t)},${Math.round(g0 + (g1 - g0) * t)},${Math.round(b0 + (b1 - b0) * t)})`;
    }
  }
  return WG_STOPS[WG_STOPS.length - 1][1];
}

function cellBgStyle(speed: number): React.CSSProperties {
  return { backgroundColor: interpolateColor(speed) };
}

/** Temperature color scale */
function tempBgStyle(temp: number): React.CSSProperties {
  if (temp <= 5) return { backgroundColor: '#dbeafe' };
  if (temp <= 10) return { backgroundColor: '#bfdbfe' };
  if (temp <= 15) return { backgroundColor: '#e0f2fe' };
  if (temp <= 20) return { backgroundColor: '#ecfdf5' };
  if (temp <= 25) return { backgroundColor: '#fef9c3' };
  if (temp <= 30) return { backgroundColor: '#fed7aa' };
  if (temp <= 35) return { backgroundColor: '#fca5a5' };
  return { backgroundColor: '#ef4444' };
}

/** Cloud cover color scale (0-100%) — darker = more clouds */
function cloudBgStyle(pct: number): React.CSSProperties {
  if (pct <= 10) return { backgroundColor: '#ffffff' };
  if (pct <= 30) return { backgroundColor: '#f3f4f6' };
  if (pct <= 50) return { backgroundColor: '#e5e7eb' };
  if (pct <= 70) return { backgroundColor: '#d1d5db' };
  if (pct <= 90) return { backgroundColor: '#9ca3af' };
  return { backgroundColor: '#6b7280' };
}

/** Precipitation color scale (mm) */
function precipBgStyle(mm: number): React.CSSProperties {
  if (mm <= 0) return { backgroundColor: '#ffffff' };
  if (mm <= 0.5) return { backgroundColor: '#dbeafe' };
  if (mm <= 2) return { backgroundColor: '#93c5fd' };
  if (mm <= 5) return { backgroundColor: '#3b82f6' };
  if (mm <= 10) return { backgroundColor: '#1d4ed8' };
  return { backgroundColor: '#1e3a8a' };
}

/** Wave color scale */
function waveBgStyle(height: number): React.CSSProperties {
  if (height <= 0.3) return { backgroundColor: '#ffffff' };
  if (height <= 0.6) return { backgroundColor: '#dbeafe' };
  if (height <= 1.0) return { backgroundColor: '#bfdbfe' };
  if (height <= 1.5) return { backgroundColor: '#93c5fd' };
  if (height <= 2.0) return { backgroundColor: '#60a5fa' };
  if (height <= 3.0) return { backgroundColor: '#f97316' };
  return { backgroundColor: '#dc2626' };
}

/** Waveriding score color — white (1) to green (10) */
function waveridingBgStyle(score: number): React.CSSProperties {
  if (score <= 1) return { backgroundColor: '#ffffff' };
  if (score <= 2) return { backgroundColor: '#f0fdf4' };
  if (score <= 3) return { backgroundColor: '#dcfce7' };
  if (score <= 4) return { backgroundColor: '#bbf7d0' };
  if (score <= 5) return { backgroundColor: '#86efac' };
  if (score <= 6) return { backgroundColor: '#4ade80' };
  if (score <= 7) return { backgroundColor: '#22c55e' };
  if (score <= 8) return { backgroundColor: '#16a34a' };
  if (score <= 9) return { backgroundColor: '#15803d' };
  return { backgroundColor: '#166534' };
}

/* ── Direction arrow (points TO wind destination) ── */
function DirectionArrow({ degrees, size = 12 }: { degrees: number; size?: number }) {
  const toDir = (degrees + 180) % 360;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className="shrink-0 inline-block">
      <g transform={`rotate(${toDir}, 10, 10)`}>
        <line x1="10" y1="4" x2="10" y2="16" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
        <polygon points="10,2 6,7 10,5 14,7" fill="#1f2937" />
      </g>
    </svg>
  );
}

/* ── Granularity selector ── */
function GranularitySelector({ value, onChange }: { value: Granularity; onChange: (g: Granularity) => void }) {
  const options: Granularity[] = [1, 3, 6, 12, 24];
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5">
      {options.map((g) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors whitespace-nowrap ${
            value === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {g}h
        </button>
      ))}
    </div>
  );
}


/* ══════════════════════════════════════════════════════
   72h Hourly Grid — Windguru style
   ══════════════════════════════════════════════════════ */

function HourlyGrid({ forecasts, waves, modelLabel, modelDesc, shoreNormal }: { forecasts: ModelForecast[]; waves: WaveForecastHour[]; modelLabel?: string; modelDesc?: string; shoreNormal: number }) {
  const { scrollRef, wrapClass } = useScrollFade();
  if (forecasts.length === 0) return <EmptyState />;

  const hours = forecasts[0].hours;
  const numHours = hours.length;
  const hasWaves = waves.length > 0;
  const dayGroups = computeDayGroups(hours);

  const LABEL_W = 72;
  const CELL_W = numHours <= 7 ? 56 : 38;
  const ROW_H = 20;
  const HEADER_H = 22;

  // Build row definitions for label + cells side-by-side
  const rows: { label: string; bg: 'gray' | 'white'; cells: React.ReactNode[] }[] = [
    // Hour
    { label: '', bg: 'gray', cells: hours.map((h) => {
      const hr = new Date(h.time).getHours();
      const isNight = hr < 6 || hr >= 22;
      return <div key={h.time} className={`text-center text-[10px] font-semibold h-full flex items-center justify-center ${isNight ? 'text-gray-400' : 'text-gray-700'}`}>{hr}h</div>;
    })},
    // Wind
    { label: 'Wind (kts)', bg: 'white', cells: hours.map((h) => (
      <div key={h.time} className="text-center text-[11px] font-bold text-gray-900 h-full flex items-center justify-center" style={cellBgStyle(h.windSpeed)}>{h.windSpeed}</div>
    ))},
    // Gusts
    { label: 'Gusts (kts)', bg: 'white', cells: hours.map((h) => (
      <div key={h.time} className="text-center text-[11px] font-bold text-gray-900 h-full flex items-center justify-center" style={cellBgStyle(h.windGust)}>{h.windGust}</div>
    ))},
    // Direction
    { label: 'Direction', bg: 'white', cells: hours.map((h) => (
      <div key={h.time} className="bg-white flex items-center justify-center h-full"><DirectionArrow degrees={h.windDirection} /></div>
    ))},
    // Temperature
    { label: 'Temp (°C)', bg: 'white', cells: hours.map((h) => (
      <div key={h.time} className="text-center text-[11px] font-bold text-gray-900 h-full flex items-center justify-center" style={tempBgStyle(h.temperature)}>{h.temperature}</div>
    ))},
    // Cloud high
    { label: 'Cld Hi %', bg: 'white', cells: hours.map((h) => (
      <div key={h.time} className="text-center text-[11px] font-semibold text-gray-700 h-full flex items-center justify-center" style={cloudBgStyle(h.cloudHigh)}>{h.cloudHigh}</div>
    ))},
    // Cloud mid
    { label: 'Cld Mid %', bg: 'white', cells: hours.map((h) => (
      <div key={h.time} className="text-center text-[11px] font-semibold text-gray-700 h-full flex items-center justify-center" style={cloudBgStyle(h.cloudMid)}>{h.cloudMid}</div>
    ))},
    // Cloud low
    { label: 'Cld Lo %', bg: 'white', cells: hours.map((h) => (
      <div key={h.time} className="text-center text-[11px] font-semibold text-gray-700 h-full flex items-center justify-center" style={cloudBgStyle(h.cloudLow)}>{h.cloudLow}</div>
    ))},
    // Rain
    { label: 'Rain (mm)', bg: 'white', cells: hours.map((h) => (
      <div key={h.time} className={`text-center text-[11px] font-bold h-full flex items-center justify-center ${h.precipitation > 5 ? 'text-white' : 'text-gray-900'}`} style={precipBgStyle(h.precipitation)}>{h.precipitation > 0 ? h.precipitation : '—'}</div>
    ))},
  ];

  // Waves rows
  if (hasWaves) {
    rows.push(
      { label: 'Waves (m)', bg: 'white', cells: hours.map((_, i) => {
        const w = waves[i];
        return <div key={i} className="text-center text-[11px] font-bold text-gray-900 h-full flex items-center justify-center" style={w ? waveBgStyle(w.waveHeight) : {}}>{w ? w.waveHeight : '—'}</div>;
      })},
      { label: 'Period (s)', bg: 'white', cells: hours.map((_, i) => {
        const w = waves[i];
        return <div key={i} className="bg-white text-center text-[11px] font-semibold text-gray-700 h-full flex items-center justify-center">{w ? w.wavePeriod : '—'}</div>;
      })},
      { label: 'Swell (m)', bg: 'white', cells: hours.map((_, i) => {
        const w = waves[i];
        return <div key={i} className="text-center text-[11px] font-bold text-gray-900 h-full flex items-center justify-center" style={w ? waveBgStyle(w.swellHeight) : {}}>{w ? w.swellHeight : '—'}</div>;
      })},
      { label: 'Swell T (s)', bg: 'white', cells: hours.map((_, i) => {
        const w = waves[i];
        return <div key={i} className="bg-white text-center text-[11px] font-semibold text-gray-700 h-full flex items-center justify-center">{w ? w.swellPeriod : '—'}</div>;
      })},
      { label: 'Ride 1-10', bg: 'white', cells: hours.map((h, i) => {
        const w = waves[i];
        const score = w ? calcWaveridingScore(w.swellHeight, w.swellPeriod, h.windSpeed, h.windDirection, shoreNormal) : 0;
        return <div key={i} className={`text-center text-[11px] font-extrabold h-full flex items-center justify-center ${score >= 8 ? 'text-white' : 'text-gray-900'}`} style={w ? waveridingBgStyle(score) : {}}>{w ? score : '—'}</div>;
      })},
    );
  }

  return (
    <>
      <div className="-mx-5">
        <div className="flex border border-gray-200 rounded-lg mx-5">
          {/* Fixed label column */}
          <div className="shrink-0" style={{ width: LABEL_W }}>
            {/* Day header spacer */}
            <div className="bg-gray-50 border-b border-gray-200 border-r border-gray-200" style={{ height: HEADER_H }}>&nbsp;</div>
            {/* Row labels */}
            {rows.map((r, i) => (
              <div
                key={i}
                className={`flex items-center px-2 text-[10px] font-semibold text-gray-600 border-r border-gray-200 ${i < rows.length - 1 ? 'border-b border-gray-200' : ''}`}
                style={{ height: ROW_H, backgroundColor: r.bg === 'gray' ? '#f9fafb' : '#ffffff' }}
              >
                {r.label}
              </div>
            ))}
          </div>

          {/* Scrollable data columns */}
          <div className={`${wrapClass} overflow-x-auto flex-1 min-w-0`} ref={scrollRef}>
            <div style={{ minWidth: `${numHours * CELL_W}px` }}>
              {/* Day groups header */}
              <div className="grid bg-gray-50 border-b border-gray-200" style={{ gridTemplateColumns: `repeat(${numHours}, 1fr)`, height: HEADER_H }}>
                {dayGroups.map((g) => (
                  <div
                    key={g.startIdx}
                    className="text-center text-[11px] font-bold text-gray-700 flex items-center justify-center border-l border-gray-100 first:border-l-0 whitespace-nowrap overflow-hidden"
                    style={{ gridColumn: `span ${g.count}` }}
                  >
                    {g.label === 'Today' ? 'Today' : g.label} <span className="text-gray-400 font-normal ml-1">{g.dateLabel}</span>
                  </div>
                ))}
              </div>
              {/* Data rows */}
              {rows.map((r, ri) => (
                <div
                  key={ri}
                  className={`grid ${ri < rows.length - 1 ? 'border-b border-gray-200' : ''}`}
                  style={{ gridTemplateColumns: `repeat(${numHours}, 1fr)`, height: ROW_H }}
                >
                  {r.cells.map((c, ci) => (
                    <div key={ci} className="border-l border-gray-100 first:border-l-0">{c}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer hasWaves={hasWaves} modelLabel={modelLabel} modelDesc={modelDesc} />
    </>
  );
}

function EmptyState() {
  return <div className="text-center text-sm text-gray-400 py-8">Forecast unavailable</div>;
}

function Footer({ hasWaves, modelLabel, modelDesc }: { hasWaves: boolean; modelLabel?: string; modelDesc?: string }) {
  return (
    <>
      <div className="mt-3 flex items-center gap-1 flex-wrap">
        <span className="text-[9px] text-gray-400 mr-1">Wind:</span>
        {WIND_LEGEND.map((r) => (
          <span key={r.label} className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: r.color }}>
            ≤{r.max} {r.label}
          </span>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100">
        <p className="text-[9px] text-gray-400">
          <span className="font-semibold text-emerald-600">{modelLabel ?? 'ICON-EU'}</span> — {modelDesc ?? 'DWD 7km high-resolution model'}{hasWaves && <span className="text-cyan-600"> · Waves: Open-Meteo Marine</span>}
        </p>
        <p className="text-[9px] text-gray-300 mt-1">
          Wind & gusts in kts · Waves in meters · Arrow = wind destination
        </p>
      </div>
    </>
  );
}

/* ── Forecast section helper ── */
function ForecastSection({
  title, titleColor, forecast, waves, modelLabel, modelDesc, shoreNormal,
}: {
  title: string;
  titleColor: string;
  forecast: ModelForecast | null;
  waves: WaveForecastHour[];
  modelLabel: string;
  modelDesc: string;
  shoreNormal: number;
}) {
  return (
    <div>
      <p className={`text-[11px] font-bold ${titleColor} mb-2`}>{title}</p>
      {forecast && forecast.hours.length > 0
        ? <HourlyGrid forecasts={[forecast]} waves={waves} modelLabel={modelLabel} modelDesc={modelDesc} shoreNormal={shoreNormal} />
        : <EmptyState />
      }
    </div>
  );
}

/* ── Main component ── */
export function WindForecast({
  granularity, onGranularityChange,
  forecast1km, forecast3km, forecast9km,
  waves1km, waves3km, waves9km,
  loading,
  shoreNormal,
}: WindForecastProps) {
  if (loading) {
    return (
      <div className="metric-card animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-gray-900">Wind Forecast</p>
          <p className="text-[10px] text-gray-400">Every {granularity}h · WRF models</p>
        </div>
        <GranularitySelector value={granularity} onChange={onGranularityChange} />
      </div>

      <div className="space-y-6">
        <ForecastSection
          title="WRF 1km — Next 24h"
          titleColor="text-emerald-600"
          forecast={forecast1km}
          waves={waves1km}
          modelLabel="WRF 1km"
          modelDesc="Météo-France AROME ~1.3km"
          shoreNormal={shoreNormal}
        />
        <ForecastSection
          title="WRF 3km — Next 72h"
          titleColor="text-blue-600"
          forecast={forecast3km}
          waves={waves3km}
          modelLabel="WRF 3km"
          modelDesc="DWD ICON-EU 7km"
          shoreNormal={shoreNormal}
        />
        <ForecastSection
          title="WRF 9km — Next 5 days"
          titleColor="text-violet-600"
          forecast={forecast9km}
          waves={waves9km}
          modelLabel="WRF 9km"
          modelDesc="NOAA GFS 25km"
          shoreNormal={shoreNormal}
        />
      </div>
    </div>
  );
}

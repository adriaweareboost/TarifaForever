import React, { useState } from 'react';
import type { TideDay } from '../../types/weather';
import type { TideSource } from '../../hooks/useWeatherData';
import { LOCALE } from '../../config';
import { TideChart } from './TideChart';
import { useScrollFade } from '../../hooks/useScrollFade';

interface TidePanelProps {
  tides: TideDay[];
  source: TideSource;
}

const SOURCE_LABEL: Record<TideSource, string> = {
  noaa: 'NOAA Tides & Currents',
  'open-meteo': 'Open-Meteo Marine',
  simulated: 'Simulated (harmonic model)',
};

export function TidePanel({ tides, source }: TidePanelProps) {
  const [selectedDay, setSelectedDay] = useState(0);
  const { scrollRef, wrapClass } = useScrollFade();

  if (!tides.length) return null;

  const now = new Date();
  const allPoints = tides.flatMap(day => day.points);
  const nextTide = allPoints.find(point => new Date(point.time) > now);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2 mb-0">
          <span className="text-xl">🌊</span> Tides
        </h2>
        <span className="text-[10px] text-gray-400">
          Data: {SOURCE_LABEL[source]}
        </span>
      </div>

      {/* Next tide highlight */}
      {nextTide && (
        <div className={`rounded-xl p-4 border ${
          nextTide.type === 'high'
            ? 'bg-blue-50 border-blue-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Next Tide</p>
              <p className="text-lg font-extrabold text-gray-900 mt-0.5">
                {nextTide.type === 'high' ? '⬆ High Tide' : '⬇ Low Tide'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-gray-900">
                {new Date(nextTide.time).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm text-gray-500">{nextTide.height}m</p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="metric-card">
        <TideChart day={tides[selectedDay]} />
      </div>

      {/* Day selector */}
      <div className={`${wrapClass} scroll-fade-gray`}>
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Tide days">
          {tides.map((day, i) => {
            const date = new Date(day.date + 'T00:00:00');
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = date.getDate();
            const label = i === 0 ? 'Today' : `${dayName} ${dayNum}`;
            return (
              <button
                key={day.date}
                role="tab"
                aria-selected={selectedDay === i}
                onClick={() => setSelectedDay(i)}
                className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedDay === i
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-brand-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tide events list */}
      <div className="space-y-2" role="tabpanel">
        {tides[selectedDay].points.map((point, i) => (
          <div key={i} className="flex items-center justify-between py-2 px-3 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                point.type === 'high' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {point.type === 'high' ? '↑' : '↓'}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {point.type === 'high' ? 'High' : 'Low'} Tide
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-900">{point.height}m</span>
              <span className="text-sm text-gray-500">
                {new Date(point.time).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

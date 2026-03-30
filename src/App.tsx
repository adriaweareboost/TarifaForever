import { ErrorBoundary } from './components/ErrorBoundary';
import { VideoPlayer } from './components/VideoPlayer';
import { NoStreamPlaceholder } from './components/VideoPlayer/NoStreamPlaceholder';
import { WeatherPanel } from './components/WeatherPanel';
import { TidePanel } from './components/TidePanel';
import { SpotSelector } from './components/SpotSelector';
import { Layout } from './components/Layout';
import { useWeatherData } from './hooks/useWeatherData';
import { useActiveSpot } from './hooks/useActiveSpot';
import { useForecast } from './hooks/useForecast';
import { WindForecast } from './components/WindForecast';
import { recommendKiteSize, getQualityFactors } from './utils/quality';
import { LOCALE } from './config';
import type { WeatherData } from './types/weather';

const QUALITY_CONFIG = {
  good: { label: 'Great Conditions', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', emoji: '🪁' },
  moderate: { label: 'Fair Conditions', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', emoji: '🌤' },
  poor: { label: 'Poor Conditions', bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-500', emoji: '⛈' },
} as const;

const FACTOR_STATUS = {
  good: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✓' },
  warn: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '~' },
  bad: { bg: 'bg-red-100', text: 'text-red-700', icon: '✗' },
} as const;

function ConditionsAndGear({ weather }: { weather: WeatherData }) {
  const q = QUALITY_CONFIG[weather.quality];
  const timeStr = new Date().toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  const factors = getQualityFactors(weather.windSpeed, weather.windGust, weather.waveHeight);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Conditions */}
      <div className={`metric-card border ${q.bg}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{q.emoji}</span>
          <div>
            <p className={`font-bold text-sm ${q.text}`}>{q.label}</p>
            <p className="text-xs opacity-60">Updated at {timeStr}</p>
          </div>
        </div>

        <div className="space-y-2">
          {factors.map((f) => {
            const s = FACTOR_STATUS[f.status];
            return (
              <div key={f.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full ${s.bg} ${s.text} flex items-center justify-center text-[10px] font-bold`}>
                    {s.icon}
                  </span>
                  <span className="text-xs font-medium text-gray-600">{f.label}</span>
                </div>
                <span className={`text-xs font-bold ${s.text}`}>{f.value}</span>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-gray-400 mt-3">
          Ideal: wind 12-30kts · gusts &lt;1.6× · waves 0.3-2.5m
        </p>
      </div>

      {/* Gear Recommendation */}
      <div className="metric-card">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🪁</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Gear Recommendation</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-[10px] text-emerald-600 font-semibold uppercase">Recommended</p>
          <p className="text-xl font-extrabold text-gray-900 mt-1">
            Kite Size: {recommendKiteSize(weather.windSpeed)}m&sup2;
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Based on {weather.windSpeed} kts avg wind for 80kg rider
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { activeSpot, setActiveSpot } = useActiveSpot();
  const { spotData, loading, error, refreshData, averages, tideSource } = useWeatherData(activeSpot);
  const { forecasts, waves, loading: forecastLoading } = useForecast(activeSpot);

  return (
    <ErrorBoundary fallbackMessage="Tarifa Forever encountered an error. Please refresh the page.">
      <Layout headerRight={<SpotSelector activeSpot={activeSpot} onSelect={setActiveSpot} />}>
        <div className="container mx-auto px-4 py-4 space-y-4 max-w-5xl">
          <ErrorBoundary fallbackMessage="Video stream unavailable.">
            {activeSpot.twitchChannel ? (
              <VideoPlayer
                twitchChannel={activeSpot.twitchChannel}
                spotName={spotData.name}
                spotLocation={spotData.location}
              />
            ) : (
              <NoStreamPlaceholder spotName={spotData.name} spotLocation={spotData.location} />
            )}
          </ErrorBoundary>

          <ConditionsAndGear weather={spotData.weather} />

          <ErrorBoundary fallbackMessage="Weather data unavailable.">
            <WeatherPanel data={spotData.weather} averages={averages} loading={loading} onRefresh={refreshData} />
          </ErrorBoundary>

          <ErrorBoundary fallbackMessage="Wind forecast unavailable.">
            <WindForecast forecasts={forecasts} waves={waves} loading={forecastLoading} />
          </ErrorBoundary>

          <ErrorBoundary fallbackMessage="Tide data unavailable.">
            <TidePanel tides={spotData.tides} source={tideSource} />
          </ErrorBoundary>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm" role="alert">
              {error}
            </div>
          )}
        </div>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;

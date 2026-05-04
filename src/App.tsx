import { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { VideoPlayer } from './components/VideoPlayer';
import { NoStreamPlaceholder } from './components/VideoPlayer/NoStreamPlaceholder';
import { TidePanel } from './components/TidePanel';
import { SpotSelector } from './components/SpotSelector';
import { Layout } from './components/Layout';
import { CookieConsent } from './components/CookieConsent';
import { useWeatherData } from './hooks/useWeatherData';
import { useActiveSpot } from './hooks/useActiveSpot';
import { useForecast } from './hooks/useForecast';
import { WindForecast } from './components/WindForecast';
import { BestMoment } from './components/BestMoment';
import { WindTrend } from './components/WindTrend';
import { WindCompass } from './components/WeatherPanel/WindCompass';
import { recommendKiteSize, getQualityFactors, WEIGHT_PROFILES, calcWaveridingScore, getWindShoreLabel } from './utils/quality';
import { LOCALE } from './config';
import type { SpotConfig } from './config';
import type { WeatherData, WeatherAverages } from './types/weather';
import { Wind, Waves, Thermometer, Compass, ChevronDown } from 'lucide-react';

const QUALITY_CONFIG = {
  good: { label: 'Great Conditions', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', emoji: '🪁' },
  moderate: { label: 'Fair Conditions', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', emoji: '🏄' },
  poor: { label: 'Poor Conditions', bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-500', emoji: '🚫' },
} as const;

const FACTOR_STATUS = {
  good: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '💨' },
  warn: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '⚠' },
  bad: { bg: 'bg-red-100', text: 'text-red-700', icon: '🛑' },
} as const;

function ConditionsAndGear({ weather, averages, spot }: { weather: WeatherData; averages: WeatherAverages | null; spot: SpotConfig }) {
  const q = QUALITY_CONFIG[weather.quality];
  const timeStr = new Date().toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  const factors = getQualityFactors(weather.windSpeed, weather.windGust, weather.waveHeight);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className={`grid grid-cols-1 ${detailsOpen ? '' : 'md:grid-cols-2'} gap-4`}>
      {/* Conditions */}
      <div className={`metric-card border ${q.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Now</span>
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/70 border border-gray-200 text-gray-500 hover:text-brand-500 hover:border-brand-300 transition-colors shadow-sm"
          >
            {detailsOpen ? 'Hide' : 'Details'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
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
                    {f.label === 'Waves' ? '🌊' : s.icon}
                  </span>
                  <span className="text-base font-medium text-gray-600">{f.label}</span>
                </div>
                <span className={`text-base font-bold ${s.text}`}>{f.value}</span>
              </div>
            );
          })}
        </div>

        {/* Swell & Waveriding Score */}
        {weather.swellHeight > 0 && (() => {
          const score = calcWaveridingScore(weather.swellHeight, weather.swellPeriod, weather.windSpeed, weather.windDirection, spot.shoreNormal);
          const shoreLabel = getWindShoreLabel(weather.windDirection, spot.shoreNormal);
          const shoreLabelDisplay: Record<string, string> = {
            offshore: 'Offshore', 'cross-off': 'Cross-off', cross: 'Cross',
            'cross-on': 'Cross-on', onshore: 'Onshore',
          };
          const scoreColor = score >= 7 ? 'text-emerald-600' : score >= 4 ? 'text-amber-600' : 'text-red-500';
          const scoreBg = score >= 7 ? 'bg-emerald-100' : score >= 4 ? 'bg-amber-100' : 'bg-red-100';
          return (
            <div className="mt-3 pt-3 border-t border-gray-200/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Waveriding</span>
                <span className={`text-sm font-extrabold ${scoreColor} ${scoreBg} px-1.5 py-0.5 rounded-md`}>{score}/10</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Swell</span>
                  <span className="text-sm font-bold text-gray-900">{weather.swellHeight}m · {weather.swellPeriod}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Wind/Shore</span>
                  <span className={`text-sm font-bold ${shoreLabel === 'offshore' || shoreLabel === 'cross-off' ? 'text-emerald-600' : shoreLabel === 'onshore' || shoreLabel === 'cross-on' ? 'text-red-500' : 'text-amber-600'}`}>
                    {shoreLabelDisplay[shoreLabel]}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                {score >= 7 ? 'Great for strapless!' : score >= 4 ? 'Rideable waves, worth trying' : 'Choppy / flat — twin tip day'}
              </p>
            </div>
          );
        })()}

        <p className="text-[10px] text-gray-400 mt-3">
          Ideal: wind 12-30kts · gusts &lt;1.6× · waves 0.3-2.5m
        </p>

        {/* Expandable details inside the NOW card */}
        {detailsOpen && (
          <div className="mt-4 pt-3 border-t border-gray-200/50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <Wind className="w-3 h-3 text-brand-400" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">Wind</span>
                </div>
                <p className="text-xl font-extrabold text-gray-900">{weather.windSpeed} <span className="text-xs font-medium text-gray-400">kts</span></p>
                <p className="text-[10px] text-brand-500 font-medium">Gusts +{Math.round(weather.windGust - weather.windSpeed)}kts</p>
                {averages && <p className="text-[9px] text-gray-400">Avg: {averages.avgWindSpeed} kts</p>}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <Compass className="w-3 h-3 text-brand-400" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">Direction</span>
                </div>
                <p className="text-xl font-extrabold text-gray-900">{weather.windDirectionLabel}</p>
                <p className="text-[10px] text-gray-400">{weather.windDirection}&deg;</p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <Waves className="w-3 h-3 text-brand-400" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">Waves</span>
                </div>
                <p className="text-xl font-extrabold text-gray-900">{weather.waveHeight} <span className="text-xs font-medium text-gray-400">m</span></p>
                <p className="text-[10px] text-gray-400">Period: {weather.wavePeriod}s</p>
                {averages && <p className="text-[9px] text-gray-400">Avg: {averages.avgWaveHeight}m</p>}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <Thermometer className="w-3 h-3 text-brand-400" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">Air</span>
                </div>
                <p className="text-xl font-extrabold text-gray-900">{weather.temperature}<span className="text-xs font-medium text-gray-400">&deg;C</span></p>
                <p className="text-[10px] text-gray-400">Water: {weather.waterTemperature > 0 ? `${weather.waterTemperature}°C` : '--'}</p>
                {averages && <p className="text-[9px] text-gray-400">Avg: {averages.avgTemperature}&deg;C</p>}
              </div>
            </div>
            <div className="flex justify-center pt-2">
              <WindCompass direction={weather.windDirection} speed={weather.windSpeed} />
            </div>
          </div>
        )}
      </div>

      {/* Gear Recommendation */}
      <div className="metric-card flex flex-col">
        <div className="mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Gear Recommendation</span>
        </div>
        <div className="grid grid-cols-2 gap-3 flex-1">
          {WEIGHT_PROFILES.map(({ id, label }) => (
            <div key={id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-[10px] text-emerald-600 font-semibold uppercase">{label}</p>
              {(() => {
                const size = recommendKiteSize(weather.windGust, id);
                const isRest = size === 'Not enough wind';
                return (
                  <p className={`mt-1 font-extrabold text-gray-900 ${isRest ? 'text-xs' : 'text-lg'}`}>
                    {isRest ? size : <>{size}m&sup2;</>}
                  </p>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const { activeSpot, setActiveSpot } = useActiveSpot();
  const { spotData, loading, error, refreshData, averages, tideSource } = useWeatherData(activeSpot);
  const {
    granularity, setGranularity,
    forecast1km, forecast3km, forecast9km,
    waves1km, waves3km, waves9km,
    forecasts,
    loading: forecastLoading,
  } = useForecast(activeSpot);

  return (
    <>
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

          <ConditionsAndGear weather={spotData.weather} averages={averages} spot={activeSpot} />

          <WindTrend history={spotData.weatherHistory} live={spotData.weather} />

          <BestMoment forecasts={forecasts} loading={forecastLoading} />

          <ErrorBoundary fallbackMessage="Wind forecast unavailable.">
            <WindForecast
              granularity={granularity}
              onGranularityChange={setGranularity}
              forecast1km={forecast1km}
              forecast3km={forecast3km}
              forecast9km={forecast9km}
              waves1km={waves1km}
              waves3km={waves3km}
              waves9km={waves9km}
              loading={forecastLoading}
              shoreNormal={activeSpot.shoreNormal}
            />
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
    <CookieConsent />
  </>
  );
}

export default App;

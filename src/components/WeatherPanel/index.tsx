import React from 'react';
import { Wind, Waves, Thermometer, Compass, Gauge, RefreshCw } from 'lucide-react';
import { WeatherData } from '../../types/weather';
import { WindCompass } from './WindCompass';

interface WeatherPanelProps {
  data: WeatherData;
  averages: {
    avgWindSpeed: number;
    avgWindDirection: number;
    avgTemperature: number;
    avgWaveHeight: number;
  } | null;
  loading: boolean;
  onRefresh: () => void;
}

export function WeatherPanel({ data, averages, loading, onRefresh }: WeatherPanelProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="section-title">Live Conditions</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Wind */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Wind</span>
            <Wind className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {data.windSpeed} <span className="text-base font-medium text-gray-400">kts</span>
          </p>
          <p className="text-xs text-brand-500 font-medium mt-1">
            Gusts +{Math.round(data.windGust - data.windSpeed)}kts
          </p>
          {averages && (
            <p className="text-[10px] text-gray-400 mt-0.5">Avg today: {averages.avgWindSpeed} kts</p>
          )}
        </div>

        {/* Direction */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Direction</span>
            <Compass className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-3xl font-extrabold text-gray-900">{data.windDirectionLabel}</p>
          <p className="text-xs text-gray-400 mt-1">{data.windDirection}&deg;</p>
        </div>

        {/* Waves */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Waves</span>
            <Waves className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {data.waveHeight} <span className="text-base font-medium text-gray-400">m</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Period: {data.wavePeriod}s</p>
          {averages && (
            <p className="text-[10px] text-gray-400 mt-0.5">Avg today: {averages.avgWaveHeight}m</p>
          )}
        </div>

        {/* Air Temp */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Air</span>
            <Thermometer className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {data.temperature}<span className="text-base font-medium text-gray-400">&deg;C</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Water: {data.waterTemperature > 0 ? `${data.waterTemperature}&deg;C` : '--'}
          </p>
          {averages && (
            <p className="text-[10px] text-gray-400 mt-0.5">Avg today: {averages.avgTemperature}&deg;C</p>
          )}
        </div>
      </div>

      {/* Wind Compass */}
      <div className="metric-card flex flex-col items-center py-5">
        <p className="text-sm font-bold text-gray-900 mb-2">Wind Direction</p>
        <WindCompass direction={data.windDirection} speed={data.windSpeed} />
      </div>

      {/* Data source */}
      <p className="text-[10px] text-gray-400 text-center">
        Data: Open-Meteo (ECMWF/GFS) &middot; Updated {data.timestamp ? new Date(data.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--'}
      </p>
    </div>
  );
}

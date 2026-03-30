import type { WeatherData, WeatherAverages } from '../types/weather';
import { circularMeanDegrees, round1 } from './wind';

/** Compute daily averages from a list of weather readings */
export function computeAverages(history: WeatherData[]): WeatherAverages | null {
  if (history.length === 0) return null;

  const n = history.length;

  return {
    avgWindSpeed: round1(history.reduce((sum, h) => sum + h.windSpeed, 0) / n),
    avgWindDirection: Math.round(circularMeanDegrees(history.map(h => h.windDirection))),
    avgTemperature: round1(history.reduce((sum, h) => sum + h.temperature, 0) / n),
    avgWaveHeight: round1(history.reduce((sum, h) => sum + h.waveHeight, 0) / n),
  };
}

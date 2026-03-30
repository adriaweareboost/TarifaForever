import type { Quality } from '../types/weather';

const MIN_GOOD_WIND = 12;
const MAX_GOOD_WIND = 30;
const MAX_GUST_RATIO = 1.6;
const MIN_OK_WAVES = 0.3;
const MAX_OK_WAVES = 2.5;
const MIN_MODERATE_WIND = 8;
const MAX_MODERATE_WIND = 35;

/** Determine kitesurf quality based on wind, gust and wave conditions */
export function calcQuality(windSpeed: number, windGust: number, waveHeight: number): Quality {
  const goodWind = windSpeed >= MIN_GOOD_WIND && windSpeed <= MAX_GOOD_WIND;
  const safeGust = windGust < windSpeed * MAX_GUST_RATIO;
  const okWaves = waveHeight >= MIN_OK_WAVES && waveHeight <= MAX_OK_WAVES;

  if (goodWind && safeGust && okWaves) return 'good';
  if (windSpeed >= MIN_MODERATE_WIND && windSpeed <= MAX_MODERATE_WIND && okWaves) return 'moderate';
  return 'poor';
}

/** Recommend kite size in m² based on wind speed in knots (for ~80kg rider) */
export function recommendKiteSize(windSpeedKnots: number): string {
  if (windSpeedKnots >= 25) return '7-9';
  if (windSpeedKnots >= 18) return '9-11';
  if (windSpeedKnots >= 12) return '11-13';
  return '13+';
}

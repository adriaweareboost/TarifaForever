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

export interface QualityFactor {
  label: string;
  value: string;
  status: 'good' | 'warn' | 'bad';
}

/** Return individual factor assessments explaining the quality rating */
export function getQualityFactors(windSpeed: number, windGust: number, waveHeight: number): QualityFactor[] {
  const factors: QualityFactor[] = [];

  // Wind
  const goodWind = windSpeed >= MIN_GOOD_WIND && windSpeed <= MAX_GOOD_WIND;
  const moderateWind = windSpeed >= MIN_MODERATE_WIND && windSpeed <= MAX_MODERATE_WIND;
  factors.push({
    label: 'Wind',
    value: `${windSpeed} kts`,
    status: goodWind ? 'good' : moderateWind ? 'warn' : 'bad',
  });

  // Gusts
  const gustRatio = windSpeed > 0 ? windGust / windSpeed : 0;
  const safeGust = windGust < windSpeed * MAX_GUST_RATIO;
  factors.push({
    label: 'Gusts',
    value: `${windGust} kts (×${gustRatio.toFixed(1)})`,
    status: safeGust ? 'good' : 'bad',
  });

  // Waves
  const okWaves = waveHeight >= MIN_OK_WAVES && waveHeight <= MAX_OK_WAVES;
  factors.push({
    label: 'Waves',
    value: `${waveHeight}m`,
    status: okWaves ? 'good' : waveHeight < MIN_OK_WAVES ? 'warn' : 'bad',
  });

  return factors;
}

export type RiderProfile = 'man' | 'woman';

const KITE_RANGES: Record<RiderProfile, { min: number; size: string }[]> = {
  man: [
    { min: 25, size: '7-9' },
    { min: 18, size: '9-11' },
    { min: 12, size: '11-13' },
    { min: 0, size: '13+' },
  ],
  woman: [
    { min: 25, size: '5-7' },
    { min: 18, size: '7-9' },
    { min: 12, size: '9-11' },
    { min: 0, size: '11-13' },
  ],
};

/** Recommend kite size in m² based on wind speed and rider profile */
export function recommendKiteSize(windSpeedKnots: number, profile: RiderProfile = 'man'): string {
  const ranges = KITE_RANGES[profile];
  for (const range of ranges) {
    if (windSpeedKnots >= range.min) return range.size;
  }
  return ranges[ranges.length - 1].size;
}

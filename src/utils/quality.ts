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

export type WeightRange = '45-60' | '60-75' | '75-90' | '90+';

export const WEIGHT_PROFILES: { id: WeightRange; label: string }[] = [
  { id: '45-60', label: '45-60 kg' },
  { id: '60-75', label: '60-75 kg' },
  { id: '75-90', label: '75-90 kg' },
  { id: '90+', label: '90+ kg' },
];

const KITE_RANGES: Record<WeightRange, { min: number; size: string }[]> = {
  '45-60': [
    { min: 35, size: '4' },
    { min: 28, size: '5' },
    { min: 22, size: '6' },
    { min: 18, size: '8' },
    { min: 15, size: '9' },
    { min: 12, size: '11' },
    { min: 10, size: '13' },
    { min: 0, size: '' },
  ],
  '60-75': [
    { min: 35, size: '5' },
    { min: 28, size: '6' },
    { min: 22, size: '8' },
    { min: 18, size: '9' },
    { min: 15, size: '11' },
    { min: 12, size: '13' },
    { min: 10, size: '16' },
    { min: 0, size: '' },
  ],
  '75-90': [
    { min: 35, size: '6' },
    { min: 28, size: '8' },
    { min: 22, size: '9' },
    { min: 18, size: '11' },
    { min: 15, size: '13' },
    { min: 12, size: '16' },
    { min: 0, size: '' },
  ],
  '90+': [
    { min: 35, size: '8' },
    { min: 28, size: '9' },
    { min: 22, size: '11' },
    { min: 18, size: '13' },
    { min: 15, size: '16' },
    { min: 0, size: '' },
  ],
};

/** Recommend kite size in m² based on wind speed and weight range */
export function recommendKiteSize(windSpeedKnots: number, weight: WeightRange = '75-90'): string {
  const ranges = KITE_RANGES[weight];
  for (const range of ranges) {
    if (windSpeedKnots >= range.min) return range.size || 'Not enough wind';
  }
  return 'Not enough wind';
}

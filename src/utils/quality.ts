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

/* ══════════════════════════════════════════════════════
   Waveriding score (1-10)
   Helps riders decide if strapless / wave board is worth it.
   Factors: swell height, swell period, wind speed, wind vs shore angle.
   ══════════════════════════════════════════════════════ */

/** Smallest angular difference (0-180) between two compass bearings */
function angleDiff(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/**
 * Wind-shore relationship label.
 * `shoreNormal` = direction the beach faces (seaward).
 * Wind direction = where the wind comes FROM.
 * Offshore = wind blows FROM land TO sea (wind dir ≈ shoreNormal + 180).
 */
export type WindShoreLabel = 'offshore' | 'cross-off' | 'cross' | 'cross-on' | 'onshore';

export function getWindShoreLabel(windDirection: number, shoreNormal: number): WindShoreLabel {
  // Angle between wind origin and the seaward direction
  const diff = angleDiff(windDirection, shoreNormal);
  // diff ≈ 0  → wind comes from same dir beach faces → onshore
  // diff ≈ 180 → wind comes from inland → offshore
  if (diff >= 157.5) return 'offshore';
  if (diff >= 112.5) return 'cross-off';
  if (diff >= 67.5) return 'cross';
  if (diff >= 22.5) return 'cross-on';
  return 'onshore';
}

export function calcWaveridingScore(
  swellHeight: number,
  swellPeriod: number,
  windSpeed: number,
  windDirection: number,
  shoreNormal: number,
): number {
  // No swell → no waves to ride
  if (swellHeight < 0.2) return 1;

  // Height score (0-4): sweet spot 0.6-1.8m for strapless
  let heightScore: number;
  if (swellHeight < 0.3) heightScore = 0.5;
  else if (swellHeight < 0.5) heightScore = 1;
  else if (swellHeight < 0.8) heightScore = 2;
  else if (swellHeight < 1.2) heightScore = 3;
  else if (swellHeight < 1.8) heightScore = 4;
  else if (swellHeight < 2.5) heightScore = 3;
  else heightScore = 2;

  // Period score (0-3): longer = cleaner, more defined waves
  let periodScore: number;
  if (swellPeriod < 4) periodScore = 0;
  else if (swellPeriod < 6) periodScore = 0.5;
  else if (swellPeriod < 8) periodScore = 1.5;
  else if (swellPeriod < 10) periodScore = 2;
  else if (swellPeriod < 13) periodScore = 2.5;
  else periodScore = 3;

  // Wind-shore score (0-3): offshore cleans the wave face
  const shore = getWindShoreLabel(windDirection, shoreNormal);
  const shoreScores: Record<WindShoreLabel, number> = {
    offshore: 3,
    'cross-off': 2.5,
    cross: 1.5,
    'cross-on': 0.5,
    onshore: 0,
  };
  let windScore = shoreScores[shore];
  // Extra penalty for strong wind (chop regardless of direction)
  if (windSpeed > 25) windScore = Math.max(0, windScore - 1.5);
  else if (windSpeed > 20) windScore = Math.max(0, windScore - 1);
  else if (windSpeed > 15) windScore = Math.max(0, windScore - 0.5);

  const raw = heightScore + periodScore + windScore; // max 10
  return Math.max(1, Math.min(10, Math.round(raw)));
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

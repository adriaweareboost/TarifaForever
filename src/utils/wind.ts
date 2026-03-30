const WIND_DIRECTIONS = [
  'N','NNE','NE','ENE','E','ESE','SE','SSE',
  'S','SSW','SW','WSW','W','WNW','NW','NNW',
] as const;

export type WindDirectionLabel = typeof WIND_DIRECTIONS[number];

/** Convert degrees (0-360) to compass label */
export function degreesToCompass(degrees: number): WindDirectionLabel {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return WIND_DIRECTIONS[index];
}

/** Compute circular mean of an array of angles in degrees */
export function circularMeanDegrees(angles: number[]): number {
  if (angles.length === 0) return 0;
  const n = angles.length;
  const sinSum = angles.reduce((sum, a) => sum + Math.sin(a * Math.PI / 180), 0);
  const cosSum = angles.reduce((sum, a) => sum + Math.cos(a * Math.PI / 180), 0);
  return ((Math.atan2(sinSum / n, cosSum / n) * 180 / Math.PI) + 360) % 360;
}

/** Round to one decimal place */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

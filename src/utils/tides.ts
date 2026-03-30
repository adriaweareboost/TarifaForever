import type { TideDay, TidePoint, TideType } from '../types/weather';

/**
 * Generate simulated tide data using a semidiurnal harmonic model.
 * Tarifa has ~2 highs and ~2 lows per day with ~1.0m tidal range.
 *
 * NOTE: Replace with real API data (NOAA/Stormglass) for production.
 */

const TIDAL_AMPLITUDE = 0.55;
const MEAN_LEVEL = 0.7;
const SEMIDIURNAL_PERIOD_MIN = 12 * 60 + 25; // 12h 25min in minutes
const SCAN_STEP_MIN = 5;
const MINUTES_PER_DAY = 24 * 60;

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

function tideHeight(totalMinutes: number): number {
  const angle = (2 * Math.PI * totalMinutes) / SEMIDIURNAL_PERIOD_MIN;
  return MEAN_LEVEL + TIDAL_AMPLITUDE * Math.cos(angle) + 0.1 * Math.cos(2 * angle);
}

export function generateTideData(days: number = 3): TideDay[] {
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  const phaseOffset = (dayOfYear(baseDate) * 48.84) % SEMIDIURNAL_PERIOD_MIN;
  const result: TideDay[] = [];

  for (let d = 0; d < days; d++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];
    const points: TidePoint[] = [];

    let prevHeight = tideHeight(d * MINUTES_PER_DAY + phaseOffset);
    let prevSlope = 0;

    for (let m = SCAN_STEP_MIN; m <= MINUTES_PER_DAY; m += SCAN_STEP_MIN) {
      const totalMinutes = d * MINUTES_PER_DAY + m + phaseOffset;
      const height = tideHeight(totalMinutes);
      const slope = height - prevHeight;

      if (prevSlope > 0 && slope <= 0) {
        const time = new Date(date);
        time.setMinutes(m - SCAN_STEP_MIN);
        points.push({ time, height: Math.round(prevHeight * 100) / 100, type: 'high' });
      } else if (prevSlope < 0 && slope >= 0) {
        const time = new Date(date);
        time.setMinutes(m - SCAN_STEP_MIN);
        points.push({ time, height: Math.round(prevHeight * 100) / 100, type: 'low' });
      }

      prevHeight = height;
      prevSlope = slope;
    }

    result.push({ date: dateStr, points });
  }

  return result;
}

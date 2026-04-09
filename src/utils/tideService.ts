import type { TideDay, TidePoint, TideHourly } from '../types/weather';
import type { SpotConfig } from '../config';
import { FETCH_TIMEOUT_MS } from '../config';
import { generateTideData } from './tides';

/* ══════════════════════════════════════════════════════
   Open-Meteo Marine API — sea_level_height_msl
   Real tide data calibrated for any global location
   ══════════════════════════════════════════════════════ */

interface OpenMeteoMarineResponse {
  utc_offset_seconds?: number;
  hourly?: {
    time?: string[];
    sea_level_height_msl?: (number | null)[];
  };
}

/**
 * Parabolic interpolation to refine peak time and height between 3 hourly samples.
 * Returns the fractional offset (in hours) from the center sample and the refined height.
 */
function parabolicInterpolation(prev: number, curr: number, next: number): { offset: number; height: number } {
  const denom = 2 * (2 * curr - prev - next);
  if (Math.abs(denom) < 1e-10) return { offset: 0, height: curr };
  const offset = (prev - next) / denom;
  const clampedOffset = Math.max(-0.5, Math.min(0.5, offset));
  const height = curr - 0.25 * (prev - next) * clampedOffset;
  return { offset: clampedOffset, height: Math.round(height * 100) / 100 };
}

/**
 * Detect local maxima (high tide) and minima (low tide) with parabolic peak interpolation
 * for sub-hourly precision.
 */
function detectHighsLows(hourly: TideHourly[]): TidePoint[] {
  const points: TidePoint[] = [];

  for (let i = 1; i < hourly.length - 1; i++) {
    const prev = hourly[i - 1].height;
    const curr = hourly[i].height;
    const next = hourly[i + 1].height;

    let type: 'high' | 'low' | null = null;
    if (curr > prev && curr >= next) type = 'high';
    else if (curr < prev && curr <= next) type = 'low';

    if (type) {
      const { offset, height } = parabolicInterpolation(prev, curr, next);
      const refinedTime = new Date(hourly[i].time.getTime() + offset * 60 * 60 * 1000);
      points.push({ time: refinedTime, height, type });
    }
  }

  return points;
}

/** Extract YYYY-MM-DD from an Open-Meteo local time string */
function localDateKey(timeStr: string): string {
  return timeStr.split('T')[0];
}

async function fetchOpenMeteoTides(spot: SpotConfig, days: number): Promise<TideDay[]> {
  const params = new URLSearchParams({
    latitude: spot.lat.toString(),
    longitude: spot.lng.toString(),
    hourly: 'sea_level_height_msl',
    forecast_days: String(Math.min(days, 7)),
    timezone: 'auto',
    cell_selection: 'sea',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`https://marine-api.open-meteo.com/v1/marine?${params}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Open-Meteo Marine error: HTTP ${res.status}`);

    const data: OpenMeteoMarineResponse = await res.json();
    const times = data.hourly?.time ?? [];
    const rawHeights = data.hourly?.sea_level_height_msl ?? [];

    if (times.length === 0 || rawHeights.length === 0 || rawHeights[0] === null) {
      throw new Error('No tide data returned from Open-Meteo Marine');
    }

    // Normalize heights to positive range (min → 0)
    const validHeights = rawHeights.filter((h): h is number => h !== null);
    const minH = Math.min(...validHeights);
    const offset = -minH;

    // Parse times as LOCAL time (Open-Meteo returns local time with timezone=auto)
    // JavaScript parses ISO without 'Z' as local time of the browser
    const hourly: TideHourly[] = times.map((t, i) => ({
      time: new Date(t),
      height: Math.round(((rawHeights[i] ?? 0) + offset) * 100) / 100,
    }));

    const points = detectHighsLows(hourly);

    // Group by day using the ORIGINAL time string (preserves local date)
    const groupedHourly = new Map<string, TideHourly[]>();
    times.forEach((t, i) => {
      const key = localDateKey(t);
      if (!groupedHourly.has(key)) groupedHourly.set(key, []);
      groupedHourly.get(key)!.push(hourly[i]);
    });

    const groupedPoints = new Map<string, TidePoint[]>();
    points.forEach((p, idx) => {
      // Find the original time string for this point
      const origTime = times.find(t => new Date(t).getTime() === p.time.getTime());
      const key = origTime ? localDateKey(origTime) : p.time.toISOString().split('T')[0];
      if (!groupedPoints.has(key)) groupedPoints.set(key, []);
      groupedPoints.get(key)!.push(p);
    });

    const result: TideDay[] = [];
    for (const [date, hourlyData] of groupedHourly.entries()) {
      result.push({
        date,
        points: (groupedPoints.get(date) ?? []).sort((a, b) => a.time.getTime() - b.time.getTime()),
        hourly: hourlyData,
      });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * NOAA CO-OPS Tides & Currents API response shape.
 * Docs: https://api.tidesandcurrents.noaa.gov/api/prod/
 */
interface NoaaPrediction {
  t: string;  // "2024-01-15 06:42"
  v: string;  // "1.234" (height in meters)
  type: 'H' | 'L';  // High or Low
}

interface NoaaResponse {
  predictions?: NoaaPrediction[];
  error?: { message: string };
}

const NOAA_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

function formatNoaaDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function parseNoaaTime(timeStr: string): Date {
  // NOAA format: "2024-01-15 06:42"
  return new Date(timeStr.replace(' ', 'T') + ':00');
}

function groupByDay(points: TidePoint[]): TideDay[] {
  const grouped = new Map<string, TidePoint[]>();

  for (const point of points) {
    const dateStr = point.time.toISOString().split('T')[0];
    const existing = grouped.get(dateStr) ?? [];
    existing.push(point);
    grouped.set(dateStr, existing);
  }

  return Array.from(grouped.entries()).map(([date, pts]) => ({
    date,
    points: pts.sort((a, b) => a.time.getTime() - b.time.getTime()),
  }));
}

/**
 * Fetch tide predictions from NOAA CO-OPS API.
 * Free, no API key required. US stations only.
 */
async function fetchNoaaTides(stationId: string, days: number): Promise<TideDay[]> {
  const beginDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const params = new URLSearchParams({
    begin_date: formatNoaaDate(beginDate),
    end_date: formatNoaaDate(endDate),
    station: stationId,
    product: 'predictions',
    datum: 'MLLW',
    time_zone: 'lst_ldt',
    units: 'metric',
    format: 'json',
    interval: 'hilo',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${NOAA_BASE_URL}?${params}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`NOAA API error: HTTP ${res.status}`);

    const data: NoaaResponse = await res.json();

    if (data.error) {
      throw new Error(`NOAA API error: ${data.error.message}`);
    }

    if (!data.predictions || data.predictions.length === 0) {
      throw new Error('No tide predictions returned from NOAA');
    }

    const points: TidePoint[] = data.predictions.map(p => ({
      time: parseNoaaTime(p.t),
      height: Math.round(parseFloat(p.v) * 100) / 100,
      type: p.type === 'H' ? 'high' : 'low',
    }));

    return groupByDay(points);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch tide data: prefers NOAA (US) → Open-Meteo Marine (global) → simulated.
 */
export async function fetchTideData(spot: SpotConfig, days: number = 5): Promise<{ tides: TideDay[]; source: 'noaa' | 'open-meteo' | 'simulated' }> {
  const stationId = spot.noaaStationId;

  // 1. Try NOAA if a US station is configured
  if (stationId) {
    try {
      const tides = await fetchNoaaTides(stationId, days);
      return { tides, source: 'noaa' };
    } catch (err) {
      console.warn('[TarifaForever] NOAA tide fetch failed, trying Open-Meteo:', err);
    }
  }

  // 2. Try Open-Meteo Marine (real sea level data, works globally)
  try {
    const tides = await fetchOpenMeteoTides(spot, days);
    return { tides, source: 'open-meteo' };
  } catch (err) {
    console.warn('[TarifaForever] Open-Meteo Marine tide fetch failed, using simulated data:', err);
  }

  // 3. Fallback to simulated
  return { tides: generateTideData(days), source: 'simulated' };
}

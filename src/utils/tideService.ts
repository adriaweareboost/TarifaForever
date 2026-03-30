import type { TideDay, TidePoint } from '../types/weather';
import type { SpotConfig } from '../config';
import { FETCH_TIMEOUT_MS } from '../config';
import { generateTideData } from './tides';

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
 * Fetch tide data: tries NOAA if station configured, falls back to simulated data.
 */
export async function fetchTideData(spot: SpotConfig, days: number = 5): Promise<{ tides: TideDay[]; source: 'noaa' | 'simulated' }> {
  const stationId = spot.noaaStationId;

  if (stationId) {
    try {
      const tides = await fetchNoaaTides(stationId, days);
      return { tides, source: 'noaa' };
    } catch (err) {
      console.warn('[TarifaForever] NOAA tide fetch failed, using simulated data:', err);
    }
  }

  return { tides: generateTideData(days), source: 'simulated' };
}

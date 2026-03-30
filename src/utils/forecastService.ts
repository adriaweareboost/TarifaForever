import type { SpotConfig } from '../config';
import { FETCH_TIMEOUT_MS } from '../config';
import { degreesToCompass, round1 } from './wind';

export interface ForecastDay {
  date: string;           // YYYY-MM-DD
  dateLabel: string;      // "30/03"
  dayLabel: string;       // "Mon", "Tue", etc.
  windSpeed: number;      // kts (daily max)
  windGust: number;       // kts (daily max)
  windDirection: number;  // degrees (dominant)
  windDirectionLabel: string;
}

export interface WaveForecastDay {
  date: string;
  dateLabel: string;
  dayLabel: string;
  waveHeight: number;     // meters (max)
  wavePeriod: number;     // seconds (max)
  waveDirection: number;  // degrees (dominant)
  waveDirectionLabel: string;
}

export interface ModelForecast {
  model: string;
  label: string;
  description: string;
  color: string;
  days: ForecastDay[];
}

interface OpenMeteoDailyResponse {
  daily?: {
    time?: string[];
    wind_speed_10m_max?: number[];
    wind_gusts_10m_max?: number[];
    wind_direction_10m_dominant?: number[];
  };
}

interface OpenMeteoMarineDailyResponse {
  daily?: {
    time?: string[];
    wave_height_max?: number[];
    wave_period_max?: number[];
    wave_direction_dominant?: number[];
  };
}

const MODELS = [
  {
    id: 'ecmwf',
    endpoint: 'https://api.open-meteo.com/v1/ecmwf',
    label: 'ECMWF IFS',
    description: 'European Centre — gold standard',
    color: '#2563eb',
  },
  {
    id: 'gfs',
    endpoint: 'https://api.open-meteo.com/v1/gfs',
    label: 'GFS',
    description: 'NOAA/USA — global reference',
    color: '#dc2626',
  },
  {
    id: 'icon',
    endpoint: 'https://api.open-meteo.com/v1/dwd-icon',
    label: 'ICON',
    description: 'DWD/Germany — best for Europe',
    color: '#059669',
  },
] as const;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

async function fetchWithTimeout(url: string, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchModelForecast(
  spot: SpotConfig,
  model: typeof MODELS[number],
): Promise<ModelForecast> {
  const params = new URLSearchParams({
    latitude: spot.lat.toString(),
    longitude: spot.lng.toString(),
    daily: 'wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant',
    wind_speed_unit: 'kn',
    timezone: 'auto',
    forecast_days: '7',
  });

  const res = await fetchWithTimeout(`${model.endpoint}?${params}`);
  const data: OpenMeteoDailyResponse = await res.json();
  const d = data.daily;

  const days: ForecastDay[] = (d?.time ?? []).map((date, i) => {
    const dir = d?.wind_direction_10m_dominant?.[i] ?? 0;
    return {
      date,
      dateLabel: formatDateLabel(date),
      dayLabel: DAY_NAMES[new Date(date + 'T12:00:00').getDay()],
      windSpeed: round1(d?.wind_speed_10m_max?.[i] ?? 0),
      windGust: round1(d?.wind_gusts_10m_max?.[i] ?? 0),
      windDirection: dir,
      windDirectionLabel: degreesToCompass(dir),
    };
  });

  return {
    model: model.id,
    label: model.label,
    description: model.description,
    color: model.color,
    days,
  };
}

/** Fetch 5-day wave forecast from Open-Meteo Marine API */
export async function fetchWaveForecast(spot: SpotConfig): Promise<WaveForecastDay[]> {
  try {
    const params = new URLSearchParams({
      latitude: spot.lat.toString(),
      longitude: spot.lng.toString(),
      daily: 'wave_height_max,wave_period_max,wave_direction_dominant',
      timezone: 'auto',
      forecast_days: '7',
    });

    const res = await fetchWithTimeout(`https://marine-api.open-meteo.com/v1/marine?${params}`);
    const data: OpenMeteoMarineDailyResponse = await res.json();
    const d = data.daily;

    return (d?.time ?? []).map((date, i) => {
      const dir = d?.wave_direction_dominant?.[i] ?? 0;
      return {
        date,
        dateLabel: formatDateLabel(date),
        dayLabel: DAY_NAMES[new Date(date + 'T12:00:00').getDay()],
        waveHeight: round1(d?.wave_height_max?.[i] ?? 0),
        wavePeriod: round1(d?.wave_period_max?.[i] ?? 0),
        waveDirection: dir,
        waveDirectionLabel: degreesToCompass(dir),
      };
    });
  } catch {
    return [];
  }
}

/** Fetch 5-day wind forecasts from 3 models in parallel */
export async function fetchWindForecast(spot: SpotConfig): Promise<ModelForecast[]> {
  const results = await Promise.allSettled(
    MODELS.map((m) => fetchModelForecast(spot, m)),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<ModelForecast> => r.status === 'fulfilled')
    .map((r) => r.value);
}

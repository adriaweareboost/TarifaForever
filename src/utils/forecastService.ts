import type { SpotConfig } from '../config';
import { FETCH_TIMEOUT_MS } from '../config';
import { degreesToCompass, round1 } from './wind';

export interface ForecastHour {
  time: string;           // ISO datetime
  hourLabel: string;      // "09:00"
  dateLabel: string;      // "01/04"
  dayLabel: string;       // "Mon"
  windSpeed: number;      // kts
  windGust: number;       // kts
  windDirection: number;  // degrees
  windDirectionLabel: string;
  temperature: number;    // °C
  cloudHigh: number;      // % (0-100)
  cloudMid: number;       // % (0-100)
  cloudLow: number;       // % (0-100)
  precipitation: number;  // mm
}

export interface WaveForecastHour {
  time: string;
  hourLabel: string;
  dateLabel: string;
  dayLabel: string;
  waveHeight: number;
  wavePeriod: number;
  waveDirection: number;
  waveDirectionLabel: string;
}

export interface ModelForecast {
  model: string;
  label: string;
  description: string;
  color: string;
  hours: ForecastHour[];
}

/** Group headers for day separators */
export interface DayGroup {
  label: string;      // "Today", "Tue", etc.
  dateLabel: string;  // "01/04"
  startIdx: number;
  count: number;
}

/* ── Daily (7-day) types ── */

export interface ForecastDay {
  date: string;
  dateLabel: string;
  dayLabel: string;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  windDirectionLabel: string;
}

export interface WaveForecastDay {
  date: string;
  dateLabel: string;
  dayLabel: string;
  waveHeight: number;
  wavePeriod: number;
  waveDirection: number;
  waveDirectionLabel: string;
}

export interface ModelForecastDaily {
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

/* ── Hourly (72h) types ── */

interface OpenMeteoHourlyResponse {
  hourly?: {
    time?: string[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
    wind_direction_10m?: number[];
    temperature_2m?: number[];
    cloud_cover_high?: number[];
    cloud_cover_mid?: number[];
    cloud_cover_low?: number[];
    precipitation?: number[];
  };
}

interface OpenMeteoMarineHourlyResponse {
  hourly?: {
    time?: string[];
    wave_height?: number[];
    wave_period?: number[];
    wave_direction?: number[];
  };
}

const MODELS = [
  {
    id: 'icon',
    endpoint: 'https://api.open-meteo.com/v1/forecast',
    label: 'ICON',
    description: 'DWD ICON-EU 7km — best for Europe',
    color: '#059669',
    weight: 1.0,
    extraParams: { models: 'icon_eu' },
  },
] as const;

export type Granularity = 1 | 3 | 6 | 12 | 24;

interface WrfConfig {
  id: string;
  label: string;
  description: string;
  color: string;
  forecastDays: string;
  cutoffHours: number;
  extraParams: Record<string, string>;
}

const WRF_1KM: WrfConfig = {
  id: 'wrf-1km',
  label: 'WRF 1km',
  description: 'High-resolution — next 24h',
  color: '#059669',
  forecastDays: '2',
  cutoffHours: 24,
  extraParams: {},
};

const WRF_3KM: WrfConfig = {
  id: 'wrf-3km',
  label: 'WRF 3km',
  description: 'Extended range — next 72h',
  color: '#2563eb',
  forecastDays: '4',
  cutoffHours: 72,
  extraParams: { models: 'icon_eu' },
};

const WRF_9KM: WrfConfig = {
  id: 'wrf-9km',
  label: 'WRF 9km',
  description: 'Extended range — next 7 days',
  color: '#7c3aed',
  forecastDays: '7',
  cutoffHours: 168,
  extraParams: { models: 'icon_eu' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STEP_HOURS = 3;

function parseHourlyData(
  times: string[],
  getData: (i: number) => ForecastHour,
  stepHours: number = STEP_HOURS,
  cutoffHours: number = 72,
): ForecastHour[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + cutoffHours * 60 * 60 * 1000);
  const hours: ForecastHour[] = [];

  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    if (t < now || t > cutoff) continue;
    if (stepHours > 1 && t.getHours() % stepHours !== 0) continue;
    hours.push(getData(i));
  }

  return hours;
}

function formatHourLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getDayLabel(iso: string): string {
  return DAY_NAMES[new Date(iso).getDay()];
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

const HOURLY_PARAMS = 'wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,cloud_cover_high,cloud_cover_mid,cloud_cover_low,precipitation';

function buildForecastHour(h: OpenMeteoHourlyResponse['hourly'], times: string[], i: number): ForecastHour {
  const dir = h?.wind_direction_10m?.[i] ?? 0;
  return {
    time: times[i],
    hourLabel: formatHourLabel(times[i]),
    dateLabel: formatDateLabel(times[i]),
    dayLabel: getDayLabel(times[i]),
    windSpeed: round1(h?.wind_speed_10m?.[i] ?? 0),
    windGust: round1(h?.wind_gusts_10m?.[i] ?? 0),
    windDirection: dir,
    windDirectionLabel: degreesToCompass(dir),
    temperature: round1(h?.temperature_2m?.[i] ?? 0),
    cloudHigh: Math.round(h?.cloud_cover_high?.[i] ?? 0),
    cloudMid: Math.round(h?.cloud_cover_mid?.[i] ?? 0),
    cloudLow: Math.round(h?.cloud_cover_low?.[i] ?? 0),
    precipitation: round1(h?.precipitation?.[i] ?? 0),
  };
}

async function fetchModelForecast(
  spot: SpotConfig,
  model: typeof MODELS[number],
): Promise<ModelForecast> {
  const params = new URLSearchParams({
    latitude: spot.lat.toString(),
    longitude: spot.lng.toString(),
    hourly: HOURLY_PARAMS,
    wind_speed_unit: 'kn',
    timezone: 'auto',
    forecast_days: '4',
    ...('extraParams' in model ? model.extraParams : {}),
  });

  const res = await fetchWithTimeout(`${model.endpoint}?${params}`);
  const data: OpenMeteoHourlyResponse = await res.json();
  const h = data.hourly;
  const times = h?.time ?? [];

  const hours = parseHourlyData(times, (i) => buildForecastHour(h, times, i));

  return {
    model: model.id,
    label: model.label,
    description: model.description,
    color: model.color,
    hours,
  };
}

/** Fetch wave forecast from Open-Meteo Marine API */
export async function fetchWaveForecast(
  spot: SpotConfig,
  stepHours: number = STEP_HOURS,
  cutoffHours: number = 72,
): Promise<WaveForecastHour[]> {
  try {
    const params = new URLSearchParams({
      latitude: spot.lat.toString(),
      longitude: spot.lng.toString(),
      hourly: 'wave_height,wave_period,wave_direction',
      timezone: 'auto',
      forecast_days: String(Math.ceil(cutoffHours / 24) + 1),
    });

    const res = await fetchWithTimeout(`https://marine-api.open-meteo.com/v1/marine?${params}`);
    const data: OpenMeteoMarineHourlyResponse = await res.json();
    const h = data.hourly;
    const times = h?.time ?? [];

    const now = new Date();
    const cutoff = new Date(now.getTime() + cutoffHours * 60 * 60 * 1000);
    const hours: WaveForecastHour[] = [];

    for (let i = 0; i < times.length; i++) {
      const t = new Date(times[i]);
      if (t < now || t > cutoff) continue;
      if (stepHours > 1 && t.getHours() % stepHours !== 0) continue;
      const dir = h?.wave_direction?.[i] ?? 0;
      hours.push({
        time: times[i],
        hourLabel: formatHourLabel(times[i]),
        dateLabel: formatDateLabel(times[i]),
        dayLabel: getDayLabel(times[i]),
        waveHeight: round1(h?.wave_height?.[i] ?? 0),
        wavePeriod: round1(h?.wave_period?.[i] ?? 0),
        waveDirection: dir,
        waveDirectionLabel: degreesToCompass(dir),
      });
    }

    return hours;
  } catch {
    return [];
  }
}

/** Compute day groups from hourly data for header rendering */
export function computeDayGroups(hours: ForecastHour[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const today = new Date().toDateString();

  for (let i = 0; i < hours.length; i++) {
    const date = new Date(hours[i].time).toDateString();
    const last = groups[groups.length - 1];
    if (last && new Date(hours[last.startIdx].time).toDateString() === date) {
      last.count++;
    } else {
      const isToday = date === today;
      groups.push({
        label: isToday ? 'Today' : hours[i].dayLabel,
        dateLabel: hours[i].dateLabel,
        startIdx: i,
        count: 1,
      });
    }
  }

  return groups;
}

/* ══════════════════════════════════════════════════════
   Daily (7-day) fetch functions
   ══════════════════════════════════════════════════════ */

function formatDailyDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

async function fetchModelForecastDaily(
  spot: SpotConfig,
  model: typeof MODELS[number],
): Promise<ModelForecastDaily> {
  const params = new URLSearchParams({
    latitude: spot.lat.toString(),
    longitude: spot.lng.toString(),
    daily: 'wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant',
    wind_speed_unit: 'kn',
    timezone: 'auto',
    forecast_days: '7',
    ...('extraParams' in model ? model.extraParams : {}),
  });

  const res = await fetchWithTimeout(`${model.endpoint}?${params}`);
  const data: OpenMeteoDailyResponse = await res.json();
  const d = data.daily;

  const days: ForecastDay[] = (d?.time ?? []).map((date, i) => {
    const dir = d?.wind_direction_10m_dominant?.[i] ?? 0;
    return {
      date,
      dateLabel: formatDailyDateLabel(date),
      dayLabel: DAY_NAMES[new Date(date + 'T12:00:00').getDay()],
      windSpeed: round1(d?.wind_speed_10m_max?.[i] ?? 0),
      windGust: round1(d?.wind_gusts_10m_max?.[i] ?? 0),
      windDirection: dir,
      windDirectionLabel: degreesToCompass(dir),
    };
  });

  return { model: model.id, label: model.label, description: model.description, color: model.color, days };
}

export async function fetchWaveForecastDaily(spot: SpotConfig): Promise<WaveForecastDay[]> {
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
        dateLabel: formatDailyDateLabel(date),
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

export async function fetchWindForecastDaily(spot: SpotConfig): Promise<ModelForecastDaily[]> {
  const results = await Promise.allSettled(
    MODELS.map((m) => fetchModelForecastDaily(spot, m)),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<ModelForecastDaily> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/* ══════════════════════════════════════════════════════
   Hourly (72h) fetch functions
   ══════════════════════════════════════════════════════ */

/** Fetch 72h wind forecasts from models in parallel */
export async function fetchWindForecast(spot: SpotConfig): Promise<ModelForecast[]> {
  const results = await Promise.allSettled(
    MODELS.map((m) => fetchModelForecast(spot, m)),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<ModelForecast> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/* ══════════════════════════════════════════════════════
   WRF 1km / 3km dual-resolution fetch
   ══════════════════════════════════════════════════════ */

async function fetchWrfModel(
  spot: SpotConfig,
  config: WrfConfig,
  step: Granularity,
): Promise<ModelForecast> {
  const params = new URLSearchParams({
    latitude: spot.lat.toString(),
    longitude: spot.lng.toString(),
    hourly: HOURLY_PARAMS,
    wind_speed_unit: 'kn',
    timezone: 'auto',
    forecast_days: config.forecastDays,
    ...config.extraParams,
  });

  const res = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params}`);
  const data: OpenMeteoHourlyResponse = await res.json();
  const h = data.hourly;
  const times = h?.time ?? [];

  const hours = parseHourlyData(times, (i) => buildForecastHour(h, times, i), step, config.cutoffHours);

  return {
    model: config.id,
    label: config.label,
    description: config.description,
    color: config.color,
    hours,
  };
}

export async function fetchWrf1km(spot: SpotConfig, step: Granularity = 1): Promise<ModelForecast> {
  return fetchWrfModel(spot, WRF_1KM, step);
}

export async function fetchWrf3km(spot: SpotConfig, step: Granularity = 3): Promise<ModelForecast> {
  return fetchWrfModel(spot, WRF_3KM, step);
}

export async function fetchWrf9km(spot: SpotConfig, step: Granularity = 6): Promise<ModelForecast> {
  return fetchWrfModel(spot, WRF_9KM, step);
}

import type { WeatherData } from '../types/weather';
import type { SpotConfig } from '../config';
import { FETCH_TIMEOUT_MS } from '../config';
import { degreesToCompass, round1 } from './wind';
import { calcQuality } from './quality';

export type WeatherSource = 'aemet' | 'open-meteo-15min' | 'open-meteo';

/* ══════════════════════════════════════════════════════
   Fetch with timeout (shared)
   ══════════════════════════════════════════════════════ */

async function fetchWithTimeout(url: string, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/* ══════════════════════════════════════════════════════
   AEMET — Real observation data (highest reliability)
   Requires VITE_AEMET_API_KEY env var
   ══════════════════════════════════════════════════════ */

const AEMET_API_KEY = import.meta.env.VITE_AEMET_API_KEY as string | undefined;

// AEMET station IDs near Tarifa
const AEMET_STATIONS: Record<string, string> = {
  'tarifa-lances': '6001',      // Tarifa
  'tarifa-valdevaqueros': '6001',
  'tarifa-balneario': '6001',
  'tarifa-town': '6001',
  'canos-de-meca': '5996B',     // Barbate
};

interface AemetObservation {
  fint: string;     // ISO timestamp
  ta?: number;      // Temperature (°C)
  hr?: number;      // Humidity (%)
  vv?: number;      // Wind speed (m/s)
  dv?: number;      // Wind direction (degrees)
  vmax?: number;    // Gust speed (m/s)
}

function msToKnots(ms: number): number {
  return round1(ms * 1.94384);
}

async function fetchAemetData(spot: SpotConfig): Promise<{
  current: WeatherData;
  source: WeatherSource;
} | null> {
  if (!AEMET_API_KEY) return null;

  const stationId = AEMET_STATIONS[spot.id] ?? '6001';

  try {
    // AEMET uses a two-step API: first get the data URL, then fetch data
    const indexRes = await fetchWithTimeout(
      `https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/${stationId}/?api_key=${AEMET_API_KEY}`,
      8000,
    );
    const index = await indexRes.json();
    if (!index.datos) return null;

    // AEMET returns data in latin-1 encoding
    const dataRes = await fetchWithTimeout(index.datos, 8000);
    const buffer = await dataRes.arrayBuffer();
    const text = new TextDecoder('iso-8859-1').decode(buffer);
    const observations: AemetObservation[] = JSON.parse(text);

    if (!observations.length) return null;

    // Get the most recent observation
    const latest = observations[observations.length - 1];
    const windSpeed = msToKnots(latest.vv ?? 0);
    const windGust = msToKnots(Math.max(latest.vv ?? 0, latest.vmax ?? 0));
    const windDirection = latest.dv ?? 0;

    return {
      current: {
        windSpeed,
        windDirection,
        windDirectionLabel: degreesToCompass(windDirection),
        windGust,
        waveHeight: 0, // AEMET doesn't provide wave data, will be filled by marine API
        wavePeriod: 0,
        waveDirection: 0,
        temperature: round1(latest.ta ?? 0),
        humidity: latest.hr ?? 0,
        waterTemperature: 0,
        timestamp: new Date(latest.fint),
        quality: 'moderate', // Recalculated after marine data
      },
      source: 'aemet' as WeatherSource,
    };
  } catch {
    console.warn('[TarifaForever] AEMET API unavailable');
    return null;
  }
}

/* ══════════════════════════════════════════════════════
   Open-Meteo — High-resolution 15-minute data
   Uses ICON-D2 model (2km resolution, best for Europe)
   ══════════════════════════════════════════════════════ */

interface OpenMeteo15minResponse {
  minutely_15?: {
    time: string[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    wind_gusts_10m?: number[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
  };
  current?: {
    time: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
  };
  hourly?: {
    time: string[];
    temperature_2m?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    wind_gusts_10m?: number[];
  };
}

/** Fetch current data from a specific model */
async function fetchModelCurrent(spot: SpotConfig, model: string): Promise<{
  windSpeed: number; windGust: number; windDirection: number; temperature: number; humidity: number;
} | null> {
  try {
    const params = new URLSearchParams({
      latitude: spot.lat.toString(),
      longitude: spot.lng.toString(),
      current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      models: model,
      wind_speed_unit: 'kn',
      timezone: 'auto',
    });
    const res = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params}`, 6000);
    const data = await res.json();
    const c = data.current;
    if (!c) return null;
    return {
      windSpeed: c.wind_speed_10m ?? 0,
      windGust: Math.max(c.wind_speed_10m ?? 0, c.wind_gusts_10m ?? 0),
      windDirection: c.wind_direction_10m ?? 0,
      temperature: c.temperature_2m ?? 0,
      humidity: c.relative_humidity_2m ?? 0,
    };
  } catch {
    return null;
  }
}

/** Weighted average of multiple model readings for better reliability */
async function fetchMultiModelCurrent(spot: SpotConfig): Promise<{
  windSpeed: number; windGust: number; windDirection: number; temperature: number; humidity: number;
} | null> {
  const models = [
    { name: 'icon_eu', weight: 1.0 },       // Best for Europe
    { name: 'ecmwf_ifs025', weight: 0.9 },  // Gold standard global
    { name: 'meteofrance_seamless', weight: 0.8 }, // W. Mediterranean specialist
  ];

  const results = await Promise.allSettled(
    models.map(m => fetchModelCurrent(spot, m.name))
  );

  const valid: { data: NonNullable<Awaited<ReturnType<typeof fetchModelCurrent>>>; weight: number }[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      valid.push({ data: r.value, weight: models[i].weight });
    }
  });

  if (valid.length === 0) return null;

  const totalWeight = valid.reduce((s, v) => s + v.weight, 0);

  // Weighted average for scalar values
  const windSpeed = valid.reduce((s, v) => s + v.data.windSpeed * v.weight, 0) / totalWeight;
  const windGust = valid.reduce((s, v) => s + v.data.windGust * v.weight, 0) / totalWeight;
  const temperature = valid.reduce((s, v) => s + v.data.temperature * v.weight, 0) / totalWeight;
  const humidity = valid.reduce((s, v) => s + v.data.humidity * v.weight, 0) / totalWeight;

  // Circular mean for wind direction
  const sinSum = valid.reduce((s, v) => s + Math.sin(v.data.windDirection * Math.PI / 180) * v.weight, 0) / totalWeight;
  const cosSum = valid.reduce((s, v) => s + Math.cos(v.data.windDirection * Math.PI / 180) * v.weight, 0) / totalWeight;
  const windDirection = ((Math.atan2(sinSum, cosSum) * 180 / Math.PI) + 360) % 360;

  return { windSpeed: round1(windSpeed), windGust: round1(windGust), windDirection: Math.round(windDirection), temperature: round1(temperature), humidity: Math.round(humidity) };
}

async function fetchOpenMeteo15min(spot: SpotConfig): Promise<{
  current: WeatherData;
  history: WeatherData[];
  source: WeatherSource;
}> {
  const { lat, lng } = spot;

  // Fetch multi-model consensus for current conditions (in parallel with 15min history)
  const [multiModel, historyRes] = await Promise.all([
    fetchMultiModelCurrent(spot),
    (async () => {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lng.toString(),
        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
        minutely_15: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,relative_humidity_2m',
        hourly: 'temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
        models: 'icon_seamless',
        wind_speed_unit: 'kn',
        timezone: 'auto',
        forecast_days: '1',
        past_days: '0',
        past_minutely_15: '4',
      });
      const res = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params}`);
      return res.json() as Promise<OpenMeteo15minResponse>;
    })(),
  ]);

  const data = historyRes;

  // Use minutely_15 for most recent data (higher resolution)
  const m15 = data.minutely_15;
  const c = data.current;

  let windSpeed: number, windGust: number, windDirection: number, temperature: number, humidity: number, timestamp: Date;

  // Prefer multi-model consensus for current conditions (most reliable)
  if (multiModel) {
    windSpeed = multiModel.windSpeed;
    windGust = multiModel.windGust;
    windDirection = multiModel.windDirection;
    temperature = multiModel.temperature;
    humidity = multiModel.humidity;
    timestamp = new Date();
  } else if (m15?.time?.length) {
    // Fallback: use 15-min data from ICON
    const now = new Date();
    let latestIdx = -1;
    for (let i = m15.time.length - 1; i >= 0; i--) {
      if (new Date(m15.time[i]) <= now) {
        latestIdx = i;
        break;
      }
    }

    if (latestIdx >= 0) {
      windSpeed = round1(m15.wind_speed_10m?.[latestIdx] ?? 0);
      windGust = round1(Math.max(windSpeed, m15.wind_gusts_10m?.[latestIdx] ?? 0));
      windDirection = m15.wind_direction_10m?.[latestIdx] ?? 0;
      temperature = round1(m15.temperature_2m?.[latestIdx] ?? c?.temperature_2m ?? 0);
      humidity = m15.relative_humidity_2m?.[latestIdx] ?? c?.relative_humidity_2m ?? 0;
      timestamp = new Date(m15.time[latestIdx]);
    } else {
      windSpeed = round1(c?.wind_speed_10m ?? 0);
      windGust = round1(Math.max(c?.wind_speed_10m ?? 0, c?.wind_gusts_10m ?? 0));
      windDirection = c?.wind_direction_10m ?? 0;
      temperature = round1(c?.temperature_2m ?? 0);
      humidity = c?.relative_humidity_2m ?? 0;
      timestamp = new Date(c?.time ?? Date.now());
    }
  } else if (c) {
    windSpeed = round1(c.wind_speed_10m ?? 0);
    windGust = round1(Math.max(c.wind_speed_10m ?? 0, c.wind_gusts_10m ?? 0));
    windDirection = c.wind_direction_10m ?? 0;
    temperature = round1(c.temperature_2m ?? 0);
    humidity = c.relative_humidity_2m ?? 0;
    timestamp = new Date(c.time);
  } else {
    throw new Error('No weather data received');
  }

  const current: WeatherData = {
    windSpeed,
    windDirection,
    windDirectionLabel: degreesToCompass(windDirection),
    windGust,
    waveHeight: 0,
    wavePeriod: 0,
    waveDirection: 0,
    temperature,
    humidity,
    waterTemperature: 0,
    timestamp,
    quality: 'moderate', // Recalculated after marine data
  };

  // Build 15-min history from minutely_15 data
  const history = build15minHistory(m15, data.hourly);

  return { current, history, source: 'open-meteo-15min' };
}

function build15minHistory(
  m15: OpenMeteo15minResponse['minutely_15'],
  hourly: OpenMeteo15minResponse['hourly'],
): WeatherData[] {
  const now = new Date();
  const history: WeatherData[] = [];

  // Prefer 15-min data for recent history
  if (m15?.time?.length) {
    for (let i = 0; i < m15.time.length; i++) {
      const time = new Date(m15.time[i]);
      if (time > now) break;

      const windSpeed = round1(m15.wind_speed_10m?.[i] ?? 0);
      const windGust = round1(Math.max(windSpeed, m15.wind_gusts_10m?.[i] ?? 0));
      const windDirection = m15.wind_direction_10m?.[i] ?? 0;

      history.push({
        windSpeed,
        windDirection,
        windDirectionLabel: degreesToCompass(windDirection),
        windGust,
        waveHeight: 0,
        wavePeriod: 0,
        waveDirection: 0,
        temperature: round1(m15.temperature_2m?.[i] ?? 0),
        humidity: m15.relative_humidity_2m?.[i] ?? 0,
        waterTemperature: 0,
        timestamp: time,
        quality: calcQuality(windSpeed, windGust, 0),
      });
    }
  }

  // Fallback: append hourly if no 15-min data
  if (history.length === 0 && hourly?.time) {
    for (let i = 0; i < hourly.time.length; i++) {
      const time = new Date(hourly.time[i]);
      if (time > now) break;

      const windSpeed = round1(hourly.wind_speed_10m?.[i] ?? 0);
      const windGust = round1(Math.max(windSpeed, hourly.wind_gusts_10m?.[i] ?? 0));
      const windDirection = hourly.wind_direction_10m?.[i] ?? 0;

      history.push({
        windSpeed,
        windDirection,
        windDirectionLabel: degreesToCompass(windDirection),
        windGust,
        waveHeight: 0,
        wavePeriod: 0,
        waveDirection: 0,
        temperature: round1(hourly.temperature_2m?.[i] ?? 0),
        humidity: 0,
        waterTemperature: 0,
        timestamp: time,
        quality: calcQuality(windSpeed, windGust, 0),
      });
    }
  }

  return history;
}

/* ══════════════════════════════════════════════════════
   Marine data (shared)
   ══════════════════════════════════════════════════════ */

interface OpenMeteoMarineResponse {
  current?: {
    wave_height?: number;
    wave_period?: number;
    wave_direction?: number;
  };
}

async function fetchMarineData(spot: SpotConfig): Promise<{
  waveHeight: number;
  wavePeriod: number;
  waveDirection: number;
}> {
  const defaults = { waveHeight: 0, wavePeriod: 0, waveDirection: 0 };

  try {
    const { lat, lng } = spot;
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      current: 'wave_height,wave_period,wave_direction',
      timezone: 'auto',
    });

    const res = await fetchWithTimeout(`https://marine-api.open-meteo.com/v1/marine?${params}`);
    const data: OpenMeteoMarineResponse = await res.json();
    const c = data.current;

    return {
      waveHeight: c?.wave_height ?? 0,
      wavePeriod: c?.wave_period ?? 0,
      waveDirection: c?.wave_direction ?? 0,
    };
  } catch {
    console.warn('[TarifaForever] Marine API unavailable, using defaults');
    return defaults;
  }
}

/* ══════════════════════════════════════════════════════
   Main fetch — cascading: AEMET → 15min → fallback
   ══════════════════════════════════════════════════════ */

export async function fetchWeatherData(spot: SpotConfig): Promise<{
  current: WeatherData;
  history: WeatherData[];
  source: WeatherSource;
}> {
  const marine = await fetchMarineData(spot);

  // 1. Try AEMET (real station observations)
  const aemet = await fetchAemetData(spot);
  if (aemet) {
    // Merge marine data into AEMET observation
    aemet.current.waveHeight = round1(marine.waveHeight);
    aemet.current.wavePeriod = round1(marine.wavePeriod);
    aemet.current.waveDirection = marine.waveDirection;
    aemet.current.quality = calcQuality(aemet.current.windSpeed, aemet.current.windGust, marine.waveHeight);

    // Still fetch Open-Meteo for history
    try {
      const om = await fetchOpenMeteo15min(spot);
      return { current: aemet.current, history: om.history, source: 'aemet' };
    } catch {
      return { current: aemet.current, history: [], source: 'aemet' };
    }
  }

  // 2. Open-Meteo 15-min resolution (ICON-D2, 2km)
  const om = await fetchOpenMeteo15min(spot);

  // Merge marine data
  om.current.waveHeight = round1(marine.waveHeight);
  om.current.wavePeriod = round1(marine.wavePeriod);
  om.current.waveDirection = marine.waveDirection;
  om.current.quality = calcQuality(om.current.windSpeed, om.current.windGust, marine.waveHeight);

  // Update history with marine data
  for (const h of om.history) {
    h.waveHeight = marine.waveHeight;
    h.wavePeriod = marine.wavePeriod;
    h.waveDirection = marine.waveDirection;
    h.quality = calcQuality(h.windSpeed, h.windGust, marine.waveHeight);
  }

  return { current: om.current, history: om.history, source: om.source };
}

import type { WeatherData } from '../types/weather';
import type { SpotConfig } from '../config';
import { FETCH_TIMEOUT_MS } from '../config';
import { degreesToCompass, round1 } from './wind';
import { calcQuality } from './quality';

/** Open-Meteo weather API response shape (partial) */
interface OpenMeteoCurrentResponse {
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

interface OpenMeteoMarineResponse {
  current?: {
    wave_height?: number;
    wave_period?: number;
    wave_direction?: number;
  };
}

/** Fetch with timeout */
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

/** Fetch current weather + hourly data from Open-Meteo */
export async function fetchWeatherData(spot: SpotConfig): Promise<{
  current: WeatherData;
  history: WeatherData[];
}> {
  const { lat, lng } = spot;

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    wind_speed_unit: 'kn',
    timezone: 'auto',
    forecast_days: '1',
    past_days: '0',
  });

  const res = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params}`);
  const data: OpenMeteoCurrentResponse = await res.json();

  const marine = await fetchMarineData(spot);

  const c = data.current;
  if (!c) throw new Error('No current weather data received');

  const windSpeed = round1(c.wind_speed_10m ?? 0);
  const windGust = round1(Math.max(c.wind_speed_10m ?? 0, c.wind_gusts_10m ?? 0));
  const windDirection = c.wind_direction_10m ?? 0;

  const current: WeatherData = {
    windSpeed,
    windDirection,
    windDirectionLabel: degreesToCompass(windDirection),
    windGust,
    waveHeight: round1(marine.waveHeight),
    wavePeriod: round1(marine.wavePeriod),
    waveDirection: marine.waveDirection,
    temperature: round1(c.temperature_2m ?? 0),
    humidity: c.relative_humidity_2m ?? 0,
    waterTemperature: 0,
    timestamp: new Date(c.time),
    quality: calcQuality(windSpeed, windGust, marine.waveHeight),
  };

  const history = buildHistory(data, marine);

  return { current, history };
}

/** Fetch marine/wave data from Open-Meteo Marine API */
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

/** Build hourly history from Open-Meteo hourly data */
function buildHistory(
  data: OpenMeteoCurrentResponse,
  marine: { waveHeight: number; wavePeriod: number; waveDirection: number },
): WeatherData[] {
  const hourly = data.hourly;
  if (!hourly?.time) return [];

  const now = new Date();
  const history: WeatherData[] = [];

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
      waveHeight: marine.waveHeight,
      wavePeriod: marine.wavePeriod,
      waveDirection: marine.waveDirection,
      temperature: round1(hourly.temperature_2m?.[i] ?? 0),
      humidity: 0,
      waterTemperature: 0,
      timestamp: time,
      quality: calcQuality(windSpeed, windGust, marine.waveHeight),
    });
  }

  return history;
}

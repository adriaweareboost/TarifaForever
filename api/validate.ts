import type { VercelRequest, VercelResponse } from '@vercel/node';

const AEMET_API_KEY = process.env.VITE_AEMET_API_KEY;
const STATION_ID = '6001'; // Tarifa
const TARIFA_LAT = 36.0128;
const TARIFA_LNG = -5.6045;
const TOLERANCE_KTS = 8; // Alert if sources diverge more than 8 kts

interface ValidationResult {
  timestamp: string;
  aemet: { windSpeed: number; windGust: number; direction: number; temp: number } | null;
  openMeteo: { windSpeed: number; windGust: number; direction: number; temp: number } | null;
  divergence: { wind: number; gust: number; direction: number; temp: number } | null;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

function msToKnots(ms: number): number {
  return Math.round(ms * 1.94384 * 10) / 10;
}

async function fetchAemet(): Promise<ValidationResult['aemet']> {
  if (!AEMET_API_KEY) return null;

  try {
    const indexRes = await fetch(
      `https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/${STATION_ID}/?api_key=${AEMET_API_KEY}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const index = await indexRes.json();
    if (!index.datos) return null;

    const dataRes = await fetch(index.datos, { signal: AbortSignal.timeout(8000) });
    const buffer = await dataRes.arrayBuffer();
    const text = new TextDecoder('iso-8859-1').decode(buffer);
    const observations = JSON.parse(text);

    if (!observations.length) return null;
    const o = observations[observations.length - 1];

    return {
      windSpeed: msToKnots(o.vv ?? 0),
      windGust: msToKnots(Math.max(o.vv ?? 0, o.vmax ?? 0)),
      direction: o.dv ?? 0,
      temp: Math.round((o.ta ?? 0) * 10) / 10,
    };
  } catch {
    return null;
  }
}

async function fetchOpenMeteo(): Promise<ValidationResult['openMeteo']> {
  try {
    const params = new URLSearchParams({
      latitude: TARIFA_LAT.toString(),
      longitude: TARIFA_LNG.toString(),
      current: 'temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      models: 'icon_seamless',
      wind_speed_unit: 'kn',
      timezone: 'auto',
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    const c = data.current;
    if (!c) return null;

    return {
      windSpeed: Math.round((c.wind_speed_10m ?? 0) * 10) / 10,
      windGust: Math.round(Math.max(c.wind_speed_10m ?? 0, c.wind_gusts_10m ?? 0) * 10) / 10,
      direction: c.wind_direction_10m ?? 0,
      temp: Math.round((c.temperature_2m ?? 0) * 10) / 10,
    };
  } catch {
    return null;
  }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const aemet = await fetchAemet();
  const openMeteo = await fetchOpenMeteo();

  const result: ValidationResult = {
    timestamp: new Date().toISOString(),
    aemet,
    openMeteo,
    divergence: null,
    status: 'ok',
    message: '',
  };

  if (!aemet && !openMeteo) {
    result.status = 'error';
    result.message = 'Both AEMET and Open-Meteo unavailable';
  } else if (!aemet) {
    result.status = 'warning';
    result.message = 'AEMET unavailable — using Open-Meteo only';
  } else if (!openMeteo) {
    result.status = 'warning';
    result.message = 'Open-Meteo unavailable — using AEMET only';
  } else {
    const windDiff = Math.abs(aemet.windSpeed - openMeteo.windSpeed);
    const gustDiff = Math.abs(aemet.windGust - openMeteo.windGust);
    const dirDiff = Math.min(
      Math.abs(aemet.direction - openMeteo.direction),
      360 - Math.abs(aemet.direction - openMeteo.direction),
    );
    const tempDiff = Math.abs(aemet.temp - openMeteo.temp);

    result.divergence = {
      wind: Math.round(windDiff * 10) / 10,
      gust: Math.round(gustDiff * 10) / 10,
      direction: Math.round(dirDiff),
      temp: Math.round(tempDiff * 10) / 10,
    };

    if (windDiff > TOLERANCE_KTS) {
      result.status = 'warning';
      result.message = `Wind divergence: ${windDiff.toFixed(1)} kts (AEMET: ${aemet.windSpeed}, OM: ${openMeteo.windSpeed})`;
    } else {
      result.message = `Sources aligned — wind diff ${windDiff.toFixed(1)} kts`;
    }
  }

  // Log for Vercel dashboard
  console.log(`[VALIDATE] ${result.status.toUpperCase()} | ${result.message}`, JSON.stringify({
    aemet: result.aemet,
    openMeteo: result.openMeteo,
    divergence: result.divergence,
  }));

  res.status(result.status === 'error' ? 500 : 200).json(result);
}

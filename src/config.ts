export interface SpotConfig {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  twitchChannel: string;
  noaaStationId: string | null;
}

/** Available spots */
export const SPOTS: SpotConfig[] = [
  {
    id: 'tarifa-lances',
    name: 'Playa de Los Lances',
    location: 'Tarifa, Cadiz',
    lat: 36.0128,
    lng: -5.6045,
    twitchChannel: 'tarifaforever',
    noaaStationId: null,
  },
  {
    id: 'tarifa-valdevaqueros',
    name: 'Valdevaqueros',
    location: 'Tarifa, Cadiz',
    lat: 36.0583,
    lng: -5.6894,
    twitchChannel: 'tarifaforever',
    noaaStationId: null,
  },
  {
    id: 'fuerteventura-sotavento',
    name: 'Playa de Sotavento',
    location: 'Fuerteventura, Canarias',
    lat: 28.0667,
    lng: -14.3167,
    twitchChannel: '',
    noaaStationId: null,
  },
  {
    id: 'dakhla-lagoon',
    name: 'Dakhla Lagoon',
    location: 'Dakhla, Morocco',
    lat: 23.7148,
    lng: -15.9467,
    twitchChannel: '',
    noaaStationId: null,
  },
  {
    id: 'cabarete',
    name: 'Kite Beach',
    location: 'Cabarete, Dominican Republic',
    lat: 19.7833,
    lng: -70.4167,
    twitchChannel: '',
    noaaStationId: null,
  },
];

/** Default spot */
export const DEFAULT_SPOT_ID = 'tarifa-lances';

export function getSpotById(id: string): SpotConfig {
  return SPOTS.find(s => s.id === id) ?? SPOTS[0];
}

/** How often to refresh weather data from the API (ms) */
export const WEATHER_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Locale for date/time formatting */
export const LOCALE = 'es-ES';

/** Fetch timeout in milliseconds */
export const FETCH_TIMEOUT_MS = 10_000;

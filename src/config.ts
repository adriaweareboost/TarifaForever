export interface SpotConfig {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  twitchChannel: string;
  noaaStationId: string | null;
  /** Direction the beach faces (seaward), in degrees. Used to compute offshore/onshore. */
  shoreNormal: number;
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
    shoreNormal: 170,   // SSE — offshore from N/NNW
  },
  {
    id: 'tarifa-valdevaqueros',
    name: 'Valdevaqueros',
    location: 'Tarifa, Cadiz',
    lat: 36.0583,
    lng: -5.6894,
    twitchChannel: 'tarifaforever',
    noaaStationId: null,
    shoreNormal: 200,   // SSW — offshore from NNE
  },
  {
    id: 'tarifa-balneario',
    name: 'Balneario',
    location: 'Tarifa, Cadiz',
    lat: 36.0089,
    lng: -5.6012,
    twitchChannel: '',
    noaaStationId: null,
    shoreNormal: 175,   // S — offshore from N
  },
  {
    id: 'tarifa-town',
    name: 'Tarifa Town',
    location: 'Tarifa, Cadiz',
    lat: 36.0143,
    lng: -5.6044,
    twitchChannel: '',
    noaaStationId: null,
    shoreNormal: 160,   // SSE — offshore from NNW
  },
  {
    id: 'canos-de-meca',
    name: 'Caños de Meca',
    location: 'Barbate, Cadiz',
    lat: 36.1856,
    lng: -5.9483,
    twitchChannel: '',
    noaaStationId: null,
    shoreNormal: 210,   // SSW — offshore from NNE
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

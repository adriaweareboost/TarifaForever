export type Quality = 'good' | 'moderate' | 'poor';
export type TideType = 'high' | 'low';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface WeatherData {
  windSpeed: number;          // knots
  windDirection: number;      // degrees (0-360)
  windDirectionLabel: string; // e.g. "NNE"
  windGust: number;           // knots
  waveHeight: number;         // meters
  wavePeriod: number;         // seconds
  waveDirection: number;      // degrees
  temperature: number;        // celsius
  humidity: number;           // percentage
  waterTemperature: number;   // celsius
  timestamp: Date;
  quality: Quality;
}

export interface TidePoint {
  time: Date;
  height: number;   // meters
  type: TideType;
}

export interface TideDay {
  date: string;      // ISO date string YYYY-MM-DD
  points: TidePoint[];
}

export interface SpotData {
  id: string;
  name: string;
  location: string;
  coordinates: Coordinates;
  weather: WeatherData;
  tides: TideDay[];
  weatherHistory: WeatherData[];
}

export interface WeatherAverages {
  avgWindSpeed: number;
  avgWindDirection: number;
  avgTemperature: number;
  avgWaveHeight: number;
}

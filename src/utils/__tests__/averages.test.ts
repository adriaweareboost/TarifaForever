import { describe, it, expect } from 'vitest';
import { computeAverages } from '../averages';
import type { WeatherData } from '../../types/weather';

function makeWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    windSpeed: 15,
    windDirection: 180,
    windDirectionLabel: 'S',
    windGust: 20,
    waveHeight: 1.0,
    wavePeriod: 8,
    waveDirection: 200,
    swellHeight: 0.8,
    swellPeriod: 10,
    swellDirection: 220,
    temperature: 22,
    humidity: 60,
    waterTemperature: 19,
    timestamp: new Date(),
    quality: 'good',
    ...overrides,
  };
}

describe('computeAverages', () => {
  it('returns null for empty history', () => {
    expect(computeAverages([])).toBeNull();
  });

  it('returns correct averages for single entry', () => {
    const result = computeAverages([makeWeather({ windSpeed: 20, temperature: 24, waveHeight: 1.5 })]);
    expect(result).not.toBeNull();
    expect(result!.avgWindSpeed).toBe(20);
    expect(result!.avgTemperature).toBe(24);
    expect(result!.avgWaveHeight).toBe(1.5);
  });

  it('computes arithmetic mean for wind speed', () => {
    const history = [
      makeWeather({ windSpeed: 10 }),
      makeWeather({ windSpeed: 20 }),
      makeWeather({ windSpeed: 30 }),
    ];
    const result = computeAverages(history);
    expect(result!.avgWindSpeed).toBe(20);
  });

  it('computes circular mean for wind direction', () => {
    const history = [
      makeWeather({ windDirection: 350 }),
      makeWeather({ windDirection: 10 }),
    ];
    const result = computeAverages(history);
    expect(result!.avgWindDirection).toBe(0);
  });

  it('rounds results to one decimal', () => {
    const history = [
      makeWeather({ temperature: 22.33 }),
      makeWeather({ temperature: 22.67 }),
    ];
    const result = computeAverages(history);
    expect(result!.avgTemperature).toBe(22.5);
  });
});

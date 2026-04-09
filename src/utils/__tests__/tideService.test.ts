import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTideData } from '../tideService';
import type { SpotConfig } from '../../config';

declare const global: { fetch: typeof fetch };

const TEST_SPOT: SpotConfig = {
  id: 'test',
  name: 'Test',
  location: 'Test',
  lat: 36.0,
  lng: -5.6,
  twitchChannel: '',
  noaaStationId: null,
};

const NOAA_SPOT: SpotConfig = {
  ...TEST_SPOT,
  noaaStationId: '8454000',
};

describe('fetchTideData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to simulated when Open-Meteo Marine fails and no NOAA station', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await fetchTideData(TEST_SPOT, 3);
    expect(result.source).toBe('simulated');
    expect(result.tides).toHaveLength(3);
  });

  it('uses Open-Meteo Marine when no NOAA station is configured', async () => {
    const mockResponse = {
      hourly: {
        time: ['2026-04-07T00:00', '2026-04-07T06:00', '2026-04-07T12:00', '2026-04-07T18:00'],
        sea_level_height_msl: [-0.5, 0.5, -0.5, 0.5],
      },
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    const result = await fetchTideData(TEST_SPOT, 1);
    expect(result.source).toBe('open-meteo');
  });

  it('simulated tides have valid structure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await fetchTideData(TEST_SPOT, 2);
    for (const day of result.tides) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(day.points.length).toBeGreaterThan(0);
      for (const point of day.points) {
        expect(point.time).toBeInstanceOf(Date);
        expect(typeof point.height).toBe('number');
        expect(['high', 'low']).toContain(point.type);
      }
    }
  });
});

describe('fetchTideData with NOAA', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to simulated when NOAA fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await fetchTideData(NOAA_SPOT, 3);
    expect(result.source).toBe('simulated');
    expect(result.tides.length).toBeGreaterThan(0);
  });

  it('parses NOAA response correctly when station is configured', async () => {
    const mockResponse = {
      predictions: [
        { t: '2024-06-15 03:42', v: '1.45', type: 'H' },
        { t: '2024-06-15 09:18', v: '0.12', type: 'L' },
        { t: '2024-06-15 16:05', v: '1.38', type: 'H' },
        { t: '2024-06-15 22:30', v: '0.08', type: 'L' },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchTideData(NOAA_SPOT, 1);
    expect(result.source).toBe('noaa');
    expect(result.tides.length).toBeGreaterThan(0);

    const day = result.tides[0];
    expect(day.points).toHaveLength(4);
    expect(day.points[0].type).toBe('high');
    expect(day.points[0].height).toBe(1.45);
    expect(day.points[1].type).toBe('low');
  });

  it('handles NOAA API error response and falls back', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: { message: 'Station not found' } }),
    });

    const result = await fetchTideData(NOAA_SPOT, 3);
    // Falls back to open-meteo (which also fails with this mock) → simulated
    expect(['open-meteo', 'simulated']).toContain(result.source);
  });
});

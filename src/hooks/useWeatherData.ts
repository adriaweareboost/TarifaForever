import { useState, useEffect, useCallback, useRef } from 'react';
import type { SpotData, WeatherAverages } from '../types/weather';
import type { SpotConfig } from '../config';
import { WEATHER_REFRESH_INTERVAL_MS } from '../config';
import { fetchWeatherData } from '../utils/weatherService';
import { fetchTideData } from '../utils/tideService';
import { computeAverages } from '../utils/averages';

function buildInitialSpot(spot: SpotConfig): SpotData {
  return {
    id: spot.id,
    name: spot.name,
    location: spot.location,
    coordinates: { lat: spot.lat, lng: spot.lng },
    weather: {
      windSpeed: 0, windDirection: 0, windDirectionLabel: '--', windGust: 0,
      waveHeight: 0, wavePeriod: 0, waveDirection: 0,
      temperature: 0, humidity: 0, waterTemperature: 0,
      timestamp: new Date(), quality: 'moderate',
    },
    tides: [],
    weatherHistory: [],
  };
}

export type TideSource = 'noaa' | 'simulated';

export function useWeatherData(activeSpot: SpotConfig) {
  const [spotData, setSpotData] = useState<SpotData>(() => buildInitialSpot(activeSpot));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [averages, setAverages] = useState<WeatherAverages | null>(null);
  const [tideSource, setTideSource] = useState<TideSource>('simulated');
  const mountedRef = useRef(true);
  const spotRef = useRef(activeSpot);

  // Reset when spot changes
  useEffect(() => {
    spotRef.current = activeSpot;
    setSpotData(buildInitialSpot(activeSpot));
    setAverages(null);
    setLoading(true);
    setError(null);
  }, [activeSpot.id]);

  const refreshData = useCallback(async () => {
    const spot = spotRef.current;
    setLoading(true);
    setError(null);
    try {
      const [weatherResult, tideResult] = await Promise.all([
        fetchWeatherData(spot),
        fetchTideData(spot, 8),
      ]);
      if (!mountedRef.current) return;
      setSpotData(prev => ({
        ...prev,
        weather: weatherResult.current,
        weatherHistory: weatherResult.history,
        tides: tideResult.tides,
      }));
      setAverages(computeAverages(weatherResult.history));
      setTideSource(tideResult.source);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error fetching weather data');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refreshData();
    const interval = setInterval(refreshData, WEATHER_REFRESH_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [activeSpot.id, refreshData]);

  return { spotData, loading, error, refreshData, averages, tideSource };
}

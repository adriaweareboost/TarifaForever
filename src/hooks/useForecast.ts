import { useState, useEffect } from 'react';
import type { SpotConfig } from '../config';
import {
  fetchWrf1km, fetchWrf3km, fetchWrf9km, fetchWaveForecast,
  fetchWindForecast,
  type ModelForecast, type WaveForecastHour,
  type Granularity,
} from '../utils/forecastService';

export type { Granularity };

export function useForecast(spot: SpotConfig) {
  const [granularity, setGranularity] = useState<Granularity>(3);
  const [forecast1km, setForecast1km] = useState<ModelForecast | null>(null);
  const [forecast3km, setForecast3km] = useState<ModelForecast | null>(null);
  const [forecast9km, setForecast9km] = useState<ModelForecast | null>(null);
  const [waves1km, setWaves1km] = useState<WaveForecastHour[]>([]);
  const [waves3km, setWaves3km] = useState<WaveForecastHour[]>([]);
  const [waves9km, setWaves9km] = useState<WaveForecastHour[]>([]);
  const [forecasts, setForecasts] = useState<ModelForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchWrf1km(spot, granularity),
      fetchWrf3km(spot, granularity),
      fetchWrf9km(spot, granularity),
      fetchWaveForecast(spot, granularity, 24),
      fetchWaveForecast(spot, granularity, 72),
      fetchWaveForecast(spot, granularity, 168),
      fetchWindForecast(spot),
    ]).then(([wrf1, wrf3, wrf9, w1km, w3km, w9km, windLegacy]) => {
      if (!cancelled) {
        setForecast1km(wrf1);
        setForecast3km(wrf3);
        setForecast9km(wrf9);
        setWaves1km(w1km);
        setWaves3km(w3km);
        setWaves9km(w9km);
        setForecasts(windLegacy);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [spot.id, granularity]);

  return {
    granularity, setGranularity,
    forecast1km, forecast3km, forecast9km,
    waves1km, waves3km, waves9km,
    forecasts,
    loading,
  };
}

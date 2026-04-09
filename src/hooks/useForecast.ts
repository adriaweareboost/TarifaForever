import { useState, useEffect } from 'react';
import type { SpotConfig } from '../config';
import {
  fetchWrf1km, fetchWrf3km, fetchWrf9km, fetchWaveForecast,
  fetchWindForecast,
  type ModelForecast, type WaveForecastHour,
  type Granularity,
} from '../utils/forecastService';

export type { Granularity };

function settled<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === 'fulfilled' ? r.value : fallback;
}

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

    Promise.allSettled([
      fetchWrf1km(spot, granularity),
      fetchWrf3km(spot, granularity),
      fetchWrf9km(spot, granularity),
      fetchWaveForecast(spot, granularity, 24),
      fetchWaveForecast(spot, granularity, 72),
      fetchWaveForecast(spot, granularity, 168),
      fetchWindForecast(spot),
    ]).then(([wrf1, wrf3, wrf9, w1km, w3km, w9km, windLegacy]) => {
      if (cancelled) return;
      setForecast1km(settled(wrf1, null));
      setForecast3km(settled(wrf3, null));
      setForecast9km(settled(wrf9, null));
      setWaves1km(settled(w1km, []));
      setWaves3km(settled(w3km, []));
      setWaves9km(settled(w9km, []));
      setForecasts(settled(windLegacy, []));
      setLoading(false);
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

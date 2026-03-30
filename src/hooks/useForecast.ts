import { useState, useEffect } from 'react';
import type { SpotConfig } from '../config';
import { fetchWindForecast, fetchWaveForecast, type ModelForecast, type WaveForecastDay } from '../utils/forecastService';

export function useForecast(spot: SpotConfig) {
  const [forecasts, setForecasts] = useState<ModelForecast[]>([]);
  const [waves, setWaves] = useState<WaveForecastDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([fetchWindForecast(spot), fetchWaveForecast(spot)])
      .then(([windData, waveData]) => {
        if (!cancelled) {
          setForecasts(windData);
          setWaves(waveData);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [spot.id]);

  return { forecasts, waves, loading };
}

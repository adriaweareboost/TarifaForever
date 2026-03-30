import { useState, useCallback } from 'react';
import { SpotConfig, DEFAULT_SPOT_ID, getSpotById } from '../config';

const STORAGE_KEY = 'tarifaforever_active_spot';

function loadSavedSpotId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SPOT_ID;
  } catch {
    return DEFAULT_SPOT_ID;
  }
}

export function useActiveSpot() {
  const [activeSpot, setActiveSpotState] = useState<SpotConfig>(() => getSpotById(loadSavedSpotId()));

  const setActiveSpot = useCallback((spotId: string) => {
    const spot = getSpotById(spotId);
    setActiveSpotState(spot);
    try {
      localStorage.setItem(STORAGE_KEY, spot.id);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return { activeSpot, setActiveSpot };
}

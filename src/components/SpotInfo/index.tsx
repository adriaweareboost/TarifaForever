import { MapPin } from 'lucide-react';
import type { SpotData } from '../../types/weather';
import { recommendKiteSize } from '../../utils/quality';
import { LOCALE } from '../../config';

interface SpotInfoProps {
  spot: SpotData;
}

const QUALITY_CONFIG = {
  good: { label: 'Great Conditions', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', emoji: '🪁' },
  moderate: { label: 'Fair Conditions', bg: 'bg-amber-50 text-amber-700 border-amber-200', emoji: '🌤' },
  poor: { label: 'Poor Conditions', bg: 'bg-red-50 text-red-700 border-red-200', emoji: '⛈' },
} as const;

export function SpotInfo({ spot }: SpotInfoProps) {
  const timeStr = new Date().toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  const q = QUALITY_CONFIG[spot.weather.quality];

  return (
    <div className="space-y-3">
      {/* Quality badge */}
      <div className={`metric-card border ${q.bg}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{q.emoji}</span>
          <div>
            <p className="font-bold text-sm">{q.label}</p>
            <p className="text-xs opacity-70">Updated at {timeStr}</p>
          </div>
        </div>
      </div>

      {/* Spot location */}
      <div className="metric-card">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-brand-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-base font-bold text-gray-900">{spot.name}</h3>
            <p className="text-sm text-gray-500">{spot.location}</p>
          </div>
        </div>
      </div>

      {/* Kite Size Recommendation */}
      <div className="metric-card">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🪁</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Gear Recommendation</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-[10px] text-emerald-600 font-semibold uppercase">Recommended</p>
          <p className="text-xl font-extrabold text-gray-900 mt-1">
            Kite Size: {recommendKiteSize(spot.weather.windSpeed)}m&sup2;
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Based on {spot.weather.windSpeed} kts avg wind for 80kg rider
          </p>
        </div>
      </div>
    </div>
  );
}

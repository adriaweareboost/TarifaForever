import { MapPin } from 'lucide-react';
import type { SpotData } from '../../types/weather';

interface SpotInfoProps {
  spot: SpotData;
}

export function SpotInfo({ spot }: SpotInfoProps) {
  return (
    <div className="metric-card">
      <div className="flex items-start gap-3">
        <MapPin className="w-5 h-5 text-brand-500 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-base font-bold text-gray-900">{spot.name}</h3>
          <p className="text-sm text-gray-500">{spot.location}</p>
        </div>
      </div>
    </div>
  );
}

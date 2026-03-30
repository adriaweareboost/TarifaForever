import React, { useState } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { SPOTS, SpotConfig } from '../../config';

interface SpotSelectorProps {
  activeSpot: SpotConfig;
  onSelect: (spotId: string) => void;
}

export function SpotSelector({ activeSpot, onSelect }: SpotSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-brand-300 transition-colors shadow-sm"
      >
        <MapPin className="w-4 h-4 text-brand-500" />
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{activeSpot.name}</p>
          <p className="text-[10px] text-gray-400">{activeSpot.location}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          {/* Menu */}
          <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-lg border border-gray-100 z-40 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Select Spot</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {SPOTS.map(spot => {
                const isActive = spot.id === activeSpot.id;
                const hasStream = !!spot.twitchChannel;
                return (
                  <button
                    key={spot.id}
                    onClick={() => { onSelect(spot.id); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 transition-colors ${
                      isActive ? 'bg-brand-50' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-brand-600' : 'text-gray-900'}`}>
                        {spot.name}
                      </p>
                      <p className="text-xs text-gray-400">{spot.location}</p>
                      {!hasStream && (
                        <p className="text-[10px] text-amber-500 mt-0.5">No live stream</p>
                      )}
                    </div>
                    {isActive && <Check className="w-4 h-4 text-brand-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

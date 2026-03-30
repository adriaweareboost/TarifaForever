import React from 'react';
import { Camera, Wind, MapPin, Clock } from 'lucide-react';

interface NoStreamPlaceholderProps {
  spotName: string;
  spotLocation: string;
}

export function NoStreamPlaceholder({ spotName, spotLocation }: NoStreamPlaceholderProps) {
  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden shadow-md">
      {/* Animated ocean gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-cyan-400">
        {/* Animated wave layers */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 200" preserveAspectRatio="none" style={{ height: '40%' }}>
          <path
            d="M0,120 C240,180 480,60 720,120 C960,180 1200,60 1440,120 L1440,200 L0,200 Z"
            fill="rgba(255,255,255,0.08)"
            className="animate-[wave_8s_ease-in-out_infinite]"
          />
          <path
            d="M0,140 C200,80 400,180 600,120 C800,60 1000,160 1440,100 L1440,200 L0,200 Z"
            fill="rgba(255,255,255,0.05)"
            className="animate-[wave_10s_ease-in-out_infinite_reverse]"
          />
          <path
            d="M0,160 C300,120 600,180 900,140 C1100,110 1300,170 1440,130 L1440,200 L0,200 Z"
            fill="rgba(255,255,255,0.03)"
            className="animate-[wave_12s_ease-in-out_infinite]"
          />
        </svg>

        {/* Floating kite silhouettes */}
        <div className="absolute top-[15%] right-[20%] opacity-10">
          <svg width="60" height="80" viewBox="0 0 60 80" fill="white">
            <polygon points="30,0 55,35 30,70 5,35" />
          </svg>
        </div>
        <div className="absolute top-[25%] left-[15%] opacity-[0.06] rotate-12">
          <svg width="40" height="55" viewBox="0 0 60 80" fill="white">
            <polygon points="30,0 55,35 30,70 5,35" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-6">
        {/* Camera icon with pulse ring */}
        <div className="relative mb-5">
          <div className="absolute inset-0 w-16 h-16 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="relative w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Camera className="w-7 h-7 text-white/80" />
          </div>
        </div>

        {/* Text */}
        <h3 className="text-lg font-bold text-white mb-1">Camera Coming Soon</h3>
        <div className="flex items-center gap-1.5 text-white/70 text-sm mb-4">
          <MapPin className="w-3.5 h-3.5" />
          <span>{spotName}</span>
          <span className="text-white/30">·</span>
          <span>{spotLocation}</span>
        </div>

        {/* Info card */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl px-5 py-3 border border-white/15 max-w-xs text-center">
          <p className="text-white/80 text-sm">
            We're setting up a live camera for this spot.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3" />
              Weather data active
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Check back soon
            </span>
          </div>
        </div>
      </div>

      {/* Top badge */}
      <div className="absolute top-3 left-3 z-20">
        <span className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white/80 px-2.5 py-1 rounded-lg text-xs font-medium border border-white/10">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
          No Stream
        </span>
      </div>
    </div>
  );
}

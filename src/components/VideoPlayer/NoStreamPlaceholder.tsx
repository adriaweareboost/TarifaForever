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
        </svg>

        {/* Floating kite silhouette */}
        <div className="absolute top-[15%] right-[20%] opacity-10 hidden sm:block">
          <svg width="60" height="80" viewBox="0 0 60 80" fill="white">
            <polygon points="30,0 55,35 30,70 5,35" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
        {/* Camera icon with pulse ring */}
        <div className="relative mb-2 sm:mb-5">
          <div className="absolute inset-0 w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="relative w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Camera className="w-5 h-5 sm:w-7 sm:h-7 text-white/80" />
          </div>
        </div>

        {/* Text */}
        <h3 className="text-sm sm:text-lg font-bold text-white mb-0.5 sm:mb-1">Camera Coming Soon</h3>
        <div className="flex items-center gap-1 sm:gap-1.5 text-white/70 text-xs sm:text-sm">
          <MapPin className="w-3 h-3" />
          <span>{spotName}</span>
          <span className="text-white/30">·</span>
          <span>{spotLocation}</span>
        </div>
      </div>

      {/* Top badge */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20">
        <span className="flex items-center gap-1 sm:gap-1.5 bg-white/15 backdrop-blur-sm text-white/80 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-medium border border-white/10">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
          No Stream
        </span>
      </div>
    </div>
  );
}

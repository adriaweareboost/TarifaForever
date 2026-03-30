import { useRef, useEffect, useState } from 'react';

interface TwitchPlayer {
  setMuted: (m: boolean) => void;
  play: () => void;
  setVolume: (v: number) => void;
  getMuted: () => boolean;
  isPaused: () => boolean;
}

interface TwitchEmbedInstance {
  addEventListener: (event: string, callback: () => void) => void;
  getPlayer: () => TwitchPlayer;
}

interface TwitchEmbedConstructor {
  new (elementId: string, options: Record<string, unknown>): TwitchEmbedInstance;
  VIDEO_READY: string;
  VIDEO_PLAY: string;
}

declare global {
  interface Window {
    Twitch?: { Embed: TwitchEmbedConstructor };
  }
}

interface VideoPlayerProps {
  twitchChannel: string;
  spotName: string;
  spotLocation: string;
  className?: string;
}

export function VideoPlayer({ twitchChannel, spotName, spotLocation, className = '' }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<TwitchEmbedInstance | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    embedRef.current = null;
    setIsPlaying(false);

    if (!containerRef.current) return;

    const TwitchEmbed = window.Twitch?.Embed;
    if (!TwitchEmbed) {
      console.warn('[TarifaForever] Twitch Embed SDK not loaded');
      return;
    }

    containerRef.current.innerHTML = '';
    const parent = window.location.hostname;

    const embed = new TwitchEmbed('twitch-embed', {
      channel: twitchChannel,
      parent: [parent],
      width: '100%',
      height: '100%',
      muted: true,
      autoplay: true,
      controls: false,
      layout: 'video',
    });

    embed.addEventListener(TwitchEmbed.VIDEO_READY, () => {
      const player = embed.getPlayer();
      player.setMuted(true);
      player.setVolume(0);
      player.play();
    });

    embed.addEventListener(TwitchEmbed.VIDEO_PLAY, () => {
      setIsPlaying(true);
    });

    embedRef.current = embed;
  }, [twitchChannel]);

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-md ${className}`}>
      <div className="relative aspect-video bg-gray-900">
        <div id="twitch-embed" ref={containerRef} className="w-full h-full" />

        {isPlaying && <div className="absolute inset-0 z-10" />}

        {/* LIVE badge */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none">
          <span className="flex items-center gap-1.5 bg-red-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold uppercase shadow-lg">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Live Cam
          </span>
        </div>

        {/* Bottom overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-10 z-20 pointer-events-none">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/70 text-xs uppercase tracking-wide">Location</p>
              <p className="text-white font-semibold">{spotName}, {spotLocation}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, RefreshCw, Lock, Sparkles, Check } from 'lucide-react';
import type { UserRole } from '../types';

interface ControlBarProps {
  role: UserRole;
  playbackState: 'playing' | 'paused';
  currentVideoId: string;
  onPlay: () => void;
  onPause: () => void;
  onResync: () => void;
  onSeekRelative: (offset: number) => void;
  onChangeVideo: (urlOrId: string) => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  role,
  playbackState,
  currentVideoId,
  onPlay,
  onPause,
  onResync,
  onSeekRelative,
  onChangeVideo
}) => {
  const [resyncSuccess, setResyncSuccess] = useState(false);
  const isElevated = role === 'host' || role === 'moderator';

  const handleResyncClick = () => {
    onResync();
    setResyncSuccess(true);
    setTimeout(() => setResyncSuccess(false), 1500);
  };

  const presetVideos = [
    { title: 'Lofi Chill Beats', id: 'jfKfPfyJRdk' },
    { title: 'Cyberpunk 2077 Trailer', id: '8X2kIfS6fb8' },
    { title: 'Nature 4K Relaxation', id: 'BHACKCNDMW8' },
    { title: 'Classic Rickroll', id: 'dQw4w9WgXcQ' }
  ];

  if (!isElevated) {
    return (
      <div className="bg-[#181818] border border-[#303030] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#272727] border border-[#383838] flex items-center justify-center text-amber-400">
            <Lock className="w-4 h-4 text-[#AAAAAA]" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Watch Only Mode</div>
            <div className="text-[11px] text-[#AAAAAA]">Controls managed by Host & Moderators</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResyncClick}
            className="h-9 px-3.5 rounded-full bg-[#FF0000]/10 border border-[#FF0000]/30 text-[#FF0000] hover:bg-[#FF0000]/20 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            title="Re-sync player with room"
          >
            {resyncSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Synced!</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-sync</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 text-xs font-mono bg-[#0F0F0F] px-3 py-1.5 rounded-lg border border-[#303030] text-[#F1F1F1]">
            <span className="text-[#AAAAAA]">ID:</span>
            <span className="text-white font-bold">{currentVideoId}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#181818] border border-[#303030] rounded-xl p-4 sm:p-4 space-y-3 shadow-lg">
      {/* Playback Controls & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Play / Pause Toggle */}
          <button
            type="button"
            onClick={playbackState === 'playing' ? onPause : onPlay}
            className="h-9 px-5 rounded-full bg-[#272727] hover:bg-[#383838] border border-[#383838] text-white font-semibold text-xs flex items-center gap-2 transition active:scale-95 shadow"
          >
            {playbackState === 'playing' ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-white" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Seek -10s Button */}
          <button
            type="button"
            onClick={() => onSeekRelative(-10)}
            className="h-9 px-3 rounded-full bg-[#272727] hover:bg-[#383838] text-[#F1F1F1] border border-[#383838] font-medium text-xs flex items-center gap-1.5 transition active:scale-95"
            title="Seek Backward 10 Seconds"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>-10s</span>
          </button>

          {/* Seek +10s Button */}
          <button
            type="button"
            onClick={() => onSeekRelative(10)}
            className="h-9 px-3 rounded-full bg-[#272727] hover:bg-[#383838] text-[#F1F1F1] border border-[#383838] font-medium text-xs flex items-center gap-1.5 transition active:scale-95"
            title="Seek Forward 10 Seconds"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>+10s</span>
          </button>

          {/* Re-sync Button */}
          <button
            type="button"
            onClick={handleResyncClick}
            className="h-9 px-3.5 rounded-full bg-[#FF0000]/10 border border-[#FF0000]/30 text-[#FF0000] hover:bg-[#FF0000]/20 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
            title="Force Re-sync Playback State"
          >
            {resyncSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Synced!</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-sync</span>
              </>
            )}
          </button>
        </div>

        {/* Current Active Video ID Badge */}
        <div className="flex items-center gap-2 text-xs font-mono bg-[#0F0F0F] px-3 py-1.5 rounded-lg border border-[#303030] text-[#F1F1F1]">
          <span className="text-[#AAAAAA]">CURRENT:</span>
          <span className="text-white font-bold">{currentVideoId}</span>
        </div>
      </div>

      {/* Recommendations / Presets */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs pt-2.5 border-t border-[#272727]">
        <span className="text-[#AAAAAA] font-medium whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Quick Load:
        </span>
        {presetVideos.map((preset) => {
          const isActive = preset.id === currentVideoId;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChangeVideo(preset.id)}
              className={`px-3 py-1.5 rounded-lg border transition whitespace-nowrap font-medium text-xs flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white text-black border-white font-bold shadow'
                  : 'bg-[#272727] hover:bg-[#383838] border-[#383838] text-[#F1F1F1]'
              }`}
            >
              <span>{preset.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

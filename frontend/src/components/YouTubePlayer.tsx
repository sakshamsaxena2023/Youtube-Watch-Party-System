import React, { useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import type { YouTubeProps, YouTubePlayer as YTPlayer } from 'react-youtube';

interface YouTubePlayerProps {
  videoId: string;
  playbackState: 'playing' | 'paused';
  lastPosition: number;
  isElevated: boolean; // Host or Moderator
  resyncTrigger?: number; // Increment to force player re-sync
  onLocalPlay: (currentTime: number) => void;
  onLocalPause: (currentTime: number) => void;
  onLocalSeek: (currentTime: number) => void;
  onPlayerError?: (errorMessage: string) => void;
}

export const YouTubePlayerComponent: React.FC<YouTubePlayerProps> = ({
  videoId,
  playbackState,
  lastPosition,
  isElevated,
  resyncTrigger = 0,
  onLocalPlay,
  onLocalPause,
  onLocalSeek: _onLocalSeek,
  onPlayerError
}) => {
  const playerRef = useRef<YTPlayer | null>(null);
  const isRemoteUpdateRef = useRef<boolean>(false);
  const prevVideoIdRef = useRef<string>(videoId);

  // Sync state when props change from socket updates
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    isRemoteUpdateRef.current = true;

    try {
      // 1. If Video ID changed, call player.loadVideoById or cueVideoById directly on player instance
      if (prevVideoIdRef.current !== videoId) {
        prevVideoIdRef.current = videoId;

        if (playbackState === 'playing') {
          if (typeof player.loadVideoById === 'function') {
            player.loadVideoById({ videoId, startSeconds: lastPosition || 0 });
          }
        } else {
          if (typeof player.cueVideoById === 'function') {
            player.cueVideoById({ videoId, startSeconds: lastPosition || 0 });
          }
        }
      } else {
        // 2. Same video ID: Sync seek position and play/pause state
        const currentTime = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
        const timeDiff = Math.abs(currentTime - lastPosition);

        if (timeDiff > 1.5 && typeof player.seekTo === 'function') {
          player.seekTo(lastPosition, true);
        }

        if (playbackState === 'playing') {
          if (typeof player.playVideo === 'function') {
            player.playVideo();
          }
        } else {
          if (typeof player.pauseVideo === 'function') {
            player.pauseVideo();
          }
        }
      }
    } catch (e) {
      console.error('[YouTubePlayer] Sync error:', e);
    }

    const timer = setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 600);

    return () => clearTimeout(timer);
  }, [videoId, playbackState, lastPosition, resyncTrigger]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    prevVideoIdRef.current = videoId;

    if (lastPosition > 0 && typeof event.target.seekTo === 'function') {
      event.target.seekTo(lastPosition, true);
    }
    if (playbackState === 'playing' && typeof event.target.playVideo === 'function') {
      event.target.playVideo();
    } else if (typeof event.target.pauseVideo === 'function') {
      event.target.pauseVideo();
    }
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (isRemoteUpdateRef.current) return;
    if (!isElevated) return;

    const player = event.target;
    const currentTime = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;

    // YT.PlayerState.PLAYING = 1, PAUSED = 2
    if (event.data === 1) {
      onLocalPlay(currentTime);
    } else if (event.data === 2) {
      onLocalPause(currentTime);
    }
  };

  const onError: YouTubeProps['onError'] = (event) => {
    console.error('[YouTubePlayer] Error code:', event.data);
    let errorMsg = 'FAILED TO LOAD YOUTUBE STREAM.';
    if (event.data === 101 || event.data === 150) {
      errorMsg = 'RESTRICTED PLAYBACK: OWNER HAS DISABLED EXTERNAL EMBEDDING.';
    } else if (event.data === 100 || event.data === 2) {
      errorMsg = 'VIDEO NOT FOUND OR INVALID YOUTUBE ID.';
    }
    if (onPlayerError) {
      onPlayerError(errorMsg);
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: isElevated ? 1 : 0,
      modestbranding: 1,
      rel: 0,
      fs: 1
    }
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-none overflow-hidden border border-neutral-800 shadow-none group">
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={onReady}
        onStateChange={onStateChange}
        onError={onError}
        className="w-full h-full absolute top-0 left-0"
        iframeClassName="w-full h-full border-0"
      />

      {/* Participant Watch-Only Badge */}
      {!isElevated && (
        <div className="absolute top-4 left-4 bg-black border border-neutral-700 text-neutral-300 text-[10px] font-mono tracking-[0.2em] uppercase px-3 py-1.5 rounded-none flex items-center gap-2 pointer-events-none z-10 select-none">
          <span className="w-1.5 h-1.5 bg-neutral-400" />
          <span>[WATCH MODE // HOST DIRECTED]</span>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { YouTubePlayerComponent } from '../components/YouTubePlayer';
import { ControlBar } from '../components/ControlBar';
import { Sidebar } from '../components/Sidebar';
import { getSocket, disconnectSocket } from '../services/socket';
import { getPersistentUserId } from '../services/user';
import type { Participant, ChatMessage, UserRole, SyncPayload } from '../types';
import { AlertCircle, CheckCircle2, Info, X, ThumbsUp, Share2, Copy, Check } from 'lucide-react';

import { extractVideoId } from '../utils/youtube';
import { formatCompactNumber } from '../utils/format';

export const WatchRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Persistent User ID (retains Host/Mod role across page refreshes and reconnections)
  const persistentUserId = useRef<string>(getPersistentUserId()).current;

  // User state
  const [username, setUsername] = useState<string>(() => {
    return location.state?.username || localStorage.getItem('watchparty_username') || '';
  });
  const [userRole, setUserRole] = useState<UserRole>('participant');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState<boolean>(false);

  // Room state
  const [videoId, setVideoId] = useState<string>('dQw4w9WgXcQ');
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused'>('paused');
  const [lastPosition, setLastPosition] = useState<number>(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [resyncTrigger, setResyncTrigger] = useState<number>(0);

  // Dynamic YouTube Video Metadata & Like Count state
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Fetch authentic YouTube Video Statistics (Title, Channel, Like Count)
  useEffect(() => {
    if (!videoId) return;
    let isMounted = true;
    setLoadingStats(true);
    setIsLiked(false);

    const fetchVideoStats = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin);
        const res = await fetch(`${backendUrl}/api/youtube/stats/${videoId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setVideoTitle(data.title || null);
            setChannelTitle(data.channelTitle || null);
            setLikeCount(typeof data.likeCount === 'number' ? data.likeCount : 0);
          }
        }
      } catch (err) {
        if (isMounted) {
          setLikeCount(0);
        }
      } finally {
        if (isMounted) {
          setLoadingStats(false);
        }
      }
    };

    fetchVideoStats();

    return () => {
      isMounted = false;
    };
  }, [videoId]);

  // Toast Notifications
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Prompt username if missing
  useEffect(() => {
    if (!username.trim()) {
      const input = prompt('Enter your Display Name to join Watch Party:');
      if (input && input.trim()) {
        const cleanName = input.trim();
        setUsername(cleanName);
        localStorage.setItem('watchparty_username', cleanName);
      } else {
        navigate('/');
      }
    }
  }, [username, navigate]);

  // Handle initial video URL if passed from Lobby
  useEffect(() => {
    if (location.state?.initialVideoUrl) {
      const cleanId = extractVideoId(location.state.initialVideoUrl);
      if (cleanId) {
        const socket = getSocket();
        socket.emit('change_video', { roomId, videoId: cleanId, userId: persistentUserId });
      }
    }
  }, [location.state, roomId, persistentUserId]);

  // Socket setup & listeners
  useEffect(() => {
    if (!roomId || !username.trim()) return;

    const socket = getSocket();

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join_room', { roomId, username, userId: persistentUserId });
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onRoomData = (data: {
      roomId: string;
      currentVideoId: string;
      playbackState: 'playing' | 'paused';
      lastPosition: number;
      participants: Participant[];
      chatMessages: ChatMessage[];
      role: UserRole;
      userId: string;
    }) => {
      setVideoId(data.currentVideoId);
      setPlaybackState(data.playbackState);
      setLastPosition(data.lastPosition);
      setParticipants(data.participants);
      setChatMessages(data.chatMessages || []);
      setUserRole(data.role);
      setIsConnected(true);
    };

    const onSyncState = (payload: SyncPayload) => {
      if (payload.videoId) {
        setVideoId(payload.videoId);
      }
      setPlaybackState(payload.playState);
      if (typeof payload.currentTime === 'number') {
        setLastPosition(payload.currentTime);
      }
    };

    const onUserJoined = (data: { username: string; userId: string; role: UserRole; participants: Participant[] }) => {
      setParticipants(data.participants);
      showToast(`${data.username} joined the party`, 'info');
    };

    const onUserLeft = (data: { username: string; userId: string; participants: Participant[] }) => {
      setParticipants(data.participants);
      showToast(`${data.username} left the room`, 'info');
    };

    const onRoleAssigned = (data: { targetUserId: string; targetUsername: string; newRole: UserRole; participants: Participant[] }) => {
      setParticipants(data.participants);
      if (data.targetUserId === persistentUserId) {
        setUserRole(data.newRole);
      }
      showToast(`${data.targetUsername}'s role updated to ${data.newRole.toUpperCase()}`, 'success');
    };

    const onParticipantRemoved = (data: { targetUserId: string; targetUsername: string; participants: Participant[] }) => {
      setParticipants(data.participants);
      showToast(`${data.targetUsername} was removed from room`, 'error');
    };

    const onChatMessage = (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    };

    const onKicked = (data: { reason: string }) => {
      alert(data.reason || 'You were removed from the room.');
      navigate('/');
    };

    const onErrorMsg = (msg: string) => {
      showToast(msg, 'error');
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_data', onRoomData);
    socket.on('sync_state', onSyncState);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('role_assigned', onRoleAssigned);
    socket.on('participant_removed', onParticipantRemoved);
    socket.on('chat_message', onChatMessage);
    socket.on('kicked', onKicked);
    socket.on('error_message', onErrorMsg);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_data', onRoomData);
      socket.off('sync_state', onSyncState);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('role_assigned', onRoleAssigned);
      socket.off('participant_removed', onParticipantRemoved);
      socket.off('chat_message', onChatMessage);
      socket.off('kicked', onKicked);
      socket.off('error_message', onErrorMsg);
    };
  }, [roomId, username, navigate, persistentUserId]);

  // Handler functions for user actions
  const isElevated = userRole === 'host' || userRole === 'moderator';
  const hostParticipant = participants.find(p => p.role === 'host');

  const handleLocalPlay = (currentTime: number) => {
    if (!isElevated) {
      showToast('Permission denied: Controls managed by Host & Moderators', 'error');
      return;
    }
    const socket = getSocket();
    socket.emit('play', { roomId, currentTime, userId: persistentUserId });
  };

  const handleLocalPause = (currentTime: number) => {
    if (!isElevated) {
      showToast('Permission denied: Controls managed by Host & Moderators', 'error');
      return;
    }
    const socket = getSocket();
    socket.emit('pause', { roomId, currentTime, userId: persistentUserId });
  };

  const handleLocalSeek = (currentTime: number) => {
    if (!isElevated) {
      showToast('Permission denied: Controls managed by Host & Moderators', 'error');
      return;
    }
    const socket = getSocket();
    socket.emit('seek', { roomId, currentTime, userId: persistentUserId });
  };

  const handleSeekRelative = (offsetSeconds: number) => {
    if (!isElevated) {
      showToast('Permission denied: Controls managed by Host & Moderators', 'error');
      return;
    }
    const targetTime = Math.max(0, lastPosition + offsetSeconds);
    const socket = getSocket();
    socket.emit('seek', { roomId, currentTime: targetTime, userId: persistentUserId });
    showToast(`Seeked ${offsetSeconds > 0 ? '+' : ''}${offsetSeconds}s`, 'info');
  };

  const handleResync = () => {
    setResyncTrigger(prev => prev + 1);
    showToast('Re-synced video state with room', 'success');
  };

  const handleChangeVideo = (urlOrId: string) => {
    if (!isElevated) {
      showToast('Permission denied: Controls managed by Host & Moderators', 'error');
      return;
    }
    const cleanId = extractVideoId(urlOrId);
    if (!cleanId) {
      showToast('Please enter a valid YouTube video URL or ID', 'error');
      return;
    }
    const socket = getSocket();
    socket.emit('change_video', { roomId, videoId: cleanId, userId: persistentUserId });
  };

  const handleSendMessage = (text: string) => {
    const socket = getSocket();
    socket.emit('chat_message', { roomId, text });
  };

  const handleAssignRole = (targetUserId: string, newRole: UserRole) => {
    const socket = getSocket();
    socket.emit('assign_role', { roomId, targetUserId, newRole, userId: persistentUserId });
  };

  const handleRemoveParticipant = (targetUserId: string) => {
    const socket = getSocket();
    socket.emit('remove_participant', { roomId, targetUserId, userId: persistentUserId });
  };

  const handleLeaveRoom = () => {
    const socket = getSocket();
    socket.emit('leave_room', { roomId });
    disconnectSocket();
    navigate('/');
  };

  const handleCopyPartyLink = () => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F1F1F1] flex flex-col selection:bg-[#FF0000] selection:text-white">
      {/* Official YouTube Navigation Bar */}
      <Navbar
        roomId={roomId}
        username={username}
        role={userRole}
        currentVideoId={videoId}
        isConnected={isConnected}
        onSearchSubmit={handleChangeVideo}
        onLeave={handleLeaveRoom}
      />

      {/* Floating Extension Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-6 z-50 animate-bounce">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold ${
              toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/50 text-red-200'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : 'bg-[#181818]/90 border-[#383838] text-white'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Info className="w-4 h-4 text-[#FF0000]" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main YouTube Layout Container */}
      <main className="max-w-[1800px] mx-auto px-4 py-4 flex-1 w-full flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Stage (Video Player + Meta Section + Control Bar) */}
        <div className="flex-1 w-full flex flex-col gap-4">
          {/* Native 16:9 YouTube Video Player */}
          <YouTubePlayerComponent
            videoId={videoId}
            playbackState={playbackState}
            lastPosition={lastPosition}
            isElevated={isElevated}
            resyncTrigger={resyncTrigger}
            onLocalPlay={handleLocalPlay}
            onLocalPause={handleLocalPause}
            onLocalSeek={handleLocalSeek}
            onPlayerError={(msg) => showToast(msg, 'error')}
          />

          {/* Native Video Meta Section (Video Title, Channel info, Like/Share Bar) */}
          <div className="space-y-3 pb-2 border-b border-[#272727]">
            <h1 className="text-lg sm:text-xl font-bold text-white font-sans tracking-tight">
              {videoTitle ? videoTitle : `YouTube Watch Party Stream // Video ID: ${videoId}`}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Channel Avatar & Host Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#272727] border border-[#383838] text-white font-bold flex items-center justify-center text-sm shadow">
                  {channelTitle
                    ? channelTitle.charAt(0).toUpperCase()
                    : hostParticipant
                    ? hostParticipant.username.charAt(0).toUpperCase()
                    : 'Y'}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {channelTitle ? channelTitle : (hostParticipant ? `${hostParticipant.username} Channel` : 'YouTube Creator')}
                  </div>
                  <div className="text-xs text-[#AAAAAA]">
                    Synchronized by {hostParticipant ? hostParticipant.username : 'Host'} • {participants.length} watching
                  </div>
                </div>
              </div>

              {/* Action Bar (Like, Share, Copy Link) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsLiked(!isLiked);
                    if (likeCount !== null && likeCount > 0) {
                      setLikeCount(prev => (prev !== null ? (isLiked ? prev - 1 : prev + 1) : null));
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition active:scale-95 ${
                    isLiked
                      ? 'bg-[#FF0000] text-white'
                      : 'bg-[#272727] hover:bg-[#383838] text-[#F1F1F1]'
                  }`}
                  title={likeCount ? `${likeCount.toLocaleString()} likes` : 'Like Video'}
                >
                  <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
                  <span>
                    {loadingStats ? (
                      <span className="inline-block animate-pulse w-8 h-3 bg-[#383838] rounded-full" />
                    ) : (
                      formatCompactNumber(likeCount)
                    )}
                  </span>
                </button>

                <button
                  onClick={handleCopyPartyLink}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#272727] hover:bg-[#383838] text-xs font-semibold text-[#F1F1F1] transition"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied Link</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-[#AAAAAA]" />
                      <span>Share Party</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyPartyLink}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#272727] hover:bg-[#383838] text-xs font-semibold text-[#F1F1F1] transition"
                >
                  <Copy className="w-4 h-4 text-[#AAAAAA]" />
                  <span>Copy Code</span>
                </button>
              </div>
            </div>
          </div>

          {/* Controls Bar / Deck */}
          <ControlBar
            role={userRole}
            playbackState={playbackState}
            currentVideoId={videoId}
            onPlay={() => handleLocalPlay(lastPosition)}
            onPause={() => handleLocalPause(lastPosition)}
            onResync={handleResync}
            onSeekRelative={handleSeekRelative}
            onChangeVideo={handleChangeVideo}
          />
        </div>

        {/* Collapsible Party Extension Sidebar (Right Side 380px) */}
        <Sidebar
          participants={participants}
          chatMessages={chatMessages}
          currentUserId={persistentUserId}
          currentUserRole={userRole}
          roomId={roomId || ''}
          isCollapsed={isDrawerCollapsed}
          onToggleCollapse={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
          onSendMessage={handleSendMessage}
          onAssignRole={handleAssignRole}
          onRemoveParticipant={handleRemoveParticipant}
        />
      </main>
    </div>
  );
};

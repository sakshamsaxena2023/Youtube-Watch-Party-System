import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Video, ArrowRight, Play } from 'lucide-react';

export const Lobby: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [username, setUsername] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [initialVideoUrl, setInitialVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam) {
      setRoomIdInput(roomParam.trim());
      setTab('join');
    }
  }, [searchParams]);

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Please enter your display name.');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin);
      const res = await fetch(`${backendUrl}/api/rooms`, { method: 'POST' });
      const data = await res.json();
      const newRoomId = data.roomId || `party-${Math.random().toString(36).substring(2, 8)}`;

      localStorage.setItem('watchparty_username', username.trim());

      navigate(`/room/${newRoomId}`, {
        state: { username: username.trim(), initialVideoUrl: initialVideoUrl.trim() }
      });
    } catch (err) {
      const fallbackId = `party-${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('watchparty_username', username.trim());
      navigate(`/room/${fallbackId}`, {
        state: { username: username.trim(), initialVideoUrl: initialVideoUrl.trim() }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Please enter your display name.');
      return;
    }
    if (!roomIdInput.trim()) {
      setErrorMessage('Please enter a room code.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    const cleanRoom = roomIdInput.trim().toLowerCase();

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin);
      const res = await fetch(`${backendUrl}/api/rooms/${cleanRoom}`);
      if (!res.ok) {
        setErrorMessage('Party room not found. Check code or create a new party.');
        setLoading(false);
        return;
      }
    } catch (err) {
      // Allow direct navigation
    }

    localStorage.setItem('watchparty_username', username.trim());
    navigate(`/room/${cleanRoom}`, { state: { username: username.trim() } });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F1F1F1] flex flex-col justify-between selection:bg-[#FF0000] selection:text-white">
      {/* Top Banner */}
      <header className="border-b border-[#272727] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-5 bg-[#FF0000] rounded-lg flex items-center justify-center shadow-md">
            <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[7px] border-l-white ml-0.5" />
          </div>
          <span className="text-white font-bold text-lg font-sans">
            YouTube <span className="bg-[#FF0000] text-white text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded">PARTY</span>
          </span>
        </div>
        <div className="text-xs text-[#AAAAAA]">Extension Overlay Mode</div>
      </header>

      {/* Main Container - Chrome Extension Popover Modal */}
      <main className="max-w-xl mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center w-full">
        {/* Extension Card Popover */}
        <div className="w-full bg-[#181818] border border-[#303030] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header Badge */}
          <div className="flex items-center justify-between border-b border-[#272727] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FF0000]/10 border border-[#FF0000]/30 flex items-center justify-center">
                <Video className="w-5 h-5 text-[#FF0000]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">YouTube Watch Party</h1>
                <p className="text-xs text-[#AAAAAA]">Browser Extension Interface</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-[#272727] border border-[#383838] text-[10px] font-semibold text-[#F1F1F1] rounded-full">
              v2.0 Active
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-red-950/80 border border-red-500/50 text-red-200 px-4 py-2.5 rounded-xl text-xs font-medium text-center">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Quick Tabs: Start Party vs Join Party */}
          <div className="flex items-center gap-1 bg-[#0F0F0F] p-1 rounded-xl border border-[#272727]">
            <button
              onClick={() => setTab('create')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                tab === 'create'
                  ? 'bg-[#272727] text-white shadow'
                  : 'text-[#AAAAAA] hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-[#FF0000]" />
              <span>Start a Party</span>
            </button>

            <button
              onClick={() => setTab('join')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                tab === 'join'
                  ? 'bg-[#272727] text-white shadow'
                  : 'text-[#AAAAAA] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Join a Party</span>
            </button>
          </div>

          {/* Tab 1: Start a Party Form */}
          {tab === 'create' && (
            <form onSubmit={handleCreateParty} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#AAAAAA] mb-1.5">Your Display Name</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Alex"
                  maxLength={25}
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#303030] focus:border-[#1C62B9] rounded-xl text-white placeholder-[#606060] text-sm focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#AAAAAA] mb-1.5">YouTube Video URL (Optional)</label>
                <input
                  type="text"
                  value={initialVideoUrl}
                  onChange={(e) => setInitialVideoUrl(e.target.value)}
                  placeholder="Paste YouTube video URL or ID (e.g., https://youtube.com/watch?v=...)"
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#303030] focus:border-[#1C62B9] rounded-xl text-white placeholder-[#606060] text-sm focus:outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#FF0000] hover:bg-[#CC0000] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
              >
                <span>{loading ? 'Creating Party...' : 'Start Watch Party'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Tab 2: Join a Party Form */}
          {tab === 'join' && (
            <form onSubmit={handleJoinParty} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#AAAAAA] mb-1.5">Your Display Name</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Sam"
                  maxLength={25}
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#303030] focus:border-[#1C62B9] rounded-xl text-white placeholder-[#606060] text-sm focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#AAAAAA] mb-1.5">Party Room Code</label>
                <input
                  type="text"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  placeholder="e.g. abc-123"
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#303030] focus:border-[#1C62B9] rounded-xl text-white font-mono placeholder-[#606060] text-sm focus:outline-none transition uppercase"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#272727] hover:bg-[#383838] border border-[#3F3F3F] text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{loading ? 'Joining Party...' : 'Join Watch Party'}</span>
              </button>
            </form>
          )}

          {/* Footer note */}
          <div className="pt-2 text-center text-xs text-[#AAAAAA]">
            Real-time synchronized YouTube theater with live chat & role controls
          </div>
        </div>
      </main>

      <footer className="border-t border-[#272727] py-4 text-center text-xs text-[#AAAAAA]">
        YouTube Watch Party Extension Protocol
      </footer>
    </div>
  );
};

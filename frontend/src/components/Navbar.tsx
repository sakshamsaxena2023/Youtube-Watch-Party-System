import React, { useState } from 'react';
import { Search, Copy, Check, LogOut, Lock, Menu, X } from 'lucide-react';
import type { UserRole } from '../types';
import { extractVideoId } from '../utils/youtube';

interface NavbarProps {
  roomId?: string;
  username?: string;
  role?: UserRole;
  currentVideoId?: string;
  isConnected?: boolean;
  onSearchSubmit?: (urlOrId: string) => void;
  onLeave?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomId,
  username,
  role,
  currentVideoId: _currentVideoId,
  isConnected = true,
  onSearchSubmit,
  onLeave
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [copied, setCopied] = useState(false);

  const isElevated = role === 'host' || role === 'moderator';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim() || !onSearchSubmit || !isElevated) return;

    const extractedId = extractVideoId(searchInput);
    const target = extractedId || searchInput.trim();
    onSearchSubmit(target);
    setSearchInput('');
  };

  const handleCopy = () => {
    if (!roomId) return;
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="border-b border-[#272727] bg-[#0F0F0F] sticky top-0 z-50 px-4 py-2.5 select-none">
      <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
        {/* Left: YouTube Watch Party Logo */}
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-[#272727] rounded-full text-[#F1F1F1] transition hidden sm:block">
            <Menu className="w-5 h-5" />
          </button>

          <a href="/" className="flex items-center gap-2 hover:opacity-90 transition">
            {/* YouTube Red Play Icon */}
            <div className="w-7 h-5 bg-[#FF0000] rounded-lg flex items-center justify-center shadow-md">
              <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[7px] border-l-white ml-0.5" />
            </div>
            <span className="text-white font-bold text-lg tracking-tighter font-sans flex items-center gap-1.5">
              YouTube
              <span className="bg-[#FF0000] text-white text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded tracking-normal">
                PARTY
              </span>
            </span>
          </a>
        </div>

        {/* Center: Direct YouTube URL / Video ID Loader */}
        {roomId ? (
          <div className="relative flex-1 max-w-2xl px-2">
            <form onSubmit={handleSearchSubmit} className="flex items-center w-full">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  disabled={!isElevated}
                  placeholder={
                    isElevated
                      ? "Paste YouTube video URL or ID (e.g., https://youtube.com/watch?v=...)"
                      : "Watch Only Mode (Host controls video playback)"
                  }
                  className="w-full bg-[#121212] border border-[#303030] focus:border-[#1C62B9] text-[#F1F1F1] placeholder-[#AAAAAA] text-sm pl-4 pr-10 py-2 rounded-l-full focus:outline-none transition disabled:opacity-60"
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA] hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : !isElevated ? (
                  <Lock className="w-4 h-4 text-[#AAAAAA] absolute right-3.5 top-1/2 -translate-y-1/2" />
                ) : null}
              </div>
              <button
                type="submit"
                disabled={!isElevated || !searchInput.trim()}
                className="bg-[#222222] hover:bg-[#272727] disabled:hover:bg-[#222222] border border-l-0 border-[#303030] px-6 py-2 rounded-r-full text-[#F1F1F1] disabled:text-[#606060] transition flex items-center justify-center"
                title={isElevated ? "Load YouTube Video" : "Host controls playback"}
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="text-xs text-[#AAAAAA] font-medium hidden md:block">
            YouTube Watch Party Extension v2.0
          </div>
        )}

        {/* Right Section: Party Status, User Avatar, Room Pill */}
        <div className="flex items-center gap-3">
          {/* Party Active Badge */}
          {roomId && (
            <div className="hidden sm:flex items-center gap-2 bg-[#272727] border border-[#303030] px-3 py-1 rounded-full text-xs text-[#F1F1F1] font-medium">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span>{isConnected ? 'Party Active' : 'Reconnecting'}</span>
            </div>
          )}

          {/* Copy Room Link Pill */}
          {roomId && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#272727] hover:bg-[#3F3F3F] border border-[#383838] text-xs font-semibold text-[#F1F1F1] rounded-full transition active:scale-95"
              title="Copy Party Link"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#AAAAAA]" />
                  <span>Share Party</span>
                </>
              )}
            </button>
          )}

          {/* User Avatar */}
          {username && (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-[#272727] border border-[#383838] text-white font-bold text-xs flex items-center justify-center uppercase shadow"
                title={`${username} (${role})`}
              >
                {username.charAt(0)}
              </div>
            </div>
          )}

          {/* Leave Button */}
          {onLeave && (
            <button
              onClick={onLeave}
              className="p-2 hover:bg-[#272727] text-[#AAAAAA] hover:text-white rounded-full transition"
              title="Exit Party"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

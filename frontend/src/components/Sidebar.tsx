import React, { useState, useRef, useEffect } from 'react';
import { Users, MessageSquare, Crown, Shield, User, UserX, Share2, Check, Send, MoreVertical, ChevronRight, ChevronLeft } from 'lucide-react';
import type { Participant, ChatMessage, UserRole } from '../types';

interface SidebarProps {
  participants: Participant[];
  chatMessages: ChatMessage[];
  currentUserId: string;
  currentUserRole: UserRole;
  roomId: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSendMessage: (text: string) => void;
  onAssignRole: (targetUserId: string, newRole: UserRole) => void;
  onRemoveParticipant: (targetUserId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  participants,
  chatMessages,
  currentUserId,
  currentUserRole,
  roomId,
  isCollapsed = false,
  onToggleCollapse,
  onSendMessage,
  onAssignRole,
  onRemoveParticipant
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const [messageInput, setMessageInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isHost = currentUserRole === 'host';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    onSendMessage(messageInput.trim());
    setMessageInput('');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="fixed right-4 top-20 z-40 bg-[#181818] hover:bg-[#272727] border border-[#303030] text-[#F1F1F1] px-3 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold transition"
        title="Expand Party Drawer"
      >
        <ChevronLeft className="w-4 h-4 text-[#FF0000]" />
        <span>Party Drawer ({participants.length})</span>
      </button>
    );
  }

  return (
    <aside className="w-full lg:w-[380px] bg-[#181818] border border-[#303030] rounded-2xl flex flex-col h-[650px] lg:h-auto shadow-2xl overflow-hidden select-none">
      {/* Extension Header */}
      <div className="p-3.5 border-b border-[#272727] bg-[#121212] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Red Extension Icon */}
          <div className="w-6 h-6 bg-[#FF0000] rounded-lg flex items-center justify-center shadow">
            <div className="w-0 h-0 border-y-[3.5px] border-y-transparent border-l-[6px] border-l-white ml-0.5" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">
            YouTube Party Drawer
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Room Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#272727] hover:bg-[#383838] border border-[#383838] text-[#F1F1F1] text-[11px] font-medium rounded-full transition"
            title="Copy Party Link"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3 h-3 text-[#AAAAAA]" />
                <span>Invite</span>
              </>
            )}
          </button>

          {/* Collapse Toggle Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-[#272727] text-[#AAAAAA] hover:text-white rounded-lg transition"
              title="Collapse Panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Top Tabs: Party Chat vs Members */}
      <div className="flex items-center border-b border-[#272727] bg-[#181818]">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition border-b-2 ${
            activeTab === 'chat'
              ? 'border-[#FF0000] text-white bg-[#222222]'
              : 'border-transparent text-[#AAAAAA] hover:text-white hover:bg-[#272727]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#FF0000]" />
          <span>Live Chat ({chatMessages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition border-b-2 ${
            activeTab === 'participants'
              ? 'border-[#FF0000] text-white bg-[#222222]'
              : 'border-transparent text-[#AAAAAA] hover:text-white hover:bg-[#272727]'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span>Members ({participants.length})</span>
        </button>
      </div>

      {/* Tab 1: YouTube Live Chat Style Feed */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#0F0F0F]">
          {/* Chat Messages Log Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#AAAAAA] space-y-2 py-12">
                <MessageSquare className="w-8 h-8 opacity-40 text-[#FF0000]" />
                <p className="text-xs">Welcome to Live Chat! Say hi to the party.</p>
              </div>
            ) : (
              chatMessages.map((msg, index) => {
                const isSelf = msg.senderId === currentUserId;
                const senderPart = participants.find(p => p.userId === msg.senderId || p.username === msg.sender);
                const senderRole = senderPart?.role || 'participant';
                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={index} className="flex items-start gap-2.5 leading-relaxed break-words">
                    {/* User Avatar Circle */}
                    <div className="w-6 h-6 rounded-full bg-[#272727] text-white font-bold text-[10px] flex items-center justify-center shrink-0 uppercase border border-[#383838] mt-0.5">
                      {msg.sender.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[#F1F1F1] text-xs">{msg.sender}</span>

                        {senderRole === 'host' && (
                          <span className="px-1.5 py-0.2 bg-[#FF0000] text-white text-[9px] font-bold rounded uppercase">HOST</span>
                        )}
                        {senderRole === 'moderator' && (
                          <span className="px-1.5 py-0.2 bg-[#1C62B9] text-white text-[9px] font-bold rounded uppercase">MOD</span>
                        )}
                        {isSelf && (
                          <span className="text-[10px] text-[#AAAAAA] font-normal">(you)</span>
                        )}

                        <span className="text-[#AAAAAA] text-[10px] ml-auto">{timeStr}</span>
                      </div>

                      <p className="text-[#D9D9D9] text-xs mt-0.5">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSend} className="p-3 border-t border-[#272727] bg-[#181818] flex items-center gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Chat as party member..."
              maxLength={300}
              className="flex-1 px-4 py-2.5 bg-[#0F0F0F] border border-[#303030] focus:border-[#1C62B9] rounded-full text-xs text-white placeholder-[#AAAAAA] focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={!messageInput.trim()}
              className="p-2.5 bg-[#FF0000] hover:bg-[#CC0000] disabled:opacity-40 text-white rounded-full transition shadow"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Members Directory */}
      {activeTab === 'participants' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0F0F0F]">
          <div className="text-xs font-bold text-[#AAAAAA] mb-3 flex items-center justify-between">
            <span>PARTY MEMBERS</span>
            <span className="px-2 py-0.5 rounded-full bg-[#272727] text-white text-[10px]">
              {participants.length} Online
            </span>
          </div>

          {participants.map((user) => {
            const isSelf = user.userId === currentUserId;
            const isUserMenuOpen = openUserMenu === user.userId;

            return (
              <div
                key={user.userId}
                className="bg-[#181818] border border-[#303030] rounded-xl p-3 flex items-center justify-between hover:border-[#383838] transition relative"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#272727] border border-[#383838] font-bold text-xs text-white flex items-center justify-center uppercase">
                    {user.username.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <span>{user.username}</span>
                      {isSelf && <span className="text-[10px] text-[#AAAAAA] font-normal">(You)</span>}
                    </div>
                    <div className="text-[10px] text-[#AAAAAA] capitalize flex items-center gap-1.5 mt-0.5">
                      {user.role === 'host' && (
                        <span className="px-1.5 py-0.2 bg-[#FF0000] text-white text-[9px] font-bold rounded uppercase">HOST</span>
                      )}
                      {user.role === 'moderator' && (
                        <span className="px-1.5 py-0.2 bg-[#1C62B9] text-white text-[9px] font-bold rounded uppercase">MOD</span>
                      )}
                      {user.role === 'participant' && (
                        <span className="text-[#AAAAAA]">Viewer</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Host Control Actions Dropdown */}
                {isHost && !isSelf && (
                  <div className="relative">
                    <button
                      onClick={() => setOpenUserMenu(isUserMenuOpen ? null : user.userId)}
                      className="p-1.5 hover:bg-[#272727] text-[#AAAAAA] hover:text-white rounded-lg transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 top-8 z-50 w-48 bg-[#272727] border border-[#383838] rounded-xl shadow-2xl py-1 text-xs">
                        {user.role === 'participant' ? (
                          <button
                            onClick={() => {
                              onAssignRole(user.userId, 'moderator');
                              setOpenUserMenu(null);
                            }}
                            className="w-full px-3 py-2 text-left text-white hover:bg-[#383838] flex items-center gap-2"
                          >
                            <Shield className="w-3.5 h-3.5 text-blue-400" />
                            <span>Make Moderator</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onAssignRole(user.userId, 'participant');
                              setOpenUserMenu(null);
                            }}
                            className="w-full px-3 py-2 text-left text-[#AAAAAA] hover:bg-[#383838] flex items-center gap-2"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>Make Viewer</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            onAssignRole(user.userId, 'host');
                            setOpenUserMenu(null);
                          }}
                          className="w-full px-3 py-2 text-left text-amber-300 hover:bg-[#383838] flex items-center gap-2"
                        >
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Transfer Host</span>
                        </button>

                        <div className="my-1 border-t border-[#383838]" />

                        <button
                          onClick={() => {
                            onRemoveParticipant(user.userId);
                            setOpenUserMenu(null);
                          }}
                          className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-950/40 flex items-center gap-2"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Kick Participant</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Docked Sync Status Pill */}
      <div className="p-3 bg-[#121212] border-t border-[#272727] flex items-center justify-between text-xs text-[#AAAAAA]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-[#F1F1F1]">● Synced with Host</span>
        </div>
        <span className="text-[10px] font-mono">Zero-Drift Protocol</span>
      </div>
    </aside>
  );
};

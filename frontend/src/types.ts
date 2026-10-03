export type UserRole = 'host' | 'moderator' | 'participant';

export interface Participant {
  userId: string;
  username: string;
  role: UserRole;
  socketId?: string;
}

export interface ChatMessage {
  sender: string;
  senderId?: string;
  text: string;
  timestamp: string | Date;
}

export interface RoomState {
  roomId: string;
  currentVideoId: string;
  playbackState: 'playing' | 'paused';
  lastPosition: number;
  participants: Participant[];
  chatMessages: ChatMessage[];
  role: UserRole;
  userId: string;
}

export interface SyncPayload {
  playState: 'playing' | 'paused';
  currentTime: number;
  videoId: string;
  senderId?: string;
  senderName?: string;
}

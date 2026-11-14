export interface User {
  id: string;
  socketId: string;
  username: string;
  isAdmin: boolean;
  avatarColor: string;
  joinedAt: number;
  status: 'watching' | 'buffering' | 'idle';
  clientTime?: number;
  isMuted?: boolean;
  isSpeaking?: boolean;
  bufferAhead?: number; // seconds of buffer ahead of current playback position
  bufferedEnd?: number;
  isBuffering?: boolean;
  pingMs?: number;
  downloadSpeedKbps?: number;
  isReadyForPlayback?: boolean;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  url: string;
  isDefault?: boolean;
  isTemporary?: boolean; // 1-day temporary retention
  expiresAt?: number;
  uploadedBy?: string;
}

export interface SubtitleStyleSettings {
  textColor: string; // e.g. '#FFFFFF'
  bgEnabled: boolean; // on / off
  bgColor: string; // e.g. '#000000'
  bgAlpha: number; // 0 - 255
  positionEnabled: boolean; // on / off
  positionPercent: number; // 0 - 100%
  preventCoveredByControls: boolean; // prevent being covered by player controls
  fontSize: number; // 1 - 70px
  outlineEnabled: boolean; // on / off
  outlineColor: string; // e.g. '#000000'
  outlineWidth: number; // 1 - 8px
  delayOffset: number; // Subtitle delay/sync offset in seconds (e.g. -10 to +10, default 0)
  fontFamily: string; // Persian font: 'Vazirmatn', 'Yekan', 'Shabnam', 'Sahel', 'Inter'
}

export interface FloatingChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  avatarColor?: string;
  lane: number;
  timestamp: number;
}

export interface TranscodedVersion {
  id: string;
  resolution: string; // "1080p", "720p", "480p", etc.
  fps: number; // 24, 30, 60
  bitrate?: string;
  url: string;
  filePath: string;
  sizeBytes?: number;
  createdAt: number;
}

export interface QueueItem {
  id: string;
  title: string;
  url: string;
  originalUrl: string;
  subtitles: SubtitleTrack[];
  duration: number;
  addedBy: string;
  addedAt: number;
  transcodedVersions: TranscodedVersion[];
  isTranscoding?: boolean;
  transcodeProgress?: number;
  transcodeStatusText?: string;
  // Server-side cache properties
  localCachedPath?: string;
  cachedUrl?: string;
  cacheStatus?: 'idle' | 'downloading' | 'ready' | 'completed' | 'error';
  cacheProgress?: number; // 0 - 100%
  cacheDownloadedBytes?: number;
  cacheTotalBytes?: number;
  cacheSpeedKbps?: number;
  cacheBufferedSeconds?: number;
}

export interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface ReactionPayload {
  id: string;
  username: string;
  emoji: string;
  timestamp: number;
  xOffset?: number; // randomized horizontal position for UI
}

export interface RoomSettings {
  allowMemberControls: boolean;
  autoPlayNext: boolean;
  enableBufferSync: boolean; // Pre-buffering sync gate
  targetBufferMinutes: number; // Target buffer ahead (default 5 min = 300s)
  minBufferSeconds: number; // Minimum buffer threshold during playback (default 60s)
}

export interface BufferSyncState {
  isSyncBuffering: boolean;
  targetSeconds: number;
  minSeconds: number;
  reason: 'initial' | 'low_buffer';
  starvingUser?: {
    socketId: string;
    username: string;
    bufferAhead: number;
    required: number;
  };
}

export interface RoomState {
  currentQueueItemId: string | null;
  activeStreamSource: 'original' | string;
  playback: PlaybackState;
  queue: QueueItem[];
  users: Record<string, User>;
  settings: RoomSettings;
  bufferSync?: BufferSyncState;
}


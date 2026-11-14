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
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  url: string; // Relative or full URL to .vtt file
  isDefault?: boolean;
  isTemporary?: boolean; // Temporary 1-day retention
  expiresAt?: number; // Timestamp when it expires (Date.now() + 24 * 3600 * 1000)
  uploadedBy?: string;
}

export interface TranscodedVersion {
  id: string;
  resolution: string; // e.g. "1080p", "720p", "480p"
  fps: number; // e.g. 24, 30, 60
  bitrate?: string;
  url: string;
  filePath: string;
  sizeBytes?: number;
  createdAt: number;
}

export interface QueueItem {
  id: string;
  title: string;
  url: string; // Direct link or proxied stream URL
  originalUrl: string; // Raw input link
  subtitles: SubtitleTrack[];
  duration: number; // in seconds
  addedBy: string;
  addedAt: number;
  transcodedVersions: TranscodedVersion[];
  isTranscoding?: boolean;
  transcodeProgress?: number;
  transcodeStatusText?: string;
}

export interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  updatedAt: number; // Server timestamp (Date.now())
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
}

export interface TranscodeJobOptions {
  queueItemId: string;
  targetFps?: number;
  targetHeight?: number; // 720, 480, 360, 1080
  preset?: string; // ultrafast, veryfast, fast, medium
  crf?: number;
}

export interface RoomState {
  currentQueueItemId: string | null;
  activeStreamSource: 'original' | string; // 'original' or transcodedVersion.id
  playback: PlaybackState;
  queue: QueueItem[];
  users: Record<string, User>;
  settings: {
    allowMemberControls: boolean;
    autoPlayNext: boolean;
  };
}


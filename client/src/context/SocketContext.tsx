import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.js';
import {
  RoomState,
  ChatMessage,
  ReactionPayload,
  User,
  QueueItem,
  SubtitleTrack,
} from '../types.js';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  roomState: RoomState | null;
  currentUser: User | null;
  chatMessages: ChatMessage[];
  reactions: ReactionPayload[];
  activeVideo: QueueItem | null;
  serverTimeOffset: number;
  // Playback actions
  sendPlay: (time?: number) => void;
  sendPause: (time?: number) => void;
  sendForcePlay: (time?: number) => void;
  sendSeek: (time: number) => void;
  sendPlaybackRate: (rate: number) => void;
  sendSourceChange: (source: string) => void;
  sendBufferStatus: (data: {
    bufferAhead: number;
    bufferedEnd: number;
    currentTime: number;
    pingMs?: number;
    downloadSpeedKbps?: number;
    isBuffering?: boolean;
  }) => void;
  measurePing: () => Promise<number>;
  // Queue actions
  setActiveVideo: (queueItemId: string) => void;
  addVideoToQueue: (
    title: string,
    url: string,
    subtitleUrl?: string,
    subtitleLabel?: string,
    autoReencode?: { fps: number; height: number }
  ) => Promise<{ success: boolean; error?: string }>;
  removeQueueItem: (id: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  // Transcode actions
  startTranscode: (queueItemId: string, targetFps: number, targetHeight: number) => void;
  cancelTranscode: (queueItemId: string) => void;
  // Subtitle actions
  attachSubtitleToCurrentVideo: (track: SubtitleTrack, queueItemId?: string) => void;
  // Social actions
  sendChatMessage: (text: string) => void;
  sendReaction: (emoji: string) => void;
  updateRoomSettings: (settings: Partial<RoomState['settings']>) => void;
  elevateToAdmin: (secretKey: string) => Promise<boolean>;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { username, secretKey, isAuthenticated, elevate } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<ReactionPayload[]>([]);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !username) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Connect to server
    const newSocket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      // Join room with username and optional secret key
      newSocket.emit('user:join', { username, secretKey });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    // Room state full sync
    newSocket.on('room:state', (state: RoomState) => {
      setRoomState(state);
      if (state.playback?.updatedAt) {
        setServerTimeOffset(Date.now() - state.playback.updatedAt);
      }
    });

    // High frequency playback sync
    newSocket.on('playback:sync', (syncData: { currentTime: number; isPlaying: boolean; playbackRate: number; updatedAt: number }) => {
      setRoomState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          playback: {
            currentTime: syncData.currentTime,
            isPlaying: syncData.isPlaying,
            playbackRate: syncData.playbackRate,
            updatedAt: syncData.updatedAt,
          },
        };
      });
      setServerTimeOffset(Date.now() - syncData.updatedAt);
    });

    // Source change
    newSocket.on('playback:source_changed', (data: { activeStreamSource: string }) => {
      setRoomState((prev) => (prev ? { ...prev, activeStreamSource: data.activeStreamSource } : null));
    });

    // Chat history and new messages
    newSocket.on('chat:history', (history: ChatMessage[]) => {
      setChatMessages(history);
    });

    newSocket.on('chat:message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    // Floating reactions
    newSocket.on('reaction:broadcast', (payload: ReactionPayload) => {
      // Add a randomized horizontal offset (10% to 90% across screen)
      const reactionWithOffset = {
        ...payload,
        xOffset: 15 + Math.random() * 70,
      };

      setReactions((prev) => [...prev, reactionWithOffset]);

      // Remove after 3.2 seconds
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== payload.id));
      }, 3200);
    });

    // Transcode progress
    newSocket.on('transcode:progress', (data: any) => {
      setRoomState((prev) => {
        if (!prev) return null;
        const updatedQueue = prev.queue.map((item) => {
          if (item.id === data.queueItemId) {
            return {
              ...item,
              isTranscoding: true,
              transcodeProgress: data.percent,
              transcodeStatusText: `${data.percent}% | ${data.speed} | FPS: ${data.fps}`,
            };
          }
          return item;
        });
        return { ...prev, queue: updatedQueue };
      });
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, username, secretKey]);

  // Derive active video item from queue
  const activeVideo: QueueItem | null =
    roomState?.queue.find((q) => q.id === roomState.currentQueueItemId) ||
    (roomState?.queue.length ? roomState.queue[0] : null);

  // Current user from socketId
  const currentUser: User | null =
    socket && socket.id && roomState?.users[socket.id] ? roomState.users[socket.id] : null;

  // Actions
  const sendPlay = (time?: number) => socket?.emit('playback:play', time);
  const sendPause = (time?: number) => socket?.emit('playback:pause', time);
  const sendForcePlay = (time?: number) => socket?.emit('playback:force_play', time);
  const sendSeek = (time: number) => socket?.emit('playback:seek', time);
  const sendPlaybackRate = (rate: number) => socket?.emit('playback:rate', rate);
  const sendSourceChange = (source: string) => socket?.emit('playback:source', source);

  const sendBufferStatus = (data: {
    bufferAhead: number;
    bufferedEnd: number;
    currentTime: number;
    pingMs?: number;
    downloadSpeedKbps?: number;
    isBuffering?: boolean;
  }) => {
    socket?.emit('playback:buffer_status', data);
  };

  const measurePing = (): Promise<number> => {
    return new Promise((resolve) => {
      if (!socket || !socket.connected) return resolve(0);
      const start = performance.now();
      socket.emit('ping:measure', Date.now(), () => {
        const ping = Math.round(performance.now() - start);
        resolve(ping);
      });
      setTimeout(() => resolve(0), 3000);
    });
  };

  const setActiveVideo = (queueItemId: string) => socket?.emit('queue:set_active', queueItemId);

  const addVideoToQueue = (
    title: string,
    url: string,
    subtitleUrl?: string,
    subtitleLabel?: string,
    autoReencode?: { fps: number; height: number }
  ): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }
      socket.emit(
        'queue:add',
        { title, url, subtitleUrl, subtitleLabel, autoReencode },
        (res: { success: boolean; error?: string }) => {
          resolve(res);
        }
      );
    });
  };

  const removeQueueItem = (id: string) => socket?.emit('queue:remove', id);
  const reorderQueue = (fromIndex: number, toIndex: number) =>
    socket?.emit('queue:reorder', { fromIndex, toIndex });

  const startTranscode = (queueItemId: string, targetFps: number, targetHeight: number) => {
    socket?.emit('transcode:start', { queueItemId, targetFps, targetHeight });
  };

  const cancelTranscode = (queueItemId: string) => socket?.emit('transcode:cancel', queueItemId);

  const sendChatMessage = (text: string) => socket?.emit('chat:send', text);
  const sendReaction = (emoji: string) => socket?.emit('reaction:send', emoji);
  const updateRoomSettings = (settings: Partial<RoomState['settings']>) =>
    socket?.emit('settings:update', settings);

  const elevateToAdmin = async (key: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket) return resolve(false);
      socket.emit('user:elevate', key, async (res: { success: boolean }) => {
        if (res.success) {
          await elevate(key);
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  };

  const attachSubtitleToCurrentVideo = (track: SubtitleTrack, queueItemId?: string) => {
    socket?.emit('video:add_subtitle', { track, queueItemId });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        roomState,
        currentUser,
        chatMessages,
        reactions,
        activeVideo,
        serverTimeOffset,
        attachSubtitleToCurrentVideo,
        sendPlay,
        sendPause,
        sendForcePlay,
        sendSeek,
        sendPlaybackRate,
        sendSourceChange,
        sendBufferStatus,
        measurePing,
        setActiveVideo,
        addVideoToQueue,
        removeQueueItem,
        reorderQueue,
        startTranscode,
        cancelTranscode,
        sendChatMessage,
        sendReaction,
        updateRoomSettings,
        elevateToAdmin,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};


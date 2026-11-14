import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext.js';
import { FloatingChatMessage } from '../types.js';

interface FloatingChatOverlayProps {
  enabled: boolean;
}

const DISPLAY_DURATION_MS = 4000; // Total life on screen: 4 seconds

interface FloatingChatItemProps {
  item: FloatingChatMessage;
  onRemove: (id: string) => void;
}

const FloatingChatItem: React.FC<FloatingChatItemProps> = ({ item, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(item.id);
    }, DISPLAY_DURATION_MS);

    return () => clearTimeout(timer);
  }, [item.id, onRemove]);

  // Vertical lane position (from 12% to 68% down the video)
  const topPosition = 12 + (item.lane % 5) * 13;

  return (
    <div
      style={{ top: `${topPosition}%` }}
      onAnimationEnd={() => onRemove(item.id)}
      className="absolute left-6 animate-chat-bubble flex items-center gap-2 max-w-md pointer-events-none select-none z-30"
    >
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 shadow-2xl text-white">
        {/* User Avatar Circle */}
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold uppercase text-white shadow-sm shrink-0"
          style={{ backgroundColor: item.avatarColor || '#6366f1' }}
        >
          {item.username ? item.username[0] : 'U'}
        </div>

        {/* User Name & Message Text */}
        <div className="flex items-center gap-1.5 text-xs truncate" dir="auto">
          <span className="font-semibold text-indigo-300 shrink-0">
            {item.username}:
          </span>
          <span className="text-slate-100 font-medium truncate" dir="auto">
            {item.text}
          </span>
        </div>
      </div>
    </div>
  );
};

export const FloatingChatOverlay: React.FC<FloatingChatOverlayProps> = ({ enabled }) => {
  const { chatMessages, roomState } = useSocket();
  const [activeItems, setActiveItems] = useState<FloatingChatMessage[]>([]);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Listen for new messages
  useEffect(() => {
    if (!enabled || chatMessages.length === 0) return;

    const latest = chatMessages[chatMessages.length - 1];
    if (!latest || latest.isSystem || processedMessageIds.current.has(latest.id)) return;

    processedMessageIds.current.add(latest.id);

    // Keep processed IDs set bounded
    if (processedMessageIds.current.size > 200) {
      processedMessageIds.current.clear();
      processedMessageIds.current.add(latest.id);
    }

    // Determine avatar color
    let avatarColor = '#6366f1';
    if (roomState?.users) {
      const user = Object.values(roomState.users).find(
        (u) => u.username === latest.username || u.id === latest.userId
      );
      if (user?.avatarColor) {
        avatarColor = user.avatarColor;
      }
    }

    const lane = Math.floor(Math.random() * 5);

    const newItem: FloatingChatMessage = {
      id: latest.id,
      userId: latest.userId,
      username: latest.username,
      text: latest.text,
      avatarColor,
      lane,
      timestamp: Date.now(),
    };

    setActiveItems((prev) => [...prev.slice(-4), newItem]); // Keep at most 5 items on screen
  }, [chatMessages, enabled, roomState?.users]);

  // Periodic sweeper: absolute guarantee that expired items (> 4.2 seconds) are removed
  useEffect(() => {
    if (!enabled) {
      setActiveItems([]);
      return;
    }

    const sweeper = setInterval(() => {
      const now = Date.now();
      setActiveItems((prev) => {
        const filtered = prev.filter((item) => now - item.timestamp < DISPLAY_DURATION_MS + 200);
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 400);

    return () => clearInterval(sweeper);
  }, [enabled]);

  const handleRemove = (id: string) => {
    setActiveItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (!enabled || activeItems.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {activeItems.map((item) => (
        <FloatingChatItem key={item.id} item={item} onRemove={handleRemove} />
      ))}
    </div>
  );
};

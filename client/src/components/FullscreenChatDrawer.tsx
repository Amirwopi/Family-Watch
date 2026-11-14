import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Smile, MessageSquare } from 'lucide-react';
import { useSocket } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';

interface FullscreenChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_EMOJIS = ['🍿', '❤️', '😂', '👏', '🔥', '😮'];

export const FullscreenChatDrawer: React.FC<FullscreenChatDrawerProps> = ({ isOpen, onClose }) => {
  const { chatMessages, sendChatMessage, sendReaction, currentUser } = useSocket();
  const { username } = useAuth();
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      // Focus input on open if on desktop
      if (window.innerWidth > 640) {
        inputRef.current?.focus();
      }
    }
  }, [isOpen, chatMessages.length]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChatMessage(text.trim());
    setText('');
  };

  const handleEmojiClick = (emoji: string) => {
    sendReaction(emoji);
    sendChatMessage(emoji);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      className="absolute top-0 right-0 bottom-0 w-80 sm:w-88 md:w-96 max-w-[90vw] bg-slate-950/90 backdrop-blur-xl border-l border-white/10 flex flex-col z-40 shadow-2xl animate-in slide-in-from-right duration-200 select-text"
      dir="rtl"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-xs sm:text-sm text-white">چت و گفتگوی زنده</h3>
            <p className="text-[10px] text-slate-400">حالت تمام‌صفحه (Fullscreen Chat)</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="بستن چت (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Reactions Bar */}
      <div className="px-3 py-2 border-b border-white/5 bg-slate-900/30 flex items-center justify-between gap-1 overflow-x-auto shrink-0">
        <span className="text-[10px] text-slate-400 shrink-0">واکنش سریع:</span>
        <div className="flex items-center gap-1.5">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="text-lg hover:scale-125 active:scale-95 transition-transform p-1 rounded-lg hover:bg-white/10"
              title={`ارسال ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 font-['Vazirmatn']">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
            <p>هنوز پیامی ارسال نشده است.</p>
            <p className="text-[10px] mt-1 text-slate-600">اولین نفری باشید که پیام می‌فرستید!</p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isSelf = msg.userId === currentUser?.id || msg.username === username;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {!isSelf && (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold uppercase">
                      {msg.username ? msg.username[0] : 'U'}
                    </div>
                  )}
                  <span className="text-[11px] font-medium text-slate-400">
                    {isSelf ? 'شما' : msg.username}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed break-words shadow-sm ${
                    isSelf
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-white/5'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-white/10 bg-slate-900/80 flex items-center gap-2 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="پیامی بنویسید..."
          className="flex-1 bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-['Vazirmatn']"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-all shrink-0 shadow-lg shadow-indigo-600/30"
          title="ارسال پیام (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

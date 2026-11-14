import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Smile } from 'lucide-react';
import { useSocket } from '../../context/SocketContext.js';

interface ChatPanelProps {
  onClose: () => void;
}

const QUICK_EMOJIS = ['🍿', '❤️', '😂', '👏', '🔥'];

export const ChatPanel: React.FC<ChatPanelProps> = ({ onClose }) => {
  const { chatMessages, sendChatMessage, sendReaction } = useSocket();
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChatMessage(text);
    setText('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full sm:w-80 md:w-96 h-full bg-slate-900 border-l border-slate-800 flex flex-col select-none z-10 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-white">Meeting Chat</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.length === 0 && (
          <div className="text-center text-xs text-slate-500 py-8">
            No messages yet. Say hello to everyone! 👋
          </div>
        )}

        {chatMessages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="text-center my-2">
                <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex flex-col space-y-0.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-indigo-400">{msg.username}</span>
                <span className="text-[10px] text-slate-500">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="text-xs text-slate-200 bg-slate-800/60 border border-slate-700/40 p-2.5 rounded-xl rounded-tl-sm break-words" dir="auto">
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reaction Emojis */}
      <div className="px-3 py-1.5 border-t border-slate-800/60 flex items-center justify-between text-lg">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            className="hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-800"
            title={`Send ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          dir="auto"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="پیام خود را بنویسید... (Send a message)"
          maxLength={300}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};


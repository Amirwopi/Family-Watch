import React, { useState } from 'react';
import {
  MessageSquare,
  ListVideo,
  Users,
  Shield,
  Smile,
  Mic,
  MicOff,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { useVoice } from '../context/VoiceContext.js';

interface MeetingDockProps {
  activeSidebar: 'chat' | 'queue' | 'participants' | 'admin' | null;
  setActiveSidebar: (sidebar: 'chat' | 'queue' | 'participants' | 'admin' | null) => void;
}

const EMOJIS = ['🍿', '❤️', '😂', '👏', '🔥', '😮', '🎉', '🙌'];

export const MeetingDock: React.FC<MeetingDockProps> = ({ activeSidebar, setActiveSidebar }) => {
  const { isAdmin } = useAuth();
  const { roomState, chatMessages, sendReaction } = useSocket();
  const { isMicMuted, isSpeaking, toggleMic, micError } = useVoice();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMicHelp, setShowMicHelp] = useState(false);

  const participantCount = roomState ? Object.keys(roomState.users).length : 1;
  const queueCount = roomState?.queue.length || 0;

  const toggleSidebar = (sidebar: 'chat' | 'queue' | 'participants' | 'admin') => {
    setActiveSidebar(activeSidebar === sidebar ? null : sidebar);
  };

  const handleSendEmoji = (emoji: string) => {
    sendReaction(emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="h-16 bg-slate-900/90 border-t border-slate-800/80 px-4 flex items-center justify-center relative select-none z-20">
      {/* Floating Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 bg-slate-900/95 border border-slate-700 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-in fade-in zoom-in-95 z-30">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSendEmoji(emoji)}
              className="text-2xl hover:scale-125 transition-transform p-1.5 rounded-xl hover:bg-slate-800"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Dock Buttons Container */}
      <div className="flex items-center gap-1.5 sm:gap-3 bg-slate-950/70 border border-slate-800 px-2 sm:px-3 py-1.5 rounded-2xl shadow-xl backdrop-blur-md relative max-w-full overflow-x-auto">
        {/* Mic Error Toast */}
        {micError && (
          <div
            onClick={() => setShowMicHelp(true)}
            className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-950/95 border border-red-500/50 text-red-200 text-[11px] px-3 py-1 rounded-xl shadow-xl flex items-center gap-1.5 animate-in fade-in cursor-pointer hover:bg-red-900/90 transition-colors"
            title="برای مشاهده راهنمای حل مشکل کلیک کنید"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="max-w-[200px] sm:max-w-md truncate">{micError}</span>
            <span className="text-[10px] text-red-300 underline font-semibold ml-1 shrink-0">راهنما ℹ️</span>
          </div>
        )}

        {/* Real-time WebRTC Voice Mic Toggle */}
        <button
          onClick={toggleMic}
          className={`p-2 sm:p-2.5 rounded-xl transition-all relative ${
            isMicMuted
              ? 'bg-slate-800/80 text-slate-400 hover:text-white'
              : isSpeaking
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-400 animate-pulse'
              : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
          }`}
          title={
            isMicMuted
              ? 'Click to Unmute & Speak with friends'
              : isSpeaking
              ? 'Speaking... (Click to Mute)'
              : 'Microphone Active (Click to Mute)'
          }
        >
          {isMicMuted ? (
            <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <>
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              {isSpeaking && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              )}
            </>
          )}
        </button>

        {/* Reactions Trigger */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 sm:p-2.5 rounded-xl transition-all ${
            showEmojiPicker
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'bg-slate-800/80 text-slate-300 hover:text-amber-400'
          }`}
          title="Send Reaction (Popcorn, Heart, etc.)"
        >
          <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="w-[1px] h-6 bg-slate-800 mx-0.5 sm:mx-1" />

        {/* Queue Button */}
        <button
          onClick={() => toggleSidebar('queue')}
          className={`relative p-2 sm:p-2.5 rounded-xl transition-all ${
            activeSidebar === 'queue'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Video Queue & Playlist"
        >
          <ListVideo className="w-4 h-4 sm:w-5 sm:h-5" />
          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] text-[10px] font-bold bg-indigo-500 text-white rounded-full border-2 border-slate-900">
              {queueCount}
            </span>
          )}
        </button>

        {/* Chat Button */}
        <button
          onClick={() => toggleSidebar('chat')}
          className={`relative p-2 sm:p-2.5 rounded-xl transition-all ${
            activeSidebar === 'chat'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Room Chat"
        >
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          {chatMessages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-slate-900" />
          )}
        </button>

        {/* Participants Button */}
        <button
          onClick={() => toggleSidebar('participants')}
          className={`relative p-2 sm:p-2.5 rounded-xl transition-all ${
            activeSidebar === 'participants'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Family Members Watching"
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] text-[10px] font-bold bg-slate-700 text-white rounded-full border-2 border-slate-900">
            {participantCount}
          </span>
        </button>

        {/* Admin Controls Button */}
        {isAdmin && (
          <>
            <div className="w-[1px] h-6 bg-slate-800 mx-0.5 sm:mx-1" />
            <button
              onClick={() => toggleSidebar('admin')}
              className={`p-2 sm:p-2.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeSidebar === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
              }`}
              title="Admin Control Center (Video Links, Subtitles, Re-encode FPS/Size)"
            >
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs font-semibold hidden md:inline">Admin Center</span>
            </button>
          </>
        )}
      </div>

      {/* Mic Network / LAN Permission Guide Modal */}
      {showMicHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none" dir="rtl">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 text-right font-['Vazirmatn']">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Mic className="w-4 h-4" />
                <span>راهنمای فعال‌سازی میکروفون در شبکه خانگی (LAN)</span>
              </div>
              <button
                onClick={() => setShowMicHelp(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3.5 leading-relaxed">
              <p className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-slate-200">
                مرورگرهای مدرن (گوگل کروم و مایکروسافت اج) به دلایل امنیتی و حفظ حریم خصوصی، اجازه فعال‌سازی میکروفون را فقط روی آدرس‌های امن (<b>localhost</b> یا پروتکل <b>HTTPS</b>) صادر می‌کنند.
              </p>

              <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <p className="font-semibold text-emerald-300">روش ۱: اتصال روی سیستم میزبان (سریع‌ترین)</p>
                <p className="text-slate-400">اگر روی همان کامپیوتری هستید که برنامه را اجرا کرده‌اید، به جای آدرس IP در نوار آدرس مرورگر وارد کنید:</p>
                <code className="block bg-slate-900 p-2 rounded-lg text-emerald-400 font-mono text-[11px] select-all border border-emerald-500/20">
                  http://localhost:{typeof window !== 'undefined' ? window.location.port || '5000' : '5000'}
                </code>
              </div>

              <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <p className="font-semibold text-amber-300">روش ۲: صحبت برای دوستان و سایر دستگاه‌ها در شبکه (LAN)</p>
                <p className="text-slate-400">تنها یکبار در مرورگر کروم یا اج دوستتان مراحل زیر را انجام دهید:</p>
                <div className="space-y-1 text-slate-300">
                  <p>۱. این آدرس را در تب جدید کروم کپی و باز کنید:</p>
                  <code className="block bg-slate-900 p-1.5 rounded text-amber-300 font-mono text-[11px] select-all border border-amber-500/20 break-all">
                    chrome://flags/#unsafely-treat-insecure-origin-as-secure
                  </code>
                  <p className="pt-1">۲. آدرس سرور را در کادر متنی مربوطه وارد کنید:</p>
                  <code className="block bg-slate-900 p-1.5 rounded text-indigo-300 font-mono text-[11px] select-all border border-indigo-500/20">
                    {typeof window !== 'undefined' ? window.location.origin : 'http://192.168.x.x:5000'}
                  </code>
                  <p className="pt-1">۳. وضعیت را روی <b>Enabled</b> بگذارید و روی دکمه آبی <b>Relaunch</b> پایین صفحه کلیک کنید.</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowMicHelp(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                متوجه شدم و بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


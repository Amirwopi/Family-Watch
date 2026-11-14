import React from 'react';
import { DownloadCloud, Play, AlertTriangle, CheckCircle, Wifi, FastForward } from 'lucide-react';
import { useSocket } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';

interface BufferSyncOverlayProps {
  onForcePlay?: () => void;
}

export const BufferSyncOverlay: React.FC<BufferSyncOverlayProps> = ({ onForcePlay }) => {
  const { roomState, sendForcePlay, updateRoomSettings } = useSocket();
  const { isAdmin } = useAuth();

  const bufferSync = roomState?.bufferSync;
  if (!bufferSync || !bufferSync.isSyncBuffering) return null;

  const targetSec = bufferSync.targetSeconds || 300;
  const minSec = bufferSync.minSeconds || 60;
  const starvingUser = bufferSync.starvingUser;
  const users = roomState?.users ? Object.values(roomState.users) : [];

  const handleForcePlay = () => {
    if (onForcePlay) {
      onForcePlay();
    } else {
      sendForcePlay();
    }
  };

  const handleToggleSync = () => {
    updateRoomSettings({
      enableBufferSync: false,
    });
    sendForcePlay();
  };

  return (
    <div
      className="absolute inset-0 z-35 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden p-6 text-center space-y-4 font-['Vazirmatn']">
        {/* Animated Glow Halo */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Icon Ring */}
        <div className="relative inline-flex items-center justify-center w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/40 border-t-indigo-400 animate-spin" />
          <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/50 flex items-center justify-center text-indigo-300 shadow-inner">
            {bufferSync.reason === 'low_buffer' ? (
              <AlertTriangle className="w-6 h-6 text-amber-400 animate-bounce" />
            ) : (
              <DownloadCloud className="w-6 h-6 text-indigo-400 animate-pulse" />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white flex items-center justify-center gap-2">
            <span>همگام‌سازی و بارگذاری بافر ویدیو (Buffer Sync)</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            {bufferSync.reason === 'low_buffer' && starvingUser ? (
              <span>
                پخش ویدیو به طور خودکار متوقف شد زیرا اینترنت کاربر{' '}
                <b className="text-amber-400 underline font-semibold">{starvingUser.username}</b> افت
                کرده و بافر او کمتر از ۱ دقیقه است ({Math.round(starvingUser.bufferAhead)} ثانیه).
              </span>
            ) : (
              <span>
                در حال دانلود حداقل ۵ دقیقه جلوتر از ویدیو برای تمام کاربران جهت تماشای کاملاً پیوسته
                و بدون لگ...
              </span>
            )}
          </p>
        </div>

        {/* Participants Buffer Progress List */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5 max-h-48 overflow-y-auto text-right">
          <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between pb-1 border-b border-slate-800/80">
            <span>وضعیت دانلود کاربران (هدف: حداقل {Math.round(targetSec / 60)} دقیقه)</span>
            <span>بافر جلوتر</span>
          </div>

          {users.map((u) => {
            const bufferVal = Math.round(u.bufferAhead || 0);
            const percent = Math.min(100, Math.round((bufferVal / targetSec) * 100));
            const isStarving = bufferSync.reason === 'low_buffer' && starvingUser?.socketId === u.socketId;
            const isReady = bufferVal >= (bufferSync.reason === 'low_buffer' ? minSec : 120);

            return (
              <div key={u.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                      style={{ backgroundColor: u.avatarColor || '#6366f1' }}
                    >
                      {u.username[0]}
                    </span>
                    <span className="font-medium text-slate-200 truncate">{u.username}</span>
                    {isStarving && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] animate-pulse">
                        بافر کم ⏳
                      </span>
                    )}
                    {isReady && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5" />
                        آماده
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    {u.pingMs ? (
                      <span
                        className={`text-[10px] flex items-center gap-0.5 ${
                          u.pingMs < 60 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                        title="پینگ کاربر"
                      >
                        <Wifi className="w-2.5 h-2.5" />
                        {u.pingMs}ms
                      </span>
                    ) : null}
                    <span
                      className={`font-bold ${
                        bufferVal >= minSec ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {bufferVal}s / {targetSec}s
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${percent}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      isReady ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Buttons / Actions */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          {isAdmin ? (
            <div className="flex items-center gap-2 w-full justify-between">
              <button
                onClick={handleToggleSync}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                title="غیرفعال‌سازی قفل بافر برای تمام اتاق"
              >
                غیرفعال کردن همگام‌سازی بافر
              </button>

              <button
                onClick={handleForcePlay}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all text-xs"
                title="پخش فوری ویدیو بدون انتظار برای کامل شدن دانلود"
              >
                <FastForward className="w-4 h-4" />
                <span>پخش فوری (بدون انتظار)</span>
              </button>
            </div>
          ) : (
            <div className="w-full text-center text-slate-400 text-[11px]">
              صبر کنید تا دانلود کاربران کامل شود... مدیر می‌تواند در صورت تمایل پخش فوری را بزند.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

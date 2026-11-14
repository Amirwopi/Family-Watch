import React from 'react';
import { DownloadCloud, Play, AlertTriangle, CheckCircle, Wifi, FastForward } from 'lucide-react';
import { useSocket } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';

interface BufferSyncOverlayProps {
  onForcePlay?: () => void;
  onInteractiveLoad?: () => void;
}

export const BufferSyncOverlay: React.FC<BufferSyncOverlayProps> = ({ onForcePlay, onInteractiveLoad }) => {
  const { roomState, activeVideo, currentUser, sendForcePlay, updateRoomSettings } = useSocket();
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
                پخش ویدیو موقتاً متوقف شد زیرا دانلود کاربر{' '}
                <b className="text-amber-400 underline font-semibold">{starvingUser.username}</b> افت
                کرده است ({Math.round(starvingUser.bufferAhead)} ثانیه بافر). در حال بازیابی و بافر هماهنگ...
              </span>
            ) : (
              <span>
                در حال بارگذاری هماهنگ ویدیو برای تمام اعضا جهت پخش پیوسته و بدون قطعی...
              </span>
            )}
          </p>
        </div>

        {/* Interactive unlock button if current user buffer is 0 (browser autoplay block) */}
        {currentUser && (currentUser.bufferAhead ?? 0) < 5 && onInteractiveLoad && (
          <button
            onClick={onInteractiveLoad}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 animate-pulse transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>برای فعال‌سازی و دریافت فریم‌های ویدیو کلیک کنید</span>
          </button>
        )}

        {/* Server Cache Progress Section */}
        {activeVideo && activeVideo.url && activeVideo.url.startsWith('http') && (
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-right space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                <DownloadCloud className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>وضعیت کش و بافر سرور:</span>
                <span className="text-white">
                  {activeVideo.cacheStatus === 'completed'
                    ? 'دانلود کامل شد (۱۰۰٪)'
                    : activeVideo.cacheStatus === 'ready'
                    ? 'آماده پخش (بافر هدف سرور تامین شد)'
                    : `${activeVideo.cacheProgress || 0}%`}
                </span>
              </div>
              <div className="text-[11px] font-mono text-indigo-200">
                {activeVideo.cacheDownloadedBytes
                  ? `${(activeVideo.cacheDownloadedBytes / 1024 / 1024).toFixed(1)} MB`
                  : ''}
                {activeVideo.cacheTotalBytes
                  ? ` / ${(activeVideo.cacheTotalBytes / 1024 / 1024).toFixed(1)} MB`
                  : ''}
              </div>
            </div>

            {/* Server download progress bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${activeVideo.cacheProgress || 0}%` }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300 shadow-sm shadow-indigo-500/50"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>
                بافر سرور: <b className="text-indigo-400 font-bold">{Math.round(((activeVideo.cacheBufferedSeconds || 0) / 60) * 10) / 10} دقیقه</b>
                {' '}(هدف: {Math.round(targetSec / 60)} دقیقه)
              </span>
              {activeVideo.cacheSpeedKbps ? (
                <span className="font-mono text-slate-400">
                  سرعت سرور: {(activeVideo.cacheSpeedKbps / 8 / 1024).toFixed(2)} MB/s
                </span>
              ) : null}
            </div>
          </div>
        )}

        {/* Participants Buffer Progress List */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5 max-h-48 overflow-y-auto text-right">
          <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between pb-1 border-b border-slate-800/80">
            <span>وضعیت دانلود کاربران</span>
            <span>بافر ذخیره شده</span>
          </div>

          {users.map((u) => {
            const bufferVal = Math.round(u.bufferAhead || 0);
            const isStarving = bufferSync.reason === 'low_buffer' && starvingUser?.socketId === u.socketId;
            const isReady = u.isReadyForPlayback || bufferVal >= 15;
            const percent = Math.min(100, Math.round((bufferVal / (bufferSync.reason === 'low_buffer' ? minSec : 15)) * 100));

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
                        افت دانلود ⏳
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
                        isReady ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {bufferVal}s
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


import React from 'react';
import {
  X,
  Play,
  Trash2,
  ChevronUp,
  ChevronDown,
  Film,
  Subtitles,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';

interface QueuePanelProps {
  onClose: () => void;
  onOpenAdmin: () => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({ onClose, onOpenAdmin }) => {
  const { isAdmin } = useAuth();
  const {
    roomState,
    setActiveVideo,
    removeQueueItem,
    reorderQueue,
  } = useSocket();

  const queue = roomState?.queue || [];
  const currentId = roomState?.currentQueueItemId;

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full sm:w-84 md:w-96 h-full bg-slate-900 border-l border-slate-800 flex flex-col select-none z-10 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-white">Video Queue</h3>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 font-medium">
            {queue.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {queue.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-12">
            Queue is empty.
            {isAdmin && (
              <p className="mt-2 text-indigo-400 cursor-pointer" onClick={onOpenAdmin}>
                + Add video from Admin Panel
              </p>
            )}
          </div>
        ) : (
          queue.map((item, index) => {
            const isCurrent = item.id === currentId;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/30'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Row: Title & Playing Badge */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 w-4 font-mono">
                      {index + 1}.
                    </span>
                    <h4 className="text-xs font-semibold text-white line-clamp-1" title={item.title}>
                      {item.title}
                    </h4>
                  </div>
                  {isCurrent && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded bg-indigo-500 text-white uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      PLAYING
                    </span>
                  )}
                </div>

                {/* Metadata Row */}
                <div className="flex items-center gap-3 text-[11px] text-slate-400 pl-6 mb-2">
                  <span>{formatDuration(item.duration)}</span>
                  <span>•</span>
                  <span>by {item.addedBy}</span>

                  {item.subtitles && item.subtitles.length > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-indigo-400" title="Subtitles available">
                      <Subtitles className="w-3 h-3" />
                      {item.subtitles.length}
                    </span>
                  )}

                  {item.transcodedVersions && item.transcodedVersions.length > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-amber-400" title="Re-encoded versions ready">
                      <Sparkles className="w-3 h-3" />
                      {item.transcodedVersions.length}
                    </span>
                  )}
                </div>

                {/* Transcoding Progress Status if active */}
                {item.isTranscoding && (
                  <div className="pl-6 mb-2">
                    <div className="flex items-center justify-between text-[10px] text-amber-400 mb-1">
                      <span>Re-encoding video...</span>
                      <span>{item.transcodeProgress || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${item.transcodeProgress || 0}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 block truncate">
                      {item.transcodeStatusText}
                    </span>
                  </div>
                )}

                {/* Action Controls for Admin */}
                {isAdmin && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 pl-6">
                    <div className="flex items-center gap-1">
                      {!isCurrent && (
                        <button
                          onClick={() => setActiveVideo(item.id)}
                          className="px-2 py-1 rounded-md bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3 fill-current" /> Play Now
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      {/* Move Up */}
                      <button
                        onClick={() => reorderQueue(index, index - 1)}
                        disabled={index === 0}
                        className="p-1 rounded hover:text-white disabled:opacity-20"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      {/* Move Down */}
                      <button
                        onClick={() => reorderQueue(index, index + 1)}
                        disabled={index === queue.length - 1}
                        className="p-1 rounded hover:text-white disabled:opacity-20"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {/* Remove */}
                      <button
                        onClick={() => removeQueueItem(item.id)}
                        className="p-1 rounded hover:text-red-400 transition-colors ml-1"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Add Video button (Admin) */}
      {isAdmin && (
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={onOpenAdmin}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Add New Video
          </button>
        </div>
      )}
    </div>
  );
};


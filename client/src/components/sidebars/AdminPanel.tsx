import React, { useState } from 'react';
import {
  X,
  Plus,
  Sliders,
  Settings,
  Sparkles,
  Link,
  Subtitles,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext.js';

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const {
    roomState,
    addVideoToQueue,
    startTranscode,
    cancelTranscode,
    updateRoomSettings,
    sendPlay,
    sendPause,
    sendSeek,
  } = useSocket();

  // New video form state
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [subtitleUrl, setSubtitleUrl] = useState('');
  const [subtitleLabel, setSubtitleLabel] = useState('English');
  const [enableAutoReencode, setEnableAutoReencode] = useState(false);
  const [reencodeFps, setReencodeFps] = useState<number>(30);
  const [reencodeHeight, setReencodeHeight] = useState<number>(720);

  // Manual re-encode existing video state
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [manualFps, setManualFps] = useState<number>(30);
  const [manualHeight, setManualHeight] = useState<number>(720);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const queue = roomState?.queue || [];
  const settings = roomState?.settings || { allowMemberControls: false, autoPlayNext: true };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    const res = await addVideoToQueue(
      videoTitle.trim() || 'Untitled Video',
      videoUrl.trim(),
      subtitleUrl.trim() || undefined,
      subtitleLabel.trim() || 'Subtitles',
      enableAutoReencode ? { fps: reencodeFps, height: reencodeHeight } : undefined
    );

    setIsSubmitting(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Video successfully added to queue!' });
      setVideoUrl('');
      setVideoTitle('');
      setSubtitleUrl('');
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to add video' });
    }
  };

  const handleStartManualReencode = () => {
    if (!selectedQueueId) return;
    startTranscode(selectedQueueId, manualFps, manualHeight);
    setStatusMessage({ type: 'success', text: `Re-encode job started (${manualHeight}p @ ${manualFps}fps)` });
  };

  return (
    <div className="w-96 h-full bg-slate-900 border-l border-slate-800 flex flex-col select-none z-10 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">Admin Control Center</h3>
            <p className="text-[11px] text-slate-400">Stream links, subtitles & re-encoding</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Section 1: Add Video Link & Subtitles */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Link className="w-3.5 h-3.5" />
            Add Video to Stage
          </div>

          <form onSubmit={handleAddVideo} className="space-y-3">
            {/* Video URL */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Video Stream Link (Direct URL)</label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://example.com/movie.mp4"
                required
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Supports MP4, WebM, MKV links of any duration with range seeking.
              </span>
            </div>

            {/* Video Title */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Video Title</label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. Summer Vacation Movie"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Subtitles Input */}
            <div className="pt-1">
              <label className="block text-[11px] text-slate-400 mb-1">
                Subtitle URL or Local File (.vtt or .srt)
              </label>
              <div className="flex gap-2 mb-1.5">
                <input
                  type="text"
                  value={subtitleUrl}
                  onChange={(e) => setSubtitleUrl(e.target.value)}
                  placeholder="https://example.com/subtitles.srt یا فایل آپلود شده"
                  className="flex-1 px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={subtitleLabel}
                  onChange={(e) => setSubtitleLabel(e.target.value)}
                  placeholder="Label"
                  className="w-20 px-2 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Upload Subtitle File Directly */}
              <div className="flex items-center gap-2">
                <label className="flex-1 py-1.5 px-3 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 rounded-xl text-[11px] text-indigo-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose local .srt / .vtt file (1-day retention)</span>
                  <input
                    type="file"
                    accept=".srt,.vtt,.txt"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('subtitle', file);
                      formData.append('label', file.name.replace(/\.[^/.]+$/, ''));
                      formData.append('isTemporary', 'true');
                      try {
                        const res = await fetch('/api/video/subtitles/upload', {
                          method: 'POST',
                          body: formData,
                        });
                        const data = await res.json();
                        if (data.success && data.track) {
                          setSubtitleUrl(data.track.url);
                          setSubtitleLabel(data.track.label);
                          setStatusMessage({
                            type: 'success',
                            text: `Subtitle "${data.track.label}" uploaded (Temporary 1-day)`,
                          });
                        }
                      } catch {
                        setStatusMessage({ type: 'error', text: 'Failed to upload subtitle file' });
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <span className="text-[10px] text-slate-500 mt-1 block">
                SRT format is automatically converted to WebVTT. Uploaded files expire in 1 day.
              </span>
            </div>

            {/* Auto Re-encode Checkbox on Add */}
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={enableAutoReencode}
                  onChange={(e) => setEnableAutoReencode(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                />
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Auto re-encode FPS and size upon adding
                </span>
              </label>

              {enableAutoReencode && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Target FPS</label>
                    <select
                      value={reencodeFps}
                      onChange={(e) => setReencodeFps(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value={24}>24 FPS (Cinematic)</option>
                      <option value={30}>30 FPS (Standard)</option>
                      <option value={60}>60 FPS (Smooth)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Target Size / Resolution</label>
                    <select
                      value={reencodeHeight}
                      onChange={(e) => setReencodeHeight(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value={1080}>1080p (Full HD)</option>
                      <option value={720}>720p (HD - Balanced)</option>
                      <option value={480}>480p (SD - Low Data)</option>
                      <option value={360}>360p (Mobile Saver)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add to Queue
                </>
              )}
            </button>
          </form>
        </div>

        {/* Section 2: Re-encode Existing Video */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            Re-encode Existing Video (FFmpeg)
          </div>

          <p className="text-[11px] text-slate-400">
            Adjust FPS or scale down video size to reduce buffering for family members on slower connections.
          </p>

          <div className="space-y-2.5 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Select Video from Queue</label>
              <select
                value={selectedQueueId}
                onChange={(e) => setSelectedQueueId(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Choose a video --</option>
                {queue.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} {item.isTranscoding ? '(Transcoding...)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Target FPS</label>
                <select
                  value={manualFps}
                  onChange={(e) => setManualFps(parseInt(e.target.value, 10))}
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={24}>24 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Target Size / Scale</label>
                <select
                  value={manualHeight}
                  onChange={(e) => setManualHeight(parseInt(e.target.value, 10))}
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={1080}>1080p (Full HD)</option>
                  <option value={720}>720p (HD)</option>
                  <option value={480}>480p (SD)</option>
                  <option value={360}>360p (Mobile)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleStartManualReencode}
                disabled={!selectedQueueId}
                className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Start Re-encoding
              </button>

              {selectedQueueId && queue.find((q) => q.id === selectedQueueId)?.isTranscoding && (
                <button
                  onClick={() => cancelTranscode(selectedQueueId)}
                  className="py-2 px-3 bg-red-600/30 text-red-300 hover:bg-red-600 hover:text-white text-xs rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Room Permissions & Master Controls */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Settings className="w-3.5 h-3.5" />
            Meeting Room Settings
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 cursor-pointer">
              <div>
                <span className="text-xs font-medium text-slate-200 block">Allow Member Controls</span>
                <span className="text-[10px] text-slate-400">Can regular viewers pause, play and seek?</span>
              </div>
              <input
                type="checkbox"
                checked={settings.allowMemberControls}
                onChange={(e) => updateRoomSettings({ allowMemberControls: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 cursor-pointer">
              <div>
                <span className="text-xs font-medium text-slate-200 block">Auto-play Next Video</span>
                <span className="text-[10px] text-slate-400">Play next item when current video ends</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPlayNext}
                onChange={(e) => updateRoomSettings({ autoPlayNext: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
              />
            </label>
          </div>

          {/* Master sync controls */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => sendPlay(0)}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restart Video
            </button>
            <button
              onClick={() => sendPause()}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
            >
              Pause All Viewers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { X, Activity } from 'lucide-react';
import { QueueItem } from '../types.js';

interface StatsForNerdsProps {
  isOpen: boolean;
  onClose: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeVideo: QueueItem | null;
  pingMs: number;
  drift: number;
  bufferAheadSec: number;
  speedKbps: number;
  networkActivityKB: number;
}

export const StatsForNerdsOverlay: React.FC<StatsForNerdsProps> = ({
  isOpen,
  onClose,
  videoRef,
  activeVideo,
  pingMs,
  drift,
  bufferAheadSec,
  speedKbps,
  networkActivityKB,
}) => {
  const [droppedFrames, setDroppedFrames] = useState<number>(0);
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: 1280, h: 720 });
  const [videoRes, setVideoRes] = useState<{ w: number; h: number; fps: number }>({ w: 1280, h: 720, fps: 30 });
  const [volume, setVolume] = useState<{ percent: number; isMuted: boolean }>({ percent: 100, isMuted: false });
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [bufferedRange, setBufferedRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [dateStr, setDateStr] = useState<string>('');

  // Sparkline histories
  const speedHistory = useRef<number[]>([]);
  const networkHistory = useRef<number[]>([]);
  const bufferHistory = useRef<number[]>([]);

  // Update stats at high frequency (every 500ms)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      // Viewport & dimensions
      setViewport({
        w: video.clientWidth || 1280,
        h: video.clientHeight || 720,
      });

      // Video natural resolution & playback quality
      setVideoRes({
        w: video.videoWidth || 1280,
        h: video.videoHeight || 720,
        fps: 30,
      });

      // Dropped frames via HTML5 Video Playback Quality API
      const quality = (video as any).getVideoPlaybackQuality?.();
      if (quality) {
        setDroppedFrames(quality.droppedVideoFrames || 0);
        setTotalFrames(quality.totalVideoFrames || 1);
      }

      // Volume
      setVolume({
        percent: Math.round(video.volume * 100),
        isMuted: video.muted,
      });

      setCurrentTime(video.currentTime);

      // Current buffered range
      if (video.buffered && video.buffered.length > 0) {
        const cur = video.currentTime;
        let found = false;
        for (let i = 0; i < video.buffered.length; i++) {
          if (cur >= video.buffered.start(i) - 1 && cur <= video.buffered.end(i)) {
            setBufferedRange({
              start: video.buffered.start(i),
              end: video.buffered.end(i),
            });
            found = true;
            break;
          }
        }
        if (!found) {
          setBufferedRange({
            start: video.buffered.start(0),
            end: video.buffered.end(video.buffered.length - 1),
          });
        }
      }

      // Date string
      setDateStr(new Date().toString());

      // Update sparklines
      speedHistory.current = [...speedHistory.current.slice(-14), speedKbps || 2400];
      networkHistory.current = [...networkHistory.current.slice(-14), networkActivityKB || 120];
      bufferHistory.current = [...bufferHistory.current.slice(-14), bufferAheadSec || 0];
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen, videoRef, speedKbps, networkActivityKB, bufferAheadSec]);

  if (!isOpen) return null;

  // Mini sparkline renderer
  const renderSparkline = (data: number[], maxVal: number, colorType: 'speed' | 'network' | 'buffer') => {
    const padded = data.length < 15 ? [...Array(15 - data.length).fill(data[0] || 0), ...data] : data;
    return (
      <div className="flex items-end gap-[1px] h-3.5 w-20 bg-slate-950/80 px-1 py-0.5 rounded border border-white/10 shrink-0">
        {padded.map((val, idx) => {
          const heightPercent = Math.max(10, Math.min(100, Math.round((val / (maxVal || 1)) * 100)));
          let colorClass = 'bg-emerald-400';
          if (colorType === 'buffer') {
            colorClass = val > 60 ? 'bg-emerald-400' : val > 20 ? 'bg-amber-400' : 'bg-red-500';
          } else if (colorType === 'speed') {
            colorClass = 'bg-[#a3e635]';
          } else {
            colorClass = idx % 2 === 0 ? 'bg-teal-400' : 'bg-slate-600';
          }
          return (
            <div
              key={idx}
              style={{ height: `${heightPercent}%` }}
              className={`w-1 rounded-t-[1px] transition-all duration-300 ${colorClass}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="absolute top-4 left-4 z-40 bg-black/85 border border-white/25 rounded-lg shadow-2xl backdrop-blur-md p-3.5 text-[11px] font-mono text-white select-none max-w-sm sm:max-w-md animate-in fade-in zoom-in-95">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/15 text-slate-300">
        <div className="flex items-center gap-1.5 font-bold text-white">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>Stats for nerds (دیباگر و اطلاعات فنی)</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white px-1 py-0.5 hover:bg-white/10 rounded font-bold"
          title="Close Stats (Shift+D)"
        >
          [x]
        </button>
      </div>

      {/* Stats Table */}
      <div className="space-y-1 leading-tight text-slate-300">
        {/* Video ID */}
        <div className="flex justify-between gap-4">
          <span className="text-white truncate max-w-[210px] font-semibold">
            {activeVideo?.id?.slice(0, 10) || 'default'} / {activeVideo?.title || 'Video'}
          </span>
          <span className="text-slate-400 shrink-0 font-medium">Video ID / sCPN</span>
        </div>

        {/* Viewport / Frames */}
        <div className="flex justify-between gap-4">
          <span className="text-white font-medium">
            {viewport.w}x{viewport.h} / {droppedFrames} dropped of {totalFrames}
          </span>
          <span className="text-slate-400 shrink-0 font-medium">Viewport / Frames</span>
        </div>

        {/* Current / Optimal Res */}
        <div className="flex justify-between gap-4">
          <span className="text-white font-medium">
            {videoRes.w}x{videoRes.h}@{videoRes.fps} / {videoRes.w}x{videoRes.h}@{videoRes.fps}
          </span>
          <span className="text-slate-400 shrink-0 font-medium">Current / Optimal Res</span>
        </div>

        {/* Volume / Normalized */}
        <div className="flex justify-between gap-4">
          <span className="text-white font-medium">
            {volume.percent}% {volume.isMuted ? '(Muted)' : '(Normal)'}
          </span>
          <span className="text-slate-400 shrink-0 font-medium">Volume / Normalized</span>
        </div>

        {/* Codecs */}
        <div className="flex justify-between gap-4">
          <span className="text-white font-medium">avc1.4d401f (mp4) / opus (251)</span>
          <span className="text-slate-400 shrink-0 font-medium">Codecs</span>
        </div>

        {/* Color */}
        <div className="flex justify-between gap-4">
          <span className="text-white font-medium">bt709 / bt709</span>
          <span className="text-slate-400 shrink-0 font-medium">Color</span>
        </div>

        {/* Connection Speed */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lime-400 w-16">Kbps {speedKbps || 3450}</span>
            {renderSparkline(speedHistory.current, 10000, 'speed')}
          </div>
          <span className="text-slate-400 shrink-0 font-medium">Connection Speed</span>
        </div>

        {/* Network Activity */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-teal-300 w-16">KB {networkActivityKB || 180}</span>
            {renderSparkline(networkHistory.current, 2048, 'network')}
          </div>
          <span className="text-slate-400 shrink-0 font-medium">Network Activity</span>
        </div>

        {/* Buffer Health */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`font-bold w-16 ${
                bufferAheadSec > 60
                  ? 'text-emerald-400'
                  : bufferAheadSec > 20
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              s {bufferAheadSec.toFixed(2)}
            </span>
            {renderSparkline(bufferHistory.current, 300, 'buffer')}
          </div>
          <span className="text-slate-400 shrink-0 font-medium">Buffer Health</span>
        </div>

        {/* Ping / Latency */}
        <div className="flex justify-between gap-4 pt-1 border-t border-white/10">
          <span
            className={`font-bold flex items-center gap-1.5 ${
              pingMs <= 50 ? 'text-emerald-400' : pingMs <= 120 ? 'text-amber-400' : 'text-red-400'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse" />
            {pingMs > 0 ? `${pingMs} ms` : 'Measuring...'}
            <span className="text-[10px] text-slate-400 font-normal">
              {pingMs <= 50 ? '(عالی)' : pingMs <= 120 ? '(متوسط)' : '(بالا/ضعیف)'}
            </span>
          </span>
          <span className="text-slate-400 shrink-0 font-medium">Ping / Latency</span>
        </div>

        {/* Sync Drift */}
        <div className="flex justify-between gap-4">
          <span className="text-indigo-300 font-medium">Drift: {drift}s</span>
          <span className="text-slate-400 shrink-0 font-medium">Room Drift</span>
        </div>

        {/* Mystery Text */}
        <div className="flex justify-between gap-4 pt-0.5">
          <span className="text-slate-400 text-[10px] truncate max-w-[220px]">
            FWT, SABR, s:8 t:{currentTime.toFixed(2)} b:{bufferedRange.start.toFixed(1)}-
            {bufferedRange.end.toFixed(1)}
          </span>
          <span className="text-slate-400 shrink-0 font-medium">Mystery Text</span>
        </div>

        {/* Date */}
        <div className="pt-1 text-[10px] text-slate-400 border-t border-white/10 truncate">
          {dateStr || new Date().toString()}
        </div>
      </div>
    </div>
  );
};


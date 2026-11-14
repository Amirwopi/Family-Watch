import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Subtitles,
  Sliders,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Film,
  Settings,
  Upload,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { SubtitleCue, fetchAndParseSubtitles } from '../utils/subtitleParser.js';
import {
  loadSubtitleStyles,
  saveSubtitleStyles,
} from '../constants/subtitleDefaults.js';
import { SubtitleStyleSettings, SubtitleTrack } from '../types.js';
import { CustomSubtitleOverlay } from './CustomSubtitleOverlay.js';
import { SubtitleSettingsModal } from './SubtitleSettingsModal.js';
import { FloatingChatOverlay } from './FloatingChatOverlay.js';

export const VideoPlayer: React.FC = () => {
  const { username, isAdmin } = useAuth();
  const {
    roomState,
    activeVideo,
    sendPlay,
    sendPause,
    sendSeek,
    sendSourceChange,
    attachSubtitleToCurrentVideo,
  } = useSocket();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [drift, setDrift] = useState<number>(0);
  const [bufferedEnd, setBufferedEnd] = useState<number>(0);

  // Subtitle states
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string>('off');
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [subtitleStyles, setSubtitleStyles] = useState<SubtitleStyleSettings>(loadSubtitleStyles);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [isUploadingSubtitle, setIsUploadingSubtitle] = useState<boolean>(false);

  // Quality & Chat overlays
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [showInVideoChat, setShowInVideoChat] = useState<boolean>(true);

  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const isSeeking = useRef<boolean>(false);

  const canControl = isAdmin || (roomState?.settings?.allowMemberControls ?? false);

  // Determine active video source URL
  let streamUrl = '';
  if (activeVideo) {
    if (roomState?.activeStreamSource && roomState.activeStreamSource !== 'original') {
      const transcoded = activeVideo.transcodedVersions.find(
        (v) => v.id === roomState.activeStreamSource
      );
      if (transcoded) {
        streamUrl = transcoded.url;
      }
    }
    // Fallback to original or proxy stream
    if (!streamUrl) {
      if (activeVideo.url.startsWith('http://') || activeVideo.url.startsWith('https://')) {
        streamUrl = `/api/video/stream?url=${encodeURIComponent(activeVideo.url)}`;
      } else {
        streamUrl = activeVideo.url;
      }
    }
  }

  // Load subtitle cues whenever selected subtitle changes
  useEffect(() => {
    if (selectedSubtitleId === 'off' || !activeVideo?.subtitles) {
      setSubtitleCues([]);
      return;
    }

    const track = activeVideo.subtitles.find((s) => s.label === selectedSubtitleId);
    if (track && track.url) {
      fetchAndParseSubtitles(track.url).then((cues) => {
        setSubtitleCues(cues);
      });
    } else {
      setSubtitleCues([]);
    }
  }, [selectedSubtitleId, activeVideo?.subtitles]);

  // Set default subtitle if active video has one and nothing selected yet
  useEffect(() => {
    if (selectedSubtitleId === 'off' && activeVideo?.subtitles && activeVideo.subtitles.length > 0) {
      const def = activeVideo.subtitles.find((s) => s.isDefault);
      if (def) {
        setSelectedSubtitleId(def.label);
      }
    }
  }, [activeVideo?.subtitles]);

  // Synchronize playback state with server
  const syncPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || !roomState?.playback || isSeeking.current) return;

    const playback = roomState.playback;
    const now = Date.now();
    const elapsed = playback.isPlaying ? (now - playback.updatedAt) / 1000 : 0;
    let serverSimulatedTime = Math.max(0, playback.currentTime + elapsed * playback.playbackRate);

    // If video has finished or simulated time exceeds video duration, cap it
    const videoDuration = video.duration || activeVideo?.duration || 0;
    if (videoDuration > 0 && serverSimulatedTime >= videoDuration) {
      serverSimulatedTime = videoDuration;
    }

    // When video reached the end, zero out drift and ensure paused
    if (video.ended || (videoDuration > 0 && video.currentTime >= videoDuration - 0.2)) {
      setDrift(0);
      if (playback.isPlaying && !video.paused) {
        video.pause();
      }
      return;
    }

    const currentDrift = Math.abs(video.currentTime - serverSimulatedTime);
    setDrift(Math.round(currentDrift * 10) / 10);

    // Hard seek if drift is > 1.5 seconds and not ended
    if (currentDrift > 1.5 && !video.ended) {
      video.currentTime = serverSimulatedTime;
    }

    // Synchronize play / pause state
    if (playback.isPlaying && video.paused && !video.ended) {
      video.play().catch(() => {});
    } else if (!playback.isPlaying && !video.paused) {
      video.pause();
    }
  }, [roomState?.playback, activeVideo?.duration]);

  useEffect(() => {
    syncPlayback();
  }, [roomState?.playback, syncPlayback]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!isSeeking.current) {
        setCurrentTime(video.currentTime);
      }
      if (video.buffered.length > 0) {
        setBufferedEnd(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || activeVideo?.duration || 0);
      syncPlayback();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setDrift(0);
      if (isAdmin) {
        sendPause(video.duration || currentTime);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [activeVideo, syncPlayback, isAdmin, currentTime, sendPause]);

  // Controls auto-hide
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) {
        setControlsVisible(false);
      }
    }, 3500);
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!canControl) return;
    if (isPlaying) {
      sendPause(videoRef.current?.currentTime);
    } else {
      sendPlay(videoRef.current?.currentTime);
    }
  };

  // Manual Seek
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  const handleSeekEnd = () => {
    isSeeking.current = false;
    if (canControl && videoRef.current) {
      sendSeek(videoRef.current.currentTime);
    }
  };

  // Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    videoRef.current.muted = next;
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Handle temporary subtitle file upload
  const handleUploadSubtitleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSubtitle(true);
    try {
      const formData = new FormData();
      formData.append('subtitle', file);
      formData.append('label', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('language', 'en');
      formData.append('isTemporary', 'true');
      formData.append('uploadedBy', username || 'User');

      const res = await fetch('/api/video/subtitles/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.track) {
        // Attach to current video in real-time
        attachSubtitleToCurrentVideo(data.track);
        setSelectedSubtitleId(data.track.label);
      }
    } catch (err) {
      console.error('Failed to upload temporary subtitle:', err);
    } finally {
      setIsUploadingSubtitle(false);
      setShowSubtitleMenu(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save subtitle styles
  const handleStylesChange = (newStyles: SubtitleStyleSettings) => {
    setSubtitleStyles(newStyles);
    saveSubtitleStyles(newStyles);
  };

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!activeVideo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-950/60 select-none">
        <Film className="w-16 h-16 text-slate-600 mb-4 animate-pulse" />
        <h3 className="text-xl font-semibold text-slate-200">Watch Stage is Waiting</h3>
        <p className="text-sm max-w-sm text-slate-500 mt-2">
          {isAdmin
            ? 'Add a video link from the Admin Panel to start watching with the family.'
            : 'Waiting for the Admin to select and play a video.'}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative flex-1 bg-black flex items-center justify-center overflow-hidden select-none group"
    >
      {/* Hidden File Input for Subtitle Upload (Temporary 1-day) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadSubtitleFile}
        accept=".srt,.vtt,.txt"
        className="hidden"
      />

      {/* Video Element */}
      <video
        ref={videoRef}
        src={streamUrl}
        playsInline
        preload="auto"
        className="w-full h-full object-contain max-h-[calc(100vh-8.5rem)] cursor-pointer"
        onClick={togglePlay}
      />

      {/* Custom High-Fidelity Subtitle Overlay with Full Styling Controls */}
      <CustomSubtitleOverlay
        cues={subtitleCues}
        currentTime={currentTime}
        styles={subtitleStyles}
        controlsVisible={controlsVisible}
      />

      {/* In-Video Floating Chat Overlay (Nico/Danmaku style comments on video) */}
      <FloatingChatOverlay enabled={showInVideoChat} />

      {/* Subtitle Settings Modal */}
      {showSettingsModal && (
        <SubtitleSettingsModal
          styles={subtitleStyles}
          onChange={handleStylesChange}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Title & Sync Drift Overlay at Top-Left */}
      <div
        className={`absolute top-4 left-4 transition-opacity duration-300 pointer-events-none flex items-center gap-2 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs text-white flex items-center gap-2 shadow-lg">
          <span className="font-medium text-slate-200 max-w-xs truncate">{activeVideo.title}</span>
          <span className="text-slate-400">•</span>
          <span className={`text-[11px] font-mono ${drift > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
            Drift: {drift}s
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              syncPlayback();
            }}
            className="pointer-events-auto hover:text-indigo-400 ml-1"
            title="Force re-sync with server"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Notice if regular member cannot control */}
      {!canControl && controlsVisible && (
        <div className="absolute top-4 right-4 transition-opacity duration-300 pointer-events-none">
          <div className="px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-sm border border-white/10 text-[11px] text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-slate-400" />
            Admin controlled playback
          </div>
        </div>
      )}

      {/* Custom Bottom Video Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pb-4 px-6 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Timeline Slider */}
        <div className="relative mb-3 flex items-center group/timeline">
          {/* Buffered track */}
          <div
            className="absolute left-0 h-1.5 bg-slate-600/50 rounded-full pointer-events-none"
            style={{ width: `${duration > 0 ? (bufferedEnd / duration) * 100 : 0}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            disabled={!canControl}
            onMouseDown={() => (isSeeking.current = true)}
            onTouchStart={() => (isSeeking.current = true)}
            onChange={handleSeekChange}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            className="w-full relative z-10 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between text-white text-sm">
          {/* Left: Play/Pause, Volume, Time */}
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              disabled={!canControl}
              className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
                !canControl ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="p-1 hover:text-indigo-400 transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 accent-indigo-500 cursor-pointer opacity-80 hover:opacity-100"
              />
            </div>

            {/* Duration Display */}
            <div className="text-xs text-slate-300 font-mono select-none">
              <span>{formatDuration(currentTime)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Right: Floating Chat Toggle, Subtitles, Quality/FPS Stream selector, Fullscreen */}
          <div className="flex items-center gap-3 relative">
            {/* In-Video Floating Chat Toggle */}
            <button
              onClick={() => setShowInVideoChat(!showInVideoChat)}
              className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1 text-xs ${
                showInVideoChat ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'
              }`}
              title={`In-Video Chat Comments: ${showInVideoChat ? 'ON' : 'OFF'}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-[10px] hidden md:inline">
                Chat {showInVideoChat ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Subtitle Selector & Full Control Center */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSubtitleMenu(!showSubtitleMenu);
                  setShowQualityMenu(false);
                }}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1 text-xs ${
                  selectedSubtitleId !== 'off' ? 'text-indigo-400 font-medium' : 'text-slate-300'
                }`}
                title="Subtitles & Styling"
              >
                <Subtitles className="w-4 h-4" />
                <span className="hidden sm:inline">CC</span>
              </button>

              {showSubtitleMenu && (
                <div className="absolute bottom-10 right-0 w-64 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl py-1 text-xs backdrop-blur-md z-30 animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                    <span>Subtitles</span>
                    <button
                      onClick={() => {
                        setShowSettingsModal(true);
                        setShowSubtitleMenu(false);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 lowercase text-[11px]"
                      title="Open Subtitle Styling Controls"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      styles
                    </button>
                  </div>

                  {/* Off Option */}
                  <button
                    onClick={() => {
                      setSelectedSubtitleId('off');
                      setShowSubtitleMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-indigo-600/20 transition-colors ${
                      selectedSubtitleId === 'off' ? 'text-indigo-400 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    Off
                  </button>

                  {/* Subtitle Track List */}
                  <div className="max-h-48 overflow-y-auto">
                    {activeVideo.subtitles?.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          setSelectedSubtitleId(sub.label);
                          setShowSubtitleMenu(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-indigo-600/20 transition-colors flex items-center justify-between ${
                          selectedSubtitleId === sub.label ? 'text-indigo-400 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate">{sub.label}</span>
                          {sub.isTemporary && (
                            <span
                              className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-medium shrink-0 flex items-center gap-0.5"
                              title="Temporary subtitle (expires in 1 day)"
                            >
                              <Clock className="w-2.5 h-2.5" />
                              1d
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase ml-2">{sub.language}</span>
                      </button>
                    ))}
                  </div>

                  {/* Upload Subtitle Button (Temporary 1-day) */}
                  <div className="p-2 border-t border-slate-800">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingSubtitle}
                      className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                    >
                      {isUploadingSubtitle ? (
                        <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-indigo-400" />
                          Upload Subtitle (1-Day Temp)
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick Subtitle Delay Control */}
                  {selectedSubtitleId !== 'off' && (
                    <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Sync:</span>
                      <div className="flex items-center gap-1 font-mono">
                        <button
                          onClick={() => handleStylesChange({ ...subtitleStyles, delayOffset: Math.round(((subtitleStyles.delayOffset || 0) - 0.5) * 10) / 10 })}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                          title="Shift 0.5s Earlier"
                        >
                          -0.5s
                        </button>
                        <button
                          onClick={() => handleStylesChange({ ...subtitleStyles, delayOffset: 0 })}
                          className="text-indigo-400 font-bold px-1 hover:underline text-[10px]"
                          title="Click to reset delay to 0"
                        >
                          {(subtitleStyles.delayOffset || 0) > 0 ? `+${(subtitleStyles.delayOffset || 0).toFixed(1)}s` : `${(subtitleStyles.delayOffset || 0).toFixed(1)}s`}
                        </button>
                        <button
                          onClick={() => handleStylesChange({ ...subtitleStyles, delayOffset: Math.round(((subtitleStyles.delayOffset || 0) + 0.5) * 10) / 10 })}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                          title="Shift 0.5s Later"
                        >
                          +0.5s
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Subtitle Styling Settings Button */}
                  <div className="p-2 pt-0">
                    <button
                      onClick={() => {
                        setShowSettingsModal(true);
                        setShowSubtitleMenu(false);
                      }}
                      className="w-full py-1.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-indigo-500/30 font-medium"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Full Subtitle Style Controls
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quality & Re-encoded Stream Profile Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowQualityMenu(!showQualityMenu);
                  setShowSubtitleMenu(false);
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs"
                title="Stream Source & Quality"
              >
                <Sliders className="w-4 h-4" />
                <span className="text-[11px] font-mono hidden sm:inline">
                  {roomState?.activeStreamSource === 'original'
                    ? 'Original'
                    : 'Re-encoded'}
                </span>
              </button>

              {showQualityMenu && (
                <div className="absolute bottom-10 right-0 w-60 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl py-1 text-xs backdrop-blur-md z-30 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                    <span>Video Quality / FPS</span>
                    {isAdmin && <span className="text-[10px] text-indigo-400 lowercase">admin controls</span>}
                  </div>

                  {/* Original */}
                  <button
                    onClick={() => {
                      if (isAdmin) sendSourceChange('original');
                      setShowQualityMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-indigo-600/20 transition-colors flex items-center justify-between ${
                      roomState?.activeStreamSource === 'original'
                        ? 'text-indigo-400 font-semibold'
                        : 'text-slate-300'
                    }`}
                  >
                    <span>Original Source</span>
                    <span className="text-[10px] text-slate-400">Direct Link</span>
                  </button>

                  {/* Transcoded versions */}
                  {activeVideo.transcodedVersions?.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        if (isAdmin) sendSourceChange(v.id);
                        setShowQualityMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-indigo-600/20 transition-colors flex items-center justify-between ${
                        roomState?.activeStreamSource === v.id
                          ? 'text-indigo-400 font-semibold'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        {v.resolution} ({v.fps} FPS)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {v.sizeBytes ? `${(v.sizeBytes / 1024 / 1024).toFixed(1)} MB` : 'Optimized'}
                      </span>
                    </button>
                  ))}

                  {activeVideo.transcodedVersions?.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-slate-500 italic">
                      No re-encoded versions yet. Admin can re-encode FPS or size in the Admin Panel.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

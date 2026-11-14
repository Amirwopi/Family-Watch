import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Sliders,
  Type,
  Palette,
  Eye,
  ShieldCheck,
  Check,
  Timer,
  Plus,
  Minus,
} from 'lucide-react';
import { SubtitleStyleSettings } from '../types.js';
import { DEFAULT_SUBTITLE_STYLES, AVAILABLE_SUBTITLE_FONTS } from '../constants/subtitleDefaults.js';

interface SubtitleSettingsModalProps {
  styles: SubtitleStyleSettings;
  onChange: (newStyles: SubtitleStyleSettings) => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { label: 'White', hex: '#FFFFFF' },
  { label: 'Yellow', hex: '#FACC15' },
  { label: 'Cyan', hex: '#38BDF8' },
  { label: 'Green', hex: '#4ADE80' },
  { label: 'Pink', hex: '#F472B6' },
  { label: 'Amber', hex: '#FB923C' },
];

export const SubtitleSettingsModal: React.FC<SubtitleSettingsModalProps> = ({
  styles,
  onChange,
  onClose,
}) => {
  const [localStyles, setLocalStyles] = useState<SubtitleStyleSettings>({ ...styles });

  const update = (patch: Partial<SubtitleStyleSettings>) => {
    const updated = { ...localStyles, ...patch };
    setLocalStyles(updated);
    onChange(updated);
  };

  const resetDefaults = () => {
    setLocalStyles(DEFAULT_SUBTITLE_STYLES);
    onChange(DEFAULT_SUBTITLE_STYLES);
  };

  // Convert hex + 0-255 alpha to rgba for preview
  const getPreviewBg = () => {
    if (!localStyles.bgEnabled) return 'transparent';
    let clean = (localStyles.bgColor || '#000000').replace('#', '');
    if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    const a = (localStyles.bgAlpha ?? 180) / 255;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 text-white">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-sm">Subtitle Styling & Controls</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Area */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              Live Preview
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              Updates in real-time on player
            </span>
          </div>

          <div className="w-full h-24 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
            <div
              dir="auto"
              style={{
                color: localStyles.textColor,
                backgroundColor: getPreviewBg(),
                fontFamily: localStyles.fontFamily || "'Vazirmatn', sans-serif",
                fontSize: `${localStyles.fontSize}px`,
                WebkitTextStroke: localStyles.outlineEnabled
                  ? `${localStyles.outlineWidth}px ${localStyles.outlineColor}`
                  : '0',
                textShadow: localStyles.outlineEnabled
                  ? `0 0 ${localStyles.outlineWidth * 2}px ${localStyles.outlineColor}`
                  : 'none',
              }}
              className="px-3.5 py-1.5 rounded-lg font-semibold tracking-wide transition-all duration-150 select-none text-center max-w-[90%] truncate"
            >
              پخش خانگی دورهمی • Family Watch 🎬
            </div>
          </div>
        </div>

        {/* Settings Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Section 1: Text Color */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-300">Text Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  onClick={() => update({ textColor: preset.hex })}
                  className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                    localStyles.textColor.toLowerCase() === preset.hex.toLowerCase()
                      ? 'border-indigo-500 bg-indigo-500/20 text-white font-medium'
                      : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/40"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span>{preset.label}</span>
                </button>
              ))}

              {/* Custom Hex Picker */}
              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="color"
                  value={localStyles.textColor}
                  onChange={(e) => update({ textColor: e.target.value })}
                  className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={localStyles.textColor}
                  onChange={(e) => update({ textColor: e.target.value })}
                  className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-center font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 1.5: Subtitle Sync & Delay Offset */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-indigo-400" />
                Subtitle Sync / Delay
              </label>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span
                  className={`font-bold px-2 py-0.5 rounded ${
                    (localStyles.delayOffset || 0) === 0
                      ? 'bg-slate-800 text-slate-400'
                      : (localStyles.delayOffset || 0) > 0
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  }`}
                >
                  {(localStyles.delayOffset || 0) > 0 ? `+${(localStyles.delayOffset || 0).toFixed(1)}s` : `${(localStyles.delayOffset || 0).toFixed(1)}s`}
                </span>
                {(localStyles.delayOffset || 0) !== 0 && (
                  <button
                    onClick={() => update({ delayOffset: 0 })}
                    className="text-[10px] text-slate-400 hover:text-white underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Shift subtitles earlier or later to match actor voices perfectly.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => update({ delayOffset: Math.max(-10, Math.round(((localStyles.delayOffset || 0) - 0.5) * 10) / 10) })}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                title="Shift 0.5s Earlier"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min={-10}
                max={10}
                step={0.1}
                value={localStyles.delayOffset || 0}
                onChange={(e) => update({ delayOffset: parseFloat(e.target.value) })}
                className="flex-1 accent-indigo-500 cursor-pointer"
              />

              <button
                onClick={() => update({ delayOffset: Math.min(10, Math.round(((localStyles.delayOffset || 0) + 0.5) * 10) / 10) })}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                title="Shift 0.5s Later"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Step Buttons */}
            <div className="flex items-center justify-between text-[10px] pt-0.5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => update({ delayOffset: Math.max(-10, Math.round(((localStyles.delayOffset || 0) - 1.0) * 10) / 10) })}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
                >
                  -1.0s
                </button>
                <button
                  onClick={() => update({ delayOffset: Math.max(-10, Math.round(((localStyles.delayOffset || 0) - 0.2) * 10) / 10) })}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
                >
                  -0.2s
                </button>
              </div>

              <span className="text-slate-500">
                {(localStyles.delayOffset || 0) === 0 ? 'Synchronized' : (localStyles.delayOffset || 0) > 0 ? 'Appears Later' : 'Appears Earlier'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => update({ delayOffset: Math.min(10, Math.round(((localStyles.delayOffset || 0) + 0.2) * 10) / 10) })}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
                >
                  +0.2s
                </button>
                <button
                  onClick={() => update({ delayOffset: Math.min(10, Math.round(((localStyles.delayOffset || 0) + 1.0) * 10) / 10) })}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
                >
                  +1.0s
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Font Size (1 - 70px) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-400" />
                Font Size (1px - 70px)
              </label>
              <span className="font-mono text-indigo-300 font-bold">{localStyles.fontSize} px</span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={70}
                value={localStyles.fontSize}
                onChange={(e) => update({ fontSize: parseInt(e.target.value, 10) })}
                className="flex-1 accent-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              {[16, 20, 24, 32, 42].map((size) => (
                <button
                  key={size}
                  onClick={() => update({ fontSize: size })}
                  className={`px-2 py-1 rounded text-[11px] border ${
                    localStyles.fontSize === size
                      ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-semibold'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Section 2.5: Font Family (فونت‌های فارسی و لاتین) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-400" />
                فونت زیرنویس (Persian Font Family)
              </label>
              <span className="text-[11px] text-indigo-300 font-medium">
                {AVAILABLE_SUBTITLE_FONTS.find(f => f.id === (localStyles.fontFamily || "'Vazirmatn', sans-serif"))?.nameFa || 'وزیرمتن'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {AVAILABLE_SUBTITLE_FONTS.map((font) => {
                const isSelected = (localStyles.fontFamily || "'Vazirmatn', sans-serif") === font.id;
                return (
                  <button
                    key={font.id}
                    onClick={() => update({ fontFamily: font.id })}
                    style={{ fontFamily: font.id }}
                    className={`px-3 py-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/20 text-white font-bold ring-1 ring-indigo-400 shadow-sm'
                        : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="text-[13px]">{font.nameFa}</span>
                    <span className="text-[10px] text-slate-400 font-sans">{font.nameEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Background Color & Transparency (0 - 255) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-400" />
                Background Color & Transparency (0 - 255)
              </label>

              {/* On / Off Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] text-slate-400">
                  {localStyles.bgEnabled ? 'ON' : 'OFF'}
                </span>
                <input
                  type="checkbox"
                  checked={localStyles.bgEnabled}
                  onChange={(e) => update({ bgEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                />
              </label>
            </div>

            {localStyles.bgEnabled && (
              <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Background Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localStyles.bgColor}
                      onChange={(e) => update({ bgColor: e.target.value })}
                      className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={localStyles.bgColor}
                      onChange={(e) => update({ bgColor: e.target.value })}
                      className="w-20 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-center font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span>Transparency (0 = Clear, 255 = Solid)</span>
                    <span className="font-mono text-indigo-300 font-bold">
                      {localStyles.bgAlpha} / 255 ({Math.round((localStyles.bgAlpha / 255) * 100)}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={localStyles.bgAlpha}
                    onChange={(e) => update({ bgAlpha: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Vertical Position (0 - 100%) & Prevent Covered by Controls */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300">
                Vertical Position (0% Top - 100% Bottom)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] text-slate-400">
                  {localStyles.positionEnabled ? 'Custom ON' : 'Default Bottom'}
                </span>
                <input
                  type="checkbox"
                  checked={localStyles.positionEnabled}
                  onChange={(e) => update({ positionEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                />
              </label>
            </div>

            {localStyles.positionEnabled && (
              <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Position from Top</span>
                  <span className="font-mono text-indigo-300 font-bold">
                    {localStyles.positionPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={localStyles.positionPercent}
                  onChange={(e) => update({ positionPercent: parseInt(e.target.value, 10) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0% (Top)</span>
                  <span>50% (Middle)</span>
                  <span>100% (Bottom)</span>
                </div>
              </div>
            )}

            {/* Prevent Covered by Controls */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div className="pr-4">
                <div className="font-medium text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Prevent Covered by Controls
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Automatically lifts subtitles above timeline slider when player controls are visible
                </span>
              </div>
              <input
                type="checkbox"
                checked={localStyles.preventCoveredByControls}
                onChange={(e) => update({ preventCoveredByControls: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
              />
            </label>
          </div>

          {/* Section 5: Font Outline */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300">
                Font Outline (Stroke & Shadow)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] text-slate-400">
                  {localStyles.outlineEnabled ? 'ON' : 'OFF'}
                </span>
                <input
                  type="checkbox"
                  checked={localStyles.outlineEnabled}
                  onChange={(e) => update({ outlineEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                />
              </label>
            </div>

            {localStyles.outlineEnabled && (
              <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Outline Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localStyles.outlineColor}
                      onChange={(e) => update({ outlineColor: e.target.value })}
                      className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={localStyles.outlineColor}
                      onChange={(e) => update({ outlineColor: e.target.value })}
                      className="w-20 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-center font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span>Outline Thickness (1px - 8px)</span>
                    <span className="font-mono text-indigo-300 font-bold">
                      {localStyles.outlineWidth} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={localStyles.outlineWidth}
                    onChange={(e) => update({ outlineWidth: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={resetDefaults}
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Check className="w-4 h-4" />
            Save & Done
          </button>
        </div>
      </div>
    </div>
  );
};


import React from 'react';
import { SubtitleCue } from '../utils/subtitleParser.js';
import { SubtitleStyleSettings } from '../types.js';

interface CustomSubtitleOverlayProps {
  cues: SubtitleCue[];
  currentTime: number;
  styles: SubtitleStyleSettings;
  controlsVisible: boolean;
}

function hexToRgba(hex: string, alpha0To255: number): string {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const a = Math.max(0, Math.min(255, alpha0To255)) / 255;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

export const CustomSubtitleOverlay: React.FC<CustomSubtitleOverlayProps> = ({
  cues,
  currentTime,
  styles,
  controlsVisible,
}) => {
  // Apply subtitle delay offset (positive delay shifts subtitle later: adjustedTime = currentTime - delayOffset)
  const adjustedTime = currentTime - (styles.delayOffset || 0);

  // Find cues matching the adjusted video timestamp
  const activeCues = cues.filter(
    (c) => adjustedTime >= c.startTime && adjustedTime <= c.endTime
  );

  if (activeCues.length === 0) return null;

  // Background styling
  const backgroundColor = styles.bgEnabled
    ? hexToRgba(styles.bgColor || '#000000', styles.bgAlpha ?? 180)
    : 'transparent';

  // Outline / text stroke styling
  const outlineStyles: React.CSSProperties = styles.outlineEnabled
    ? {
        WebkitTextStroke: `${styles.outlineWidth}px ${styles.outlineColor}`,
        textShadow: `0 0 ${styles.outlineWidth * 2}px ${styles.outlineColor}, 0 2px 4px rgba(0,0,0,0.85)`,
      }
    : {
        WebkitTextStroke: '0',
        textShadow: '0 2px 4px rgba(0,0,0,0.7)',
      };

  // Positioning logic
  let positionStyles: React.CSSProperties = {};

  if (styles.positionEnabled) {
    // Custom position 0% (top) to 100% (bottom)
    let percent = Math.max(0, Math.min(100, styles.positionPercent));

    // If near bottom and controls are visible, lift up so controls never cover subtitles!
    if (styles.preventCoveredByControls && controlsVisible && percent >= 75) {
      positionStyles = {
        bottom: '86px',
        left: '50%',
        transform: 'translateX(-50%)',
      };
    } else {
      positionStyles = {
        top: `${percent}%`,
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }
  } else {
    // Default bottom position with auto-lift above control bar
    const bottomOffset =
      styles.preventCoveredByControls && controlsVisible ? '86px' : '26px';

    positionStyles = {
      bottom: bottomOffset,
      left: '50%',
      transform: 'translateX(-50%)',
    };
  }

  return (
    <div
      style={{
        ...positionStyles,
        transition: 'bottom 0.25s ease, top 0.25s ease',
      }}
      className="absolute z-20 pointer-events-none max-w-[90%] text-center px-4"
    >
      {activeCues.map((cue) => (
        <div
          key={cue.id}
          dir="auto"
          style={{
            color: styles.textColor || '#ffffff',
            backgroundColor,
            fontSize: `${Math.max(1, Math.min(70, styles.fontSize || 24))}px`,
            fontFamily: styles.fontFamily || "'Vazirmatn', sans-serif",
            ...outlineStyles,
          }}
          className="inline-block px-3 py-1.5 rounded-lg whitespace-pre-line leading-relaxed font-semibold transition-all duration-150 select-none backdrop-blur-[1px]"
        >
          {cue.text}
        </div>
      ))}
    </div>
  );
};


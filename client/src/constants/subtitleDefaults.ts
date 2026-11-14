import { SubtitleStyleSettings } from '../types.js';

export interface SubtitleFontOption {
  id: string;
  nameFa: string;
  nameEn: string;
}

export const AVAILABLE_SUBTITLE_FONTS: SubtitleFontOption[] = [
  { id: "'Vazirmatn', sans-serif", nameFa: 'وزیرمتن', nameEn: 'Vazirmatn' },
  { id: "'Yekan', 'yekan', sans-serif", nameFa: 'یکان', nameEn: 'Yekan' },
  { id: "'Shabnam', sans-serif", nameFa: 'شبنم', nameEn: 'Shabnam' },
  { id: "'Sahel', sans-serif", nameFa: 'ساحل', nameEn: 'Sahel' },
  { id: "'Inter', system-ui, sans-serif", nameFa: 'سیستم / لاتین', nameEn: 'Inter' },
];

export const DEFAULT_SUBTITLE_STYLES: SubtitleStyleSettings = {
  textColor: '#FFFFFF',
  bgEnabled: true,
  bgColor: '#000000',
  bgAlpha: 180, // ~70% opacity in 0-255 scale
  positionEnabled: false,
  positionPercent: 90, // 90% from top (near bottom)
  preventCoveredByControls: true, // Lifts above controls bar when visible
  fontSize: 24, // 24px (1 - 70px)
  outlineEnabled: true,
  outlineColor: '#000000',
  outlineWidth: 2, // 2px (1 - 8px)
  delayOffset: 0, // 0 seconds (range -10s to +10s)
  fontFamily: "'Vazirmatn', sans-serif",
};

export const SUBTITLE_STORAGE_KEY = 'familywatch_subtitle_styles';

export function loadSubtitleStyles(): SubtitleStyleSettings {
  try {
    const saved = localStorage.getItem(SUBTITLE_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SUBTITLE_STYLES, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore error
  }
  return DEFAULT_SUBTITLE_STYLES;
}

export function saveSubtitleStyles(styles: SubtitleStyleSettings): void {
  try {
    localStorage.setItem(SUBTITLE_STORAGE_KEY, JSON.stringify(styles));
  } catch {
    // Ignore error
  }
}


import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
import { SubtitleTrack } from '../types/index.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MANIFEST_FILE = path.join(CONFIG.STORAGE_DIR, 'subtitles_manifest.json');

interface SubtitleManifestItem {
  id: string;
  fileName: string;
  label: string;
  language: string;
  isTemporary: boolean;
  expiresAt?: number;
  uploadedBy?: string;
  createdAt: number;
}

export class SubtitleService {
  private static manifest: Record<string, SubtitleManifestItem> = {};

  public static initialize(): void {
    this.loadManifest();
    this.cleanupExpiredSubtitles();

    // Schedule cleanup every hour
    setInterval(() => {
      this.cleanupExpiredSubtitles();
    }, 60 * 60 * 1000);
  }

  /**
   * Converts SRT text to WebVTT text
   */
  public static srtToVtt(srtText: string): string {
    let vtt = srtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    if (vtt.startsWith('WEBVTT')) {
      return vtt;
    }

    // Replace comma in timestamps: 00:00:20,000 --> 00:00:24,400 with period
    vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

    return `WEBVTT\n\n${vtt}`;
  }

  /**
   * Save a subtitle from raw text or buffer with optional 1-day expiration
   */
  public static saveSubtitle(
    content: string,
    label: string = 'English',
    language: string = 'en',
    isTemporary: boolean = false,
    uploadedBy?: string
  ): SubtitleTrack {
    const id = uuidv4();
    const vttContent = this.srtToVtt(content);
    const prefix = isTemporary ? 'temp_' : '';
    const fileName = `${prefix}${id}.vtt`;
    const filePath = path.join(CONFIG.SUBTITLES_DIR, fileName);

    fs.writeFileSync(filePath, vttContent, 'utf-8');

    const expiresAt = isTemporary ? Date.now() + ONE_DAY_MS : undefined;

    // Track in manifest
    this.manifest[id] = {
      id,
      fileName,
      label,
      language,
      isTemporary,
      expiresAt,
      uploadedBy,
      createdAt: Date.now(),
    };
    this.saveManifest();

    return {
      id,
      label,
      language,
      url: `/api/subtitles/${fileName}`,
      isTemporary,
      expiresAt,
      uploadedBy,
    };
  }

  /**
   * Download and convert subtitle from a remote URL or return local uploaded subtitle track
   */
  public static async fetchAndSaveFromUrl(
    url: string,
    label: string = 'Subtitles',
    language: string = 'en'
  ): Promise<SubtitleTrack> {
    // 1. If it's already a local uploaded subtitle on our server
    if (url.startsWith('/api/subtitles/') || url.startsWith('/api/video/subtitles/') || url.startsWith('/subtitles/')) {
      const fileName = path.basename(url);
      const fullPath = this.getSubtitlePath(fileName);
      if (fullPath && fs.existsSync(fullPath)) {
        const trackId = fileName.replace(/^temp_/, '').replace(/\.vtt$/, '');
        const manifestItem = this.manifest[trackId];
        return {
          id: trackId,
          label: label || manifestItem?.label || 'Subtitles',
          language: manifestItem?.language || language,
          url: `/api/subtitles/${fileName}`,
          isTemporary: manifestItem?.isTemporary ?? true,
          expiresAt: manifestItem?.expiresAt,
        };
      }
    }

    // 2. Fetch remote subtitle URL
    const response = await axios.get(url, {
      responseType: 'text',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
    });

    return this.saveSubtitle(response.data, label, language, false);
  }

  /**
   * Get absolute path for a subtitle file
   */
  public static getSubtitlePath(fileName: string): string | null {
    const sanitized = path.basename(fileName);
    const fullPath = path.join(CONFIG.SUBTITLES_DIR, sanitized);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    return null;
  }

  /**
   * Cleans up expired temporary subtitles older than 24 hours (1 day)
   */
  public static cleanupExpiredSubtitles(): void {
    const now = Date.now();
    let changed = false;

    // 1. Check files in manifest
    for (const [id, item] of Object.entries(this.manifest)) {
      if (item.isTemporary && item.expiresAt && now > item.expiresAt) {
        const filePath = path.join(CONFIG.SUBTITLES_DIR, item.fileName);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`[SubtitleService] Cleaned up expired subtitle: ${item.fileName}`);
          } catch (err) {
            console.error(`[SubtitleService] Failed to delete expired file ${item.fileName}:`, err);
          }
        }
        delete this.manifest[id];
        changed = true;
      }
    }

    // 2. Scan directory for temp_ files older than 24 hours that might not be in manifest
    try {
      if (fs.existsSync(CONFIG.SUBTITLES_DIR)) {
        const files = fs.readdirSync(CONFIG.SUBTITLES_DIR);
        for (const file of files) {
          if (file === 'demo.vtt') continue;
          if (file.startsWith('temp_')) {
            const filePath = path.join(CONFIG.SUBTITLES_DIR, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > ONE_DAY_MS) {
              fs.unlinkSync(filePath);
              console.log(`[SubtitleService] Deleted orphaned temp subtitle: ${file}`);
            }
          }
        }
      }
    } catch (err) {
      console.error('[SubtitleService] Directory scan error:', err);
    }

    if (changed) {
      this.saveManifest();
    }
  }

  private static loadManifest(): void {
    try {
      if (fs.existsSync(MANIFEST_FILE)) {
        const raw = fs.readFileSync(MANIFEST_FILE, 'utf-8');
        this.manifest = JSON.parse(raw);
      }
    } catch {
      this.manifest = {};
    }
  }

  private static saveManifest(): void {
    try {
      fs.writeFileSync(MANIFEST_FILE, JSON.stringify(this.manifest, null, 2), 'utf-8');
    } catch (err) {
      console.error('[SubtitleService] Failed to save manifest:', err);
    }
  }
}

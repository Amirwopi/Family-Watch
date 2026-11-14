import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
import { QueueItem, TranscodedVersion } from '../types/index.js';
import { TranscoderService } from './transcoder.service.js';

export class QueueService {
  private static items: QueueItem[] = [];

  public static initialize(): void {
    this.loadFromDisk();

    // If queue is completely empty, add a default demo video with subtitles for immediate testing
    if (this.items.length === 0) {
      this.items.push({
        id: uuidv4(),
        title: 'Blooming Flower (Demo Video)',
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        originalUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        subtitles: [
          {
            id: 'demo-sub-1',
            label: 'English Demo',
            language: 'en',
            url: '/api/subtitles/demo.vtt',
            isDefault: true,
          },
        ],
        duration: 5,
        addedBy: 'System',
        addedAt: Date.now(),
        transcodedVersions: [],
      });
      this.saveToDisk();
    }
  }

  public static getQueue(): QueueItem[] {
    return [...this.items];
  }

  public static getItem(id: string): QueueItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  public static async addItem(
    title: string,
    url: string,
    addedBy: string,
    subtitles: QueueItem['subtitles'] = []
  ): Promise<QueueItem> {
    const meta = await TranscoderService.getVideoMetadata(url);

    const newItem: QueueItem = {
      id: uuidv4(),
      title: title.trim() || 'Untitled Video',
      url,
      originalUrl: url,
      subtitles,
      duration: meta.duration || 0,
      addedBy,
      addedAt: Date.now(),
      transcodedVersions: [],
    };

    this.items.push(newItem);
    this.saveToDisk();
    return newItem;
  }

  public static removeItem(id: string): boolean {
    const index = this.items.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.items.splice(index, 1);
      this.saveToDisk();
      return true;
    }
    return false;
  }

  public static reorder(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= this.items.length || toIndex < 0 || toIndex >= this.items.length) {
      return false;
    }
    const [moved] = this.items.splice(fromIndex, 1);
    this.items.splice(toIndex, 0, moved);
    this.saveToDisk();
    return true;
  }

  public static updateItem(id: string, updates: Partial<QueueItem>): QueueItem | null {
    const item = this.getItem(id);
    if (!item) return null;

    Object.assign(item, updates);
    this.saveToDisk();
    return item;
  }

  public static addTranscodedVersion(id: string, version: TranscodedVersion): boolean {
    const item = this.getItem(id);
    if (!item) return false;

    // Replace if already exists with same resolution & fps
    item.transcodedVersions = item.transcodedVersions.filter(
      (v) => !(v.resolution === version.resolution && v.fps === version.fps)
    );
    item.transcodedVersions.push(version);
    this.saveToDisk();
    return true;
  }

  private static saveToDisk(): void {
    try {
      fs.writeFileSync(CONFIG.QUEUE_FILE, JSON.stringify(this.items, null, 2), 'utf-8');
    } catch (err) {
      console.error('[QueueService] Failed to save queue to disk:', err);
    }
  }

  private static loadFromDisk(): void {
    try {
      if (fs.existsSync(CONFIG.QUEUE_FILE)) {
        const raw = fs.readFileSync(CONFIG.QUEUE_FILE, 'utf-8');
        this.items = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[QueueService] Failed to load queue from disk:', err);
      this.items = [];
    }
  }
}

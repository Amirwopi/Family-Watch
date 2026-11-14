import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
import { TranscoderService } from './transcoder.service.js';
export class QueueService {
    static items = [];
    static initialize() {
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
    static getQueue() {
        return [...this.items];
    }
    static getItem(id) {
        return this.items.find((item) => item.id === id);
    }
    static async addItem(title, url, addedBy, subtitles = []) {
        const meta = await TranscoderService.getVideoMetadata(url);
        const newItem = {
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
    static removeItem(id) {
        const index = this.items.findIndex((item) => item.id === id);
        if (index !== -1) {
            this.items.splice(index, 1);
            this.saveToDisk();
            return true;
        }
        return false;
    }
    static reorder(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.items.length || toIndex < 0 || toIndex >= this.items.length) {
            return false;
        }
        const [moved] = this.items.splice(fromIndex, 1);
        this.items.splice(toIndex, 0, moved);
        this.saveToDisk();
        return true;
    }
    static updateItem(id, updates) {
        const item = this.getItem(id);
        if (!item)
            return null;
        Object.assign(item, updates);
        this.saveToDisk();
        return item;
    }
    static addTranscodedVersion(id, version) {
        const item = this.getItem(id);
        if (!item)
            return false;
        // Replace if already exists with same resolution & fps
        item.transcodedVersions = item.transcodedVersions.filter((v) => !(v.resolution === version.resolution && v.fps === version.fps));
        item.transcodedVersions.push(version);
        this.saveToDisk();
        return true;
    }
    static saveToDisk() {
        try {
            fs.writeFileSync(CONFIG.QUEUE_FILE, JSON.stringify(this.items, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[QueueService] Failed to save queue to disk:', err);
        }
    }
    static loadFromDisk() {
        try {
            if (fs.existsSync(CONFIG.QUEUE_FILE)) {
                const raw = fs.readFileSync(CONFIG.QUEUE_FILE, 'utf-8');
                this.items = JSON.parse(raw);
            }
        }
        catch (err) {
            console.error('[QueueService] Failed to load queue from disk:', err);
            this.items = [];
        }
    }
}

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { CONFIG } from '../config.js';
import { QueueService } from './queue.service.js';
export class VideoCacheService {
    static activeJobs = new Map();
    /**
     * Start downloading video to local cache and buffering on the server
     */
    static async startDownload(queueItem, io, targetBufferSeconds = 180, onReadyCallback) {
        const queueItemId = queueItem.id;
        const finalFile = path.join(CONFIG.CACHE_DIR, `${queueItemId}.mp4`);
        const partFile = path.join(CONFIG.CACHE_DIR, `${queueItemId}.mp4.part`);
        // 1. If already completed
        if (fs.existsSync(finalFile)) {
            const stat = fs.statSync(finalFile);
            QueueService.updateItem(queueItemId, {
                localCachedPath: finalFile,
                cachedUrl: `/api/video/cached/${queueItemId}`,
                cacheStatus: 'completed',
                cacheProgress: 100,
                cacheDownloadedBytes: stat.size,
                cacheTotalBytes: stat.size,
                cacheBufferedSeconds: queueItem.duration || 999999,
            });
            if (io) {
                io.emit('cache:progress', {
                    queueItemId,
                    percent: 100,
                    downloadedBytes: stat.size,
                    totalBytes: stat.size,
                    speedKbps: 0,
                    bufferedSeconds: queueItem.duration || 999999,
                    status: 'completed',
                });
            }
            if (onReadyCallback)
                onReadyCallback();
            return;
        }
        // 2. If already downloading
        if (this.activeJobs.has(queueItemId)) {
            return;
        }
        // If local file or not http/https, skip remote download
        if (!queueItem.url.startsWith('http://') && !queueItem.url.startsWith('https://')) {
            return;
        }
        const controller = new AbortController();
        let existingBytes = 0;
        if (fs.existsSync(partFile)) {
            try {
                existingBytes = fs.statSync(partFile).size;
            }
            catch {
                existingBytes = 0;
            }
        }
        const job = {
            controller,
            downloadedBytes: existingBytes,
            totalBytes: 0,
            speedKbps: 0,
            startTime: Date.now(),
            lastUpdate: 0,
        };
        this.activeJobs.set(queueItemId, job);
        QueueService.updateItem(queueItemId, {
            cachedUrl: `/api/video/cached/${queueItemId}`,
            cacheStatus: 'downloading',
            localCachedPath: partFile,
        });
        try {
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                Accept: '*/*',
                'Accept-Encoding': 'identity',
            };
            if (existingBytes > 0) {
                headers['Range'] = `bytes=${existingBytes}-`;
            }
            console.log(`[VideoCacheService] Starting download for "${queueItem.title}" (resuming from ${existingBytes} bytes)...`);
            const response = await axios({
                method: 'GET',
                url: queueItem.url,
                headers,
                responseType: 'stream',
                signal: controller.signal,
                validateStatus: (status) => status >= 200 && status < 300,
                timeout: 60000,
            });
            // Parse total bytes
            let totalBytes = 0;
            const contentRange = response.headers['content-range'];
            if (contentRange) {
                const match = String(contentRange).match(/\/(\d+)$/);
                if (match)
                    totalBytes = parseInt(match[1], 10);
            }
            if (!totalBytes && response.headers['content-length']) {
                totalBytes = parseInt(String(response.headers['content-length']), 10) + existingBytes;
            }
            job.totalBytes = totalBytes;
            const writeStream = fs.createWriteStream(partFile, { flags: existingBytes > 0 ? 'a' : 'w' });
            let hasTriggeredReady = false;
            let lastSpeedCalcBytes = existingBytes;
            let lastSpeedCalcTime = Date.now();
            response.data.on('data', (chunk) => {
                job.downloadedBytes += chunk.length;
                const now = Date.now();
                // Speed calculation every 1s
                if (now - lastSpeedCalcTime >= 1000) {
                    const deltaBytes = job.downloadedBytes - lastSpeedCalcBytes;
                    const deltaSec = (now - lastSpeedCalcTime) / 1000;
                    job.speedKbps = Math.round((deltaBytes * 8) / deltaSec / 1024);
                    lastSpeedCalcBytes = job.downloadedBytes;
                    lastSpeedCalcTime = now;
                }
                // Throttle progress broadcast to every 500ms
                if (now - job.lastUpdate >= 500) {
                    job.lastUpdate = now;
                    const percent = job.totalBytes > 0 ? Math.min(100, Math.round((job.downloadedBytes / job.totalBytes) * 100)) : 0;
                    const duration = queueItem.duration || 300;
                    const bufferedSeconds = job.totalBytes > 0 ? Math.round((job.downloadedBytes / job.totalBytes) * duration) : Math.round(job.downloadedBytes / 1024 / 200);
                    let status = 'downloading';
                    if (bufferedSeconds >= targetBufferSeconds || (job.totalBytes > 0 && job.downloadedBytes >= job.totalBytes)) {
                        status = 'ready';
                        if (!hasTriggeredReady) {
                            hasTriggeredReady = true;
                            console.log(`[VideoCacheService] Target buffer reached (${bufferedSeconds}s / ${targetBufferSeconds}s) for "${queueItem.title}"!`);
                            if (onReadyCallback)
                                onReadyCallback();
                        }
                    }
                    QueueService.updateItem(queueItemId, {
                        cacheStatus: status,
                        cacheProgress: percent,
                        cacheDownloadedBytes: job.downloadedBytes,
                        cacheTotalBytes: job.totalBytes,
                        cacheSpeedKbps: job.speedKbps,
                        cacheBufferedSeconds: bufferedSeconds,
                    });
                    if (io) {
                        io.emit('cache:progress', {
                            queueItemId,
                            percent,
                            downloadedBytes: job.downloadedBytes,
                            totalBytes: job.totalBytes,
                            speedKbps: job.speedKbps,
                            bufferedSeconds,
                            status,
                        });
                    }
                }
            });
            response.data.pipe(writeStream);
            await new Promise((resolve, reject) => {
                writeStream.on('finish', () => resolve());
                writeStream.on('error', (err) => reject(err));
                response.data.on('error', (err) => reject(err));
            });
            // Download completed! Rename to .mp4
            if (fs.existsSync(partFile)) {
                try {
                    if (fs.existsSync(finalFile))
                        fs.unlinkSync(finalFile);
                    fs.renameSync(partFile, finalFile);
                }
                catch {
                    // If rename fails, copy and delete
                    fs.copyFileSync(partFile, finalFile);
                    fs.unlinkSync(partFile);
                }
            }
            const finalStat = fs.statSync(finalFile);
            console.log(`[VideoCacheService] Video download completed: "${queueItem.title}" (${(finalStat.size / 1024 / 1024).toFixed(1)} MB)`);
            QueueService.updateItem(queueItemId, {
                localCachedPath: finalFile,
                cacheStatus: 'completed',
                cacheProgress: 100,
                cacheDownloadedBytes: finalStat.size,
                cacheTotalBytes: finalStat.size,
                cacheSpeedKbps: 0,
                cacheBufferedSeconds: queueItem.duration || 999999,
            });
            if (io) {
                io.emit('cache:progress', {
                    queueItemId,
                    percent: 100,
                    downloadedBytes: finalStat.size,
                    totalBytes: finalStat.size,
                    speedKbps: 0,
                    bufferedSeconds: queueItem.duration || 999999,
                    status: 'completed',
                });
            }
            if (onReadyCallback)
                onReadyCallback();
        }
        catch (err) {
            if (axios.isCancel(err)) {
                console.log(`[VideoCacheService] Download cancelled for "${queueItem.title}".`);
            }
            else {
                console.error(`[VideoCacheService] Download failed for "${queueItem.title}":`, err.message);
                QueueService.updateItem(queueItemId, {
                    cacheStatus: 'error',
                });
            }
        }
        finally {
            this.activeJobs.delete(queueItemId);
        }
    }
    /**
     * Cancel ongoing download
     */
    static cancelDownload(queueItemId) {
        const job = this.activeJobs.get(queueItemId);
        if (job) {
            job.controller.abort();
            this.activeJobs.delete(queueItemId);
        }
    }
    /**
     * Check if a cached file or part file exists
     */
    static getCachedPath(queueItemId) {
        const finalFile = path.join(CONFIG.CACHE_DIR, `${queueItemId}.mp4`);
        if (fs.existsSync(finalFile)) {
            return { finalPath: finalFile, isComplete: true };
        }
        const partFile = path.join(CONFIG.CACHE_DIR, `${queueItemId}.mp4.part`);
        if (fs.existsSync(partFile)) {
            return { partPath: partFile, isComplete: false };
        }
        return { isComplete: false };
    }
}

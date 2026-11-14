import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
export class TranscoderService {
    static activeJobs = new Map();
    /**
     * Probe video duration and stream info using ffprobe
     */
    static async getVideoMetadata(urlOrPath) {
        return new Promise((resolve) => {
            const args = [
                '-v', 'error',
                '-show_entries', 'format=duration:stream=width,height,r_frame_rate',
                '-of', 'json',
                urlOrPath,
            ];
            const proc = spawn('ffprobe', args);
            let stdout = '';
            proc.stdout.on('data', (chunk) => {
                stdout += chunk.toString();
            });
            proc.on('close', (code) => {
                if (code === 0 && stdout) {
                    try {
                        const data = JSON.parse(stdout);
                        const duration = parseFloat(data.format?.duration || '0');
                        const videoStream = data.streams?.find((s) => s.width && s.height);
                        let fps = 30;
                        if (videoStream?.r_frame_rate) {
                            const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
                            if (den && den > 0) {
                                fps = Math.round(num / den);
                            }
                        }
                        resolve({
                            duration: isNaN(duration) ? 0 : duration,
                            width: videoStream?.width,
                            height: videoStream?.height,
                            fps,
                        });
                        return;
                    }
                    catch {
                        // parse error
                    }
                }
                // Fallback default
                resolve({ duration: 0, fps: 30 });
            });
            proc.on('error', () => {
                resolve({ duration: 0, fps: 30 });
            });
        });
    }
    /**
     * Re-encode video to adjust FPS and resolution / size
     */
    static transcodeVideo(queueItem, targetFps = 30, targetHeight = 720, onProgress) {
        return new Promise(async (resolve, reject) => {
            const transcodeId = uuidv4();
            const outputFilename = `${queueItem.id}_${targetHeight}p_${targetFps}fps.mp4`;
            const outputPath = path.join(CONFIG.TRANSCODED_DIR, outputFilename);
            // Total duration
            let totalDuration = queueItem.duration;
            if (!totalDuration || totalDuration <= 0) {
                const meta = await this.getVideoMetadata(queueItem.url);
                totalDuration = meta.duration;
            }
            // Build video filter: scale=-2:height ensures even width (required by x264), fps=targetFps
            const vfFilter = `scale=-2:${targetHeight},fps=${targetFps}`;
            const args = [
                '-y', // Overwrite output
                '-i', queueItem.url,
                '-vf', vfFilter,
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-crf', '24', // balanced compression
                '-c:a', 'aac',
                '-b:a', '128k',
                '-movflags', '+faststart', // Web streaming friendly
                outputPath,
            ];
            console.log(`[Transcoder] Starting job for "${queueItem.title}" -> ${targetHeight}p @ ${targetFps}fps`);
            const proc = spawn('ffmpeg', args);
            this.activeJobs.set(queueItem.id, proc);
            let stderrBuffer = '';
            proc.stderr.on('data', (data) => {
                const text = data.toString();
                stderrBuffer += text;
                // Parse progress from stderr
                // Example: frame=  123 fps= 45 q=28.0 size=   1240kB time=00:00:08.52 bitrate=1190.2kbits/s speed=2.15x
                const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
                const fpsMatch = text.match(/fps=\s*([\d.]+)/);
                const speedMatch = text.match(/speed=\s*([\d.]+x)/);
                if (timeMatch) {
                    const hours = parseFloat(timeMatch[1]);
                    const minutes = parseFloat(timeMatch[2]);
                    const seconds = parseFloat(timeMatch[3]);
                    const currentSeconds = hours * 3600 + minutes * 60 + seconds;
                    let percent = 0;
                    if (totalDuration > 0) {
                        percent = Math.min(100, Math.round((currentSeconds / totalDuration) * 100));
                    }
                    if (onProgress) {
                        onProgress({
                            percent,
                            fps: fpsMatch ? fpsMatch[1] : `${targetFps}`,
                            speed: speedMatch ? speedMatch[1] : '1x',
                            currentTime: `${timeMatch[1]}:${timeMatch[2]}:${Math.floor(seconds).toString().padStart(2, '0')}`,
                            currentSeconds,
                            totalDuration,
                        });
                    }
                }
            });
            proc.on('close', (code) => {
                this.activeJobs.delete(queueItem.id);
                if (code === 0 && fs.existsSync(outputPath)) {
                    const stats = fs.statSync(outputPath);
                    console.log(`[Transcoder] Finished ${outputFilename} (Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                    const result = {
                        id: transcodeId,
                        resolution: `${targetHeight}p`,
                        fps: targetFps,
                        url: `/api/video/transcoded/${outputFilename}`,
                        filePath: outputPath,
                        sizeBytes: stats.size,
                        createdAt: Date.now(),
                    };
                    resolve(result);
                }
                else {
                    console.error(`[Transcoder] Failed with code ${code}. Error log:`, stderrBuffer.slice(-500));
                    reject(new Error(`Transcode failed with exit code ${code}`));
                }
            });
            proc.on('error', (err) => {
                this.activeJobs.delete(queueItem.id);
                console.error('[Transcoder] Process error:', err);
                reject(err);
            });
        });
    }
    /**
     * Cancel an ongoing transcode job
     */
    static cancelJob(queueItemId) {
        const proc = this.activeJobs.get(queueItemId);
        if (proc) {
            proc.kill('SIGTERM');
            this.activeJobs.delete(queueItemId);
            return true;
        }
        return false;
    }
    /**
     * Check if a video is currently being transcoded
     */
    static isJobActive(queueItemId) {
        return this.activeJobs.has(queueItemId);
    }
}

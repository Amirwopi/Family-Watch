import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
import { QueueService } from './queue.service.js';
import { TranscoderService } from './transcoder.service.js';
import { SubtitleService } from './subtitle.service.js';
const AVATAR_COLORS = [
    '#f87171', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#818cf8', '#a78bfa', '#f472b6',
];
export class RoomService {
    static io;
    static users = new Map(); // socketId -> User
    static chatHistory = [];
    static currentQueueItemId = null;
    static activeStreamSource = 'original';
    static playback = {
        currentTime: 0,
        isPlaying: false,
        playbackRate: 1.0,
        updatedAt: Date.now(),
    };
    static settings = {
        allowMemberControls: false, // Only admin can control unless enabled
        autoPlayNext: true,
        enableBufferSync: true, // Smart buffer sync enabled by default
        targetBufferMinutes: 5, // 5 minutes ahead initial target
        minBufferSeconds: 60, // 1 minute minimum while playing
    };
    static bufferSync = {
        isSyncBuffering: false,
        targetSeconds: 300,
        minSeconds: 60,
        reason: 'initial',
    };
    static initialize(io) {
        this.io = io;
        QueueService.initialize();
        SubtitleService.initialize();
        // Set first video in queue as current if available
        const queue = QueueService.getQueue();
        if (queue.length > 0) {
            this.currentQueueItemId = queue[0].id;
        }
        this.setupSocketHandlers();
        // Start background sync ticker (every 3 seconds broadcast authoritative time)
        setInterval(() => {
            this.broadcastPlaybackSync();
        }, 3000);
    }
    /**
     * Get the current extrapolated playback time in seconds
     */
    static getCurrentCalculatedTime() {
        if (!this.playback.isPlaying) {
            return this.playback.currentTime;
        }
        const elapsedSeconds = (Date.now() - this.playback.updatedAt) / 1000;
        const calcTime = this.playback.currentTime + elapsedSeconds * this.playback.playbackRate;
        // Cap playback at video duration if active item duration is known
        const activeItem = this.currentQueueItemId ? QueueService.getItem(this.currentQueueItemId) : null;
        if (activeItem && typeof activeItem.duration === 'number' && activeItem.duration > 0) {
            if (calcTime >= activeItem.duration) {
                this.playback.isPlaying = false;
                this.playback.currentTime = activeItem.duration;
                this.playback.updatedAt = Date.now();
                return activeItem.duration;
            }
        }
        return calcTime;
    }
    /**
     * Build complete room state object
     */
    static getRoomState() {
        const usersRecord = {};
        this.users.forEach((u, key) => {
            usersRecord[key] = u;
        });
        return {
            currentQueueItemId: this.currentQueueItemId,
            activeStreamSource: this.activeStreamSource,
            playback: {
                currentTime: this.getCurrentCalculatedTime(),
                isPlaying: this.playback.isPlaying,
                playbackRate: this.playback.playbackRate,
                updatedAt: Date.now(),
            },
            queue: QueueService.getQueue(),
            users: usersRecord,
            settings: this.settings,
            bufferSync: this.bufferSync,
        };
    }
    /**
     * Evaluates buffer health across all connected watching users.
     * If any user has < minSeconds (60s) buffer, pauses playback and enters sync mode.
     * When all users have >= required buffer, resumes playback.
     */
    static evaluateBufferSync() {
        if (!this.settings.enableBufferSync || !this.currentQueueItemId) {
            if (this.bufferSync.isSyncBuffering) {
                this.bufferSync.isSyncBuffering = false;
                this.bufferSync.starvingUser = undefined;
                this.broadcastRoomState();
            }
            return;
        }
        const activeItem = QueueService.getItem(this.currentQueueItemId);
        const duration = activeItem?.duration || 0;
        const currentTime = this.getCurrentCalculatedTime();
        const remainingTime = duration > 0 ? Math.max(0, duration - currentTime) : 999999;
        const watchingUsers = Array.from(this.users.values()).filter((u) => u.status === 'watching' || u.status === 'buffering');
        if (watchingUsers.length === 0)
            return;
        const targetSec = Math.min(this.settings.targetBufferMinutes * 60, remainingTime > 0 ? remainingTime : 300);
        const minSec = Math.min(this.settings.minBufferSeconds, remainingTime > 0 ? remainingTime : 60);
        // 1. If currently playing: check if anyone is below minSec (e.g. 60s)
        if (this.playback.isPlaying) {
            if (remainingTime > 15) {
                const starvingUser = watchingUsers.find((u) => typeof u.bufferAhead === 'number' && (u.bufferAhead < minSec || u.isBuffering));
                if (starvingUser) {
                    // Pause playback!
                    this.playback.currentTime = currentTime;
                    this.playback.isPlaying = false;
                    this.playback.updatedAt = Date.now();
                    this.bufferSync = {
                        isSyncBuffering: true,
                        targetSeconds: targetSec,
                        minSeconds: minSec,
                        reason: 'low_buffer',
                        starvingUser: {
                            socketId: starvingUser.socketId,
                            username: starvingUser.username,
                            bufferAhead: starvingUser.bufferAhead ?? 0,
                            required: minSec,
                        },
                    };
                    this.broadcastPlaybackSync();
                    this.broadcastRoomState();
                    this.addSystemMessage(`⚠️ پخش متوقف شد: سرعت دانلود «${starvingUser.username}» کمتر از ۱ دقیقه بافر دارد (${Math.round(starvingUser.bufferAhead ?? 0)} ثانیه). در حال بارگذاری هماهنگ...`);
                }
            }
        }
        else if (this.bufferSync.isSyncBuffering) {
            // 2. Room is waiting for everyone to buffer:
            const requiredThreshold = this.bufferSync.reason === 'initial' ? Math.min(targetSec, 180) : minSec;
            const stillStarving = watchingUsers.find((u) => (u.bufferAhead ?? 0) < requiredThreshold || u.isBuffering);
            if (!stillStarving) {
                // Everyone reached buffer! Resume playback!
                this.bufferSync.isSyncBuffering = false;
                this.bufferSync.starvingUser = undefined;
                this.playback.isPlaying = true;
                this.playback.updatedAt = Date.now();
                this.broadcastPlaybackSync();
                this.broadcastRoomState();
                this.addSystemMessage(`✅ بافر تمام کاربران تکمیل شد! ادامه پخش ویدیو به صورت کاملاً هماهنگ.`);
            }
            else {
                this.bufferSync.starvingUser = {
                    socketId: stillStarving.socketId,
                    username: stillStarving.username,
                    bufferAhead: stillStarving.bufferAhead ?? 0,
                    required: requiredThreshold,
                };
                this.broadcastRoomState();
            }
        }
    }
    static broadcastRoomState() {
        this.io.emit('room:state', this.getRoomState());
    }
    static broadcastPlaybackSync() {
        this.io.emit('playback:sync', {
            currentTime: this.getCurrentCalculatedTime(),
            isPlaying: this.playback.isPlaying,
            playbackRate: this.playback.playbackRate,
            updatedAt: Date.now(),
        });
    }
    static addSystemMessage(text) {
        const msg = {
            id: uuidv4(),
            userId: 'system',
            username: 'System',
            text,
            timestamp: Date.now(),
            isSystem: true,
        };
        this.chatHistory.push(msg);
        if (this.chatHistory.length > 100)
            this.chatHistory.shift();
        this.io.emit('chat:message', msg);
    }
    static setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            // 1. Join room with username and optional admin secret key
            socket.on('user:join', (data) => {
                const username = (data.username || 'Guest').trim().slice(0, 25);
                const isAdmin = Boolean(data.secretKey && data.secretKey === CONFIG.ADMIN_SECRET_KEY);
                const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);
                const user = {
                    id: socket.id,
                    socketId: socket.id,
                    username,
                    isAdmin,
                    avatarColor: AVATAR_COLORS[colorIndex],
                    joinedAt: Date.now(),
                    status: 'watching',
                };
                this.users.set(socket.id, user);
                // Send initial state & chat history to the joining user
                socket.emit('room:state', this.getRoomState());
                socket.emit('chat:history', this.chatHistory);
                // Broadcast to other members
                socket.broadcast.emit('user:joined', user);
                this.addSystemMessage(`${user.username} joined the meeting${user.isAdmin ? ' (as Admin)' : ''}.`);
            });
            // 2. Elevate to Admin with secret key
            socket.on('user:elevate', (secretKey, callback) => {
                const user = this.users.get(socket.id);
                if (!user)
                    return;
                if (secretKey === CONFIG.ADMIN_SECRET_KEY) {
                    user.isAdmin = true;
                    this.broadcastRoomState();
                    this.addSystemMessage(`${user.username} was elevated to Admin.`);
                    if (callback)
                        callback({ success: true });
                }
                else {
                    if (callback)
                        callback({ success: false, message: 'Invalid Admin Secret Key' });
                }
            });
            // 3. Playback control: Play
            socket.on('playback:play', (time) => {
                const user = this.users.get(socket.id);
                if (!user || (!user.isAdmin && !this.settings.allowMemberControls))
                    return;
                const seekTime = typeof time === 'number' ? time : this.getCurrentCalculatedTime();
                this.playback.currentTime = Math.max(0, seekTime);
                // Check if BufferSync is enabled: if anyone is low on buffer, trigger buffer sync
                if (this.settings.enableBufferSync && this.currentQueueItemId) {
                    const activeItem = QueueService.getItem(this.currentQueueItemId);
                    const duration = activeItem?.duration || 0;
                    const remainingTime = duration > 0 ? Math.max(0, duration - this.playback.currentTime) : 999999;
                    const minSec = Math.min(this.settings.minBufferSeconds, remainingTime > 0 ? remainingTime : 60);
                    const watchingUsers = Array.from(this.users.values()).filter((u) => u.status === 'watching' || u.status === 'buffering');
                    const starving = watchingUsers.find((u) => typeof u.bufferAhead === 'number' && (u.bufferAhead < minSec || u.isBuffering));
                    if (starving && remainingTime > 15) {
                        this.playback.isPlaying = false;
                        this.playback.updatedAt = Date.now();
                        this.bufferSync = {
                            isSyncBuffering: true,
                            targetSeconds: Math.min(this.settings.targetBufferMinutes * 60, remainingTime),
                            minSeconds: minSec,
                            reason: 'low_buffer',
                            starvingUser: {
                                socketId: starving.socketId,
                                username: starving.username,
                                bufferAhead: starving.bufferAhead ?? 0,
                                required: minSec,
                            },
                        };
                        this.broadcastPlaybackSync();
                        this.broadcastRoomState();
                        this.addSystemMessage(`⚠️ کاربر «${starving.username}» به اندازه کافی (${minSec} ثانیه) بافر ندارد. در حال بافر هماهنگ...`);
                        return;
                    }
                }
                this.playback.isPlaying = true;
                this.playback.updatedAt = Date.now();
                this.broadcastPlaybackSync();
                this.addSystemMessage(`${user.username} resumed playback at ${formatTime(this.playback.currentTime)}`);
            });
            // 3.1 Force Play (Admin or control bypass buffer sync)
            socket.on('playback:force_play', (time) => {
                const user = this.users.get(socket.id);
                if (!user || (!user.isAdmin && !this.settings.allowMemberControls))
                    return;
                this.bufferSync.isSyncBuffering = false;
                this.bufferSync.starvingUser = undefined;
                const seekTime = typeof time === 'number' ? time : this.getCurrentCalculatedTime();
                this.playback.currentTime = Math.max(0, seekTime);
                this.playback.isPlaying = true;
                this.playback.updatedAt = Date.now();
                this.broadcastPlaybackSync();
                this.broadcastRoomState();
                this.addSystemMessage(`${user.username} پخش ویدیو را بدون انتظار برای بافر آغاز کرد.`);
            });
            // 4. Playback control: Pause
            socket.on('playback:pause', (time) => {
                const user = this.users.get(socket.id);
                if (!user || (!user.isAdmin && !this.settings.allowMemberControls))
                    return;
                const pauseTime = typeof time === 'number' ? time : this.getCurrentCalculatedTime();
                this.playback.currentTime = Math.max(0, pauseTime);
                this.playback.isPlaying = false;
                this.playback.updatedAt = Date.now();
                this.broadcastPlaybackSync();
                this.addSystemMessage(`${user.username} paused playback at ${formatTime(this.playback.currentTime)}`);
            });
            // 5. Playback control: Seek
            socket.on('playback:seek', (time) => {
                const user = this.users.get(socket.id);
                if (!user || (!user.isAdmin && !this.settings.allowMemberControls))
                    return;
                this.playback.currentTime = Math.max(0, time);
                this.playback.updatedAt = Date.now();
                this.broadcastPlaybackSync();
                this.addSystemMessage(`${user.username} jumped to ${formatTime(time)}`);
            });
            // 6. Playback control: Rate
            socket.on('playback:rate', (rate) => {
                const user = this.users.get(socket.id);
                if (!user || !user.isAdmin)
                    return;
                this.playback.currentTime = this.getCurrentCalculatedTime();
                this.playback.playbackRate = rate;
                this.playback.updatedAt = Date.now();
                this.broadcastPlaybackSync();
                this.addSystemMessage(`${user.username} set playback speed to ${rate}x`);
            });
            // 7. Select active stream source (Original vs Re-encoded)
            socket.on('playback:source', (source) => {
                const user = this.users.get(socket.id);
                if (!user || !user.isAdmin)
                    return;
                this.activeStreamSource = source;
                this.io.emit('playback:source_changed', { activeStreamSource: source });
                this.addSystemMessage(`${user.username} switched stream source to ${source === 'original' ? 'Original Source' : 'Re-encoded'}.`);
            });
            // 8. Queue: Set active video
            socket.on('queue:set_active', (queueItemId) => {
                const user = this.users.get(socket.id);
                if (!user || !user.isAdmin)
                    return;
                const item = QueueService.getItem(queueItemId);
                if (!item)
                    return;
                this.currentQueueItemId = queueItemId;
                this.activeStreamSource = 'original';
                this.playback.currentTime = 0;
                this.playback.updatedAt = Date.now();
                if (this.settings.enableBufferSync) {
                    const targetSec = Math.min(this.settings.targetBufferMinutes * 60, item.duration || 300);
                    this.bufferSync = {
                        isSyncBuffering: true,
                        targetSeconds: targetSec,
                        minSeconds: Math.min(this.settings.minBufferSeconds, item.duration || 60),
                        reason: 'initial',
                    };
                    this.playback.isPlaying = false;
                }
                else {
                    this.playback.isPlaying = true;
                }
                this.broadcastRoomState();
                this.addSystemMessage(`${user.username} changed video to "${item.title}".`);
            });
            // 9. Queue: Add video (Admin only)
            socket.on('queue:add', async (data, callback) => {
                const user = this.users.get(socket.id);
                if (!user || !user.isAdmin) {
                    if (callback)
                        callback({ success: false, error: 'Unauthorized: Admin only' });
                    return;
                }
                try {
                    let subtitles = [];
                    if (data.subtitleUrl) {
                        try {
                            const subTrack = await SubtitleService.fetchAndSaveFromUrl(data.subtitleUrl, data.subtitleLabel || 'Subtitles');
                            subtitles.push(subTrack);
                        }
                        catch (err) {
                            console.warn('[RoomService] Subtitle download warning:', err.message);
                        }
                    }
                    const newItem = await QueueService.addItem(data.title, data.url, user.username, subtitles);
                    // If no video is currently active, make this the active video
                    if (!this.currentQueueItemId) {
                        this.currentQueueItemId = newItem.id;
                        this.playback.currentTime = 0;
                        this.playback.updatedAt = Date.now();
                        if (this.settings.enableBufferSync) {
                            const targetSec = Math.min(this.settings.targetBufferMinutes * 60, newItem.duration || 300);
                            this.bufferSync = {
                                isSyncBuffering: true,
                                targetSeconds: targetSec,
                                minSeconds: Math.min(this.settings.minBufferSeconds, newItem.duration || 60),
                                reason: 'initial',
                            };
                            this.playback.isPlaying = false;
                        }
                        else {
                            this.playback.isPlaying = true;
                        }
                    }
                    this.broadcastRoomState();
                    this.addSystemMessage(`${user.username} added "${newItem.title}" to the queue.`);
                    if (callback)
                        callback({ success: true, item: newItem });
                    // If auto re-encode is requested
                    if (data.autoReencode) {
                        this.startTranscodeJob(newItem.id, data.autoReencode.fps, data.autoReencode.height);
                    }
                }
                catch (err) {
                    console.error('[RoomService] Failed to add video:', err);
                    if (callback)
                        callback({ success: false, error: err.message || 'Failed to add video' });
                }
            });
            // 9.1 Add subtitle to active or specific video
            socket.on('video:add_subtitle', (data) => {
                const user = this.users.get(socket.id);
                if (!user || !data.track)
                    return;
                const targetId = data.queueItemId || this.currentQueueItemId;
                if (!targetId)
                    return;
                const item = QueueService.getItem(targetId);
                if (item) {
                    if (!item.subtitles.some((s) => s.id === data.track.id)) {
                        item.subtitles.push(data.track);
                        QueueService.updateItem(targetId, { subtitles: item.subtitles });
                        this.broadcastRoomState();
                        this.addSystemMessage(`${user.username} attached subtitle "${data.track.label}"${data.track.isTemporary ? ' (temporary 1-day)' : ''}.`);
                    }
                }
            });
            // 10. Queue: Remove item
            socket.on('queue:remove', (id) => {
                const user = this.users.get(socket.id);
                if (!user || !user.isAdmin)
                    return;
                const item = QueueService.getItem(id);
                if (!item)
                    return;
                QueueService.removeItem(id);
                if (this.currentQueueItemId === id) {
                    const queue = QueueService.getQueue();
                    this.currentQueueItemId = queue.length > 0 ? queue[0].id : null;
                    this.playback.currentTime = 0;
                    this.playback.isPlaying = false;
                }
                this.broadcastRoomState();
                this.addSystemMessage(`${user.username} removed "${item.title}" from the queue.`);
            });
            // 11. Queue: Reorder
            socket.on('queue:reorder', (data) => {
                const user = this.users.get(socket.id);
                if (!user || !user.isAdmin)
                    return;
                QueueService.reorder(data.fromIndex, data.toIndex);
                this.broadcastRoomState();
            });
            // 12. Video Re-encoding: Start job (Admin only)
            socket.on('transcode:start', (data) => {
                const user = this.users.get(socket.id);
                if (!user || !user.isAdmin)
                    return;
                this.startTranscodeJob(data.queueItemId, data.targetFps, data.targetHeight);
            });
            // 13. Video Re-encoding: Cancel job
            socket.on('transcode:cancel', (queueItemId) => {
                const user = this.users.get(socket.id);
                if (!user || !user.isAdmin)
                    return;
                TranscoderService.cancelJob(queueItemId);
                QueueService.updateItem(queueItemId, {
                    isTranscoding: false,
                    transcodeProgress: 0,
                    transcodeStatusText: 'Cancelled',
                });
                this.broadcastRoomState();
                this.addSystemMessage(`${user.username} cancelled video re-encoding.`);
            });
            // 14. Chat Message
            socket.on('chat:send', (text) => {
                const user = this.users.get(socket.id);
                if (!user || !text.trim())
                    return;
                const msg = {
                    id: uuidv4(),
                    userId: user.id,
                    username: user.username,
                    text: text.trim().slice(0, 500),
                    timestamp: Date.now(),
                };
                this.chatHistory.push(msg);
                if (this.chatHistory.length > 100)
                    this.chatHistory.shift();
                this.io.emit('chat:message', msg);
            });
            // 15. Real-time floating reactions (popcorn, emojis)
            socket.on('reaction:send', (emoji) => {
                const user = this.users.get(socket.id);
                if (!user)
                    return;
                const payload = {
                    id: uuidv4(),
                    username: user.username,
                    emoji,
                    timestamp: Date.now(),
                };
                this.io.emit('reaction:broadcast', payload);
            });
            // 16. Client buffering status / time report
            socket.on('client:status', (data) => {
                const user = this.users.get(socket.id);
                if (user) {
                    user.status = data.status;
                    user.clientTime = data.currentTime;
                    socket.broadcast.emit('user:status_updated', {
                        socketId: socket.id,
                        status: data.status,
                        clientTime: data.currentTime,
                    });
                }
            });
            // 16.1 Buffer health report from client
            socket.on('playback:buffer_status', (data) => {
                const user = this.users.get(socket.id);
                if (!user)
                    return;
                user.bufferAhead = Math.max(0, data.bufferAhead || 0);
                user.bufferedEnd = data.bufferedEnd;
                user.clientTime = data.currentTime;
                if (typeof data.pingMs === 'number')
                    user.pingMs = data.pingMs;
                if (typeof data.downloadSpeedKbps === 'number')
                    user.downloadSpeedKbps = data.downloadSpeedKbps;
                user.isBuffering = data.isBuffering ?? false;
                user.status = data.isBuffering ? 'buffering' : 'watching';
                this.evaluateBufferSync();
            });
            // 16.2 Roundtrip ping measurement
            socket.on('ping:measure', (clientTime, callback) => {
                if (typeof callback === 'function') {
                    callback(Date.now());
                }
            });
            // 17. Room settings update
            socket.on('settings:update', (newSettings) => {
                const user = this.users.get(socket.id);
                if (!user || !user.isAdmin)
                    return;
                Object.assign(this.settings, newSettings);
                this.broadcastRoomState();
                this.addSystemMessage(`${user.username} updated room settings.`);
            });
            // 17.1 WebRTC Voice Signaling
            socket.on('voice:signal', (data) => {
                if (!data.targetSocketId || !data.signal)
                    return;
                this.io.to(data.targetSocketId).emit('voice:signal', {
                    senderSocketId: socket.id,
                    signal: data.signal,
                });
            });
            // 17.2 Voice Status (Muted / Unmuted)
            socket.on('voice:status', (data) => {
                const user = this.users.get(socket.id);
                if (user) {
                    user.isMuted = data.isMuted;
                    socket.broadcast.emit('voice:user_status', {
                        socketId: socket.id,
                        isMuted: data.isMuted,
                    });
                }
            });
            // 17.3 Voice Speaking Indicator
            socket.on('voice:speaking', (isSpeaking) => {
                const user = this.users.get(socket.id);
                if (user) {
                    user.isSpeaking = isSpeaking;
                    socket.broadcast.emit('voice:user_speaking', {
                        socketId: socket.id,
                        isSpeaking,
                    });
                }
            });
            // 18. Disconnect
            socket.on('disconnect', () => {
                const user = this.users.get(socket.id);
                if (user) {
                    this.users.delete(socket.id);
                    this.io.emit('user:left', socket.id);
                    this.addSystemMessage(`${user.username} left the meeting.`);
                }
            });
        });
    }
    /**
     * Helper to execute transcoding in the background and notify room
     */
    static async startTranscodeJob(queueItemId, targetFps, targetHeight) {
        const item = QueueService.getItem(queueItemId);
        if (!item)
            return;
        if (TranscoderService.isJobActive(queueItemId)) {
            return; // Already in progress
        }
        QueueService.updateItem(queueItemId, {
            isTranscoding: true,
            transcodeProgress: 0,
            transcodeStatusText: `Starting re-encode (${targetHeight}p @ ${targetFps}fps)...`,
        });
        this.broadcastRoomState();
        this.addSystemMessage(`Re-encoding started for "${item.title}" (${targetHeight}p @ ${targetFps}fps)...`);
        try {
            const transcodedVersion = await TranscoderService.transcodeVideo(item, targetFps, targetHeight, (progress) => {
                QueueService.updateItem(queueItemId, {
                    isTranscoding: true,
                    transcodeProgress: progress.percent,
                    transcodeStatusText: `${progress.percent}% | ${progress.speed} | FPS: ${progress.fps}`,
                });
                this.io.emit('transcode:progress', {
                    queueItemId,
                    ...progress,
                });
            });
            // Successfully finished
            QueueService.addTranscodedVersion(queueItemId, transcodedVersion);
            QueueService.updateItem(queueItemId, {
                isTranscoding: false,
                transcodeProgress: 100,
                transcodeStatusText: `Re-encode complete (${targetHeight}p @ ${targetFps}fps)`,
            });
            this.broadcastRoomState();
            this.addSystemMessage(`Re-encoding completed for "${item.title}" (${targetHeight}p @ ${targetFps}fps)! Now available for selection.`);
        }
        catch (err) {
            QueueService.updateItem(queueItemId, {
                isTranscoding: false,
                transcodeProgress: 0,
                transcodeStatusText: `Failed: ${err.message}`,
            });
            this.broadcastRoomState();
            this.addSystemMessage(`Re-encoding failed for "${item.title}": ${err.message}`);
        }
    }
}
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

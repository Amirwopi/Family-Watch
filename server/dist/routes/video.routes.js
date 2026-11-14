import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import multer from 'multer';
import { CONFIG } from '../config.js';
import { SubtitleService } from '../services/subtitle.service.js';
const router = Router();
const upload = multer({ dest: path.join(CONFIG.STORAGE_DIR, 'uploads') });
/**
 * Streaming proxy for remote video links with HTTP 206 Partial Content support
 * This allows playing videos of any duration and instant seeking without CORS errors.
 */
router.get('/stream', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        res.status(400).send('Missing url parameter');
        return;
    }
    const range = req.headers.range;
    const requestHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
    };
    if (range) {
        requestHeaders['Range'] = range;
    }
    try {
        const response = await axios({
            method: 'GET',
            url: videoUrl,
            headers: requestHeaders,
            responseType: 'stream',
            validateStatus: (status) => status >= 200 && status < 300,
            timeout: 15000,
        });
        const status = response.status === 206 ? 206 : (range ? 206 : 200);
        const contentType = response.headers['content-type'] ? String(response.headers['content-type']) : 'video/mp4';
        const contentLength = response.headers['content-length'] ? String(response.headers['content-length']) : undefined;
        const contentRange = response.headers['content-range'] ? String(response.headers['content-range']) : undefined;
        res.status(status);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        if (contentLength)
            res.setHeader('Content-Length', contentLength);
        if (contentRange)
            res.setHeader('Content-Range', contentRange);
        // Destroy stream on client disconnect to avoid leaks
        req.on('close', () => {
            if (response.data && typeof response.data.destroy === 'function') {
                response.data.destroy();
            }
        });
        response.data.pipe(res);
    }
    catch (err) {
        console.error('[Video Proxy] Stream error:', err.message);
        if (!res.headersSent) {
            res.status(502).send(`Error streaming video: ${err.message}`);
        }
    }
});
/**
 * Serve local transcoded MP4 files with range request support
 */
router.get('/transcoded/:filename', (req, res) => {
    const paramFilename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const fileName = path.basename(paramFilename);
    const filePath = path.join(CONFIG.TRANSCODED_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        res.status(404).send('Transcoded video not found');
        return;
    }
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        if (start >= fileSize) {
            res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
            return;
        }
        const chunksize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=86400',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        });
        file.pipe(res);
    }
    else {
        res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
            'Accept-Ranges': 'bytes',
        });
        fs.createReadStream(filePath).pipe(res);
    }
});
/**
 * Serve subtitle WebVTT files
 */
router.get('/subtitles/:filename', (req, res) => {
    const paramFilename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const fileName = path.basename(paramFilename);
    const filePath = SubtitleService.getSubtitlePath(fileName);
    if (!filePath || !fs.existsSync(filePath)) {
        res.status(404).send('Subtitle not found');
        return;
    }
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    fs.createReadStream(filePath).pipe(res);
});
/**
 * Upload subtitle file (SRT or VTT) with temporary 1-day retention
 */
router.post('/subtitles/upload', upload.single('subtitle'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No subtitle file uploaded' });
        return;
    }
    try {
        const content = fs.readFileSync(req.file.path, 'utf-8');
        const label = req.body.label || req.file.originalname.replace(/\.[^/.]+$/, '');
        const language = req.body.language || 'en';
        const uploadedBy = req.body.uploadedBy || 'User';
        const isTemporary = req.body.isTemporary !== 'false'; // Default to true (1 day temporary)
        const track = SubtitleService.saveSubtitle(content, label, language, isTemporary, uploadedBy);
        // Clean up temp upload file
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.json({ success: true, track });
    }
    catch (err) {
        console.error('[Video Routes] Subtitle upload failed:', err);
        res.status(500).json({ error: 'Failed to process subtitle file' });
    }
});
export default router;

import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import authRoutes from './routes/auth.routes.js';
import videoRoutes from './routes/video.routes.js';
import queueRoutes from './routes/queue.routes.js';
import { RoomService } from './services/room.service.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
// Initialize Socket.io with CORS
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 10000,
});
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// API routes
app.use('/api/auth', authRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/queue', queueRoutes);
// Direct subtitles route alias
app.use('/api/subtitles', (req, res, next) => {
    req.url = '/subtitles' + req.url;
    videoRoutes(req, res, next);
});
// Health check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'familywatchtogether',
        timestamp: new Date().toISOString(),
    });
});
// Initialize Room state and socket handlers
RoomService.initialize(io);
// Static client files (for production build)
const publicDir = path.resolve(__dirname, 'public');
app.use(express.static(publicDir));
// Fallback to index.html for client-side routing
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
    }
    const indexPath = path.join(publicDir, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(200).send(`
        <html>
          <body style="font-family:sans-serif; background:#0f172a; color:#fff; text-align:center; padding:50px;">
            <h2>Family Watch Together Server is Running!</h2>
            <p>Port: ${CONFIG.PORT}</p>
            <p>If you are in development mode, access the web client at <a style="color:#60a5fa;" href="http://localhost:3000">http://localhost:3000</a>.</p>
            <p>To build client for production: <code>npm run build</code></p>
          </body>
        </html>
      `);
        }
    });
});
// Start server
server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(`🎬 Family Watch Together Server is LIVE`);
    console.log(`🌐 Local URL:   http://localhost:${CONFIG.PORT}`);
    console.log(`🔑 Admin Key:   ${CONFIG.ADMIN_SECRET_KEY}`);
    console.log(`===================================================`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down server gracefully...');
    server.close(() => {
        console.log('Server terminated');
    });
});

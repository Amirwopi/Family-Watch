import { Router } from 'express';
import { QueueService } from '../services/queue.service.js';
import { CONFIG } from '../config.js';
const router = Router();
// Middleware to verify admin key from header if calling via REST
function requireAdmin(req, res, next) {
    const secretKey = req.headers['x-admin-key'];
    if (!secretKey || secretKey !== CONFIG.ADMIN_SECRET_KEY) {
        res.status(403).json({ error: 'Unauthorized. Admin secret key required.' });
        return;
    }
    next();
}
router.get('/', (_req, res) => {
    res.json({ queue: QueueService.getQueue() });
});
router.post('/', requireAdmin, async (req, res) => {
    const { title, url, addedBy, subtitles } = req.body;
    if (!url) {
        res.status(400).json({ error: 'Video URL is required' });
        return;
    }
    try {
        const item = await QueueService.addItem(title || 'Video', url, addedBy || 'Admin', subtitles || []);
        res.json({ success: true, item });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/:id', requireAdmin, (req, res) => {
    const itemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const success = QueueService.removeItem(itemId);
    res.json({ success });
});
router.post('/reorder', requireAdmin, (req, res) => {
    const { fromIndex, toIndex } = req.body;
    const success = QueueService.reorder(fromIndex, toIndex);
    res.json({ success });
});
export default router;

import { Router } from 'express';
import { CONFIG } from '../config.js';
const router = Router();
router.post('/login', (req, res) => {
    const { username, secretKey } = req.body;
    if (!username || typeof username !== 'string' || !username.trim()) {
        res.status(400).json({ error: 'Username is required' });
        return;
    }
    const cleanUsername = username.trim().slice(0, 30);
    const isAdmin = Boolean(secretKey && secretKey === CONFIG.ADMIN_SECRET_KEY);
    res.json({
        success: true,
        user: {
            username: cleanUsername,
            isAdmin,
        },
    });
});
router.post('/elevate', (req, res) => {
    const { secretKey } = req.body;
    if (!secretKey || secretKey !== CONFIG.ADMIN_SECRET_KEY) {
        res.status(401).json({ error: 'Invalid admin secret key' });
        return;
    }
    res.json({
        success: true,
        isAdmin: true,
    });
});
export default router;

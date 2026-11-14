import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY || 'admin123',
  STORAGE_DIR: path.resolve(__dirname, '../storage'),
  TRANSCODED_DIR: path.resolve(__dirname, '../storage/transcoded'),
  SUBTITLES_DIR: path.resolve(__dirname, '../storage/subtitles'),
  CACHE_DIR: path.resolve(__dirname, '../storage/cache'),
  QUEUE_FILE: path.resolve(__dirname, '../storage/queue.json'),
};

// Ensure storage directories exist
[CONFIG.STORAGE_DIR, CONFIG.TRANSCODED_DIR, CONFIG.SUBTITLES_DIR, CONFIG.CACHE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

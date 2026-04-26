import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import Message from '../models/Message.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// uploads folder is ../uploads relative to this routes file (i.e. backend/uploads)
const uploadDir = path.join(__dirname, '../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname || 'file';
    const ext = path.extname(originalName).toLowerCase();
    const base = path
      .basename(originalName, ext)
      .replace(/[^a-z0-9_-]/gi, '')
      .slice(0, 40);
    cb(null, Date.now() + '-' + base + ext);
  }
});

// File size limit (20 MB here; adjust if needed)
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// Allowed mime types (images + common video)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm'
];

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
}); // limits.fileSize + fileFilter are Multer’s standard mechanisms to enforce size/type constraints.[web:64][web:70][web:83][web:88]

const sanitizeRoomCode = (code) =>
  String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);

// POST /api/rooms/:code/upload
router.post('/:code/upload', upload.single('file'), async (req, res) => {
  try {
    const code = sanitizeRoomCode(req.params.code);
    const senderId = String(req.body.senderId || '').trim();

    if (!code || !senderId) {
      return res.status(400).json({ error: 'Invalid room or sender' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const publicUrl = `/uploads/${req.file.filename}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const msgDoc = await Message.create({
      roomCode: code,
      senderId,
      message: '', // you could support captions later via req.body.caption
      timestamp: now,
      type: 'media',
      mediaUrl: publicUrl,
      mediaType: req.file.mimetype,
      mediaSize: req.file.size,
      expiresAt
    });

    const payload = {
      _id: msgDoc._id.toString(),
      roomCode: code,
      senderId,
      message: '',
      type: 'media',
      mediaUrl: publicUrl,
      mediaType: req.file.mimetype,
      mediaSize: req.file.size,
      timestamp: msgDoc.timestamp
    };

    // Emit to room via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(code).emit('newMessage', payload);
    }

    res.status(201).json(payload);
  } catch (err) {
    console.error('Upload error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

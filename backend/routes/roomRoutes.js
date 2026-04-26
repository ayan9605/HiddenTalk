import express from 'express';
import Room from '../models/Room.js';
import Message from '../models/Message.js';

const router = express.Router();

// Simple input sanitization helpers
const sanitizeRoomCode = (code) =>
  String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);

const sanitizeLimit = (limit) => {
  const n = parseInt(limit, 10);
  if (Number.isNaN(n)) return 50;
  return Math.min(Math.max(n, 1), 200);
};

// GET /api/rooms/:code/messages?limit=50
router.get('/:code/messages', async (req, res) => {
  try {
    const code = sanitizeRoomCode(req.params.code);
    if (!code) {
      return res.status(400).json({ error: 'Invalid room code' });
    }

    const limit = sanitizeLimit(req.query.limit);

    // Returns both text and media messages for the room,
    // in chronological order, up to the specified limit.
    const messages = await Message.find({ roomCode: code })
      .sort({ timestamp: 1 })
      .limit(limit)
      .lean();

    // Ensure the room exists (optional: auto-create like in socket join)
    await Room.findOneAndUpdate(
      { code },
      { $setOnInsert: { code, createdAt: new Date() } },
      { upsert: true, new: true }
    );

    res.json({ roomCode: code, messages });
  } catch (err) {
    console.error('Error fetching messages', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

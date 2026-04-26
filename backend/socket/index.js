import Room from '../models/Room.js';
import Message from '../models/Message.js';

// Basic in-memory typing map { roomCode: { senderId: timeoutId } }
const TYPING_TIMEOUT_MS = 2000;

export default function initSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('joinRoom', async ({ roomCode, senderId }) => {
      try {
        const code = String(roomCode || '')
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_-]/g, '')
          .slice(0, 32);

        if (!code || !senderId) return;

        socket.join(code);
        socket.data.roomCode = code;
        socket.data.senderId = senderId;

        // Ensure the room exists
        await Room.findOneAndUpdate(
          { code },
          { $setOnInsert: { code, createdAt: new Date() } },
          { upsert: true, new: true }
        );

        socket.to(code).emit('systemMessage', {
          type: 'join',
          senderId,
          message: 'A user joined the room.'
        });

        console.log(`Socket ${socket.id} joined room ${code}`);
      } catch (err) {
        console.error('joinRoom error:', err);
      }
    });

    socket.on('sendMessage', async ({ roomCode, senderId, message }) => {
      try {
        const code = String(roomCode || '')
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_-]/g, '')
          .slice(0, 32);
        const text = String(message || '').trim();

        if (!code || !senderId || !text) return;
        if (text.length > 2000) return; // basic spam / flood protection

        const msgDoc = await Message.create({
          roomCode: code,
          senderId,
          message: text,
          timestamp: new Date()
        });

        io.to(code).emit('newMessage', {
          _id: msgDoc._id.toString(),
          roomCode: code,
          senderId,
          message: text,
          timestamp: msgDoc.timestamp
        });
      } catch (err) {
        console.error('sendMessage error:', err);
      }
    });

    socket.on('typing', ({ roomCode, senderId, isTyping }) => {
      const code = String(roomCode || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '')
        .slice(0, 32);
      if (!code || !senderId) return;

      // Broadcast typing indicator to others in the room
      socket.to(code).emit('typing', { senderId, isTyping: !!isTyping });
    });

    socket.on('disconnect', () => {
      const { roomCode, senderId } = socket.data || {};
      if (roomCode && senderId) {
        socket.to(roomCode).emit('systemMessage', {
          type: 'leave',
          senderId,
          message: 'A user left the room.'
        });
      }
      console.log('Socket disconnected:', socket.id);
    });
  });
}

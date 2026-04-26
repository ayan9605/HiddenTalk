import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, index: true },
    senderId: { type: String, required: true },

    // Text content is now optional so we can have pure media messages
    message: { type: String },

    timestamp: { type: Date, default: Date.now, index: true },

    // Message kind: plain text or media
    type: {
      type: String,
      enum: ['text', 'media'],
      default: 'text'
    },

    // Media fields (only used when type === 'media')
    mediaUrl: { type: String },   // e.g. /uploads/1234-file.jpg
    mediaType: { type: String },  // MIME type (image/jpeg, video/mp4, etc.)
    mediaSize: { type: Number },  // size in bytes

    // Optional per-message expiration time.
    // For media messages we’ll set this to now + 24h.
    // MongoDB TTL index will delete the document when this time is reached.[web:68][web:71][web:84][web:87]
    expiresAt: { type: Date, index: true }
  },
  { collection: 'messages' }
);

// Index for chronological queries by room
messageSchema.index({ roomCode: 1, timestamp: 1 });

// TTL index: expire documents at the exact time in expiresAt
// We use expireAfterSeconds: 0 so each document's expiresAt controls when it is removed.[web:71][web:84][web:87]
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Message', messageSchema);

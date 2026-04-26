import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { collection: 'messages' }
);

messageSchema.index({ roomCode: 1, timestamp: 1 });

export default mongoose.model('Message', messageSchema);

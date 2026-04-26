import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: 'rooms' }
);

export default mongoose.model('Room', roomSchema);

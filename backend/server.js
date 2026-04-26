import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

import roomRoutes from './routes/roomRoutes.js';
import initSocket from './socket/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*', // adjust to your frontend origin in production
    methods: ['GET', 'POST']
  }
});

// Initialize Socket.IO handlers
initSocket(io);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Basic rate limiter (IP-based)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 120,              // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter); // apply to all REST routes[web:6][web:15]

// REST routes
app.use('/api/rooms', roomRoutes);

// Serve frontend (assuming ../frontend)
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI, {
    dbName: 'anonymous_chat'
  })
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });

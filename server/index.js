import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import ticketRoutes from './routes/tickets.js';
import adminRoutes from './routes/admin.js';
import errorHandler from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookleaf';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
});

// Attach io instance to express app for access in controllers
app.set('io', io);

// Socket.IO connection and room management
io.on('connection', (socket) => {
  // Join a dedicated room for author or admin based on user id and optional role
  socket.on('join', (data) => {
    if (typeof data === 'string') {
      socket.join(data);
    } else if (data && data.userId) {
      socket.join(data.userId.toString());
      if (data.role === 'admin') {
        socket.join('admins');
      }
    }
  });

  // Admins join the shared 'admins' room for live queue and ticket updates
  socket.on('join:admins', () => {
    socket.join('admins');
  });

  socket.on('disconnect', () => {
    // Clean disconnection
  });
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BookLeaf API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handler
app.use(errorHandler);

// Connect to MongoDB and start HTTP & WebSocket server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
    server.listen(PORT, () => {
      console.log(`BookLeaf server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

export default app;

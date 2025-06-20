import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import disasterRoutes from './routes/disasters.js';
import socialMediaRoutes from './routes/socialMedia.js';
import resourcesRoutes from './routes/resources.js';
import updatesRoutes from './routes/updates.js';
import verificationRoutes from './routes/verification.js';
import geocodingRoutes from './routes/geocoding.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { initializeDatabase } from './database/init.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/disasters', disasterRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/updates', updatesRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/geocoding', geocodingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join_disaster', (disasterId) => {
    socket.join(`disaster_${disasterId}`);
    logger.info(`Client ${socket.id} joined disaster room: ${disasterId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Initialize database and start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await initializeDatabase();
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
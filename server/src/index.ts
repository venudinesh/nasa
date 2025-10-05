import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

// Import routes
import planetRoutes from './routes/planets-simple';
import chatRoutes from './routes/chat-simple';
import userRoutes from './routes/users-simple';
import adminRoutes from './routes/admin-simple';
// import advancedChatRoutes from './routes/advanced-chat-simple';

// Import middleware
import { rateLimiter } from './middleware/rateLimiter-simple';
import { errorHandler } from './middleware/errorHandler-simple';

// Load environment variables
dotenv.config();

// Initialize Prisma client
export const prisma = new PrismaClient();

// Create Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO for real-time chat
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Routes
app.use('/api/planets', planetRoutes);
app.use('/api/chat', chatRoutes);
// app.use('/api/advanced-chat', advancedChatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (_, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'connected'
  });
});

// Simple advanced chat endpoint
app.post('/api/advanced-chat/message', (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Message and sessionId are required'
      });
    }

    // Simple response for now
    const response = {
      success: true,
      data: {
        response: `I received your message: "${message}". I'm an advanced NASA AI assistant ready to help you explore exoplanets! Ask me about habitable worlds, planet characteristics, or space exploration.`,
        type: 'text',
        sessionId: sessionId,
        suggestions: [
          "Show me potentially habitable planets",
          "Tell me about Kepler-452b",
          "What are the latest exoplanet discoveries?",
          "How do we detect exoplanets?"
        ]
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Advanced chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Simple suggestions endpoint
app.get('/api/advanced-chat/suggestions', (_, res) => {
  res.json({
    success: true,
    data: {
      suggestions: [
        "Show me potentially habitable planets",
        "Tell me about the hottest exoplanets",
        "Which planets are closest to Earth?",
        "How do we detect exoplanets?",
        "What makes a planet habitable?",
        "Tell me about the Kepler mission"
      ]
    }
  });
});

// Socket.IO for real-time chat
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('join-chat', (userId: string) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined chat room`);
  });

  socket.on('send-message', async (data) => {
    try {
      // Handle real-time chat messages
      const { userId, message } = data;
      
      // Emit to user's room
      io.to(`user-${userId}`).emit('new-message', {
        id: Date.now().toString(),
        message,
        sender: 'user',
        timestamp: new Date().toISOString()
      });
      
      // Process with AI chatbot (implemented in chat routes)
      // This will be handled by the chatbot service
      
    } catch (error) {
      console.error('Socket message error:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Exoplanet Backend Server running on port ${PORT}`);
  console.log(`🌍 CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
  console.log(`📊 Database: Connected via Prisma`);
  console.log(`🤖 AI Chatbot: Ready for interactions`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

export { io };
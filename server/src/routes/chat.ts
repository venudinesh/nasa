import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { ChatbotService } from '../services/chatbotService';

const router = Router();
const prisma = new PrismaClient();
const chatbotService = new ChatbotService();

// POST /api/chat/sessions - Create new chat session
router.post('/sessions', asyncHandler(async (req: Request, res: Response) => {
  const { userId, title } = req.body;
  
  if (!userId) {
    throw createError('User ID is required', 400);
  }

  // Ensure user exists or create one
  let user = await prisma.user.findUnique({ where: { sessionId: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        sessionId: userId,
        name: `User-${userId.slice(-8)}`
      }
    });
  }

  const session = await prisma.chatSession.create({
    data: {
      userId: user.id,
      title: title || 'New Chat'
    }
  });

  res.json({
    success: true,
    data: session
  });
}));

// GET /api/chat/sessions/:userId - Get user's chat sessions
router.get('/sessions/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  const user = await prisma.user.findUnique({ 
    where: { sessionId: userId },
    include: {
      chatSessions: {
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { messages: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    success: true,
    data: user.chatSessions
  });
}));

// POST /api/chat/message - Send message and get AI response
router.post('/message', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, message, userId } = req.body;
  
  if (!sessionId || !message || !userId) {
    throw createError('Session ID, message, and user ID are required', 400);
  }

  // Verify session exists
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10 // Last 10 messages for context
      }
    }
  });

  if (!session) {
    throw createError('Chat session not found', 404);
  }

  // Save user message
  const userMessage = await prisma.chatMessage.create({
    data: {
      sessionId,
      content: message,
      sender: 'user'
    }
  });

  // Generate AI response
  const aiResponse = await chatbotService.generateResponse(message, session.messages);
  
  // Save AI response
  const assistantMessage = await prisma.chatMessage.create({
    data: {
      sessionId,
      content: aiResponse.content,
      sender: 'assistant',
      messageType: aiResponse.type,
      planetId: aiResponse.planetId,
      metadata: aiResponse.metadata ? JSON.stringify(aiResponse.metadata) : null
    }
  });

  // Update session timestamp
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() }
  });

  res.json({
    success: true,
    data: {
      userMessage,
      assistantMessage,
      suggestions: aiResponse.suggestions || []
    }
  });
}));

// GET /api/chat/messages/:sessionId - Get messages for a session
router.get('/messages/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: parseInt(limit as string),
    skip: parseInt(offset as string),
    include: {
      planet: {
        select: {
          id: true,
          pl_name: true,
          image: true,
          pl_eqt: true,
          classification: true
        }
      }
    }
  });

  res.json({
    success: true,
    data: messages
  });
}));

// POST /api/chat/planet-question - Ask specific question about a planet
router.post('/planet-question', asyncHandler(async (req: Request, res: Response) => {
  const { planetId, question, sessionId } = req.body;
  
  if (!planetId || !question) {
    throw createError('Planet ID and question are required', 400);
  }

  const planet = await prisma.planet.findUnique({
    where: { id: planetId }
  });

  if (!planet) {
    throw createError('Planet not found', 404);
  }

  const response = await chatbotService.generatePlanetSpecificResponse(planet, question);
  
  // Save to chat if session provided
  if (sessionId) {
    await prisma.chatMessage.create({
      data: {
        sessionId,
        content: question,
        sender: 'user',
        planetId
      }
    });

    await prisma.chatMessage.create({
      data: {
        sessionId,
        content: response.content,
        sender: 'assistant',
        messageType: 'planet_info',
        planetId,
        metadata: JSON.stringify(response.metadata)
      }
    });
  }

  res.json({
    success: true,
    data: response
  });
}));

// GET /api/chat/quick-responses - Get pre-defined quick responses
router.get('/quick-responses', asyncHandler(async (req: Request, res: Response) => {
  const quickResponses = [
    {
      id: 'find-habitable',
      text: 'Show me potentially habitable planets',
      query: 'habitable=true'
    },
    {
      id: 'hottest-planets',
      text: 'What are the hottest exoplanets?',
      query: 'sortBy=pl_eqt&sortOrder=desc&limit=5'
    },
    {
      id: 'nearest-planets',
      text: 'Which exoplanets are closest to Earth?',
      query: 'sortBy=sy_dist&sortOrder=asc&limit=5'
    },
    {
      id: 'recent-discoveries',
      text: 'Show me recently discovered planets',
      query: 'sortBy=discoveryyear&sortOrder=desc&limit=5'
    },
    {
      id: 'explain-website',
      text: 'How does this website work?',
      action: 'explain-features'
    },
    {
      id: 'planet-comparison',
      text: 'Compare planets with Earth',
      action: 'compare-earth'
    }
  ];

  res.json({
    success: true,
    data: quickResponses
  });
}));

export default router;
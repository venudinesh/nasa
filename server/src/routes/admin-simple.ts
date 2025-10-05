import { Router, Request, Response } from 'express';
import { prisma } from '../index';

const router = Router();

// Get session details (for development/debugging)
router.get('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    // Find the session
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          where: { sender: 'assistant' },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Format the response
    const data = {
      assistant: session.messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        ts: msg.createdAt.getTime()
      })),
      embeddingsCount: session.messages.length // Simplified - count of messages
    };

    res.json({ data });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Delete session
router.delete('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    // Check if session exists
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Delete all messages first (due to foreign key constraint)
    await prisma.chatMessage.deleteMany({
      where: { sessionId }
    });

    // Delete the session
    await prisma.chatSession.delete({
      where: { id: sessionId }
    });

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Get all sessions (for admin overview)
router.get('/sessions', async (_req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.chatSession.findMany({
      include: {
        messages: {
          select: {
            id: true,
            sender: true,
            createdAt: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 sessions
    });

    const data = sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      username: session.user?.name || 'Anonymous',
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }));

    res.json({ data });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get system statistics
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalSessions,
      totalMessages,
      totalUsers,
      totalPlanets
    ] = await Promise.all([
      prisma.chatSession.count(),
      prisma.chatMessage.count(),
      prisma.user.count(),
      prisma.planet.count()
    ]);

    const stats = {
      totalSessions,
      totalMessages,
      totalUsers,
      totalPlanets,
      avgMessagesPerSession: totalSessions > 0 
        ? (totalMessages / totalSessions).toFixed(2) 
        : '0'
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/users/:sessionId - Get or create user
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    let user = await prisma.user.findUnique({
      where: { sessionId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          sessionId,
          name: 'Anonymous User',
          email: `user-${sessionId}@example.com`
        }
      });
    }

    return res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/users/:sessionId - Update user preferences
router.put('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { name, email, preferredUnits, interests } = req.body;
    
    const user = await prisma.user.update({
      where: { sessionId },
      data: {
        name,
        email,
        preferredUnits,
        interests,
        lastActive: new Date()
      }
    });

    return res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/users - Create new user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { sessionId, name, email } = req.body;
    
    const user = await prisma.user.create({
      data: {
        sessionId: sessionId || `user-${Date.now()}`,
        name: name || 'Anonymous User',
        email: email || `user-${Date.now()}@example.com`
      }
    });

    return res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
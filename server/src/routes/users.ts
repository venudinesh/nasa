import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// POST /api/users - Create or get user
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, name, email, preferences } = req.body;
  
  if (!sessionId) {
    throw createError('Session ID is required', 400);
  }

  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { sessionId }
  });

  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        sessionId,
        name: name || `User-${sessionId.slice(-8)}`,
        email,
        preferredUnits: preferences?.units || 'metric',
        interests: preferences?.interests || []
      }
    });
  } else {
    // Update last active
    user = await prisma.user.update({
      where: { sessionId },
      data: { lastActive: new Date() }
    });
  }

  res.json({
    success: true,
    data: user
  });
}));

// GET /api/users/:sessionId - Get user profile
router.get('/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  const user = await prisma.user.findUnique({
    where: { sessionId },
    include: {
      favorites: {
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
      },
      _count: {
        select: { chatSessions: true }
      }
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    success: true,
    data: user
  });
}));

// POST /api/users/:sessionId/favorites - Add planet to favorites
router.post('/:sessionId/favorites', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { planetId, notes } = req.body;
  
  if (!planetId) {
    throw createError('Planet ID is required', 400);
  }

  const user = await prisma.user.findUnique({
    where: { sessionId }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  const favorite = await prisma.userFavoritePlanet.create({
    data: {
      userId: user.id,
      planetId,
      notes
    },
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
    data: favorite
  });
}));

// DELETE /api/users/:sessionId/favorites/:planetId - Remove from favorites
router.delete('/:sessionId/favorites/:planetId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, planetId } = req.params;
  
  const user = await prisma.user.findUnique({
    where: { sessionId }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  await prisma.userFavoritePlanet.deleteMany({
    where: {
      userId: user.id,
      planetId
    }
  });

  res.json({
    success: true,
    message: 'Planet removed from favorites'
  });
}));

// PUT /api/users/:sessionId/preferences - Update user preferences
router.put('/:sessionId/preferences', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { units, interests } = req.body;
  
  const user = await prisma.user.update({
    where: { sessionId },
    data: {
      preferredUnits: units,
      interests: interests || [],
      lastActive: new Date()
    }
  });

  res.json({
    success: true,
    data: user
  });
}));

export default router;
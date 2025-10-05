import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/planets - Get all planets with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50; // Default to 50 to show all planets
    const offset = (page - 1) * limit;

    const planets = await prisma.planet.findMany({
      skip: offset,
      take: limit,
      orderBy: { pl_name: 'asc' }
    });

    const total = await prisma.planet.count();

    return res.json({
      success: true,
      data: planets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching planets:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/planets/:id - Get planet by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const planet = await prisma.planet.findUnique({
      where: { id }
    });

    if (!planet) {
      return res.status(404).json({
        success: false,
        error: 'Planet not found'
      });
    }

    return res.json({
      success: true,
      data: planet
    });
  } catch (error) {
    console.error('Error fetching planet:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/planets/search/suggestions - Get search suggestions
router.get('/search/suggestions', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || (q as string).length < 2) {
      return res.json({ success: true, data: [] });
    }

    const suggestions = await prisma.planet.findMany({
      where: {
        OR: [
          { pl_name: { contains: q as string } },
          { hostname: { contains: q as string } }
        ]
      },
      select: {
        id: true,
        pl_name: true,
        hostname: true,
        pl_eqt: true,
        image: true
      },
      take: 8
    });

    return res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
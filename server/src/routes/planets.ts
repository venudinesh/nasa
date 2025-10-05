import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// GET /api/planets - Get all planets with optional filtering
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { 
    search, 
    minTemp, 
    maxTemp, 
    minRadius, 
    maxRadius, 
    discoveryMethod, 
    habitable,
    sortBy = 'pl_name',
    sortOrder = 'asc',
    limit = 50,
    offset = 0
  } = req.query;

  // Build filter conditions
  const where: any = {};
  
  if (search) {
    where.OR = [
      { pl_name: { contains: search as string, mode: 'insensitive' } },
      { hostname: { contains: search as string, mode: 'insensitive' } },
      { st_spectype: { contains: search as string, mode: 'insensitive' } }
    ];
  }
  
  if (minTemp || maxTemp) {
    where.pl_eqt = {};
    if (minTemp) where.pl_eqt.gte = parseFloat(minTemp as string);
    if (maxTemp) where.pl_eqt.lte = parseFloat(maxTemp as string);
  }
  
  if (minRadius || maxRadius) {
    where.pl_rade = {};
    if (minRadius) where.pl_rade.gte = parseFloat(minRadius as string);
    if (maxRadius) where.pl_rade.lte = parseFloat(maxRadius as string);
  }
  
  if (discoveryMethod) {
    where.discoverymethod = { contains: discoveryMethod as string, mode: 'insensitive' };
  }

  // Habitable zone filter (rough approximation)
  if (habitable === 'true') {
    where.AND = [
      { pl_eqt: { gte: 175, lte: 350 } }, // Habitable temperature range
      { pl_rade: { gte: 0.5, lte: 2.5 } }  // Earth-size range
    ];
  }

  const planets = await prisma.planet.findMany({
    where,
    orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
    take: parseInt(limit as string),
    skip: parseInt(offset as string),
    include: {
      _count: {
        select: { chatMentions: true, userFavorites: true }
      }
    }
  });

  const total = await prisma.planet.count({ where });

  return res.json({
    success: true,
    data: {
      planets,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasNext: parseInt(offset as string) + parseInt(limit as string) < total
      }
    }
  });
}));

// GET /api/planets/:id - Get specific planet by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const planet = await prisma.planet.findUnique({
    where: { id },
    include: {
      chatMentions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          session: {
            include: { user: { select: { name: true } } }
          }
        }
      },
      _count: {
        select: { chatMentions: true, userFavorites: true }
      }
    }
  });

  if (!planet) {
    throw createError('Planet not found', 404);
  }

  res.json({
    success: true,
    data: planet
  });
}));

// GET /api/planets/name/:name - Get planet by name
router.get('/name/:name', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  
  const planet = await prisma.planet.findUnique({
    where: { pl_name: name },
    include: {
      _count: {
        select: { chatMentions: true, userFavorites: true }
      }
    }
  });

  if (!planet) {
    throw createError('Planet not found', 404);
  }

  res.json({
    success: true,
    data: planet
  });
}));

// GET /api/planets/search/suggestions - Get search suggestions
router.get('/search/suggestions', asyncHandler(async (req: Request, res: Response) => {
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
}));

// GET /api/planets/compare/:ids - Compare multiple planets
router.get('/compare/:ids', asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.params;
  const planetIds = ids.split(',').slice(0, 5); // Limit to 5 planets
  
  const planets = await prisma.planet.findMany({
    where: {
      id: { in: planetIds }
    },
    select: {
      id: true,
      pl_name: true,
      hostname: true,
      sy_dist: true,
      pl_rade: true,
      pl_bmasse: true,
      pl_orbper: true,
      pl_insol: true,
      pl_eqt: true,
      discoverymethod: true,
      discoveryyear: true,
      st_spectype: true,
      st_teff: true,
      image: true,
      classification: true
    }
  });

  if (planets.length === 0) {
    throw createError('No planets found with provided IDs', 404);
  }

  res.json({
    success: true,
    data: {
      planets,
      comparison: {
        count: planets.length,
        tempRange: {
          min: Math.min(...planets.map(p => p.pl_eqt || 0).filter(t => t > 0)),
          max: Math.max(...planets.map(p => p.pl_eqt || 0))
        },
        radiusRange: {
          min: Math.min(...planets.map(p => p.pl_rade || 0).filter(r => r > 0)),
          max: Math.max(...planets.map(p => p.pl_rade || 0))
        }
      }
    }
  });
}));

// GET /api/planets/stats/overview - Get planet statistics
router.get('/stats/overview', asyncHandler(async (_: Request, res: Response) => {
  const total = await prisma.planet.count();
  
  const stats = await prisma.planet.groupBy({
    by: ['discoverymethod'],
    _count: true
  });

  const tempStats = await prisma.planet.aggregate({
    _min: { pl_eqt: true },
    _max: { pl_eqt: true },
    _avg: { pl_eqt: true }
  });

  const radiusStats = await prisma.planet.aggregate({
    _min: { pl_rade: true },
    _max: { pl_rade: true },
    _avg: { pl_rade: true }
  });

  // Habitable zone estimate
  const potentiallyHabitable = await prisma.planet.count({
    where: {
      AND: [
        { pl_eqt: { gte: 175, lte: 350 } },
        { pl_rade: { gte: 0.5, lte: 2.5 } }
      ]
    }
  });

  return res.json({
    success: true,
    data: {
      total,
      potentiallyHabitable,
      discoveryMethods: stats,
      temperature: tempStats,
      radius: radiusStats,
      lastUpdated: new Date().toISOString()
    }
  });
}));

export default router;
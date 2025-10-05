import { Router, Request, Response } from 'express';
import { AdvancedChatbotService } from '../services/advancedChatbotService';
import { NASAApiService } from '../services/nasaApiService';

const router = Router();
const advancedChatbot = new AdvancedChatbotService();
const nasaApi = new NASAApiService(process.env.NASA_API_KEY);

/**
 * POST /api/advanced-chat/message
 * Process advanced AI chat messages with NASA integration
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message, sessionId, userId, context } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Message and sessionId are required'
      });
    }

    // Process message with advanced AI
    const response = await advancedChatbot.processMessage(
      message,
      sessionId,
      { userId, ...context }
    );

    return res.json({
      success: true,
      data: {
        response: response.content,
        type: response.type,
        metadata: response.metadata,
        actionButtons: response.actionButtons,
        suggestions: response.suggestions,
        conversationContext: response.conversationContext
      }
    });

  } catch (error) {
    console.error('Advanced chat error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process chat message'
    });
  }
});

/**
 * POST /api/advanced-chat/nasa-data
 * Get real-time NASA data based on query
 */
router.post('/nasa-data', async (req: Request, res: Response) => {
  try {
    const { query, dataType } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    let data;
    
    switch (dataType) {
      case 'apod':
        data = await nasaApi.getAPOD();
        break;
      case 'mars-rover':
        data = await nasaApi.getMarsRoverPhotos();
        break;
      case 'asteroids':
        data = await nasaApi.getNearEarthObjects();
        break;
      default:
        data = await nasaApi.getComprehensiveSpaceData(query);
    }

    return res.json({
      success: true,
      data,
      query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('NASA API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch NASA data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/advanced-chat/suggestions
 * Get contextual suggestions for the chat
 */
router.get('/suggestions', async (_req: Request, res: Response) => {
  try {
    const suggestions = [
      "Tell me about habitable exoplanets",
      "Show me today's space picture",
      "What are the latest Mars rover discoveries?",
      "Find asteroids near Earth",
      "Calculate orbital mechanics"
    ];

    return res.json({
      success: true,
      data: { suggestions }
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
});

/**
 * GET /api/advanced-chat/nasa-health
 * Check NASA API health status
 */
router.get('/nasa-health', async (_req: Request, res: Response) => {
  try {
    const healthStatus = await nasaApi.healthCheck();
    
    const overallHealth = Object.values(healthStatus).every(status => status);
    
    return res.json({
      success: true,
      data: {
        overall: overallHealth ? 'healthy' : 'degraded',
        services: healthStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Health check failed',
      data: {
        overall: 'unhealthy',
        services: {},
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;
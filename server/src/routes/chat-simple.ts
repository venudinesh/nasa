import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/chat/sessions - Create new chat session
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    
    // Create user first if doesn't exist
    let user = await prisma.user.findUnique({ where: { sessionId: userId || 'anonymous' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          sessionId: userId || 'anonymous',
          name: 'Anonymous User',
          email: `user-${userId || 'anonymous'}@example.com`
        }
      });
    }
    
    const session = await prisma.chatSession.create({
      data: {
        userId: user.id,
        title: 'New Chat Session'
      }
    });

    return res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/chat/message - Send chat message
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, content, message, sender = 'user' } = req.body;
    const messageContent = content || message;
    
    if (!messageContent) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    // Try to save user message, but continue even if it fails
    let userMessage;
    try {
      userMessage = await prisma.chatMessage.create({
        data: {
          sessionId,
          content: messageContent,
          sender
        }
      });
    } catch (dbError) {
      console.warn('Failed to save user message to DB:', dbError);
      // Create a mock user message for response
      userMessage = {
        id: `mock_${Date.now()}`,
        sessionId,
        content: messageContent,
        sender,
        createdAt: new Date()
      };
    }

    // Generate AI response based on the message content
    let aiResponse = "I'm having trouble processing your message right now. Please try again or ask about exoplanets directly!";
    let actionButtons: Array<{text: string, action: string, planetId?: string}> = [];
    
    const messageText = messageContent.toLowerCase();
    
    if (messageText.includes('habitable')) {
      aiResponse = "🌍 **Habitable exoplanets** are fascinating! These are planets that exist within their star's 'habitable zone' where liquid water could potentially exist.\n\n**Notable examples include:**\n• **Kepler-186f** - First Earth-sized planet in habitable zone\n• **TRAPPIST-1e** - Part of a 7-planet system\n• **Proxima Centauri b** - Closest potentially habitable world\n\nWould you like to explore these planets in our 3D viewer?";
      actionButtons = [
        { text: "🌍 View Kepler-186f in 3D", action: "view-3d", planetId: "Kepler-186 f" },
        { text: "🌟 View TRAPPIST-1e in 3D", action: "view-3d", planetId: "TRAPPIST-1 e" },
        { text: "🚀 View Proxima Centauri b in 3D", action: "view-3d", planetId: "Proxima Cen b" },
        { text: "🔍 Explore All Habitable Planets", action: "explore-habitable" }
      ];
    } else if (messageText.includes('closest') || messageText.includes('nearest')) {
      aiResponse = "🚀 **Proxima Centauri b** is the closest confirmed exoplanet to Earth, located about **4.24 light-years** away in the Proxima Centauri system.\n\n**Key Facts:**\n• **Distance:** 4.24 light-years\n• **Type:** Rocky planet\n• **Habitability:** Potentially habitable\n• **Discovery:** 2016\n\nIt's fascinating that our nearest stellar neighbor hosts a potentially habitable world!";
      actionButtons = [
        { text: "🌍 View Proxima Centauri b in 3D", action: "view-3d", planetId: "Proxima Cen b" },
        { text: "📊 Compare with Earth", action: "compare-planets" }
      ];
    } else if (messageText.includes('hottest')) {
      aiResponse = "🔥 **KELT-9b** is one of the hottest known exoplanets with temperatures reaching over **4,300°C (7,800°F)** - hotter than some stars!\n\n**Extreme Facts:**\n• **Temperature:** 4,300°C+ (hotter than many red dwarf stars)\n• **Type:** Ultra-hot Jupiter\n• **Atmosphere:** Being stripped away by intense heat\n• **Year:** Takes only 1.5 Earth days to orbit its star\n\nThis planet is so hot that molecules in its atmosphere are literally being torn apart!";
      actionButtons = [
        { text: "🔥 View KELT-9b in 3D", action: "view-3d", planetId: "KELT-9 b" },
        { text: "🌡️ Compare Temperatures", action: "compare-planets" }
      ];
    } else if (messageText.includes('how') && messageText.includes('work')) {
      aiResponse = "🛠️ **Welcome to ExoArchive!** This interactive platform lets you explore the universe of exoplanets in multiple ways:\n\n**🌍 3D Planet Viewer**\n• Explore detailed 3D models of exoplanets\n• Compare sizes and characteristics\n• Interactive planet surfaces and atmospheres\n\n**🔍 Smart Filtering**\n• Filter by habitability, temperature, size\n• Find Earth-like worlds\n• Discover extreme planets\n\n**📊 Data Visualization**\n• Charts and graphs of planet properties\n• Timeline of discoveries\n• Mission planning tools\n\n**🤖 AI Assistant (That's me!)**\n• Ask questions about any planet\n• Get personalized recommendations\n• Navigate through features seamlessly\n\nWhat would you like to explore first?";
      actionButtons = [
        { text: "🌍 Explore 3D Planets", action: "explore-habitable" },
        { text: "📊 View Data Charts", action: "view-charts" },
        { text: "🔍 Filter Planets", action: "view-filters" }
      ];
    } else if (messageText.includes('compare')) {
      aiResponse = "📊 **Planet Comparison** is one of our coolest features! You can compare multiple exoplanets side-by-side to see:\n\n**Size Comparisons:**\n• Radius vs Earth\n• Mass comparisons\n• Visual size differences\n\n**Environmental Factors:**\n• Temperature ranges\n• Orbital periods\n• Distance from star\n\n**Habitability Scores:**\n• Potential for life\n• Atmospheric conditions\n• Water possibilities\n\nWhich planets would you like to compare?";
      actionButtons = [
        { text: "🌍 Compare Earth-like Planets", action: "compare-planets" },
        { text: "🔥 Compare Hot Jupiters", action: "compare-hot-jupiters" },
        { text: "❄️ Compare Cold Worlds", action: "compare-cold-worlds" }
      ];
    } else if (messageText.includes('discovery') || messageText.includes('found') || messageText.includes('discovered')) {
      aiResponse = "🔭 **Exoplanet discoveries** have revolutionized our understanding of the universe! Since 1995, we've found over **5,000+ confirmed exoplanets**.\n\n**Discovery Methods:**\n• **Transit Method** - Planet blocks star's light\n• **Radial Velocity** - Star wobbles from planet's gravity\n• **Direct Imaging** - Actually photographing the planet\n• **Gravitational Microlensing** - Gravity bends light\n\n**Major Missions:**\n• **Kepler Space Telescope** - Found thousands of planets\n• **TESS** - Currently discovering new worlds\n• **James Webb Space Telescope** - Studying atmospheres\n\nWant to explore planets by discovery year or method?";
      actionButtons = [
        { text: "📅 Timeline of Discoveries", action: "view-timeline" },
        { text: "🔭 Kepler Discoveries", action: "filter-kepler" },
        { text: "🚀 Recent TESS Finds", action: "filter-tess" }
      ];
    } else if (messageText.includes('life') || messageText.includes('alien') || messageText.includes('extraterrestrial')) {
      aiResponse = "� **The search for life** beyond Earth is one of the most exciting aspects of exoplanet research!\n\n**Biosignatures we look for:**\n• **Oxygen & Water Vapor** - Essential for life as we know it\n• **Methane** - Could indicate biological processes\n• **Atmospheric composition** - Chemical imbalances suggesting life\n\n**Promising Candidates:**\n• **K2-18b** - Water vapor detected in atmosphere\n• **TRAPPIST-1 system** - Multiple potentially habitable worlds\n• **TOI-715 b** - In the habitable zone\n\n**Next Steps:**\n• James Webb Space Telescope atmospheric analysis\n• Future direct imaging missions\n• Listening for technosignatures\n\nExplore our most promising worlds for life!";
      actionButtons = [
        { text: "🌊 View K2-18b", action: "view-3d", planetId: "K2-18 b" },
        { text: "🌟 TRAPPIST-1 System", action: "view-3d", planetId: "TRAPPIST-1 e" },
        { text: "🔬 All Biosignature Candidates", action: "filter-biosignatures" }
      ];
    } else if (messageText.includes('size') || messageText.includes('big') || messageText.includes('large') || messageText.includes('small')) {
      aiResponse = "📏 **Exoplanet sizes** vary dramatically - from smaller than Mercury to larger than Jupiter!\n\n**Size Categories:**\n• **Earth-sized** (0.8-1.25× Earth radius)\n• **Super-Earths** (1.25-2× Earth radius)\n• **Mini-Neptunes** (2-4× Earth radius)\n• **Gas Giants** (4+ × Earth radius)\n\n**Size Records:**\n• **Smallest:** Kepler-37b (smaller than Mercury)\n• **Largest:** HAT-P-67b (larger than Jupiter)\n• **Most Earth-like:** Kepler-452b\n\nWant to compare planet sizes visually?";
      actionButtons = [
        { text: "🌍 Earth-sized Planets", action: "filter-earth-size" },
        { text: "🌊 Super-Earths", action: "filter-super-earths" },
        { text: "🪐 Gas Giants", action: "filter-gas-giants" },
        { text: "📊 Size Comparison Tool", action: "compare-planets" }
      ];
    } else {
      // For general questions, provide a helpful response with exploration options
      aiResponse = "🌟 I'm your **ExoArchive AI Assistant**! I can help you explore the fascinating world of exoplanets.\n\n**Popular topics to explore:**\n• 🌍 Habitable worlds that could support life\n• 🔥 Extreme planets with unusual conditions\n• 📏 Planet sizes and comparisons\n• 🔭 Recent discoveries and missions\n• 👽 The search for extraterrestrial life\n\n**Or try asking:**\n• \"Show me the closest exoplanet\"\n• \"Which planets might have life?\"\n• \"Compare Jupiter-sized planets\"\n• \"What's the hottest planet discovered?\"\n\nWhat would you like to discover today?";
      actionButtons = [
        { text: "🌍 Habitable Worlds", action: "explore-habitable" },
        { text: "🔥 Extreme Planets", action: "filter-extreme" },
        { text: "🆕 Recent Discoveries", action: "filter-recent" },
        { text: "📊 Compare Planets", action: "compare-planets" }
      ];
    }

    // Create AI response message
    let assistantMessage;
    try {
      assistantMessage = await prisma.chatMessage.create({
        data: {
          sessionId,
          content: aiResponse,
          sender: 'assistant'
        }
      });
    } catch (dbError) {
      console.warn('Failed to save AI response to DB:', dbError);
      // Create a mock AI message for response
      assistantMessage = {
        id: `ai_${Date.now()}`,
        sessionId,
        content: aiResponse,
        sender: 'assistant',
        createdAt: new Date(),
        messageType: 'text',
        actionButtons
      };
    }

    return res.json({
      success: true,
      data: {
        userMessage,
        assistantMessage
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/chat/sessions/:sessionId/messages - Get chat history
router.get('/sessions/:sessionId/messages', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/chat/quick-responses - Get quick response suggestions
router.get('/quick-responses', async (_: Request, res: Response) => {
  try {
    const quickResponses = [
      { id: 'habitable', text: 'Tell me about habitable exoplanets' },
      { id: 'closest', text: 'What is the closest exoplanet to Earth?' },
      { id: 'hottest', text: 'Show me the hottest planet' },
      { id: 'compare', text: 'Compare planet sizes' },
      { id: 'discovery', text: 'How are exoplanets discovered?' }
    ];

    return res.json({
      success: true,
      data: quickResponses
    });
  } catch (error) {
    console.error('Error fetching quick responses:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
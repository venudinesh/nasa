import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  messageType: string;
  planetId?: string;
  createdAt: Date;
}

interface Planet {
  id: string;
  pl_name: string;
  hostname: string;
  sy_dist?: number | null;
  pl_rade?: number | null;
  pl_bmasse?: number | null;
  pl_orbper?: number | null;
  pl_insol?: number | null;
  pl_eqt?: number | null;
  discoverymethod: string;
  discoveryyear: number;
  st_spectype?: string | null;
  st_teff?: number | null;
  image?: string | null;
  special?: string | null;
  classification?: string | null;
  summary?: string | null;
}

interface ChatbotResponse {
  content: string;
  type: string;
  planetId?: string;
  metadata?: any;
  suggestions?: string[];
}

export class ChatbotService {
  private openai: OpenAI | null = null;
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async generateResponse(message: string, chatHistory: ChatMessage[]): Promise<ChatbotResponse> {
    // Analyze message intent
    const intent = this.analyzeIntent(message);
    
    switch (intent.type) {
      case 'planet-search':
        return await this.handlePlanetSearch(message, intent.entities);
      case 'planet-comparison':
        return await this.handlePlanetComparison(message, intent.entities);
      case 'website-help':
        return this.handleWebsiteHelp(message);
      case 'general-astronomy':
        return await this.handleAstronomyQuestion(message, chatHistory);
      default:
        return await this.handleGeneralChat(message, chatHistory);
    }
  }

  private analyzeIntent(message: string): { type: string; entities: any } {
    const lowerMessage = message.toLowerCase();
    
    // Planet search patterns
    if (lowerMessage.match(/(find|search|show|tell me about) .*(planet|exoplanet)/)) {
      return { type: 'planet-search', entities: this.extractPlanetNames(message) };
    }
    
    // Comparison patterns
    if (lowerMessage.match(/(compare|vs|versus|difference|similar)/)) {
      return { type: 'planet-comparison', entities: this.extractPlanetNames(message) };
    }
    
    // Website help patterns
    if (lowerMessage.match(/(how|what|help|guide|explain|features|work)/)) {
      return { type: 'website-help', entities: {} };
    }
    
    // Astronomy questions
    if (lowerMessage.match(/(habitable|temperature|orbit|discovery|star|galaxy|universe)/)) {
      return { type: 'general-astronomy', entities: {} };
    }
    
    return { type: 'general-chat', entities: {} };
  }

  private extractPlanetNames(message: string): string[] {
    const knownPlanets = [
      'kepler-186f', 'proxima centauri b', 'trappist-1e', 'toi-715 b',
      'hd 40307g', '55 cancri e', 'wasp-12b', 'gliese 667cc',
      'k2-18b', 'gj 1002b', 'kelt-9 b', 'psr b1620-26 b'
    ];
    
    const foundPlanets: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    for (const planet of knownPlanets) {
      if (lowerMessage.includes(planet.toLowerCase())) {
        foundPlanets.push(planet);
      }
    }
    
    return foundPlanets;
  }

  async handlePlanetSearch(message: string, planetNames: string[]): Promise<ChatbotResponse> {
    if (planetNames.length > 0) {
      // Search for specific planets
      const planets = await this.prisma.planet.findMany({
        where: {
          pl_name: {
            in: planetNames
          }
        },
        take: 5
      });

      if (planets.length > 0) {
        const planetList = planets.map(p => `**${p.pl_name}** - ${p.summary || this.generatePlanetSummary(p)}`).join('\\n\\n');
        
        return {
          content: `Here are the planets I found:\\n\\n${planetList}\\n\\nWould you like to know more about any specific planet?`,
          type: 'planet_info',
          metadata: { planets: planets.map(p => p.id) },
          suggestions: planets.map(p => `Tell me more about ${p.pl_name}`)
        };
      }
    }

    // General planet search
    const searchTerms = this.extractSearchTerms(message);
    const planets = await this.searchPlanets(searchTerms);
    
    if (planets.length === 0) {
      return {
        content: "I couldn't find any planets matching your search. Try asking about specific characteristics like 'hot planets' or 'habitable worlds'.",
        type: 'text',
        suggestions: [
          'Show me the hottest planets',
          'Find potentially habitable planets',
          'What are the largest exoplanets?'
        ]
      };
    }

    const planetList = planets.slice(0, 3).map(p => 
      `**${p.pl_name}** - ${this.generatePlanetSummary(p)}`
    ).join('\\n\\n');

    return {
      content: `Here are some planets that match your search:\\n\\n${planetList}\\n\\nWould you like to explore any of these in detail?`,
      type: 'planet_info',
      metadata: { planets: planets.map(p => p.id) },
      suggestions: planets.slice(0, 3).map(p => `Learn about ${p.pl_name}`)
    };
  }

  async handlePlanetComparison(message: string, planetNames: string[]): Promise<ChatbotResponse> {
    void message;
    if (planetNames.length < 2) {
      return {
        content: "To compare planets, please mention at least two planet names. For example: 'Compare Kepler-186f and Proxima Centauri b'",
        type: 'text',
        suggestions: [
          'Compare Earth-like planets',
          'Compare Kepler-186f and Proxima Centauri b',
          'Show me planet size comparisons'
        ]
      };
    }

    const planets = await this.prisma.planet.findMany({
      where: {
        pl_name: {
          in: planetNames
        }
      }
    });
    if (planets.length < 2) {
      return {
        content: "I need at least two valid planet names to make a comparison. Please try again with known exoplanet names.",
        type: 'text'
      };
    }

    const comparison = this.generateComparison(planets);
    
    return {
      content: comparison,
      type: 'comparison',
      metadata: { planets: planets.map(p => p.id) },
      suggestions: [
        'Tell me more about the differences',
        'Which one is more Earth-like?',
        'Compare their host stars'
      ]
    };
  }

  handleWebsiteHelp(message: string): ChatbotResponse {
    const helpTopics = {
      'features': `🌟 **Exoplanet Explorer Features:**

• **3D Planet Visualization**: Interactive 3D models of exoplanets with realistic textures
• **Planet Database**: Comprehensive data on 12+ confirmed exoplanets
• **Smart Filters**: Find planets by temperature, size, habitability, and more
• **Planet Comparison**: Side-by-side analysis of different worlds
• **Educational Content**: Learn about discovery methods and planetary science
• **AI Chatbot**: Get instant answers about planets and astronomy (that's me!)

What would you like to explore first?`,

      'navigation': `🧭 **How to Navigate:**

• Browse planets in the main gallery
• Click on any planet card for detailed information
• Use the search bar to find specific planets
• Apply filters to narrow down results
• Click the 3D model to interact with planets
• Use this chat to ask questions anytime!`,

      'default': `👋 **Welcome to Exoplanet Explorer!**

This interactive website lets you explore confirmed exoplanets with:
• Stunning 3D visualizations
• Scientific data and facts
• Interactive comparisons
• Real-time chat assistance

Try asking me:
• "Show me potentially habitable planets"
• "What's the hottest exoplanet?"
• "Compare Kepler-186f with Earth"
• "How do we discover exoplanets?"

What would you like to learn about?`
    };

    const topic = message.toLowerCase().includes('feature') ? 'features' :
                  message.toLowerCase().includes('navigate') ? 'navigation' : 'default';

    return {
      content: helpTopics[topic],
      type: 'help',
      suggestions: [
        'Show me potentially habitable planets',
        'What are the website features?',
        'How do I compare planets?',
        'Tell me about exoplanet discovery'
      ]
    };
  }

  async handleAstronomyQuestion(message: string, chatHistory: ChatMessage[]): Promise<ChatbotResponse> {
    // Use AI if available, otherwise use predefined responses
    if (this.openai) {
      return await this.generateAIResponse(message, chatHistory);
    }

    // Fallback responses for common astronomy questions
    const responses = {
      habitable: `🌍 **Potentially Habitable Exoplanets:**

Planets in the "Goldilocks Zone" where liquid water could exist:
• **Kepler-186f**: First Earth-size planet in habitable zone
• **Proxima Centauri b**: Closest potentially habitable world
• **TRAPPIST-1e**: Part of a 7-planet system with multiple habitable candidates

These planets have temperatures that could allow liquid water, but habitability depends on many factors like atmosphere and magnetic fields.`,

      discovery: `🔭 **How We Discover Exoplanets:**

• **Transit Method**: Detecting dimming when planets pass in front of stars
• **Radial Velocity**: Measuring stellar wobble caused by orbiting planets
• **Direct Imaging**: Actually photographing distant planets (very rare)
• **Gravitational Lensing**: Using gravity to magnify distant worlds

Most exoplanets are found using the transit method by space telescopes like Kepler and TESS!`
    };

    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('habitable')) {
      return { content: responses.habitable, type: 'text' };
    }
    if (lowerMessage.includes('discover') || lowerMessage.includes('find')) {
      return { content: responses.discovery, type: 'text' };
    }

    return {
      content: "That's a great astronomy question! I'd love to help you explore our exoplanet database to find answers. Try asking about specific planets or use our search features.",
      type: 'text',
      suggestions: [
        'Show me planet discovery methods',
        'Find the most recently discovered planets',
        'What makes a planet habitable?'
      ]
    };
  }

  async handleGeneralChat(message: string, _chatHistory: ChatMessage[]): Promise<ChatbotResponse> {
    // Simple conversational responses
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon'];
    const thanks = ['thank', 'thanks', 'appreciate'];
    
    const lowerMessage = message.toLowerCase();
    
    if (greetings.some(greeting => lowerMessage.includes(greeting))) {
      return {
        content: "Hello! 👋 I'm your exoplanet exploration assistant. I can help you discover amazing worlds beyond our solar system. What would you like to explore today?",
        type: 'text',
        suggestions: [
          'Show me potentially habitable planets',
          'What are the most extreme exoplanets?',
          'How does this website work?'
        ]
      };
    }
    
    if (thanks.some(thank => lowerMessage.includes(thank))) {
      return {
        content: "You're welcome! I'm here to help you explore the cosmos. Feel free to ask me anything about exoplanets! 🌌",
        type: 'text'
      };
    }

    return {
      content: "I'm here to help you explore exoplanets! Try asking me about specific planets, planetary characteristics, or how to use this website.",
      type: 'text',
      suggestions: [
        'Show me the hottest planets',
        'Find Earth-like exoplanets',
        'How do we detect exoplanets?'
      ]
    };
  }

  private extractSearchTerms(message: string): string[] {
    const terms = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hot')) terms.push('hot');
    if (lowerMessage.includes('cold')) terms.push('cold');
    if (lowerMessage.includes('large') || lowerMessage.includes('big')) terms.push('large');
    if (lowerMessage.includes('small')) terms.push('small');
    if (lowerMessage.includes('habitable')) terms.push('habitable');
    if (lowerMessage.includes('recent')) terms.push('recent');
    
    return terms;
  }

  private async searchPlanets(terms: string[]): Promise<Planet[]> {
    let where: any = {};
    
    if (terms.includes('hot')) {
      where.pl_eqt = { gte: 1000 };
    }
    if (terms.includes('cold')) {
      where.pl_eqt = { lte: 200 };
    }
    if (terms.includes('large')) {
      where.pl_rade = { gte: 2 };
    }
    if (terms.includes('small')) {
      where.pl_rade = { lte: 1.5 };
    }
    if (terms.includes('habitable')) {
      where.AND = [
        { pl_eqt: { gte: 175, lte: 350 } },
        { pl_rade: { gte: 0.5, lte: 2.5 } }
      ];
    }
    if (terms.includes('recent')) {
      where.discoveryyear = { gte: 2020 };
    }
    
    return await this.prisma.planet.findMany({
      where,
      take: 10,
      orderBy: { pl_name: 'asc' }
    });
  }

  private generatePlanetSummary(planet: Planet): string {
    if (planet.summary) return planet.summary;
    
    const temp = planet.pl_eqt ? `${planet.pl_eqt}K` : 'unknown temperature';
    const size = planet.pl_rade ? `${planet.pl_rade}× Earth radius` : 'unknown size';
    const distance = planet.sy_dist ? `${planet.sy_dist} parsecs away` : 'unknown distance';
    
    return `Located ${distance}, this planet has ${temp} and is ${size}. Discovered in ${planet.discoveryyear} using ${planet.discoverymethod}.`;
  }

  private generateComparison(planets: Planet[]): string {
    const [planet1, planet2] = planets;
    
    let comparison = `**Comparing ${planet1.pl_name} and ${planet2.pl_name}:**\\n\\n`;
    
    // Temperature comparison
    if (planet1.pl_eqt && planet2.pl_eqt) {
      const hotter = planet1.pl_eqt > planet2.pl_eqt ? planet1 : planet2;
      const tempDiff = Math.abs(planet1.pl_eqt - planet2.pl_eqt);
      comparison += `🌡️ **Temperature**: ${hotter.pl_name} is ${tempDiff}K hotter\\n`;
    }
    
    // Size comparison
    if (planet1.pl_rade && planet2.pl_rade) {
      const larger = planet1.pl_rade > planet2.pl_rade ? planet1 : planet2;
      const sizeDiff = (Math.max(planet1.pl_rade, planet2.pl_rade) / Math.min(planet1.pl_rade, planet2.pl_rade)).toFixed(1);
      comparison += `📏 **Size**: ${larger.pl_name} is ${sizeDiff}× larger\\n`;
    }
    
    // Distance comparison
    if (planet1.sy_dist && planet2.sy_dist) {
      const closer = planet1.sy_dist < planet2.sy_dist ? planet1 : planet2;
      comparison += `🚀 **Distance**: ${closer.pl_name} is closer to Earth\\n`;
    }
    
    // Discovery comparison
    comparison += `🔭 **Discovery**: ${planet1.pl_name} (${planet1.discoveryyear}) vs ${planet2.pl_name} (${planet2.discoveryyear})`;
    
    return comparison;
  }

  async generatePlanetSpecificResponse(planet: Planet, _question: string): Promise<ChatbotResponse> {
    const planetInfo = `
**${planet.pl_name}** ${planet.classification ? `(${planet.classification})` : ''}

${planet.summary || this.generatePlanetSummary(planet)}

**Key Facts:**
• Host Star: ${planet.hostname} ${planet.st_spectype ? `(${planet.st_spectype})` : ''}
• Temperature: ${planet.pl_eqt ? `${planet.pl_eqt}K` : 'Unknown'}
• Size: ${planet.pl_rade ? `${planet.pl_rade}× Earth radius` : 'Unknown'}
• Distance: ${planet.sy_dist ? `${planet.sy_dist} parsecs` : 'Unknown'}
• Discovered: ${planet.discoveryyear} via ${planet.discoverymethod}

${planet.special ? `**Special Notes:** ${planet.special}` : ''}
    `;

    return {
      content: planetInfo,
      type: 'planet_info',
      planetId: planet.id,
      metadata: { planet: planet.id },
      suggestions: [
        `Compare ${planet.pl_name} with Earth`,
        `How was ${planet.pl_name} discovered?`,
        'Show me similar planets'
      ]
    };
  }

  private async generateAIResponse(message: string, chatHistory: ChatMessage[]): Promise<ChatbotResponse> {
    try {
      const context = chatHistory.slice(-5).map(msg => 
        `${msg.sender}: ${msg.content}`
      ).join('\\n');

      const response = await this.openai!.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert exoplanet assistant for an interactive 3D exoplanet explorer website. You help users learn about exoplanets, astronomy, and website features. Be enthusiastic, educational, and concise. Include relevant emojis and suggest follow-up questions.`
          },
          {
            role: "user",
            content: `Context: ${context}\\n\\nUser: ${message}`
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return {
        content: response.choices[0]?.message?.content || "I'm having trouble processing that question. Please try asking about specific exoplanets or website features!",
        type: 'text'
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      return await this.handleGeneralChat(message, chatHistory);
    }
  }
}
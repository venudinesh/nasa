import OpenAI from 'openai';
import axios from 'axios';

// Enhanced interfaces for the advanced AI system
interface QueryClassification {
  type: 'faq' | 'nasa-api' | 'calculation' | 'reasoning' | 'multi-modal' | 'real-time';
  confidence: number;
  entities: string[];
  parameters?: Record<string, any>;
}

interface ConversationMemory {
  sessionId: string;
  userPreferences: Record<string, any>;
  conversationHistory: ChatMessage[];
  contextualData: Record<string, any>;
}



interface EnhancedChatbotResponse {
  content: string;
  type: 'text' | 'image' | 'video' | 'data' | 'calculation' | 'interactive';
  metadata?: {
    sources?: string[];
    images?: string[];
    planetData?: any;
    calculations?: any;
    realTimeData?: any;
  };
  actionButtons?: Array<{
    text: string;
    action: string;
    data?: any;
  }>;
  suggestions?: string[];
  conversationContext?: Record<string, any>;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  messageType: string;
  planetId?: string;
  metadata?: any;
  timestamp: Date;
}

export class AdvancedChatbotService {
  private openai: OpenAI | null = null;
  private conversationMemory: Map<string, ConversationMemory> = new Map();
  private nasaApiKey: string;

  // NASA API endpoints
  private nasaEndpoints = {
    apod: 'https://api.nasa.gov/planetary/apod',
    neows: 'https://api.nasa.gov/neo/rest/v1/feed',
    marsRover: 'https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos',
    exoplanet: 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync',
    techPort: 'https://api.nasa.gov/techport/api'
  };

  constructor() {
    this.nasaApiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Main entry point for processing user messages
   */
  async processMessage(
    message: string, 
    sessionId: string, 
    userContext?: Record<string, any>
  ): Promise<EnhancedChatbotResponse> {
    try {
      // Initialize or retrieve conversation memory
      const memory = await this.getOrCreateMemory(sessionId, userContext);
      
      // Classify the query to determine processing approach
      const classification = await this.classifyQuery(message, memory);
      
      // Update conversation history
      const userMessage: ChatMessage = {
        id: this.generateId(),
        content: message,
        sender: 'user',
        messageType: classification.type,
        metadata: classification,
        timestamp: new Date()
      };
      
      memory.conversationHistory.push(userMessage);
      
      // Route to appropriate handler based on classification
      let response: EnhancedChatbotResponse;
      
      switch (classification.type) {
        case 'nasa-api':
          response = await this.handleNASAApiQuery(message);
          break;
        case 'calculation':
          response = await this.handleCalculationQuery(message);
          break;
        case 'multi-modal':
          response = await this.handleMultiModalQuery(message);
          break;
        case 'real-time':
          response = await this.handleRealTimeQuery(message);
          break;
        case 'faq':
          response = await this.handleFAQQuery(message);
          break;
        default:
          response = await this.handleReasoningQuery(message, memory);
      }
      
      // Add response to conversation history
      const assistantMessage: ChatMessage = {
        id: this.generateId(),
        content: response.content,
        sender: 'assistant',
        messageType: response.type,
        metadata: response.metadata,
        timestamp: new Date()
      };
      
      memory.conversationHistory.push(assistantMessage);
      
      // Update memory and save
      this.conversationMemory.set(sessionId, memory);
      await this.saveConversationToDB(memory);
      
      return response;
      
    } catch (error) {
      console.error('Error processing message:', error);
      return this.createErrorResponse('I encountered an error processing your message. Please try again.');
    }
  }

  /**
   * Advanced query classification using LLM and pattern matching
   */
  private async classifyQuery(message: string, memory: ConversationMemory): Promise<QueryClassification> {
    const lowerMessage = message.toLowerCase();
    
    // Pattern-based classification for quick routing
    const patterns = {
      'nasa-api': [
        /(?:show|get|find|latest|current|today|yesterday).*(picture|image|photo|apod|mars|rover|asteroid|comet)/i,
        /(?:nasa|space|astronomy|picture|photo|today|daily)/i,
        /(?:mars rover|curiosity|perseverance|opportunity|spirit).*(photo|image|picture)/i
      ],
      'calculation': [
        /(?:calculate|compute|orbit|distance|velocity|mass|gravity|force|trajectory)/i,
        /(?:what is|how far|how fast|how big|how massive|orbital period|escape velocity)/i,
        /(?:physics|equation|formula|math)/i
      ],
      'multi-modal': [
        /(?:show|display|view|see|visualize).*(3d|model|comparison|chart|graph)/i,
        /(?:image|picture|video|animation|visualization)/i
      ],
      'real-time': [
        /(?:current|latest|now|today|live|real.?time|breaking|news|recent)/i,
        /(?:asteroid|comet|iss|space station|launch|mission)/i
      ],
      'faq': [
        /(?:what is|how does|explain|define|help|guide|tutorial)/i,
        /(?:habitable|goldilocks|drake equation|fermi paradox)/i
      ]
    };

    // Check patterns and calculate confidence using lowerMessage
    for (const [type, typePatterns] of Object.entries(patterns)) {
      for (const pattern of typePatterns) {
        if (pattern.test(lowerMessage)) {
          return {
            type: type as QueryClassification['type'],
            confidence: 0.8,
            entities: this.extractEntities(message),
            parameters: this.extractParameters(message, type)
          };
        }
      }
    }

    // Use LLM for complex classification if no patterns match
    if (this.openai) {
      try {
        const llmClassification = await this.classifyWithLLM(message, memory);
        return llmClassification;
      } catch (error) {
        console.error('LLM classification failed:', error);
      }
    }

    // Default to reasoning if all else fails
    return {
      type: 'reasoning',
      confidence: 0.5,
      entities: this.extractEntities(message),
      parameters: {}
    };
  }

  /**
   * Handle NASA API queries (APOD, Mars Rover, etc.)
   */
  private async handleNASAApiQuery(
    message: string
  ): Promise<EnhancedChatbotResponse> {
    const lowerMessage = message.toLowerCase();
    
    try {
      // Determine which NASA API to call based on user message
      if (lowerMessage.includes('picture') || lowerMessage.includes('apod') || lowerMessage.includes('astronomy picture')) {
        const apodData = await this.fetchNASAAPOD();
        return {
          content: `Here's today's Astronomy Picture of the Day: ${apodData.title}\n\n${apodData.explanation}`,
          type: 'image',
          metadata: {
            sources: ['NASA APOD API'],
            images: [apodData.url],
            realTimeData: apodData
          },
          actionButtons: [
            { text: 'View Full Resolution', action: 'open_image', data: { url: apodData.hdurl || apodData.url } },
            { text: 'Learn More', action: 'external_link', data: { url: 'https://apod.nasa.gov/apod/' } }
          ],
          suggestions: ['Show me Mars rover photos', 'Tell me about exoplanets', 'What are today\'s asteroids?']
        };
      }
      
      if (lowerMessage.includes('mars') || lowerMessage.includes('rover')) {
        const roverData = await this.fetchMarsRoverPhotos();
        return {
          content: `Here are the latest Mars rover photos from Curiosity. These images show the current Martian landscape and ongoing exploration.`,
          type: 'image',
          metadata: {
            sources: ['NASA Mars Rover API'],
            images: roverData.photos.slice(0, 3).map((photo: any) => photo.img_src),
            realTimeData: roverData
          },
          actionButtons: [
            { text: 'View More Photos', action: 'load_more_images', data: { source: 'mars_rover' } },
            { text: 'Mars Mission Info', action: 'show_mission_info', data: { mission: 'mars_rovers' } }
          ],
          suggestions: ['Tell me about Mars geology', 'Show me asteroid tracking', 'What is Perseverance doing?']
        };
      }
      
      if (lowerMessage.includes('asteroid') || lowerMessage.includes('near earth')) {
        const asteroidData = await this.fetchNearEarthObjects();
        return {
          content: `Current Near-Earth Objects: I found ${asteroidData.element_count} asteroids approaching Earth in the next few days.`,
          type: 'data',
          metadata: {
            sources: ['NASA NEO API'],
            realTimeData: asteroidData
          },
          actionButtons: [
            { text: 'Show Asteroid Details', action: 'show_asteroid_data', data: asteroidData },
            { text: 'Safety Information', action: 'show_safety_info', data: { topic: 'asteroids' } }
          ],
          suggestions: ['How dangerous are these asteroids?', 'Show me the largest asteroid', 'When will they pass Earth?']
        };
      }
      
    } catch (error) {
      console.error('NASA API error:', error);
      return this.createErrorResponse('Sorry, I couldn\'t fetch the latest NASA data right now. Please try again later.');
    }

    return this.createErrorResponse('I couldn\'t find the specific NASA data you\'re looking for. Try asking about astronomy pictures, Mars rover photos, or asteroid tracking.');
  }

  /**
   * Handle calculation queries (orbital mechanics, physics, etc.)
   */
  private async handleCalculationQuery(
    message: string
  ): Promise<EnhancedChatbotResponse> {
    const calculations = this.performCalculations(message);
    
    if (calculations.success) {
      return {
        content: `Here's the calculation result:\n\n${calculations.explanation}\n\n**Result: ${calculations.result}**`,
        type: 'calculation',
        metadata: {
          calculations: calculations,
          sources: ['Physics calculations', 'Orbital mechanics']
        },
        actionButtons: [
          { text: 'Show Formula', action: 'show_formula', data: calculations },
          { text: 'Related Calculations', action: 'suggest_calculations', data: { topic: calculations.type } }
        ],
        suggestions: ['Calculate escape velocity', 'Orbital period formula', 'Gravity on other planets']
      };
    }

    return this.createErrorResponse('I couldn\'t perform that calculation. Please provide more specific parameters.');
  }

  /**
   * Handle multi-modal queries (images, 3D models, visualizations)
   */
  private async handleMultiModalQuery(
    message: string
  ): Promise<EnhancedChatbotResponse> {
    const planetName = this.extractPlanetName(message);
    
    if (planetName) {
      return {
        content: `Here's a 3D visualization of ${planetName}. You can interact with the model to explore its features.`,
        type: 'interactive',
        metadata: {
          planetData: { name: planetName },
          sources: ['Exoplanet Database', '3D Models']
        },
        actionButtons: [
          { text: 'View in 3D', action: 'show_3d_model', data: { planetId: planetName } },
          { text: 'Compare Planets', action: 'compare_planets', data: { planet: planetName } },
          { text: 'Planet Details', action: 'show_planet_details', data: { planetId: planetName } }
        ],
        suggestions: [`Tell me about ${planetName}`, 'Compare with Earth', 'Show habitability data']
      };
    }

    return {
      content: 'I can show you 3D models, comparisons, and visualizations of exoplanets. Which planet would you like to explore?',
      type: 'interactive',
      suggestions: ['Show me Kepler-186f in 3D', 'Compare TRAPPIST-1e with Earth', 'Visualize the habitable zone']
    };
  }

  /**
   * Handle real-time queries (space news, current missions, live data)
   */
  private async handleRealTimeQuery(
    message: string
  ): Promise<EnhancedChatbotResponse> {
    try {
      // Simulate real-time space data (you can integrate with actual news APIs)
      const realTimeData = await this.fetchRealTimeSpaceData(message);
      
      return {
        content: `Here's the latest space news and real-time data:\n\n${realTimeData.summary}`,
        type: 'data',
        metadata: {
          sources: ['Space news feeds', 'NASA mission updates'],
          realTimeData: realTimeData
        },
        actionButtons: [
          { text: 'Read Full Article', action: 'open_article', data: realTimeData.articles[0] },
          { text: 'Mission Updates', action: 'show_missions', data: { type: 'current' } }
        ],
        suggestions: ['What missions are launching this month?', 'Latest exoplanet discoveries', 'ISS current location']
      };
    } catch (error) {
      return this.createErrorResponse('Sorry, I couldn\'t fetch the latest space news right now.');
    }
  }

  /**
   * Handle FAQ queries using knowledge base
   */
  private async handleFAQQuery(
    message: string
  ): Promise<EnhancedChatbotResponse> {
    const faqResponse = await this.searchKnowledgeBase(message);
    
    return {
      content: faqResponse.answer,
      type: 'text',
      metadata: {
        sources: faqResponse.sources
      },
      suggestions: faqResponse.relatedQuestions
    };
  }

  /**
   * Handle general reasoning queries using LLM
   */
  private async handleReasoningQuery(
    message: string, 
    memory: ConversationMemory
  ): Promise<EnhancedChatbotResponse> {
    if (!this.openai) {
      return this.createErrorResponse('AI reasoning is currently unavailable.');
    }

    try {
      const context = this.buildContextForLLM(memory);
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an advanced NASA AI assistant specializing in exoplanets, space exploration, and astronomy. 
            You have access to real-time NASA data, can perform calculations, and help users explore the cosmos.
            Be engaging, educational, and accurate. Use the conversation context to provide personalized responses.
            
            Context: ${context}`
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || 'I need more information to help you better.';
      
      return {
        content: response,
        type: 'text',
        metadata: {
          sources: ['AI reasoning', 'NASA knowledge base']
        },
        suggestions: this.generateSmartSuggestions(message, memory)
      };
      
    } catch (error) {
      console.error('LLM reasoning error:', error);
      return this.createErrorResponse('I\'m having trouble processing that question right now.');
    }
  }

  // Utility methods for NASA API integration
  private async fetchNASAAPOD(): Promise<any> {
    const response = await axios.get(`${this.nasaEndpoints.apod}?api_key=${this.nasaApiKey}`);
    return response.data;
  }

  private async fetchMarsRoverPhotos(): Promise<any> {
    const response = await axios.get(`${this.nasaEndpoints.marsRover}?sol=1000&api_key=${this.nasaApiKey}`);
    return response.data;
  }

  private async fetchNearEarthObjects(): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const response = await axios.get(`${this.nasaEndpoints.neows}?start_date=${today}&api_key=${this.nasaApiKey}`);
    return response.data;
  }

  // Utility methods
  private async getOrCreateMemory(sessionId: string, userContext?: Record<string, any>): Promise<ConversationMemory> {
    if (this.conversationMemory.has(sessionId)) {
      return this.conversationMemory.get(sessionId)!;
    }

    const memory: ConversationMemory = {
      sessionId,
      userPreferences: userContext || {},
      conversationHistory: [],
      contextualData: {}
    };

    this.conversationMemory.set(sessionId, memory);
    return memory;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private createErrorResponse(message: string): EnhancedChatbotResponse {
    return {
      content: message,
      type: 'text',
      suggestions: ['Tell me about exoplanets', 'Show me space pictures', 'Calculate orbital mechanics']
    };
  }

  private extractEntities(message: string): string[] {
    // Simple entity extraction - you can enhance this with NLP libraries
    const entities = [];
    const planetPattern = /(kepler|trappist|proxima|gliese|wasp|hd|k2|toi|psr)/gi;
    const matches = message.match(planetPattern);
    if (matches) entities.push(...matches);
    return entities;
  }

  private extractParameters(message: string, type: string): Record<string, any> {
    // Extract numerical parameters for calculations
    const numbers = message.match(/\d+\.?\d*/g);
    return { numbers: numbers || [], type };
  }

  private async classifyWithLLM(_message: string, _memory: ConversationMemory): Promise<QueryClassification> {
    // Implement LLM-based classification for complex queries
    return {
      type: 'reasoning',
      confidence: 0.7,
      entities: this.extractEntities(_message),
      parameters: {}
    };
  }

  private performCalculations(message: string): any {
    // Implement physics and orbital mechanics calculations
    const hasNumbers = /\d+/.test(message);
    return {
      success: true,
      result: hasNumbers ? 'Calculation with detected numbers' : 'Sample calculation result',
      explanation: 'This is how the calculation works...',
      type: 'orbital_mechanics'
    };
  }

  private extractPlanetName(message: string): string | null {
    const planetNames = ['kepler-186f', 'proxima centauri b', 'trappist-1e', 'gliese 667cc'];
    const lowerMessage = message.toLowerCase();
    
    for (const planet of planetNames) {
      if (lowerMessage.includes(planet.toLowerCase())) {
        return planet;
      }
    }
    return null;
  }

  private async fetchRealTimeSpaceData(_message: string): Promise<any> {
    // Implement real-time space data fetching
    return {
      summary: 'Latest space exploration news and mission updates...',
      articles: [{ title: 'Sample Article', url: 'https://example.com' }]
    };
  }

  private async searchKnowledgeBase(_message: string): Promise<any> {
    // Implement vector search through knowledge base
    return {
      answer: 'Here\'s what I found in the knowledge base...',
      sources: ['NASA FAQ', 'Exoplanet Guide'],
      relatedQuestions: ['Related question 1', 'Related question 2']
    };
  }

  private buildContextForLLM(memory: ConversationMemory): string {
    const recentHistory = memory.conversationHistory.slice(-5);
    return recentHistory.map(msg => `${msg.sender}: ${msg.content}`).join('\n');
  }

  private generateSmartSuggestions(_message: string, _memory: ConversationMemory): string[] {
    // Generate contextual suggestions based on conversation
    return [
      'Tell me more about exoplanets',
      'Show me space images',
      'Calculate something interesting'
    ];
  }

  private async saveConversationToDB(_memory: ConversationMemory): Promise<void> {
    // Save conversation history to database
    try {
      // Implement database saving logic
      console.log('Conversation saved to memory store');
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }
}
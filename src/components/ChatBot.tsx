import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Bot, User, Loader2 } from 'lucide-react';
import ChatbotIcon from './icons/ChatbotIcon';

interface Planet {
  pl_name: string;
  pl_rade?: number;
  pl_bmasse?: number;
  pl_orbper?: number;
  pl_eqt?: number;
  st_dist?: number;
  disc_year?: number;
  habitability_score?: number;
  [key: string]: any;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  messageType?: string;
  planetId?: string;
  metadata?: any;
  actionButtons?: Array<{
    text: string;
    action: string;
    planetId?: string;
  }>;
}

interface QuickResponse {
  id: string;
  text: string;
  query?: string;
  action?: string;
}

interface ChatBotProps {
  planets?: Planet[];
  onPlanetSelect?: (planet: Planet) => void;
  onNavigateToView?: (viewType: string, planetId?: string) => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ 
  planets = [], 
  onPlanetSelect, 
  onNavigateToView 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [quickResponses, setQuickResponses] = useState<QuickResponse[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Allow configuration via Vite env or fallback to localhost
  const API_BASE = ((import.meta as any).env && (import.meta as any).env.VITE_API_BASE) || 'http://localhost:3001/api';

  // Initialize chat session
  useEffect(() => {
    initializeChat();
    loadQuickResponses();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Announce new assistant messages for screen readers
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.sender === 'assistant') {
      const live = document.getElementById('chatbot-live-region');
      if (live) {
        live.textContent = last.content || 'New message from assistant';
      }
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Listen for a global event to open the chat (used by App keyboard shortcut)
  useEffect(() => {
    const onOpen = () => setIsOpen(true);
    window.addEventListener('exo-open-chat', onOpen as EventListener);
    return () => window.removeEventListener('exo-open-chat', onOpen as EventListener);
  }, []);

  // Close on Escape when chat is open for accessibility
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    try {
      // Generate a simple session ID for advanced chat
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      // Add welcome message
      setMessages([{
        id: 'welcome',
        content: `🌟 **Welcome to NASA Exoplanet Assistant!**

I'm your advanced AI assistant powered by NASA data, ready to help you explore amazing worlds beyond our solar system! 

I can help you with:
- 🔍 **Discover Exoplanets** - Find specific planets and their characteristics
- 📊 **Compare Worlds** - Analyze planet similarities and differences
- 🌡️ **Scientific Details** - Learn about habitability, composition, and discovery methods
- 🚀 **3D Exploration** - Navigate to interactive planet views
- ❓ **Advanced Q&A** - Ask me anything about space like ChatGPT!

Try asking: "Show me potentially habitable planets" or "Tell me about Kepler-452b"

What would you like to explore today?`,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        messageType: 'welcome'
      }]);

    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setMessages([{
        id: 'error',
        content: "Hello! I'm having trouble connecting to my systems, but I can still help you explore exoplanets. What would you like to know?",
        sender: 'assistant',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const loadQuickResponses = async () => {
    try {
      // add a timeout to avoid hanging if API is unreachable
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${API_BASE}/advanced-chat/suggestions`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error('suggestions fetch failed');
      const { data } = await response.json();
      const quickResponses = data?.suggestions?.map((s: string, i: number) => ({ id: `quick_${i}`, text: s })) || [];
      if (quickResponses.length > 0) setQuickResponses(quickResponses);
    } catch (error) {
      console.error('Failed to load quick responses:', error);
      // Fallback quick responses
      setQuickResponses([
        { id: 'habitable', text: 'Show me potentially habitable planets' },
        { id: 'hottest', text: 'What are the hottest exoplanets?' },
        { id: 'nearest', text: 'Which planets are closest to Earth?' },
        { id: 'features', text: 'How does this website work?' }
      ]);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || currentMessage.trim();
    if (!text || isLoading) return;

    setCurrentMessage('');
    setIsLoading(true);
    setSuggestions([]);

    // Add user message
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content: text,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      if (!sessionId) {
        throw new Error('No active session');
      }

      // Try the advanced chat API first, fallback to mock response
      let assistantResponse;
      try {
        const response = await fetch(`${API_BASE}/advanced-chat/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message: text, userId })
        });

        const contentType = response.headers.get('content-type') || '';

        // If server returns JSON, use it normally
        if (response.ok && contentType.includes('application/json')) {
          const { data } = await response.json();
          assistantResponse = data.response || data.message || 'I received your message!';
          if (data.suggestions?.length > 0) setSuggestions(data.suggestions);
          // do not append here; append exactly once after handling streaming vs non-streaming

        } else if (response.ok && response.body) {
          // Attempt to stream plain text chunks (server-driven streaming)
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          const assistantId = `assistant_${Date.now()}`;
          // create placeholder assistant message
          const assistantMessage: ChatMessage = {
            id: assistantId,
            content: '',
            sender: 'assistant',
            timestamp: new Date().toISOString(),
            messageType: 'informational'
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsStreaming(true);

          let done = false;
          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
              const chunk = decoder.decode(value, { stream: true });
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m));
            }
          }

          setIsStreaming(false);
          // Try to set final suggestions from headers or a final JSON chunk - best-effort
        } else {
          throw new Error('Chat API returned an unexpected response');
        }
      } catch (apiError) {
        console.log('API not available or failed, using enhanced fallback responses', apiError);

        // Enhanced fallback responses based on message content
        const lowerText = text.toLowerCase();
        if (lowerText.includes('habitable') || lowerText.includes('goldilocks') || lowerText.includes('life')) {
          assistantResponse = `🌍 **Potentially Habitable Exoplanets**

Here are some of the most promising potentially habitable worlds we've discovered:

• **Kepler-452b** - "Earth's cousin" orbiting in the habitable zone of a sun-like star
• **Proxima Centauri b** - Closest potentially habitable exoplanet at 4.2 light-years away
• **TRAPPIST-1e** - One of seven Earth-sized planets, likely has the right temperature for liquid water
• **K2-18b** - Water vapor detected in its atmosphere by Hubble and James Webb telescopes
• **TOI-715 b** - Recently discovered super-Earth in the conservative habitable zone

These planets orbit at just the right distance from their stars where liquid water could exist on the surface - not too hot, not too cold, but just right!`;
          setSuggestions(['Tell me more about Kepler-452b', 'How do we detect water on exoplanets?', 'What is the habitable zone?']);
          
        } else if (lowerText.includes('kepler') && (lowerText.includes('452') || lowerText.includes('earth'))) {
          assistantResponse = `🌎 **Kepler-452b: Earth's Cousin**

Kepler-452b is one of the most Earth-like planets we've found:

**🔍 Discovery Details:**
• Discovered by NASA's Kepler Space Telescope in 2015
• Located 1,400 light-years away in the constellation Cygnus
• Orbits a sun-like star every 385 days (close to Earth's 365-day year)

**🌍 Earth-like Qualities:**
• 60% larger than Earth (a "super-Earth")
• Receives similar energy from its star as Earth does from the Sun
• Star is 6 billion years old (1.5 billion years older than our Sun)
• May have rocky composition and atmosphere

This planet represents what Earth might become as our Sun ages!`;
          setSuggestions(['View Kepler-452b in 3D', 'Compare Kepler-452b with Earth', 'What other Kepler planets are there?']);
          
        } else if (lowerText.includes('detect') || lowerText.includes('find') || lowerText.includes('discover') || lowerText.includes('method')) {
          assistantResponse = `🔭 **How We Detect Exoplanets**

Scientists use several clever methods to find distant worlds:

**1. Transit Method** (Most common)
• Watch for tiny dips in starlight when planets pass in front of their stars
• Used by Kepler, TESS, and James Webb telescopes

**2. Radial Velocity** (Doppler Method)
• Detect the "wobble" in a star's motion caused by orbiting planets
• How we found the first exoplanets in the 1990s

**3. Direct Imaging**
• Actually photograph planets (very rare and difficult)
• Only works for large, young, hot planets far from bright stars

**4. Gravitational Microlensing**
• Use gravitational effects to magnify distant stars and reveal planets

The transit method has been most successful, finding thousands of worlds!`;
          setSuggestions(['Tell me about the Kepler mission', 'What is the James Webb telescope finding?', 'Show me planet detection animations']);
          
        } else if (lowerText.includes('james webb') || lowerText.includes('jwst') || lowerText.includes('telescope') || lowerText.includes('nasa mission')) {
          assistantResponse = `🛰️ **James Webb Space Telescope & Exoplanets**

JWST is revolutionizing exoplanet science with unprecedented capabilities:

**🌟 Atmospheric Analysis:**
• Detecting water vapor, carbon dioxide, and other gases in exoplanet atmospheres
• Studying planets like K2-18b, WASP-96b, and the TRAPPIST-1 system
• Can analyze atmospheres of potentially habitable worlds

**🔬 Recent Discoveries:**
• Confirmed water vapor in K2-18b's atmosphere
• Detailed atmospheric composition of hot gas giants
• Weather patterns on distant worlds
• Studying rocky planet atmospheres for the first time

**🚀 Other NASA Missions:**
• **TESS** - Finding new planets every month
• **Kepler** - Discovered over 2,600 confirmed exoplanets
• **Hubble** - Still making discoveries after 30+ years in space

JWST can study planets up to 1,000 light-years away in detail!`;
          setSuggestions(['Latest JWST exoplanet discoveries', 'How does JWST analyze atmospheres?', 'Tell me about the TESS mission']);
          
        } else if (lowerText.includes('trappist') || lowerText.includes('seven')) {
          assistantResponse = `🌌 **TRAPPIST-1: A System of Seven Worlds**

TRAPPIST-1 is an amazing planetary system just 40 light-years away:

**🪐 The System:**
• Seven Earth-sized planets orbiting a ultra-cool dwarf star
• All seven planets could have temperatures allowing for liquid water
• Planets are very close to their star (year ranges from 1.5 to 18 Earth days)

**🌍 The Potentially Habitable Worlds:**
• **TRAPPIST-1e** - Most likely to be habitable, similar to Earth
• **TRAPPIST-1f & g** - Also in the habitable zone
• All planets likely tidally locked (one side always faces the star)

**🔬 Current Research:**
• James Webb telescope is studying their atmospheres
• Looking for signs of water, oxygen, and other biosignatures
• Could be our best chance to find life beyond Earth

This system is so close we might be able to study it for decades!`;
          setSuggestions(['Tell me more about TRAPPIST-1e', 'What does tidally locked mean?', 'Could there be life on TRAPPIST-1 planets?']);
          
        } else if (lowerText.includes('3d') || lowerText.includes('view') || lowerText.includes('explore') || lowerText.includes('model')) {
          assistantResponse = `🚀 **3D Planet Exploration**

Our interactive 3D models let you explore distant worlds like never before:

**🌍 Available Features:**
• **Realistic Planet Models** - Based on scientific data and artistic interpretation
• **Size Comparisons** - See how planets compare to Earth
• **Surface Features** - Explore potential landscapes and atmospheres
• **Orbital Mechanics** - Understand planet-star relationships

**🪐 Planets You Can Explore:**
• Kepler-452b, Proxima Centauri b, TRAPPIST-1e
• Hot Jupiters like WASP-12b and KELT-9b
• Cold worlds and super-Earths

**🎮 How to Use:**
• Click on any planet card to enter 3D view
• Rotate, zoom, and examine surface details
• Compare multiple planets side by side

Which planet would you like to explore first?`;
          setSuggestions(['Show me Kepler-452b in 3D', 'View the TRAPPIST-1 system', 'Compare planet sizes', 'Explore hot Jupiter planets']);
          
        } else if (lowerText.includes('water') || lowerText.includes('atmosphere') || lowerText.includes('oxygen')) {
          assistantResponse = `💧 **Water and Atmospheres on Exoplanets**

Detecting water and studying atmospheres is key to finding life:

**🔬 Detection Methods:**
• **Spectroscopy** - Breaking down starlight to identify chemical signatures
• **Transit Observations** - Analyzing light passing through planet atmospheres
• **James Webb Telescope** - Most powerful tool for atmospheric analysis

**💧 Water Discoveries:**
• **K2-18b** - Water vapor confirmed in atmosphere
• **WASP-96b** - Detailed water signature detected
• **HD 209458b** - First exoplanet with detected water (2019)

**🌬️ Atmospheric Clues:**
• Water vapor = potential for liquid water
• Oxygen + methane = possible biological activity
• Carbon dioxide = greenhouse effects and climate

**🔮 Future Goals:**
• Find oxygen in Earth-like planet atmospheres
• Detect biosignatures that could indicate life
• Study weather patterns on distant worlds

The search for water is really the search for life!`;
          setSuggestions(['Which planets have water vapor?', 'How do we detect oxygen on exoplanets?', 'What are biosignatures?']);
          
        } else if (lowerText.includes('closest') || lowerText.includes('nearest') || lowerText.includes('proxima')) {
          assistantResponse = `🌟 **Closest Exoplanets to Earth**

Here are our nearest planetary neighbors beyond the solar system:

**🔴 Proxima Centauri b** (4.2 light-years)
• Orbits the closest star to our Sun
• Potentially habitable rocky planet
• Receives similar energy as Earth from its red dwarf star

**🌟 Alpha Centauri system** (4.3 light-years)
• Multiple planets possibly in this triple star system
• Target for future interstellar missions like Breakthrough Starshot

**🔥 Barnard's Star b** (6 light-years)
• Super-Earth orbiting a red dwarf
• Too cold for liquid water, but fascinating world

**🌍 Wolf 359 system** (7.9 light-years)
• Recently discovered planets around this nearby red dwarf

**⏱️ Travel Time Reality:**
• With current technology: 70,000+ years to reach Proxima b
• Future technology might reduce this to decades or centuries

These nearby worlds are our best targets for detailed study!`;
          setSuggestions(['Tell me more about Proxima Centauri b', 'Could we ever travel to these planets?', 'What about Alpha Centauri?']);
          
        } else {
          // More varied default responses
          const defaultResponses = [
            `🌟 **Welcome to Exoplanet Discovery!**

I'm your NASA Exoplanet Assistant! I can help you explore thousands of confirmed worlds beyond our solar system.

**Popular Topics:**
• 🌍 Potentially habitable planets
• 🔭 How we discover exoplanets  
• 🛰️ NASA missions and telescopes
• 🌌 Fascinating planet types

What cosmic mystery would you like to explore?`,

            `🚀 **Amazing Exoplanet Facts!**

Did you know we've confirmed over 5,000 exoplanets? Here are some incredible discoveries:

• **Planets made of diamond** - Like 55 Cancri e
• **Worlds with glass rain** - Like HD 189733b  
• **Planets orbiting dead stars** - Like PSR B1620-26 b
• **Seven-planet systems** - Like TRAPPIST-1

Each discovery teaches us something new about planetary formation and the potential for life!`,

            `🔬 **Exoplanet Science is Advancing Fast!**

Recent breakthroughs in exoplanet research:

• **James Webb Telescope** - Studying planet atmospheres in unprecedented detail
• **TESS Mission** - Discovering new planets every month
• **Atmospheric Analysis** - Finding water vapor and other key molecules
• **Habitability Studies** - Refining what makes a planet livable

The next decade will bring incredible discoveries!`
          ];
          
          assistantResponse = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
          setSuggestions(['Show potentially habitable planets', 'How do we detect exoplanets?', 'Tell me about James Webb discoveries', 'What makes a planet habitable?']);
        }
      }
      
      // If assistantResponse was produced by fallback logic above (or JSON), send the original user message
      // to the server-side processor which handles dedupe, rewriting, and persistence.
      if (sessionId) {
        try {
          const procResp = await fetch(`${API_BASE}/process-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, message: text })
          });
          if (procResp.ok) {
            const json = await procResp.json();
            const reply = json?.data?.reply || assistantResponse || 'I received your message!';
            const assistantMessage: ChatMessage = {
              id: `assistant_${Date.now()}`,
              content: reply,
              sender: 'assistant',
              timestamp: new Date().toISOString(),
              messageType: 'informational'
            };
            setMessages(prev => [...prev, assistantMessage]);
          } else {
            // fallback to whatever assistantResponse we have
            const assistantMessage: ChatMessage = {
              id: `assistant_${Date.now()}`,
              content: assistantResponse || 'I received your message!',
              sender: 'assistant',
              timestamp: new Date().toISOString(),
              messageType: 'informational'
            };
            setMessages(prev => [...prev, assistantMessage]);
          }
        } catch (e) {
          // if processing fails, fallback to local assistantResponse
          const assistantMessage: ChatMessage = {
            id: `assistant_${Date.now()}`,
            content: assistantResponse || 'I received your message!',
            sender: 'assistant',
            timestamp: new Date().toISOString(),
            messageType: 'informational'
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      } else if (assistantResponse) {
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          content: assistantResponse,
          sender: 'assistant',
          timestamp: new Date().toISOString(),
          messageType: 'informational'
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        content: "I'm having trouble processing your message right now. Please try again or ask about exoplanets directly!",
        sender: 'assistant',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleQuickResponse = (quickResponse: QuickResponse) => {
    if (quickResponse.action === 'explain-features') {
      sendMessage('How does this website work?');
    } else if (quickResponse.action === 'compare-earth') {
      sendMessage('Compare planets with Earth');
    } else {
      sendMessage(quickResponse.text);
    }
  };

  const handleActionButton = (action: string, planetId?: string) => {
    if (action === 'view-3d' && planetId && planets && onPlanetSelect) {
      const planet = planets.find(p => p.pl_name === planetId);
      if (planet) {
        onPlanetSelect(planet);
        // Add confirmation message
        const confirmMessage: ChatMessage = {
          id: `confirm_${Date.now()}`,
          content: `Great! Opening 3D view for ${planet.pl_name}...`,
          sender: 'assistant',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, confirmMessage]);
      }
    } else if (action === 'explore-habitable' && onNavigateToView) {
      onNavigateToView('filter', 'habitable');
    } else if (action === 'compare-planets' && onNavigateToView) {
      onNavigateToView('comparison');
    }
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\\n/g, '<br>');
  };

  const renderMessage = (message: ChatMessage) => (
    <div key={message.id} className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.sender === 'assistant' && (
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
        message.sender === 'user' 
          ? 'bg-blue-500 text-white ml-auto' 
          : 'bg-gray-100 text-gray-800'
      }`}>
        <div 
          className="text-sm"
          dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
        />
        
        {/* Action Buttons for Assistant Messages */}
        {message.sender === 'assistant' && message.actionButtons && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.actionButtons.map((button, index) => (
              <button
                key={index}
                onClick={() => handleActionButton(button.action, button.planetId)}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full transition-colors"
              >
                {button.text}
              </button>
            ))}
          </div>
        )}
        
        <div className={`text-xs mt-1 opacity-70 ${
          message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {message.sender === 'user' && (
        <div className="flex-shrink-0 w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 z-50 group"
        aria-label="Open chat assistant"
      >
  <ChatbotIcon className="w-6 h-6 text-white" />
        <div className="absolute -top-2 -left-2 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Ask me about exoplanets!
        </div>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Exoplanet Assistant"
      tabIndex={-1}
      className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200"
      onKeyDown={(e) => {
        // basic focus trap: if Tab at end, cycle to input
        if (e.key === 'Tab') {
          const focusable = Array.from(document.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')) as HTMLElement[];
          if (focusable.length > 0) {
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              (first as HTMLElement).focus();
            } else if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              (last as HTMLElement).focus();
            }
          }
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">Exoplanet Assistant</h3>
            <p className="text-xs opacity-90">Ask me anything about exoplanets!</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 rounded-full p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(renderMessage)}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            </div>
          </div>
        )}
        {isStreaming && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <span className="text-sm text-gray-700">Typing…</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-1">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => sendMessage(suggestion)}
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick responses (shown when no messages yet) */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 border-t">
          <p className="text-xs text-gray-500 mb-2">Try asking:</p>
          <div className="grid grid-cols-1 gap-1">
            {quickResponses.slice(0, 4).map((response) => (
              <button
                key={response.id}
                onClick={() => handleQuickResponse(response)}
                className="text-left text-xs bg-gray-100 hover:bg-gray-200 text-black font-medium px-2 py-1 rounded transition-colors border border-gray-300"
                style={{ color: '#000000' }}
              >
                {response.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Ctrl/Cmd+Enter sends as well for multiline in future
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about exoplanets..."
            aria-label="Chat input"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!currentMessage.trim() || isLoading}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Live region for accessibility announcements */}
      <div id="chatbot-live-region" aria-live="polite" aria-atomic="true" className="sr-only" />
    </div>
  );
};

export default ChatBot;
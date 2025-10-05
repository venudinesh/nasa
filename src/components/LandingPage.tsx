import React, { useEffect, useState, useRef } from 'react';

interface LandingPageProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const LandingPage: React.FC<LandingPageProps> = ({ isOpen, onClose }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visibleFeatures, setVisibleFeatures] = useState<Set<number>>(new Set());
  const [countedStats, setCountedStats] = useState({ planets: 0, models: 0, ai: 0 });
  const [titleVisible, setTitleVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Prevent background scrolling but allow landing page scroll
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    // Don't set overflow hidden - the landing container handles its own scroll
    // document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Mouse tracking for particles and parallax
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Create particle on mouse move (throttled)
      if (Math.random() < 0.1) {
        const newParticle: Particle = {
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1
        };
        setParticles(prev => [...prev.slice(-50), newParticle]);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isOpen]);

  // Particle animation
  useEffect(() => {
    if (!isOpen || particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.02
          }))
          .filter(p => p.life > 0)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [isOpen, particles.length]);

  // Draw particles on canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 181, 246, ${particle.life})`;
      ctx.fill();
    });
  }, [particles]);

  // Scroll reveal for features
  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setVisibleFeatures(prev => new Set([...prev, index]));
          }
        });
      },
      { threshold: 0.2 }
    );

    const cards = document.querySelectorAll('.feature-card');
    cards.forEach(card => observer.observe(card));

    return () => observer.disconnect();
  }, [isOpen]);

  // Counting animation for stats
  useEffect(() => {
    if (!isOpen) return;

    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      
      setCountedStats({
        planets: Math.floor(12 * progress),
        models: Math.floor(100 * progress) / 100, // For "3D" we'll show progress
        ai: Math.floor(100 * progress) / 100 // For "AI" we'll show progress
      });

      if (step >= steps) {
        setCountedStats({ planets: 12, models: 1, ai: 1 });
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Title reveal animation
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => setTitleVisible(true), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Shooting stars
  useEffect(() => {
    if (!isOpen) return;

    const createShootingStar = () => {
      const star = document.createElement('div');
      star.className = 'shooting-star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 50 + '%';
      document.querySelector('.landing-background')?.appendChild(star);

      setTimeout(() => star.remove(), 2000);
    };

    const interval = setInterval(createShootingStar, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleGetStarted = () => {
    localStorage.setItem('onboardingSeen', '1');
    onClose();
  };

  if (!isOpen) return null;

  // Parallax offset based on mouse position
  const parallaxX = (mousePosition.x - window.innerWidth / 2) / 50;
  const parallaxY = (mousePosition.y - window.innerHeight / 2) / 50;

  return (
    <div className="landing-container" role="dialog" aria-modal="true" aria-label="Welcome to Exoplanet Explorer">
      {/* Particle Canvas */}
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* Animated Space Background */}
      <div className="landing-background">
        <div className="stars-layer"></div>
        <div className="stars-layer-2"></div>
        <div className="nebula-glow"></div>
      </div>

      {/* Main Content */}
      <div className="landing-content">
        {/* Hero Section */}
        <section className="hero-section" ref={heroRef}>
          <div className="hero-content">
            <div className="hero-badge animate-fade-in">
              <span className="badge-icon">🌌</span>
              <span>Discover New Worlds</span>
            </div>
            
            <h1 className={`hero-title ${titleVisible ? 'title-visible' : ''}`}>
              Explore the
              <span className="gradient-text"> Universe </span>
              of Exoplanets
            </h1>
            
            <p className="hero-description animate-fade-in-delay-1">
              Journey through 12 confirmed exoplanets with stunning 3D visualizations, 
              interactive comparisons, and AI-powered exploration tools. Experience 
              worlds beyond our solar system like never before.
            </p>

            <div className="hero-actions animate-fade-in-delay-2">
              <button onClick={handleGetStarted} className="btn-primary">
                <span>Start Exploring</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              <button onClick={() => {
                const features = document.querySelector('.features-section');
                features?.scrollIntoView({ behavior: 'smooth' });
              }} className="btn-secondary">
                <span>Learn More</span>
              </button>
            </div>

            {/* Stats */}
            <div className="hero-stats animate-fade-in-delay-3">
              <div className="stat-item">
                <div className="stat-number">{countedStats.planets}</div>
                <div className="stat-label">Exoplanets</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-number">3D</div>
                <div className="stat-label">Models</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-number">AI</div>
                <div className="stat-label">Assistant</div>
              </div>
            </div>
          </div>

          {/* Hero Visual with Parallax */}
          <div className="hero-visual" style={{
            transform: `translate(${parallaxX}px, ${parallaxY}px)`
          }}>
            <div className="planet-showcase">
              <div className="planet-orbit">
                <div className="planet-sphere"></div>
              </div>
              <div className="orbit-ring"></div>
              <div className="orbit-ring-2"></div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="section-header">
            <h2 className="section-title">Powerful Features</h2>
            <p className="section-subtitle">Everything you need to explore exoplanets</p>
          </div>

          <div className="features-grid">
            {[
              { icon: '🌍', title: '3D Visualization', description: 'Explore planets in stunning 3D with real-time rendering and detailed textures.' },
              { icon: '🤖', title: 'AI Assistant', description: 'Get instant answers about planets with our intelligent chatbot companion.' },
              { icon: '📊', title: 'Compare Planets', description: 'Side-by-side comparison of up to 3 planets with detailed metrics.' },
              { icon: '🎓', title: 'Educational Quests', description: 'Learn through interactive challenges and unlock achievements.' },
              { icon: '🚀', title: 'Mission Planner', description: 'Design space missions and calculate travel times to distant worlds.' },
              { icon: '🌦️', title: 'Weather Simulator', description: 'Simulate atmospheric conditions on different exoplanets.' }
            ].map((feature, index) => (
              <div 
                key={index}
                data-index={index}
                className={`feature-card ${visibleFeatures.has(index) ? 'feature-visible' : ''}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Explore?</h2>
            <p className="cta-description">
              Start your journey through the cosmos and discover worlds beyond imagination.
            </p>
            <button onClick={handleGetStarted} className="btn-primary btn-large">
              <span>Begin Your Adventure</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <p>Built with React, TypeScript, and Three.js</p>
          <button onClick={handleGetStarted} className="footer-skip">
            Skip intro →
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;

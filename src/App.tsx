import { useEffect, useMemo, useState, useRef } from "react";
import "./index.css";

import SearchBar from "./components/SearchBar";
import RandomDiscovery from "./components/RandomDiscovery";
import PlanetCard from "./components/PlanetCard";
import PlanetDetail from "./components/PlanetDetail";
import FilterPills, { FilterType } from "./components/FilterPills";
import DataVisualization from "./components/DataVisualization";
import Timeline from "./components/Timeline";
import Charts from "./components/Charts";
import EducationalQuests from "./components/EducationalQuests";
import ExoplanetNewsFeed from "./components/ExoplanetNewsFeed";
import SpaceMissionPlanner from "./components/SpaceMissionPlanner";
import PlanetComparison from "./components/PlanetComparison";
import ChatBot from "./components/ChatBot";
import CompareTray from "./components/CompareTray";
import LandingPage from "./components/LandingPage";
import AdminPanel from "./components/AdminPanel";
import InlinePlanetDetail from "./components/InlinePlanetDetail";
import { Planet, filterClosest, filterEarthLike, filterWeird } from "./lib/filters";
import { narrate, type NarrativeContext } from "./lib/narrator";

// Minimalistic cursor trail effect
function CursorTrail() {
  useEffect(() => {
    const trails: HTMLDivElement[] = [];

    const createTrail = (x: number, y: number) => {
      const trail = document.createElement('div');
      trail.className = 'cursor-trail';
      
      // Center the small dot on cursor
      const size = 6;
      trail.style.left = `${x - size/2}px`;
      trail.style.top = `${y - size/2}px`;
      
      document.body.appendChild(trail);
      trails.push(trail);

      // Remove after animation
      setTimeout(() => {
        trail.remove();
        const index = trails.indexOf(trail);
        if (index > -1) trails.splice(index, 1);
      }, 600);
    };

    // Throttle trail creation for performance
    let lastTrailTime = 0;
    const throttledMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastTrailTime > 50) {
        createTrail(e.clientX, e.clientY);
        lastTrailTime = now;
      }
    };

    document.addEventListener('mousemove', throttledMouseMove);

    return () => {
      document.removeEventListener('mousemove', throttledMouseMove);
      trails.forEach(trail => trail.remove());
    };
  }, []);

  return null;
}

function App() {
  const [allPlanets, setAllPlanets] = useState<Planet[]>([]);
  const [visiblePlanets, setVisiblePlanets] = useState<Planet[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'explore' | 'data' | 'timeline' | 'quests' | 'news' | 'missions' | 'comparison' | 'charts'>('explore');
  
  // Dashboard states
  const [isDataVizOpen, setIsDataVizOpen] = useState(false);
  const [isQuestsOpen, setIsQuestsOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  // comparison modal handled via CompareTray/PlanetComparison elsewhere
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    try {
      const t = localStorage.getItem('theme');
      return (t === 'light' || t === 'dark') ? t : 'dark';
    } catch {
      return 'dark';
    }
  });
  
  // Audio controls state
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const [showGlow, setShowGlow] = useState(true);
    // glow intensity sub-control removed (kept simple on/off)
  const audioRef = useRef<HTMLAudioElement>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);
  
  // User statistics for quests/achievements
  const [userStats, setUserStats] = useState({
    planetsViewed: 0,
    comparisonsCreated: 0,
    missionsPlanned: 0,
    newsRead: 0,
    simulationsRun: 0,
  });
  
  // Comparison planets
  const [comparisonPlanets, setComparisonPlanets] = useState<Planet[]>([]);
  // Show the onboarding as a landing page when the site opens
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [inlinePlanet, setInlinePlanet] = useState<Planet | null>(null);
  const [shuffling, setShuffling] = useState(false);

  // scroll inline detail into view when set
  useEffect(() => {
    if (!inlinePlanet) return;
    const el = document.getElementById('inline-planet-detail');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try { (el as HTMLElement).focus(); } catch {}
    }
  }, [inlinePlanet]);

  // persist compare tray
  useEffect(() => {
    try { localStorage.setItem('comparePlanets', JSON.stringify(comparisonPlanets.map(p => p.pl_name))); } catch {}
  }, [comparisonPlanets]);

  useEffect(() => {
    try {
        const stored = JSON.parse(localStorage.getItem('comparePlanets') || '[]');
      if (Array.isArray(stored) && stored.length) {
        // attempt to map stored names back to planet objects
        // delay until allPlanets loaded
        const mapped = stored.map((name: string) => allPlanets.find(p => p.pl_name === name)).filter(Boolean) as Planet[];
        if (mapped.length) setComparisonPlanets(mapped);
      }
  } catch {}
  }, [allPlanets]);

  // onboarding now shows as the landing page by default; closing it persists the flag

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/data/planets.min.json");
  const data = await res.json();
  if (cancelled) return;
  let planets: Planet[] = [];
  if (Array.isArray(data)) planets = data as Planet[];
  else if (data && typeof data === 'object' && Array.isArray((data as any).planets)) planets = (data as any).planets as Planet[];
        setAllPlanets(planets);
        setVisiblePlanets(planets);
      } catch (e) {
          console.error("Failed to load planets:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // persist theme
  useEffect(() => {
    try { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  // persist and apply glow preference
  useEffect(() => {
    try {
      localStorage.setItem('showGlow', showGlow ? '1' : '0');
      // apply a global no-glow class to suppress glows across the UI when turned off
      if (!showGlow) {
        document.body.classList.add('no-glow');
        document.body.classList.add('no-audio-glow');
      } else {
        document.body.classList.remove('no-glow');
        document.body.classList.remove('no-audio-glow');
      }
  } catch {}
  }, [showGlow]);

  // glowIntensity related effects removed

  useEffect(() => {
    const stored = localStorage.getItem('showGlow');
    if (stored !== null) setShowGlow(stored === '1');
  }, []);

  // Listen for fallback custom event to open a planet (used by RandomDiscovery)
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        // Detail is available on CustomEvent; guard accordingly
        const pDetail = (e as CustomEvent)?.detail;
        if (pDetail && typeof pDetail === 'object' && 'pl_name' in (pDetail as any)) {
          const p = pDetail as Planet;
          openPlanet(p);
          setInlinePlanet(p);
          setActiveSection('explore');
        }
  } catch {}
    };
    window.addEventListener('exo-open-planet', handler as EventListener);
    return () => window.removeEventListener('exo-open-planet', handler as EventListener);
  }, [allPlanets]);

  // persist last volume and implement mute toggle
  useEffect(() => {
    const stored = localStorage.getItem('lastVolume');
    if (stored) {
      const v = parseFloat(stored);
      if (!Number.isNaN(v)) setVolume(v);
    }
  }, []);

  const toggleMute = () => {
    if (!isMuted) {
      localStorage.setItem('lastVolume', String(volume));
      setVolume(0);
      setIsMuted(true);
    } else {
      const last = parseFloat(localStorage.getItem('lastVolume') || '0.1') || 0.1;
      setVolume(last);
      setIsMuted(false);
    }
  };

  // Sync glow width to the slider fill using a CSS variable
  useEffect(() => {
    const updateFill = () => {
      const container = sliderContainerRef.current;
      const slider = sliderRef.current;
      if (!container || !slider) return;
      const rect = slider.getBoundingClientRect();
      const filled = rect.width * volume;
      container.style.setProperty('--fill-px', `${filled}px`);
    };
    updateFill();
    // Debounce resize for performance
    let t: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (t) clearTimeout(t as ReturnType<typeof setTimeout>);
      t = setTimeout(updateFill, 120);
    };
    window.addEventListener('resize', debounced);

    // Update on input (drag) for immediate visual feedback
    const slider = sliderRef.current;
    const onInput = () => updateFill();
    if (slider) slider.addEventListener('input', onInput);

    return () => {
      window.removeEventListener('resize', debounced);
      if (slider) slider.removeEventListener('input', onInput);
      if (t) clearTimeout(t);
    };
  }, [volume]);

  const narrativeContext: NarrativeContext = useMemo(() => {
    switch (activeFilter) {
      case "earthlike":
        return "earthlike";
      case "weird":
        return "weird";
      case "closest":
        return "closest";
      default:
        return "random";
    }
  }, [activeFilter]);

  const applyFilter = (filter: FilterType, planets: Planet[]) => {
    switch (filter) {
      case "earthlike":
        return filterEarthLike(planets);
      case "weird":
        return filterWeird(planets);
      case "closest":
        return filterClosest(planets);
      default:
        return planets;
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setVisiblePlanets(applyFilter(filter, allPlanets));
  };

  const handleSearchResults = (results: Planet[]) => {
    setVisiblePlanets(applyFilter(activeFilter, results));
  };

  const openPlanet = (planet: Planet) => {
    console.log('[App] openPlanet called ->', planet && planet.pl_name);
    setSelectedPlanet(planet);
    setIsDetailOpen(true);
    try {
      setNotification(`Opening ${planet.pl_name}`);
      window.setTimeout(() => setNotification(null), 2500);
  } catch {}
    // Update user stats for achievements
    setUserStats(prev => ({
      ...prev,
      planetsViewed: prev.planetsViewed + 1
    }));
  };

  // Play the transition animation in an overlay iframe and then open the planet detail
  const playTransitionThenOpen = (planet: Planet) => {
    // create overlay iframe
    const existing = document.getElementById('exo-transition-iframe');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'exo-transition-iframe';
    iframe.style.position = 'fixed';
    iframe.style.inset = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.zIndex = '99999';
    iframe.style.background = 'black';
    // pass planet name as query param so the transition can display it
    iframe.src = `/transition.html?planet=${encodeURIComponent(planet.pl_name)}`;
    document.body.appendChild(iframe);

    let settled = false;
    const cleanup = () => {
    try { window.removeEventListener('message', onMessage); } catch {}
      const el = document.getElementById('exo-transition-iframe');
      if (el) el.remove();
    };

    const onMessage = (ev: MessageEvent) => {
      if (!ev.data) return;
      try {
        if (ev.data && ev.data.type === 'exoTransitionDone') {
          if (settled) return;
          settled = true;
          cleanup();
          // small timeout to allow DOM cleanup
          setTimeout(() => openPlanet(planet), 50);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('message', onMessage);

    // Fallback: if iframe doesn't respond in 6s, remove it and open the planet
    setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      openPlanet(planet);
    }, 6000);

    // ensure fallback is cleared when planet detail opens
    // fallback will be cleared when we receive the iframe message and call openPlanet
  };

  // If a planet is provided, open it; otherwise pick a random planet
  const travelRandom = (p?: Planet) => {
    if (p) {
      console.log('[App] travelRandom requested with planet ->', p.pl_name);
      openPlanet(p);
      setInlinePlanet(p);
      setActiveSection('explore');
      return;
    }
    if (!allPlanets || allPlanets.length === 0) return;
    const rand = allPlanets[Math.floor(Math.random() * allPlanets.length)];
    console.log('[App] travelRandom picked ->', rand.pl_name);
    openPlanet(rand);
    setInlinePlanet(rand);
    setActiveSection('explore');
  };

  const closeDetail = () => setIsDetailOpen(false);

  const addToComparison = (planet: Planet) => {
    if (comparisonPlanets.length < 3 && !comparisonPlanets.find(p => p.pl_name === planet.pl_name)) {
      setComparisonPlanets(prev => [...prev, planet]);
      setUserStats(prev => ({
        ...prev,
        comparisonsCreated: prev.comparisonsCreated + 1
      }));
    }
  };

  const removeFromComparison = (planet: Planet) => {
    setComparisonPlanets(prev => prev.filter(p => p.pl_name !== planet.pl_name));
  };

  const reorderComparison = (newOrder: Planet[]) => {
    setComparisonPlanets(newOrder.slice(0,3));
  };

  // Audio control functions
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Keyboard shortcut to open chat (C)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      try {
        if (e.key && e.key.toLowerCase() === 'c') {
          // Dispatch a custom event the ChatBot listens for to open itself
          // If onboarding is open, close it so chat isn't hidden behind it
          try { setShowOnboarding(false); } catch {}
          window.dispatchEvent(new CustomEvent('exo-open-chat'));
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('keypress', onKey);
    return () => window.removeEventListener('keypress', onKey);
  }, []);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-space-dark flex items-center justify-center">
        <div className="text-neon-cyan text-xl">Loading exoplanets...</div>
      </div>
    );
  }
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Blackhole Video Background - hidden while a detail view is open to avoid visual obstruction */}
      {!(isDetailOpen || inlinePlanet || shuffling) && (
        <>
          <video 
            autoPlay 
            loop 
            muted 
            className="absolute inset-0 w-full h-full object-cover z-0"
          >
            <source src="/images/blackhole.mp4" type="video/mp4" />
          </video>
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black bg-opacity-40 z-10" />
        </>
      )}

          {/* Top Navigation - Moved to top-right */}
          <nav className="absolute top-20 md:top-24 right-6 z-30 p-6">
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-3">
                <button className="nav-hamburger md:hidden" onClick={() => setIsNavOpen(s => !s)} aria-label="Toggle menu">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <button className="nav-theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle dark/light theme" aria-pressed={theme === 'dark'}>
                  {theme === 'dark' ? '🌙' : '☀️'}
                </button>
                <button className="nav-theme-toggle" onClick={() => setShowOnboarding(true)} title="Help / Tour">
                  Help
                </button>
              </div>

              <div className={`flex gap-4 flex-wrap ${isNavOpen ? 'block' : 'hidden'} md:flex`}>
                <button 
                  onClick={() => setActiveSection('explore')} 
                  className={`nav-link ${activeSection === 'explore' ? 'active' : ''}`}
                >
                  Explore
                </button>
                <button 
                  onClick={() => setActiveSection('charts')} 
                  className={`nav-link ${activeSection === 'charts' ? 'active' : ''}`}
                >
                  Charts
                </button>
                <button 
                  onClick={() => setIsDataVizOpen(true)} 
                  className="nav-link"
                >
                  Data Dashboard
                </button>
                <button 
                  onClick={() => setActiveSection('timeline')} 
                  className={`nav-link ${activeSection === 'timeline' ? 'active' : ''}`}
                >
                  Timeline
                </button>
                <button 
                  onClick={() => {
                    console.log('Quests button clicked!');
                    setIsQuestsOpen(true);
                  }} 
                  className="nav-link"
                >
                  Quests
                </button>
                <button 
                  onClick={() => setIsNewsOpen(true)} 
                  className="nav-link"
                >
                  News
                </button>
                <button 
                  onClick={() => setIsMissionsOpen(true)} 
                  className="nav-link"
                >
                  Missions
                </button>
                <button 
                  onClick={() => setActiveSection('comparison')} 
                  className="nav-link"
                >
                  Compare
                </button>
                {/* Dev-only Admin button */}
                {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || (() => { try { const m: any = (typeof import.meta !== 'undefined') ? import.meta : undefined; return !!(m?.env && m.env.MODE && m.env.MODE !== 'production'); } catch { return false; } })()) && (
                  <button onClick={() => setShowAdmin(true)} className="nav-link" title="Admin">Admin</button>
                )}
                <div
                  onClick={() => setShowGlow(s => !s)}
                  className="nav-link relative"
                  title="Toggle audio glow"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowGlow(s => !s); } }}
                >
                  <span>Glow: {showGlow ? 'On' : 'Off'}</span>
                  {/* glow intensity sub-control removed */}
                </div>
              </div>

              {/* Audio Controls - placed under the nav buttons */}
              <div className="flex items-center gap-2 audio-controls" role="group" aria-label="Audio controls">
                <button
                  onClick={togglePlayPause}
                  className="audio-control-btn"
                  title={isPlaying ? 'Pause Music' : 'Play Music'}
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                <div ref={sliderContainerRef} className="flex items-center gap-2 audio-controls-row">
                  <svg className="w-4 h-4 text-neon-cyan" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.814L4.906 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.906l3.477-2.814z" clipRule="evenodd" />
                  </svg>
                  <input
                    ref={sliderRef}
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className={`volume-slider ${volume >= 0.999 ? 'full' : ''}`}
                    aria-label="Volume slider"
                    title={`Volume: ${Math.round(volume * 100)}%`}
                    style={{
                      background: `linear-gradient(to right, var(--neon-cyan) 0%, var(--neon-cyan) ${Math.round(
                        volume * 100
                      )}%, #374151 ${Math.round(volume * 100)}%, #374151 100%)`
                    }}
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-valuenow={volume}
                  />
                  <span className="text-xs text-neon-cyan font-medium min-w-[3ch]">
                    {Math.round(volume * 100)}%
                  </span>
                  <button onClick={toggleMute} className="audio-control-btn ml-2" title={isMuted ? 'Unmute' : 'Mute'} aria-pressed={isMuted}>
                    {isMuted ? '🔇' : '🔊'}
                  </button>
                </div>
              </div>
            </div>
          </nav>

      {/* Main Title - Top left */}
      <div className="absolute top-12 md:top-16 left-6 z-30">
        <div className="neon-text text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-wide neon-title">EXOPLANET EXPLORER</div>
      </div>

  <main className="container mx-auto px-6 pt-40 md:pt-48 relative z-20">
        {activeSection === 'explore' && (
          <>
            <div className="text-center mb-12 parallax-element">
              <div className="backdrop-blur-sm bg-black bg-opacity-30 rounded-2xl p-8 mx-auto max-w-4xl">
                <h1 className="text-4xl md:text-6xl font-bold mb-6 neon-text-glow leading-tight">
                  Discover New Worlds
                </h1>
                <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
                  Explore confirmed exoplanets with our interactive 3D visualization platform
                </p>
              </div>
            </div>

            <div className="mb-8 space-y-4">
              <RandomDiscovery
                planets={allPlanets}
                onExplore={(p) => { openPlanet(p); setActiveSection('explore'); }}
                onTravelRandom={travelRandom}
                onOpenInline={(p) => { console.log('[App] onOpenInline ->', p.pl_name); setInlinePlanet(p); setActiveSection('explore'); }}
                onShuffleStart={() => { console.log('[App] shuffle start'); setShuffling(true); setNotification('Shuffling worlds...'); }}
                onShuffleEnd={() => { console.log('[App] shuffle end'); setShuffling(false); setNotification(null); }}
              />
              {inlinePlanet && (
                <InlinePlanetDetail planet={inlinePlanet} onClose={() => setInlinePlanet(null)} context={narrativeContext} />
              )}
              <div className="backdrop-blur-sm bg-black bg-opacity-20 rounded-xl p-4">
                <SearchBar planets={allPlanets} onSearchResults={handleSearchResults} className="neon-search-bar" />
              </div>
              <div className="backdrop-blur-sm bg-black bg-opacity-20 rounded-xl p-4">
                <FilterPills activeFilter={activeFilter} onFilterChange={handleFilterChange} />
              </div>
            </div>

            <section id="explore" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-16">
              {visiblePlanets.map((planet) => (
                <div key={(planet.pl_name || "") + (planet.hostname || "")} className="flip-card">
                  <div className="flip-card-inner">
                    <div className="flip-card-front">
                      <div className="backdrop-blur-sm bg-black bg-opacity-40 rounded-lg">
                        <PlanetCard planet={planet} onClick={() => openPlanet(planet)} onLearnMore={() => playTransitionThenOpen(planet)} />
                      </div>
                    </div>
                    <div className="flip-card-back">
                      <div className="p-6 h-full flex flex-col justify-center text-center backdrop-blur-md bg-gradient-to-b from-purple-900/80 to-slate-900/80 rounded-lg border border-neon-purple/30">
                        <h3 className="text-lg font-bold text-neon-cyan mb-3 leading-tight">{planet.pl_name}</h3>
                        <p className="text-sm text-gray-200 mb-4 leading-relaxed">{narrate(planet, narrativeContext)}</p>
                        <div className="mt-auto space-y-2">
                          <button className="neon-button w-full" onClick={() => playTransitionThenOpen(planet)}>
                            Explore Details
                          </button>
                          <button 
                            className="neon-button w-full text-xs" 
                            onClick={(e) => {
                              e.stopPropagation();
                              addToComparison(planet);
                            }}
                          >
                            Add to Compare ({comparisonPlanets.length}/3)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {activeSection === 'charts' && (
          <div className="backdrop-blur-sm bg-black bg-opacity-30 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-neon-cyan mb-6">Exoplanet Data Charts</h2>
            <Charts planets={allPlanets} />
          </div>
        )}

        {activeSection === 'timeline' && (
          <div className="backdrop-blur-sm bg-black bg-opacity-30 rounded-2xl p-8">
            <Timeline />
          </div>
        )}

      </main>

      <PlanetDetail planet={selectedPlanet} isOpen={isDetailOpen} onClose={closeDetail} context={narrativeContext} />

      <PlanetComparison
        planets={allPlanets}
        isOpen={activeSection === 'comparison'}
        onClose={() => setActiveSection('explore')}
        initialPlanets={comparisonPlanets}
      />

      <EducationalQuests 
        planets={allPlanets}
        isOpen={isQuestsOpen}
        onClose={() => setIsQuestsOpen(false)}
        userStats={userStats}
      />

      <SpaceMissionPlanner 
        planets={allPlanets}
        isOpen={isMissionsOpen}
        onClose={() => {
          setIsMissionsOpen(false);
          setUserStats(prev => ({
            ...prev,
            missionsPlanned: prev.missionsPlanned + 1
          }));
        }}
      />

      <DataVisualization 
        planets={allPlanets}
        isOpen={isDataVizOpen}
        onClose={() => setIsDataVizOpen(false)}
      />

      <audio ref={audioRef} autoPlay loop style={{ display: 'none' }}>
        <source src="/audio/ambient.mp3" type="audio/mpeg" />
      </audio>

      {/* Transient notification for debug */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-2 bg-black bg-opacity-80 text-white rounded-md shadow-lg">
            {notification}
          </div>
        </div>
      )}

      

      {/* AI ChatBot Widget */}
      <ChatBot
        planets={allPlanets}
        onPlanetSelect={(p) => {
          openPlanet(p);
          setActiveSection('explore');
        }}
        onNavigateToView={(viewType, arg) => {
          if (viewType === 'filter' && typeof arg === 'string') {
            // map simple filter strings
            if (arg === 'habitable') {
              setActiveFilter('earthlike');
              setVisiblePlanets(applyFilter('earthlike', allPlanets));
              setActiveSection('explore');
            }
          } else if (viewType === 'comparison') {
            // open compare tray and switch to explore view
            setActiveSection('explore');
          }
        }}
      />

      {comparisonPlanets.length > 0 && (
        <CompareTray planets={comparisonPlanets} onRemove={removeFromComparison} onReorder={reorderComparison} />
      )}

      <ExoplanetNewsFeed 
        planets={allPlanets}
        isOpen={isNewsOpen}
        onClose={() => setIsNewsOpen(false)}
        onPlanetClick={openPlanet}
      />

      <LandingPage isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

  {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {/* Cursor trail effect */}
      <CursorTrail />

    </div>
  );
}

export default App;


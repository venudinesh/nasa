import React, { useEffect, useState } from 'react';
import { Planet } from '../lib/filters';

interface Props {
  planets: Planet[];
  onExplore: (p: Planet) => void;
  // When requesting a travel, the component will pick a planet and notify parent
  onTravelRandom: (p: Planet) => void;
  // optional: open inline detail instead of modal
  onOpenInline?: (p: Planet) => void;
  onShuffleStart?: () => void;
  onShuffleEnd?: () => void;
}

const RandomDiscovery: React.FC<Props> = ({ planets, onExplore, onTravelRandom, onOpenInline, onShuffleStart, onShuffleEnd }) => {
  const [planet, setPlanet] = useState<Planet | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const timersRef = React.useRef<number[]>([]);

  useEffect(() => {
    if (!planets || planets.length === 0) {
      setPlanet(null);
      return;
    }
    const pick = () => planets[Math.floor(Math.random() * planets.length)];
    setPlanet(pick());
    return () => {
      // clear any timers when planets change/unmount
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [planets]);

  if (!planet) return null;

  return (
    <div className="random-discovery-panel frosted-panel backdrop-blur-md p-6 rounded-lg border border-neon-purple/30 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-700 to-pink-600 flex items-center justify-center text-white text-lg">🎲</div>
        <div className="flex-1">
          <div className="text-sm text-gray-300 font-semibold">Random Discovery</div>
          <h3 className="text-2xl font-bold text-white mt-1">{planet.pl_name}</h3>
          <div className="text-sm text-gray-400 mt-1">Orbiting {planet.hostname || 'unknown'} • Discovered in {planet.discoveryyear || '—'} • {planet.sy_dist ? `${planet.sy_dist.toFixed(1)} parsecs away` : 'distance unknown'}</div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => { if (onOpenInline) { onOpenInline(planet); } else { onExplore(planet); } }} className="neon-button px-4 py-2">Explore This World</button>
          <button
            onClick={() => {
              // Travel random initiated
              if (shuffling) return;
              if (!planets || planets.length === 0) {
                // no planets to pick
                return;
              }
              // Shuffle animation: cycle through random planets then pick final
              setShuffling(true);
              try { if (onShuffleStart) onShuffleStart(); } catch (err) { console.warn('onShuffleStart handler failed', err); }
              const steps = Math.min(12, Math.max(6, Math.floor((planets.length) / 2)));
              for (let i = 0; i < steps; i++) {
                const delay = 80 + i * 60; // accelerate slightly
                const t = window.setTimeout(() => {
                  const pick = planets[Math.floor(Math.random() * planets.length)];
                  setPlanet(pick);
                  // shuffle step
                  if (i === steps - 1) {
                    // open the final planet after a brief pause to avoid race conditions with other UI changes
                      window.setTimeout(() => {
                      try { onExplore(pick); } catch (err) { console.warn('[RandomDiscovery] onExplore failed', err); }
                      try { onTravelRandom(pick); } catch (err) { console.warn('[RandomDiscovery] onTravelRandom failed', err); }
                      // dispatch a custom event as a robust fallback so the app opens the planet
                      try {
                        window.dispatchEvent(new CustomEvent('exo-open-planet', { detail: pick }));
                      } catch (err) { console.warn('dispatch exo-open-planet failed', err); }
                      // finalize shuffle state and notify parent
                      setShuffling(false);
                      try { if (onShuffleEnd) onShuffleEnd(); } catch (err) { console.warn('onShuffleEnd handler failed', err); }
                      // clear any timers we created
                      timersRef.current.forEach((t) => clearTimeout(t));
                      timersRef.current = [];
                    }, 80);
                  }
                }, delay);
                timersRef.current.push(t);
              }
            }}
            className={`ml-auto px-4 py-2 rounded text-white ${shuffling ? 'bg-gray-600 cursor-wait' : 'bg-purple-600'}`}
            disabled={shuffling}
          >
            {shuffling ? 'Shuffling...' : 'Travel Random'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RandomDiscovery;

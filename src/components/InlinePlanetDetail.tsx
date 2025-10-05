import React, { Suspense } from 'react';
import { Planet } from '../lib/filters';
import { narrate, NarrativeContext } from '../lib/narrator';
const PlanetSphere = React.lazy(() => import('./PlanetSphere'));

interface Props {
  planet: Planet;
  onClose: () => void;
  context?: NarrativeContext;
}

const getNASAUrl = (planetName: string) => {
  return `https://exoplanetarchive.ipac.caltech.edu/cgi-bin/DisplayOverview/nph-DisplayOverview?objname=${encodeURIComponent(
    planetName
  )}`;
};

const InlinePlanetDetail: React.FC<Props> = ({ planet, onClose, context = 'random' }) => {
  return (
    <div id="inline-planet-detail" className="inline-planet-detail mt-4 backdrop-blur-sm bg-black bg-opacity-40 rounded-2xl p-6 border border-neon-purple/20">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2 flex-shrink-0">
          <div className="w-full h-64 sm:h-72 md:h-80 rounded-md overflow-hidden bg-black/70">
            <Suspense fallback={<div className="w-full h-full bg-gray-200 animate-pulse" />}>
              <PlanetSphere textureUrl={planet.image} planet={planet} className="w-full h-full" />
            </Suspense>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white">{planet.pl_name}</h2>
              <div className="text-sm text-gray-300">Orbiting {planet.hostname || 'Unknown'}</div>
            </div>
            <div>
              <button onClick={onClose} className="text-sm px-3 py-1 rounded bg-gray-800 text-white">Close</button>
            </div>
          </div>

          <p className="mt-3 text-gray-200">{narrate(planet, context)}</p>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-gray-900 rounded">
              <div className="text-xs text-gray-400">Distance</div>
              <div className="text-lg text-white">{planet.sy_dist ?? '—'} parsecs</div>
            </div>
            <div className="p-3 bg-gray-900 rounded">
              <div className="text-xs text-gray-400">Discovery Year</div>
              <div className="text-lg text-white">{planet.discoveryyear ?? '—'}</div>
            </div>
            <div className="p-3 bg-gray-900 rounded">
              <div className="text-xs text-gray-400">Radius (R⊕)</div>
              <div className="text-lg text-white">{planet.pl_rade ?? '—'}</div>
            </div>
            <div className="p-3 bg-gray-900 rounded">
              <div className="text-xs text-gray-400">Mass (M⊕)</div>
              <div className="text-lg text-white">{planet.pl_bmasse ?? '—'}</div>
            </div>
          </div>

          <div className="mt-4">
            <a className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded" href={getNASAUrl(planet.pl_name)} target="_blank" rel="noreferrer">Learn more</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InlinePlanetDetail;

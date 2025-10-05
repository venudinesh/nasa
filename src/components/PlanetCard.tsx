// no top-level imports required for JSX runtime and no local state used
import { Planet } from "../lib/filters";
import React, { Suspense } from 'react';
const PlanetSphere = React.lazy(() => import('./PlanetSphere'));

interface PlanetCardProps {
  planet: Planet;
  onClick: () => void;
  onLearnMore?: () => void;
}

const PlanetCard: React.FC<PlanetCardProps> = ({ planet, onClick, onLearnMore }) => {
  
  // debug logging removed

  const formatValue = (value: number | null | undefined, unit: string = "", precision: number = 1): string => {
    if (value == null) return "Unknown";
    return value.toFixed(precision) + unit;
  };

  return (
    <div
      onClick={() => onClick()}
      className="planet-card bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer p-4 border border-gray-200"
    >
      <div className="mb-3 overflow-hidden rounded-md">
        <Suspense fallback={<div className="w-full h-36 bg-gray-200 animate-pulse rounded-md" /> }>
          <PlanetSphere 
            planet={planet} 
            textureUrl={planet.image} 
            className="w-full h-36 rounded-md" 
          />
        </Suspense>
      </div>
      
      <div className="mb-3">
        <h3 className="font-bold text-lg text-gray-900">{planet.pl_name}</h3>
      </div>
      
      <div className="text-sm text-gray-600 mb-3">
        <div className="mb-1">
          <span className="font-medium">Host:</span> {planet.hostname || "Unknown"}
        </div>
        <div>
          <span className="font-medium">Discovered:</span> {planet.discoveryyear || "Unknown"}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-medium text-gray-700">Distance</div>
          <div className="text-gray-900">{formatValue(planet.sy_dist, " pc")}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-medium text-gray-700">Radius</div>
          <div className="text-gray-900">{formatValue(planet.pl_rade, " R")}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-medium text-gray-700">Temperature</div>
          <div className="text-gray-900">{formatValue(planet.pl_eqt, " K")}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-medium text-gray-700">Insolation</div>
          <div className="text-gray-900">{formatValue(planet.pl_insol, " Earth")}</div>
        </div>
      </div>
      {onLearnMore && (
        <div className="mt-3 flex justify-end">
          <button onClick={(e) => { e.stopPropagation(); onLearnMore(); }} className="neon-button text-sm px-3 py-1">
            Learn more
          </button>
        </div>
      )}
    </div>
  );
};

export default PlanetCard;

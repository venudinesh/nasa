import React, { Fragment, useState, Suspense } from 'react';
import { Planet } from '../lib/filters';
import { narrate, NarrativeContext } from '../lib/narrator';
import WeatherSimulator from './WeatherSimulator';
const PlanetSphere = React.lazy(() => import('./PlanetSphere'));
import { loadModelManifest, getModelUrl } from '../lib/modelManifest'
import { getCachedModelUrl } from '../lib/modelCache'
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PlanetDetailProps {
  planet: Planet | null;
  isOpen: boolean;
  onClose: () => void;
  context: NarrativeContext;
  isCompared?: boolean;
  onToggleCompare?: () => void;
}

const formatValue = (
  value: number | null | undefined,
  unit: string = '',
  precision: number = 2
): string => {
  if (value == null) return 'Unknown';
  return value.toFixed(precision) + unit;
};

const PlanetDetail: React.FC<PlanetDetailProps> = ({ planet, isOpen, onClose, context, isCompared = false, onToggleCompare }) => {
  // render
  const [showWeatherSim, setShowWeatherSim] = useState(false);

  // Small renderer used in the modal header — show model when modal opens
  const PlanetDetailModelRenderer: React.FC<{ planet: Planet }> = ({ planet }) => {
    const [modelExists, setModelExists] = useState<boolean | null>(null)
    const slug = (planet.pl_name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const modelUrl = `/models/${slug}.glb`
  const [cachedUrl, setCachedUrl] = React.useState<string | null>(null)
  const [loadingModel, setLoadingModel] = React.useState(false)

  React.useEffect(() => {
      let mounted = true
      if (!isOpen) return
      ;(async () => {
        try {
            await loadModelManifest()
            if (!mounted) return
            const url = getModelUrl(slug)
            setModelExists(Boolean(url))
          } catch (err) {
            console.warn('Failed to load model manifest', err)
            if (!mounted) return
            setModelExists(false)
          }
      })()
      return () => { mounted = false }
  }, [slug])

    // If model exists, try to get cached blob URL
  React.useEffect(() => {
    let mounted = true
    if (!isOpen || !modelExists) return
      (async () => {
        try {
          setLoadingModel(true)
          const modelUrlLocal = `/models/${slug}.glb`
          const url = getModelUrl(slug) || modelUrlLocal
          const blobUrl = await getCachedModelUrl(slug, url)
          if (!mounted) return
          setCachedUrl(blobUrl)
        } catch (err) {
          console.warn('Failed to fetch cached model URL', err)
        } finally {
          if (mounted) setLoadingModel(false)
        }
      })()
      return () => { mounted = false }
  }, [slug, modelExists])

    return (
      <div className='w-full max-w-3xl h-64 sm:h-56 md:h-72 rounded-md overflow-hidden bg-black/70 flex-shrink-0 planet-media'>
        {modelExists ? (
          loadingModel ? (
            <div className='w-full h-full bg-gray-200 animate-pulse' />
          ) : (
            <model-viewer
              src={cachedUrl || modelUrl}
              alt={`${planet.pl_name} 3D model`}
              ar
              camera-controls
              reveal
              interaction-prompt="auto"
              poster={planet.image}
              className='w-full h-full object-cover'
            />
          )
        ) : (
          <Suspense fallback={<div className='w-full h-full bg-gray-200 animate-pulse' />}>
            <PlanetSphere 
              textureUrl={planet.image} 
              planet={planet}
              className='w-full h-full' 
            />
          </Suspense>
        )}
      </div>
    )
  }

  const getNASAUrl = (planetName: string): string => {
    // Map specific planets to their NASA catalog URLs
    const planetMap: Record<string, string> = {
      'Kepler-186 f':
        'https://exoplanets.nasa.gov/alien-worlds/exoplanet-travel-bureau/explore-kepler-186f/?travel_bureau=true',
      'KELT-9 b': 'https://science.nasa.gov/exoplanet-catalog/kelt-9-b/',
      'Proxima Centauri b': 'https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/',
      'TRAPPIST-1e':
        'https://exoplanets.nasa.gov/alien-worlds/exoplanet-travel-bureau/trappist-1e-guided-tour/?intent=021',
      'TOI-715 b': 'https://science.nasa.gov/exoplanet-catalog/toi-715-b/',
      'HD 40307 g':
        'https://exoplanets.nasa.gov/alien-worlds/exoplanet-travel-bureau/hd-40307g-guided-tour/?intent=021',
      '55 Cancri e':
        'https://exoplanets.nasa.gov/alien-worlds/exoplanet-travel-bureau/explore-55-cancri-e/?travel_bureau=true&intent=021',
      'WASP-12 b': 'https://science.nasa.gov/exoplanet-catalog/wasp-12-b/',
      'K2-18 b': 'https://science.nasa.gov/exoplanet-catalog/k2-18-b/',
      'PSR B1620-26 b': 'https://science.nasa.gov/exoplanet-catalog/psr-b1620-26-b/',
      'Gliese 667C c': 'https://science.nasa.gov/exoplanet-catalog/gj-667-c-c/',
      'GJ 1002 b': 'https://science.nasa.gov/exoplanet-catalog/gj-1002-b/',
    };

    // Prefer NASA 3D Resources search (official NASA 3D view results for the planet).
    // If a specific page is available in planetMap, use that as a higher-quality fallback.
    const nasa3dSearch = `https://nasa3d.arc.nasa.gov/search?keyword=${encodeURIComponent(planetName)}`;
    return planetMap[planetName] || nasa3dSearch ||
      `https://exoplanetarchive.ipac.caltech.edu/cgi-bin/DisplayOverview/nph-DisplayOverview?objname=${encodeURIComponent(planetName)}`;
  };

  const [activeTab, setActiveTab] = React.useState<'overview'|'atmosphere'|'orbits'|'missions'>('overview')

  // simple animated counter hook
  const useCounter = (value: number | null | undefined, duration = 700) => {
    const [display, setDisplay] = React.useState(0);
    React.useEffect(() => {
      if (value == null) { setDisplay(0); return; }
      let start = Date.now();
      const from = 0; // start from 0 for each change to provide deterministic animation
      const to = Math.round(value as number);
      const raf = () => {
        const now = Date.now();
        const t = Math.min(1, (now - start) / duration);
        setDisplay(Math.round(from + (to - from) * t));
        if (t < 1) requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }, [value, duration]);
    return display;
  };

  const counterRadius = useCounter(planet ? planet.pl_rade : null);
  const counterMass = useCounter(planet ? planet.pl_bmasse : null);
  if (!planet) return null;
  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as='div' className='relative z-50' onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-300'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-200'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <div className='fixed inset-0 bg-black bg-opacity-50 transition-opacity' />
          </Transition.Child>

          <div className='fixed inset-0 z-50 overflow-y-auto'>
            <div className='flex min-h-full items-center justify-center p-4 text-center'>
              <Transition.Child
                as={Fragment}
                enter='ease-out duration-300'
                enterFrom='opacity-0 translate-y-4 scale-95'
                enterTo='opacity-100 translate-y-0 scale-100'
                leave='ease-in duration-200'
                leaveFrom='opacity-100 translate-y-0 scale-100'
                leaveTo='opacity-0 translate-y-4 scale-95'
              >
                <Dialog.Panel className='rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700 bg-gradient-to-b from-gray-900/95 to-gray-900/95 text-white'>
                  <div className='sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 flex justify-between items-center'>
                    <div className='flex items-center gap-3'>
                      <Dialog.Title
                        as='h2'
                        className='text-lg sm:text-xl font-bold text-gray-900 truncate pr-2'
                      >
                        {planet.pl_name}
                      </Dialog.Title>
                    </div>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => { if (typeof onToggleCompare === 'function') onToggleCompare() }}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                          isCompared ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {isCompared ? 'Comparing' : 'Compare'}
                      </button>
                      <button
                        onClick={() => setShowWeatherSim(true)}
                        className='bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105'
                      >
                        <span>🌦️</span>
                        Weather
                      </button>
                      <button
                        onClick={onClose}
                        className='text-gray-600 hover:text-gray-900 flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110'
                      >
                        <XMarkIcon className='w-6 h-6' />
                      </button>
                    </div>
                  </div>
                  <div className='p-3 sm:p-6 space-y-4 sm:space-y-6'>
                    {/* Model preview between title and narrative */}
                    <div className='flex justify-center'>
                      <PlanetDetailModelRenderer planet={planet} />
                    </div>
                    {/* Tabs */}
                    <div className='tabs-wrapper bg-transparent rounded-lg p-2'>
                      <div className='flex gap-2 mb-3'>
                        <button
                          onClick={() => setActiveTab('overview')}
                          className={`px-3 py-1 rounded font-medium transition-all duration-150 ${activeTab==='overview' ? 'bg-gray-700 text-white shadow' : 'bg-gray-800/40 text-white/80 hover:bg-gray-700/60'}`}>
                          Overview
                        </button>
                        <button
                          onClick={() => setActiveTab('atmosphere')}
                          className={`px-3 py-1 rounded font-medium transition-all duration-150 ${activeTab==='atmosphere' ? 'bg-gray-700 text-white shadow' : 'bg-gray-800/40 text-white/80 hover:bg-gray-700/60'}`}>
                          Atmosphere
                        </button>
                        <button
                          onClick={() => setActiveTab('orbits')}
                          className={`px-3 py-1 rounded font-medium transition-all duration-150 ${activeTab==='orbits' ? 'bg-gray-700 text-white shadow' : 'bg-gray-800/40 text-white/80 hover:bg-gray-700/60'}`}>
                          Orbits
                        </button>
                        <button
                          onClick={() => setActiveTab('missions')}
                          className={`px-3 py-1 rounded font-medium transition-all duration-150 ${activeTab==='missions' ? 'bg-gray-700 text-white shadow' : 'bg-gray-800/40 text-white/80 hover:bg-gray-700/60'}`}>
                          Missions
                        </button>
                      </div>

                      {activeTab === 'overview' && (
                        <div className='p-3'>
                          <p className='text-white leading-relaxed text-sm sm:text-base mb-3 font-medium opacity-95'>{narrate(planet, context)}</p>
                          <div className='grid grid-cols-2 gap-4'>
                            <div className='p-3 bg-gray-800 rounded shadow-lg border border-gray-700'>
                              <div className='text-xs font-semibold text-white opacity-95 mb-1'>Radius (R⊕)</div>
                              <div className='text-2xl font-bold text-white'>{counterRadius || '—'}</div>
                              <a className='text-xs text-blue-300 font-medium hover:text-blue-200 underline' href={getNASAUrl(planet.pl_name)} target='_blank' rel='noreferrer'>Source</a>
                            </div>
                            <div className='p-3 bg-gray-800 rounded shadow-lg border border-gray-700'>
                              <div className='text-xs font-semibold text-white opacity-95 mb-1'>Mass (M⊕)</div>
                              <div className='text-2xl font-bold text-white'>{counterMass || '—'}</div>
                              <a className='text-xs text-blue-300 font-medium hover:text-blue-200 underline' href={getNASAUrl(planet.pl_name)} target='_blank' rel='noreferrer'>Source</a>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'atmosphere' && (
                        <div className='p-3'>
                          <h4 className='font-semibold mb-2 text-white'>Atmospheric Notes</h4>
                          <p className='text-sm text-white opacity-90'>No direct atmosphere measurements available for many exoplanets; where spectral features are available, references are linked.</p>
                          <a className='text-xs text-blue-400 font-medium hover:text-blue-300 underline' href={getNASAUrl(planet.pl_name)} target='_blank' rel='noreferrer'>Read mission notes</a>
                        </div>
                      )}

                      {activeTab === 'orbits' && (
                        <div className='p-3'>
                          <h4 className='font-semibold mb-2 text-white'>Orbital Parameters</h4>
                          <div className='text-sm text-white opacity-90'>Period: {planet.pl_orbper || '—'}</div>
                          <div className='text-sm text-white opacity-90'>Equilibrium temp: {planet.pl_eqt || '—'}</div>
                        </div>
                      )}

                      {activeTab === 'missions' && (
                        <div className='p-3'>
                          <h4 className='font-semibold mb-2 text-white'>Related Missions</h4>
                          <p className='text-sm text-white opacity-90'>This planet has observational data from missions such as Kepler, TESS, Hubble, and JWST where available. See linked source for details.</p>
                          <a className='text-xs text-blue-400 font-medium hover:text-blue-300 underline' href={getNASAUrl(planet.pl_name)} target='_blank' rel='noreferrer'>Explore mission data</a>
                        </div>
                      )}
                    </div>
                    <div className='grid md:grid-cols-2 gap-6'>
                      <div>
                        <h3 className='font-bold text-lg mb-4 text-white'>Planet Properties</h3>
                        <div className='space-y-3'>
                          <div className='flex justify-between py-2 border-b border-gray-100'>
                            <span className='font-medium text-white opacity-90'>Name:</span>
                            <span className='text-white'>{planet.pl_name}</span>
                          </div>
                          <div className='flex justify-between py-2 border-b border-gray-100'>
                            <span className='font-medium text-white opacity-90'>Host Star:</span>
                            <span className='text-white'>{planet.hostname || 'Unknown'}</span>
                          </div>
                          <div className='flex justify-between py-2 border-b border-gray-100'>
                            <span className='font-medium text-white opacity-90'>Distance:</span>
                            <span className='text-white'>
                              {formatValue(planet.sy_dist, ' parsecs')}
                            </span>
                          </div>
                          <div className='flex justify-between py-2 border-b border-gray-100'>
                            <span className='font-medium text-white opacity-90'>Radius:</span>
                            <span className='text-white'>
                              {formatValue(planet.pl_rade, ' R')}
                            </span>
                          </div>
                          <div className='flex justify-between py-2 border-b border-gray-100'>
                            <span className='font-medium text-white opacity-90'>Mass:</span>
                            <span className='text-white'>
                              {formatValue(planet.pl_bmasse, ' M')}
                            </span>
                          </div>
                          <div className='flex justify-between py-2 border-b border-gray-100'>
                            <span className='font-medium text-white opacity-90'>Orbital Period:</span>
                            <span className='text-white'>
                              {formatValue(planet.pl_orbper, ' days')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className='font-bold text-lg mb-4 text-white'>
                          Atmospheric Conditions
                        </h3>
                        <div className='space-y-3'>
                          <div className='flex justify-between py-2 border-b border-gray-100'>
                            <span className='font-medium text-white opacity-90'>Equilibrium Temp:</span>
                            <span className='text-white'>
                              {formatValue(planet.pl_eqt, ' K', 0)}
                            </span>
                          </div>
                          <div className='flex justify-between py-2 border-b border-gray-100'>
                            <span className='font-medium text-white opacity-90'>Insolation:</span>
                            <span className='text-white'>
                              {formatValue(planet.pl_insol, ' Earth')}
                            </span>
                          </div>
                          <div className='flex justify-between py-2 border-b border-gray-100'>
                            <span className='font-medium text-white opacity-90'>Star Type:</span>
                            <span className='text-white'>{planet.st_spectype || 'Unknown'}</span>
                          </div>
                          <div className='flex justify-between py-2 border-b border-gray-100'>
                            <span className='font-medium text-white opacity-90'>Star Temperature:</span>
                            <span className='text-white'>
                              {formatValue(planet.st_teff, ' K', 0)}
                            </span>
                          </div>
                          <div className='flex justify-between py-2 border-b border-gray-100'>
                            <span className='font-medium text-white opacity-90'>Discovery Method:</span>
                            <span className='text-white'>
                              {planet.discoverymethod || 'Unknown'}
                            </span>
                          </div>
                          <div className='flex justify-between py-2 border-b border-gray-100'>
                            <span className='font-medium text-white opacity-90'>Discovery Year:</span>
                            <span className='text-white'>
                              {planet.discoveryyear || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* NASA Learn More Button */}
                    <div className='flex justify-center pt-4'>
                      <button
                        onClick={() => window.open(getNASAUrl(planet.pl_name), '_blank')}
                        className='bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl hover:scale-105'
                      >
                        <span>🚀</span>
                        Learn more about this planet
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Weather Simulator Modal */}
      <WeatherSimulator
        planet={planet}
        isOpen={showWeatherSim}
        onClose={() => setShowWeatherSim(false)}
      />
    </>
  );
};

export default PlanetDetail;

import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { Planet } from '../lib/filters';

interface WeatherPattern {
  type: 'storm' | 'clear' | 'cloudy' | 'extreme' | 'aurora' | 'rain';
  intensity: number; // 0-100
  duration: number; // hours
  description: string;
}

interface AtmosphericCondition {
  temperature: number; // Kelvin
  
  pressure: number; // Earth atmospheres
  windSpeed: number; // km/h
  humidity: number; // percentage
  visibility: number; // km
  uvIndex: number; // 0-15+
}

interface WeatherEvent {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-100
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  effects: string[];
}

interface WeatherSimulatorProps {
  planet: Planet;
  isOpen: boolean;
  onClose: () => void;
}

// Weather events based on planet characteristics
const generateWeatherEvents = (planet: Planet): WeatherEvent[] => {
  const events: WeatherEvent[] = [];
  const temp = planet.pl_eqt || 255;
  const radius = planet.pl_rade || 1;
  const insolation = planet.pl_insol || 1;

  // Hot planet events
  if (temp > 1000) {
    events.push({
      id: 'lava-rain',
      name: 'Molten Rock Precipitation',
      description: 'Temperatures so extreme that rock vaporizes and condenses as molten droplets',
      probability: 85,
      severity: 'extreme',
      effects: ['Surface melting', 'Metal vapor clouds', 'Extreme radiation'],
    });

    events.push({
      id: 'plasma-storms',
      name: 'Plasma Storm Systems',
      description: 'Ionized atmospheric particles create violent electromagnetic storms',
      probability: 70,
      severity: 'extreme',
      effects: ['Electromagnetic interference', 'Aurora-like displays', 'Particle radiation'],
    });
  }

  // Very hot planets
  if (temp > 800 && temp <= 1000) {
    events.push({
      id: 'metal-snow',
      name: 'Metallic Precipitation',
      description: 'Vaporized metals condense in the upper atmosphere and fall as metallic snow',
      probability: 60,
      severity: 'severe',
      effects: ['Metallic cloud formation', 'Conductive surface deposits', 'Extreme corrosion'],
    });
  }

  // Hot Jupiter-like conditions
  if (temp > 600 && radius > 3) {
    events.push({
      id: 'diamond-rain',
      name: 'Diamond Rain Events',
      description: 'Extreme pressure and carbon-rich atmosphere create diamond precipitation',
      probability: 40,
      severity: 'moderate',
      effects: ['Crystalline precipitation', 'Pressure variations', 'Valuable surface deposits'],
    });

    events.push({
      id: 'supersonic-winds',
      name: 'Supersonic Wind Storms',
      description: 'Atmospheric circulation creates winds exceeding the speed of sound',
      probability: 90,
      severity: 'extreme',
      effects: ['Sonic shockwaves', 'Rapid temperature changes', 'Atmospheric mixing'],
    });
  }

  // Earth-like conditions
  if (temp > 200 && temp < 350 && radius > 0.5 && radius < 2) {
    events.push({
      id: 'water-cycle',
      name: 'Liquid Water Weather',
      description: 'Traditional water-based precipitation and weather patterns',
      probability: 95,
      severity: 'mild',
      effects: ['Cloud formation', 'Precipitation cycles', 'Seasonal variations'],
    });

    events.push({
      id: 'aurora',
      name: 'Auroral Displays',
      description: 'Magnetic field interactions create beautiful light displays',
      probability: 30,
      severity: 'mild',
      effects: ['Light phenomena', 'Particle interactions', 'Navigation interference'],
    });
  }

  // Cold planets
  if (temp < 200) {
    events.push({
      id: 'nitrogen-snow',
      name: 'Nitrogen Snow Storms',
      description: 'Frozen nitrogen and other gases create alien snowfall patterns',
      probability: 70,
      severity: 'moderate',
      effects: ['Frozen gas precipitation', 'Sublimation cycles', 'Surface frost'],
    });

    events.push({
      id: 'cryovolcanism',
      name: 'Ice Volcano Activity',
      description: 'Subsurface liquids erupt as ice and gas geysers',
      probability: 25,
      severity: 'moderate',
      effects: ['Ice geysers', 'Surface renewal', 'Atmospheric venting'],
    });
  }

  // High insolation events
  if (insolation > 10) {
    events.push({
      id: 'radiation-storms',
      name: 'Stellar Radiation Storms',
      description: 'Intense stellar radiation creates dangerous atmospheric conditions',
      probability: 80,
      severity: 'severe',
      effects: ['High UV exposure', 'Atmospheric ionization', 'Radiation hazards'],
    });
  }

  // Tidally locked planets
  if (planet.pl_orbper && planet.pl_orbper < 10) {
    events.push({
      id: 'terminator-storms',
      name: 'Terminator Zone Cyclones',
      description:
        'Extreme temperature differences create massive storm systems at day/night boundary',
      probability: 95,
      severity: 'extreme',
      effects: ['Extreme wind gradients', 'Temperature shocks', 'Atmospheric circulation'],
    });
  }

  return events;
};

// Generate atmospheric conditions based on planet properties
const generateAtmosphericConditions = (planet: Planet, timeOfDay: number): AtmosphericCondition => {
  const baseTemp = planet.pl_eqt || 255;
  const insolation = planet.pl_insol || 1;
  const radius = planet.pl_rade || 1;

  // Time-based temperature variation (simplified)
  const tempVariation = Math.sin(timeOfDay * Math.PI * 2) * 20; // 20K daily variation
  const temperature = baseTemp + tempVariation;

  // Pressure estimate based on planet size and temperature
  const pressure = radius * Math.sqrt(temperature / 255) * 0.5;

  // Wind speed based on temperature gradients and planet properties
  const windSpeed = Math.abs(tempVariation) * 10 + insolation * 5;

  // Simplified atmospheric properties
  const humidity = Math.max(0, Math.min(100, temperature > 273 && temperature < 373 ? 60 : 5));

  const visibility = Math.max(0.1, 50 - windSpeed / 10);
  const uvIndex = Math.min(15, insolation * 5);

  return {
    temperature,
    pressure,
    windSpeed,
    humidity,
    visibility,
    uvIndex,
  };
};

// Weather animation component
function WeatherAnimation({ intensity, planet }: { intensity: number; planet: Planet }) {
  const getAnimationStyle = () => {
    const baseOpacity = 0.3 + (intensity / 100) * 0.7;
    const temp = planet.pl_eqt || 255;

    // Ultra-hot planets (>2000K) - Dark with intense reds, oranges, yellows
    if (temp > 2000) {
      return {
        background: `linear-gradient(45deg, 
          rgba(40, 0, 0, ${baseOpacity * 1.2}) 0%,
          rgba(139, 0, 0, ${baseOpacity}) 20%,
          rgba(255, 69, 0, ${baseOpacity * 0.9}) 40%,
          rgba(255, 140, 0, ${baseOpacity * 0.8}) 60%,
          rgba(255, 215, 0, ${baseOpacity * 0.7}) 80%,
          rgba(255, 255, 100, ${baseOpacity * 0.6}) 100%)`,
        animation: 'extreme-flicker 1.5s ease-in-out infinite',
      };
    }

    // Very hot planets (1500-2000K) - Dark red to orange gradients
    if (temp > 1500) {
      return {
        background: `linear-gradient(135deg, 
          rgba(25, 0, 0, ${baseOpacity * 1.1}) 0%,
          rgba(139, 0, 0, ${baseOpacity}) 25%,
          rgba(220, 20, 60, ${baseOpacity * 0.9}) 50%,
          rgba(255, 69, 0, ${baseOpacity * 0.8}) 75%,
          rgba(255, 140, 0, ${baseOpacity * 0.7}) 100%)`,
        animation: 'storm-pulse 2s ease-in-out infinite',
      };
    }

    // Hot planets (1000-1500K) - Dark to red/orange
    if (temp > 1000) {
      return {
        background: `linear-gradient(45deg, 
          rgba(20, 10, 0, ${baseOpacity * 1.1}) 0%,
          rgba(139, 69, 19, ${baseOpacity}) 30%,
          rgba(178, 34, 34, ${baseOpacity * 0.9}) 60%,
          rgba(255, 69, 0, ${baseOpacity * 0.8}) 100%)`,
        animation: 'storm-pulse 2.5s ease-in-out infinite',
      };
    }

    // Warm planets (600-1000K) - Orange to yellow tones
    if (temp > 600) {
      return {
        background: `linear-gradient(45deg, 
          rgba(139, 69, 19, ${baseOpacity}) 0%,
          rgba(205, 92, 92, ${baseOpacity * 0.9}) 30%,
          rgba(255, 140, 0, ${baseOpacity * 0.8}) 70%,
          rgba(255, 215, 0, ${baseOpacity * 0.7}) 100%)`,
        animation: 'extreme-flicker 2s ease-in-out infinite',
      };
    }

    // Temperate planets (300-600K) - Blue to light blue
    if (temp > 300) {
      return {
        background: `linear-gradient(45deg, 
          rgba(25, 25, 112, ${baseOpacity}) 0%,
          rgba(70, 130, 180, ${baseOpacity * 0.9}) 40%,
          rgba(135, 206, 235, ${baseOpacity * 0.8}) 70%,
          rgba(173, 216, 230, ${baseOpacity * 0.7}) 100%)`,
        animation: 'aurora-wave 3s ease-in-out infinite',
      };
    }

    // Cold planets (<300K) - Deep blue to light blue
    return {
      background: `linear-gradient(45deg, 
        rgba(0, 0, 139, ${baseOpacity}) 0%,
        rgba(30, 144, 255, ${baseOpacity * 0.9}) 30%,
        rgba(135, 206, 250, ${baseOpacity * 0.8}) 70%,
        rgba(176, 224, 230, ${baseOpacity * 0.7}) 100%)`,
      animation: 'clear-glow 4s ease-in-out infinite',
    };
  };

  return (
    <div className='absolute inset-0 rounded-lg pointer-events-none' style={getAnimationStyle()} />
  );
}

// Real-time weather display
function WeatherDisplay({
  conditions,
  currentWeather,
  planet,
}: {
  conditions: AtmosphericCondition;
  currentWeather: WeatherPattern;
  planet: Planet;
}) {
  const formatTemperature = (kelvin: number) => {
    const celsius = kelvin - 273.15;
    const fahrenheit = (celsius * 9) / 5 + 32;
    return `${kelvin.toFixed(0)}K (${celsius.toFixed(0)}°C / ${fahrenheit.toFixed(0)}°F)`;
  };

  const getTemperatureColor = (temp: number) => {
    if (temp > 1000) return 'text-red-600';
    if (temp > 500) return 'text-orange-600';
    if (temp > 373) return 'text-yellow-600';
    if (temp > 273) return 'text-green-600';
    return 'text-blue-600';
  };

  const getWindDescription = (speed: number) => {
    if (speed > 1000) return 'Supersonic hurricane';
    if (speed > 300) return 'Devastating storm';
    if (speed > 150) return 'Extreme winds';
    if (speed > 80) return 'Strong winds';
    if (speed > 30) return 'Moderate breeze';
    return 'Light winds';
  };

  return (
    <div className='relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 overflow-hidden border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300'>
      <WeatherAnimation intensity={currentWeather.intensity} planet={planet} />

      <div className='relative z-10'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* Current Conditions */}
          <div>
            <h3 className='text-lg font-bold text-white mb-4'>Current Conditions</h3>
            <div className='space-y-3'>
              <div className='flex justify-between items-center'>
                <span className='text-gray-300'>Temperature:</span>
                <span className={`font-bold ${getTemperatureColor(conditions.temperature)}`}>
                  {formatTemperature(conditions.temperature)}
                </span>
              </div>

              <div className='flex justify-between items-center'>
                <span className='text-gray-300'>Pressure:</span>
                <span className='font-medium'>{conditions.pressure.toFixed(2)} atm</span>
              </div>

              <div className='flex justify-between items-center'>
                <span className='text-gray-300'>Wind Speed:</span>
                <span className='font-medium text-blue-400'>
                  {conditions.windSpeed.toFixed(0)} km/h
                </span>
              </div>

              <div className='flex justify-between items-center'>
                <span className='text-gray-300'>Wind Condition:</span>
                <span className='font-medium text-orange-400'>
                  {getWindDescription(conditions.windSpeed)}
                </span>
              </div>

              <div className='flex justify-between items-center'>
                <span className='text-gray-300'>Visibility:</span>
                <span className='font-medium text-green-400'>
                  {conditions.visibility.toFixed(1)} km
                </span>
              </div>

              <div className='flex justify-between items-center'>
                <span className='text-gray-300'>UV Index:</span>
                <span
                  className={`font-bold ${
                    conditions.uvIndex > 10
                      ? 'text-red-400'
                      : conditions.uvIndex > 6
                        ? 'text-orange-400'
                        : 'text-green-400'
                  }`}
                >
                  {conditions.uvIndex.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Weather Pattern */}
          <div>
            <h3 className='text-lg font-bold text-white mb-4'>Weather Pattern</h3>
            <div className='space-y-3'>
              <div>
                <span className='text-gray-300'>Current Pattern:</span>
                <div className='font-bold text-purple-400 capitalize mt-1'>
                  {currentWeather.type.replace('-', ' ')}
                </div>
              </div>

              <div>
                <span className='text-gray-300'>Intensity:</span>
                <div className='flex items-center gap-2 mt-1'>
                  <div className='flex-1 bg-gray-600 rounded-full h-2'>
                    <div
                      className={`h-2 rounded-full ${
                        currentWeather.intensity > 70
                          ? 'bg-red-500'
                          : currentWeather.intensity > 40
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${currentWeather.intensity}%` }}
                    />
                  </div>
                  <span className='text-sm font-medium text-white'>
                    {currentWeather.intensity}%
                  </span>
                </div>
              </div>

              <div>
                <span className='text-gray-300'>Duration:</span>
                <div className='font-medium text-white mt-1'>
                  {currentWeather.duration} hours remaining
                </div>
              </div>

              <div>
                <span className='text-gray-300'>Description:</span>
                <div className='text-sm text-gray-200 mt-1'>{currentWeather.description}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Weather events list
function WeatherEventsList({ events }: { events: WeatherEvent[] }) {
  const getSeverityColor = (severity: WeatherEvent['severity']) => {
    switch (severity) {
      case 'mild':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'severe':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'extreme':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <div className='space-y-4'>
      <h3 className='text-lg font-bold text-white'>Possible Weather Events</h3>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {events.map(event => (
          <div
            key={event.id}
            className='bg-slate-800 rounded-lg border border-white/20 p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-slate-700 hover:scale-105'
          >
            <div className='flex justify-between items-start mb-3'>
              <h4 className='font-bold text-white'>{event.name}</h4>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(event.severity)}`}
              >
                {event.severity.toUpperCase()}
              </span>
            </div>

            <p className='text-sm text-gray-200 mb-3'>{event.description}</p>

            <div className='space-y-2'>
              <div className='flex justify-between items-center'>
                <span className='text-sm text-gray-300'>Probability:</span>
                <span className='text-sm font-medium text-white'>{event.probability}%</span>
              </div>

              <div>
                <span className='text-sm text-gray-300'>Effects:</span>
                <ul className='text-xs text-gray-200 mt-1 space-y-1'>
                  {event.effects.map((effect, index) => (
                    <li key={index} className='flex items-center gap-1'>
                      <span className='text-blue-500'>•</span>
                      {effect}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Time control component
function TimeControl({
  timeOfDay,
  setTimeOfDay,
  isPlaying,
  setIsPlaying,
}: {
  timeOfDay: number;
  setTimeOfDay: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}) {
  const formatTime = (time: number) => {
    const hours = Math.floor(time * 24);
    const minutes = Math.floor((time * 24 * 60) % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className='bg-slate-800 rounded-lg border border-white/20 p-4 shadow-lg hover:shadow-xl transition-all duration-300'>
      <h3 className='text-lg font-bold text-white mb-4'>Time Control</h3>

      <div className='space-y-4'>
        <div>
          <div className='flex justify-between items-center mb-2'>
            <span className='text-sm text-gray-300'>Local Time:</span>
            <span className='font-bold text-blue-400'>{formatTime(timeOfDay)}</span>
          </div>

          <input
            type='range'
            min='0'
            max='1'
            step='0.01'
            value={timeOfDay}
            onChange={e => setTimeOfDay(parseFloat(e.target.value))}
            className='w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer'
          />
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            isPlaying
              ? 'bg-red-900 text-red-300 hover:bg-red-800'
              : 'bg-green-900 text-green-300 hover:bg-green-800'
          }`}
        >
          {isPlaying ? '⏸ Pause Simulation' : '▶ Play Simulation'}
        </button>
      </div>
    </div>
  );
}

// Main weather simulator component
const WeatherSimulator: React.FC<WeatherSimulatorProps> = ({ planet, isOpen, onClose }) => {
  const [timeOfDay, setTimeOfDay] = useState(0.5); // 0 = midnight, 0.5 = noon, 1 = midnight
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<WeatherPattern>({
    type: 'clear',
    intensity: 30,
    duration: 6,
    description: 'Clear atmospheric conditions with normal visibility',
  });
  const [weatherEvents, setWeatherEvents] = useState<WeatherEvent[]>([]);

  // Generate weather events when planet changes
  useEffect(() => {
    const events = generateWeatherEvents(planet);
    setWeatherEvents(events);

    // Set initial weather based on planet conditions
    const temp = planet.pl_eqt || 255;
    if (temp > 1000) {
      setCurrentWeather({
        type: 'extreme',
        intensity: 90,
        duration: 12,
        description: 'Extreme heat creating hostile surface conditions with molten surfaces',
      });
    } else if (temp > 600) {
      setCurrentWeather({
        type: 'storm',
        intensity: 70,
        duration: 8,
        description: 'Violent atmospheric storms with extreme wind patterns',
      });
    } else if (temp < 200) {
      setCurrentWeather({
        type: 'cloudy',
        intensity: 40,
        duration: 10,
        description: 'Frozen atmospheric conditions with ice crystal formations',
      });
    } else {
      setCurrentWeather({
        type: 'clear',
        intensity: 30,
        duration: 6,
        description: 'Stable atmospheric conditions suitable for observation',
      });
    }
  }, [planet]);

  // Animation loop for time progression
    useEffect(() => {
      let interval: ReturnType<typeof setInterval> | undefined;
  
      if (isPlaying) {
        interval = setInterval(() => {
          setTimeOfDay(prev => (prev + 0.01) % 1); // 100 steps per day
        }, 100); // Update every 100ms
      }
  
      return () => {
        if (interval) clearInterval(interval);
      };
    }, [isPlaying]);

  // Update weather patterns based on time and planet characteristics
  const updateWeatherPattern = useCallback(() => {
    const events = generateWeatherEvents(planet);
    if (events.length > 0) {
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      const shouldOccur = Math.random() * 100 < randomEvent.probability / 10; // Reduced frequency

      if (shouldOccur) {
        const weatherTypes: WeatherPattern['type'][] = [
          'storm',
          'extreme',
          'aurora',
          'rain',
          'cloudy',
        ];
        const newType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];

        setCurrentWeather({
          type: newType,
          intensity: 20 + Math.random() * 80,
          duration: 2 + Math.random() * 10,
          description: randomEvent.description,
        });
      }
    }
  }, [planet]);

  // Randomly update weather patterns
  useEffect(() => {
    const weatherInterval = setInterval(updateWeatherPattern, 5000); // Every 5 seconds
    return () => clearInterval(weatherInterval);
  }, [updateWeatherPattern]);

  // Generate current atmospheric conditions
  const currentConditions = generateAtmosphericConditions(planet, timeOfDay);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
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
          <div className='min-h-screen px-4 py-8'>
            <div className='max-w-7xl mx-auto bg-slate-900 rounded-lg shadow-2xl border border-slate-700'>
              {/* Header */}
              <div className='flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800 rounded-t-lg'>
                <div>
                  <h2 className='text-2xl font-bold text-white flex items-center gap-2'>
                    🌦️ Weather Simulator
                  </h2>
                  <p className='text-gray-300 mt-1'>
                    Real-time atmospheric conditions on {planet.pl_name}
                  </p>
                </div>
                <button onClick={onClose} className='text-gray-400 hover:text-gray-200 p-2'>
                  <XMarkIcon className='w-6 h-6' />
                </button>
              </div>

              <div className='p-6 space-y-6'>
                {/* Current Weather Display */}
                <WeatherDisplay
                  conditions={currentConditions}
                  currentWeather={currentWeather}
                  planet={planet}
                />

                <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                  {/* Time Control */}
                  <div className='lg:col-span-1'>
                    <TimeControl
                      timeOfDay={timeOfDay}
                      setTimeOfDay={setTimeOfDay}
                      isPlaying={isPlaying}
                      setIsPlaying={setIsPlaying}
                    />
                  </div>

                  {/* Weather Events */}
                  <div className='lg:col-span-2'>
                    <WeatherEventsList events={weatherEvents} />
                  </div>
                </div>

                {/* Planet Info */}
                <div className='bg-blue-50 rounded-lg p-4 border border-blue-200 shadow-md hover:shadow-lg transition-all duration-300 hover:bg-blue-100'>
                  <h3 className='font-bold text-blue-900 mb-2'>Planet Characteristics</h3>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                    <div>
                      <span className='text-blue-700'>Temperature:</span>
                      <div className='font-bold'>{planet.pl_eqt?.toFixed(0) || 'Unknown'} K</div>
                    </div>
                    <div>
                      <span className='text-blue-700'>Size:</span>
                      <div className='font-bold'>{planet.pl_rade?.toFixed(1) || 'Unknown'} R⊕</div>
                    </div>
                    <div>
                      <span className='text-blue-700'>Insolation:</span>
                      <div className='font-bold'>{planet.pl_insol?.toFixed(1) || 'Unknown'} S⊕</div>
                    </div>
                    <div>
                      <span className='text-blue-700'>Period:</span>
                      <div className='font-bold'>
                        {planet.pl_orbper?.toFixed(1) || 'Unknown'} days
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom CSS for animations */}
              <style>{`
                @keyframes storm-pulse { 0%, 100% { opacity: 0.4; filter: brightness(1); } 50% { opacity: 0.9; filter: brightness(1.2); } }
                @keyframes extreme-flicker { 0%,100% { opacity:0.5; filter:brightness(1) saturate(1); } 25% { opacity:0.95; filter:brightness(1.4) saturate(1.3); } 75% { opacity:0.4; filter:brightness(0.8) saturate(1.1); } }
                @keyframes aurora-wave { 0%,100% { transform: translateX(0); opacity: 0.5; filter: brightness(1);} 50% { transform: translateX(8px); opacity:0.8; filter: brightness(1.1);} }
                @keyframes rain-fall { 0%{ transform: translateY(-10px); opacity:0.8;} 100%{ transform: translateY(10px); opacity:0.4;} }
                @keyframes cloud-drift { 0%,100%{ transform: translateX(0); opacity:0.6; } 50%{ transform: translateX(6px); opacity:0.8; } }
                @keyframes clear-glow { 0%,100%{ opacity:0.3; filter:brightness(1);} 50%{ opacity:0.6; filter:brightness(1.1);} }
              `}</style>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default WeatherSimulator;

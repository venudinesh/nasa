import React, { useState, useEffect } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface Mission {
  id: string;
  name: string;
  year: number;
  blurb: string;
  link: string;
}

const Timeline: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  // Fixed visual style: use translucent background (better text contrast than opacity)
  // Previously we offered variants A/B/C; now we lock to A-like translucent style.

  useEffect(() => {
    console.log('🚀 Timeline: Starting to fetch missions data...')
    fetch('/data/missions.json')
      .then(response => {
        console.log('🚀 Timeline: Response received:', response.status)
        return response.json()
      })
      .then((data: Mission[]) => {
        console.log('🚀 Timeline: Data loaded:', data.length, 'missions')
        setMissions(data.sort((a, b) => b.year - a.year)); // Sort by year, newest first
        setLoading(false);
      })
      .catch(error => {
        console.error('❌ Timeline: Error loading missions:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className='p-6 text-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-cosmic-purple mx-auto'></div>
        <p className='mt-2 text-gray-600'>Loading mission timeline...</p>
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto p-3 sm:p-6'>
      <h2 className='text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-900'>
        Space Exploration Timeline
      </h2>
      {/* Fixed card style applied (translucent background with bright text) */}
      <p className='text-center text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto text-sm sm:text-base px-4'>
        Key missions that have revolutionized our understanding of the cosmos and paved the way for
        exoplanet discovery.
      </p>
      
  {/* timeline */}
      {missions.length === 0 && !loading && (
        <div className="text-center text-red-500 mb-4">
          ⚠️ No missions data loaded
        </div>
      )}
      
      {missions.length > 0 && (
        <div className="text-center text-green-600 mb-4 text-sm">
          ✅ Loaded {missions.length} missions
        </div>
      )}

      <div className='relative'>
        {/* Timeline line */}
        <div className='absolute left-4 md:left-1/2 transform md:-translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-cosmic-purple to-space-blue'></div>

        <div className='space-y-6 sm:space-y-8'>
          {missions.map((mission, index) => (
            <div
              key={mission.id}
              className={`flex items-center ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
            >
              {/* Year badge */}
              <div className='absolute left-0 md:left-1/2 transform md:-translate-x-1/2 bg-cosmic-purple text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold z-10 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110'>
                {mission.year}
              </div>

              {/* Mission card - use planet-card styles for consistent hover/animations */}
              <div
                className={`ml-10 sm:ml-12 md:ml-0 md:w-5/12 ${index % 2 === 0 ? 'md:mr-auto md:pr-6 lg:pr-8' : 'md:ml-auto md:pl-6 lg:pl-8'}`}
              >
                <div
                  className={
                    // dark translucent background with bright text for readability
                    `planet-card bg-black/70 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer p-4 sm:p-6 border border-white/10 focus:outline-none hover:scale-105 hover:-translate-y-2 hover:border-cosmic-purple/40 `
                  }
                >
                  <h3 className='text-lg sm:text-xl font-bold text-white mb-2'>{mission.name}</h3>
                  <p className='text-white leading-relaxed mb-3 sm:mb-4 text-sm sm:text-base'>
                    {mission.blurb}
                  </p>
                  {mission.link && (
                    <a
                      href={mission.link}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-2 text-cosmic-purple hover:text-purple-300 font-medium text-sm transition-all duration-200 hover:gap-3 hover:shadow-md hover:bg-white/5 px-2 py-1 rounded-md'
                    >
                      Learn More
                      <ArrowTopRightOnSquareIcon className='w-4 h-4' />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;

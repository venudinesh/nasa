import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Combobox } from '@headlessui/react';
import { Planet } from '../lib/filters';

interface SearchBarProps {
  onSearchResults: (results: Planet[]) => void;
  planets: Planet[];
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearchResults, planets, className = '' }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<Planet | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      onSearchResults(planets);
      return;
    }

    setIsSearching(true);

    // Simple fuzzy search without lunr for now
    const searchTerm = query.toLowerCase();
    const results = planets.filter(
      planet =>
        planet.pl_name?.toLowerCase().includes(searchTerm) ||
        planet.hostname?.toLowerCase().includes(searchTerm) ||
        planet.discoverymethod?.toLowerCase().includes(searchTerm) ||
        planet.disc_facility?.toLowerCase().includes(searchTerm)
    );

    setTimeout(() => {
      onSearchResults(results);
      setIsSearching(false);
    }, 100);
  }, [query, planets, onSearchResults]);

  const handleClear = () => {
    setQuery('');
  };

  // Filter planets based on query (simple fuzzy match)
  const filtered = query.trim()
    ? planets.filter(
        (planet: Planet) =>
          (planet.pl_name || '').toLowerCase().includes(query.toLowerCase()) ||
          (planet.hostname || '').toLowerCase().includes(query.toLowerCase()) ||
          (planet.discoverymethod || '').toLowerCase().includes(query.toLowerCase()) ||
          (planet.disc_facility || '').toLowerCase().includes(query.toLowerCase())
      )
    : planets;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // On Enter, emit current filtered results
      onSearchResults(filtered);
    }
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Combobox
        value={selected}
          onChange={(val: Planet | null) => {
          setSelected(val);
          if (val) {
            setQuery(val.pl_name || '');
            onSearchResults([val]);
          }
        }}
      >
        <div className='relative'>
          <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
            <MagnifyingGlassIcon className='h-5 w-5 text-gray-400' />
          </div>
          <Combobox.Input
            className='block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-cosmic-purple focus:border-transparent text-sm shadow-md hover:shadow-lg transition-all duration-200 focus:shadow-xl'
            placeholder='Search planets, stars, or discovery methods...'
            displayValue={() => query}
            onChange={e => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            onKeyDown={handleKeyDown}
          />

          {query && (
            <button
              onClick={handleClear}
              className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-r-lg transition-all duration-200 hover:scale-110'
            >
              <XMarkIcon className='h-5 w-5' />
            </button>
          )}
        </div>

        {isSearching && (
          <div className='absolute right-3 top-3'>
            <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-cosmic-purple'></div>
          </div>
        )}

        {query && (
          <Combobox.Options className='absolute top-full left-0 right-0 mt-1 text-sm bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-64 overflow-y-auto transition-all duration-200'>
            {filtered.length === 0 && <div className='px-3 py-2 text-gray-500'>No results</div>}
            {filtered.map((planet: Planet) => (
              <Combobox.Option
                key={planet.pl_name || planet.hostname || Math.random()}
                value={planet}
              >
                {({ active }) => (
                  <div
                    className={`px-3 py-2 cursor-pointer ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}`}
                  >
                    <div className='font-medium'>{planet.pl_name || planet.hostname}</div>
                    {planet.discoverymethod && (
                      <div className='text-xs text-gray-500'>{planet.discoverymethod}</div>
                    )}
                  </div>
                )}
              </Combobox.Option>
            ))}
            <div className='px-3 py-2 text-gray-500'>Press Enter to search • ESC to clear</div>
          </Combobox.Options>
        )}
      </Combobox>
    </div>
  );
};

export default SearchBar;

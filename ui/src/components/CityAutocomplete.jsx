import React, { useState, useEffect, useRef } from 'react';

// Country code to country name mapping (common countries)
const COUNTRY_NAMES = {
  'US': 'USA',
  'GB': 'UK',
  'CA': 'Canada',
  'AU': 'Australia',
  'NZ': 'New Zealand',
  'FR': 'France',
  'DE': 'Germany',
  'IT': 'Italy',
  'ES': 'Spain',
  'JP': 'Japan',
  'CN': 'China',
  'IN': 'India',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'AR': 'Argentina',
  'ZA': 'South Africa',
  'NG': 'Nigeria',
  'EG': 'Egypt',
  'KE': 'Kenya',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'PL': 'Poland',
  'RU': 'Russia',
  'UA': 'Ukraine',
  'TR': 'Turkey',
  'SA': 'Saudi Arabia',
  'AE': 'UAE',
  'IL': 'Israel',
  'SG': 'Singapore',
  'MY': 'Malaysia',
  'TH': 'Thailand',
  'PH': 'Philippines',
  'ID': 'Indonesia',
  'VN': 'Vietnam',
  'KR': 'South Korea',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
  'CL': 'Chile',
  'CO': 'Colombia',
  'PE': 'Peru',
  'VE': 'Venezuela',
  'PT': 'Portugal',
  'GR': 'Greece',
  'CZ': 'Czech Republic',
  'AT': 'Austria',
  'CH': 'Switzerland',
  'IE': 'Ireland'
};

// Cache for loaded cities data - loaded on demand
let citiesCache = null;

const CityAutocomplete = ({
  value,
  onChange,
  placeholder = "Search for a city...",
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [citiesLoaded, setCitiesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load cities data lazily on first focus
  const loadCities = async () => {
    if (citiesCache) {
      setCitiesLoaded(true);
      return citiesCache;
    }

    setIsLoading(true);
    try {
      const citiesModule = await import('cities.json');
      const citiesData = citiesModule.default;

      // Process cities data
      citiesCache = citiesData.map(city => ({
        name: city.name,
        country: COUNTRY_NAMES[city.country] || city.country,
        countryCode: city.country,
        lat: parseFloat(city.lat),
        lng: parseFloat(city.lng),
        displayName: `${city.name}, ${COUNTRY_NAMES[city.country] || city.country}`
      }));

      setCitiesLoaded(true);
      return citiesCache;
    } catch (e) {
      console.error('Failed to load cities data:', e);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Search cities when query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Only search if cities are loaded
    if (!citiesCache) {
      loadCities().then(() => {
        // Re-trigger search after loading
        if (citiesCache && query.length >= 2) {
          searchCities(query);
        }
      });
      return;
    }

    searchCities(query);
  }, [query, citiesLoaded]);

  const searchCities = (searchQuery) => {
    if (!citiesCache) return;

    const lowerQuery = searchQuery.toLowerCase();

    // Fuzzy search: match city name or country
    const matches = citiesCache
      .filter(city =>
        city.name.toLowerCase().includes(lowerQuery) ||
        city.country.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 10); // Limit to 10 results

    setResults(matches);
    setShowDropdown(matches.length > 0);
    setSelectedIndex(0);
  };

  // Handle city selection
  const handleSelect = (city) => {
    setQuery(city.displayName);
    setShowDropdown(false);

    // Call onChange with city data
    onChange({
      city: city.displayName,
      latitude: city.lat,
      longitude: city.lng
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
      default:
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync query with value prop
  useEffect(() => {
    if (value && value !== query) {
      setQuery(value);
    }
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          loadCities(); // Preload cities on focus
          if (query.length >= 2 && results.length > 0) setShowDropdown(true);
        }}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-white border border-[rgba(26,26,26,0.12)] rounded-xl text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:border-[#0F4C5C] focus:ring-2 focus:ring-[rgba(15,76,92,0.1)] transition-colors"
        autoComplete="off"
      />

      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-[rgba(26,26,26,0.12)] rounded-xl shadow-xl max-h-80 overflow-y-auto"
        >
          {results.map((city, index) => (
            <button
              key={`${city.name}-${city.countryCode}-${index}`}
              onClick={() => handleSelect(city)}
              className={`w-full px-4 py-3 text-left hover:bg-[#F5F2ED] transition-colors ${
                index === selectedIndex ? 'bg-[#F5F2ED]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[#1A1A1A] font-medium">{city.name}</div>
                  <div className="text-[#525252] text-sm">{city.country}</div>
                </div>
                <div className="text-xs text-[#8A8A8A]">
                  {city.lat.toFixed(2)}, {city.lng.toFixed(2)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isLoading && query.length >= 2 && (
        <div
          className="absolute z-50 w-full mt-2 bg-white border border-[rgba(26,26,26,0.12)] rounded-xl shadow-xl p-4"
        >
          <div className="text-[#8A8A8A] text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#0F4C5C] border-t-transparent rounded-full animate-spin"></div>
            Loading cities...
          </div>
        </div>
      )}

      {!isLoading && query.length >= 2 && results.length === 0 && showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-[rgba(26,26,26,0.12)] rounded-xl shadow-xl p-4"
        >
          <div className="text-[#8A8A8A] text-sm">
            No cities found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;

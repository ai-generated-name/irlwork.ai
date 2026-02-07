import React, { useState, useEffect, useRef, useMemo } from 'react';
import citiesData from 'cities.json';

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

// Filter to major cities (reduce dataset for performance)
// Keep cities that are more likely to be relevant
const majorCities = useMemo(() => {
  // For now, just use all cities. Can optimize later if performance is an issue
  return citiesData.map(city => ({
    name: city.name,
    country: COUNTRY_NAMES[city.country] || city.country,
    countryCode: city.country,
    lat: parseFloat(city.lat),
    lng: parseFloat(city.lng),
    displayName: `${city.name}, ${COUNTRY_NAMES[city.country] || city.country}`
  }));
}, []);

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
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Search cities when query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const lowerQuery = query.toLowerCase();

    // Fuzzy search: match city name or country
    const matches = majorCities
      .filter(city =>
        city.name.toLowerCase().includes(lowerQuery) ||
        city.country.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 10); // Limit to 10 results

    setResults(matches);
    setShowDropdown(matches.length > 0);
    setSelectedIndex(0);
  }, [query]);

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
        onFocus={() => query.length >= 2 && results.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
        autoComplete="off"
      />

      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-800 rounded-lg shadow-xl max-h-80 overflow-y-auto"
        >
          {results.map((city, index) => (
            <button
              key={`${city.name}-${city.countryCode}-${index}`}
              onClick={() => handleSelect(city)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors ${
                index === selectedIndex ? 'bg-gray-800' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{city.name}</div>
                  <div className="text-gray-400 text-sm">{city.country}</div>
                </div>
                <div className="text-xs text-gray-500">
                  {city.lat.toFixed(2)}, {city.lng.toFixed(2)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-800 rounded-lg shadow-xl p-4"
        >
          <div className="text-gray-400 text-sm">
            No cities found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;

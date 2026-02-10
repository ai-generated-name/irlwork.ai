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

// Countries where state/province should be shown in display name
const COUNTRIES_WITH_STATES = ['US', 'CA', 'AU'];

// Cache for loaded cities and admin1 data - loaded on demand
let citiesCache = null;
let admin1Map = null;

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
  const lastValidCity = useRef(value || null);
  const queryRef = useRef(query);

  // Load cities data lazily on first focus
  const loadCities = async () => {
    if (citiesCache) {
      setCitiesLoaded(true);
      return citiesCache;
    }

    setIsLoading(true);
    try {
      // Load cities and admin1 data in parallel
      const [citiesModule, admin1Module] = await Promise.all([
        import('cities.json'),
        import('cities.json/admin1.json')
      ]);
      const citiesData = citiesModule.default;
      const admin1Data = admin1Module.default;

      // Build admin1 lookup map: "US.MA" -> "Massachusetts"
      if (!admin1Map) {
        admin1Map = new Map();
        admin1Data.forEach(a => admin1Map.set(a.code, a.name));
      }

      // Process cities data with state/province info
      citiesCache = citiesData.map(city => {
        const countryCode = city.country;
        const countryName = COUNTRY_NAMES[countryCode] || countryCode;

        // Look up state/province name for countries that use them
        let stateName = null;
        let stateCode = null;
        if (COUNTRIES_WITH_STATES.includes(countryCode) && city.admin1) {
          const admin1Key = `${countryCode}.${city.admin1}`;
          stateName = admin1Map.get(admin1Key) || null;
          stateCode = city.admin1;
        }

        // Build display name: "City, State, Country" or "City, Country"
        let displayName;
        if (stateName) {
          displayName = `${city.name}, ${stateName}, ${countryName}`;
        } else {
          displayName = `${city.name}, ${countryName}`;
        }

        return {
          name: city.name,
          country: countryName,
          countryCode,
          state: stateName,
          stateCode,
          lat: parseFloat(city.lat),
          lng: parseFloat(city.lng),
          displayName
        };
      });

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
    lastValidCity.current = city.displayName;
    setShowDropdown(false);

    // Call onChange with full city data including country and state
    onChange({
      city: city.displayName,
      latitude: city.lat,
      longitude: city.lng,
      country: city.country,
      country_code: city.countryCode,
      state: city.state,
      state_code: city.stateCode
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
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Sync query with value prop
  useEffect(() => {
    if (value && value !== query) {
      setQuery(value);
      lastValidCity.current = value;
    }
  }, [value]);

  // Keep queryRef in sync for use inside setTimeout
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  // Revert to last valid city on blur (prevents free-text entry)
  const handleBlur = () => {
    setTimeout(() => {
      setShowDropdown(false);
      // Use ref to get current query value (state may be stale in timeout)
      const currentQuery = queryRef.current;
      if (currentQuery !== lastValidCity.current) {
        setQuery(lastValidCity.current || '');
        if (!lastValidCity.current) {
          onChange({
            city: '',
            latitude: null,
            longitude: null,
            country: null,
            country_code: null,
            state: null,
            state_code: null
          });
        }
      }
    }, 200);
  };

  return (
    <div className={`city-autocomplete-v4 ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          loadCities(); // Preload cities on focus
          if (query.length >= 2) {
            if (results.length > 0) {
              setShowDropdown(true);
            } else if (citiesCache) {
              searchCities(query);
            }
          }
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="city-autocomplete-v4-input"
        autoComplete="off"
      />

      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="city-autocomplete-v4-dropdown"
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
        >
          {results.map((city, index) => (
            <button
              key={`${city.name}-${city.countryCode}-${index}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(city); }}
              className={`city-autocomplete-v4-item ${index === selectedIndex ? 'selected' : ''}`}
            >
              <div>
                <div className="city-autocomplete-v4-item-name">{city.name}</div>
                <div className="city-autocomplete-v4-item-country">{city.country}</div>
              </div>
              <div className="city-autocomplete-v4-item-coords">
                {city.lat.toFixed(2)}, {city.lng.toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      )}

      {isLoading && query.length >= 2 && (
        <div className="city-autocomplete-v4-dropdown">
          <div className="city-autocomplete-v4-loading">
            <div className="w-4 h-4 border-2 border-[var(--orange-500)] border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
            Loading cities...
          </div>
        </div>
      )}

      {!isLoading && query.length >= 2 && results.length === 0 && showDropdown && (
        <div
          ref={dropdownRef}
          className="city-autocomplete-v4-dropdown"
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
        >
          <div className="city-autocomplete-v4-empty">
            No cities found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;

import React, { useState, useEffect, useRef } from 'react';
import API_URL from '../config/api';

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
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const lastValidCity = useRef(value || null);
  const queryRef = useRef(query);
  const isSelectingRef = useRef(false);
  const abortRef = useRef(null);
  const justSelectedRef = useRef(false);

  // Search cities via API when query changes (debounced)
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Debounce API calls — wait 300ms after last keystroke
    const timeoutId = setTimeout(() => {
      // Cancel any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      fetch(`${API_URL}/cities/search?q=${encodeURIComponent(query)}&limit=10`, {
        signal: controller.signal
      })
        .then(res => res.json())
        .then(cities => {
          setResults(cities);
          setShowDropdown(cities.length > 0);
          setSelectedIndex(0);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error('City search failed:', err);
          }
        })
        .finally(() => setIsLoading(false));
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  // Handle city selection
  const handleSelect = (city) => {
    isSelectingRef.current = false;
    justSelectedRef.current = true;
    setQuery(city.displayName);
    lastValidCity.current = city.displayName;
    setShowDropdown(false);

    onChange({
      city: city.name,
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

  // Close dropdown when clicking/tapping outside
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

    // pointerdown works for both mouse and touch, and does NOT fire
    // for virtual keyboard taps on mobile
    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, []);

  // Calculate fixed dropdown position on mobile
  useEffect(() => {
    if (showDropdown && inputRef.current && window.innerWidth <= 767) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownTop(rect.bottom + 4);
    }
  }, [showDropdown]);

  // Sync query with value prop (skip if we just selected internally)
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (!value) {
      setQuery('');
      lastValidCity.current = null;
    } else if (value !== query) {
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
      // If user is tapping a dropdown item, don't revert
      if (isSelectingRef.current) {
        isSelectingRef.current = false;
        return;
      }
      // On mobile, blur/refocus cycles happen frequently (keyboard toggle,
      // viewport resize). If the input already regained focus, skip revert.
      if (document.activeElement === inputRef.current) {
        return;
      }
      setShowDropdown(false);
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
          if (query.length >= 2 && results.length > 0) {
            setShowDropdown(true);
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
          style={dropdownTop != null && window.innerWidth <= 767 ? { top: dropdownTop } : undefined}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={() => { isSelectingRef.current = true; }}
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
        <div
          className="city-autocomplete-v4-dropdown"
          style={dropdownTop != null && window.innerWidth <= 767 ? { top: dropdownTop } : undefined}
        >
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
          style={dropdownTop != null && window.innerWidth <= 767 ? { top: dropdownTop } : undefined}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={() => { isSelectingRef.current = true; }}
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

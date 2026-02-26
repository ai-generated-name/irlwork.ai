import React, { useState, useEffect, useRef } from 'react';
import API_URL from '../config/api';

const CountryAutocomplete = ({
  value,
  onChange,
  placeholder = "Search country...",
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
  const lastValidCountry = useRef(value || null);
  const queryRef = useRef(query);
  const isSelectingRef = useRef(false);
  const abortRef = useRef(null);

  // Search countries via API when query changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      const url = query.length >= 1
        ? `${API_URL}/countries/search?q=${encodeURIComponent(query)}&limit=20`
        : `${API_URL}/countries/search?limit=20`;

      fetch(url, { signal: controller.signal })
        .then(res => res.json())
        .then(countries => {
          setResults(countries);
          setShowDropdown(true);
          // When user has typed a query, default to the first result (not "All Countries")
          setSelectedIndex(query.length >= 1 && countries.length > 0 ? 1 : 0);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Country search failed:', err);
          }
        })
        .finally(() => setIsLoading(false));
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  const handleSelect = (country) => {
    isSelectingRef.current = false;
    if (country) {
      setQuery(country.name);
      lastValidCountry.current = country.name;
      setShowDropdown(false);
      onChange(country.name, country.code);
    } else {
      // "All" option
      setQuery('');
      lastValidCountry.current = null;
      setShowDropdown(false);
      onChange('', '');
    }
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setShowDropdown(true);
        // When user has typed a query, default to the first result (not "All Countries")
        setSelectedIndex(query.length >= 1 && results.length > 0 ? 1 : 0);
      }
      return;
    }

    // +1 for the "All Countries" option at index 0
    const totalItems = 1 + results.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < totalItems - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex === 0) {
          handleSelect(null); // "All"
        } else if (results[selectedIndex - 1]) {
          handleSelect(results[selectedIndex - 1]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
      case 'Tab':
        setShowDropdown(false);
        break;
      default:
        break;
    }
  };

  const handleFocus = () => {
    setShowDropdown(true);
    // When user has typed a query, default to the first result (not "All Countries")
    setSelectedIndex(query.length >= 1 && results.length > 0 ? 1 : 0);
    if (inputRef.current && window.innerWidth <= 767) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownTop(rect.bottom + 4);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value && value !== query) {
      setQuery(value);
      lastValidCountry.current = value;
    } else if (!value && query) {
      setQuery('');
      lastValidCountry.current = null;
    }
  }, [value]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const handleBlur = () => {
    setTimeout(() => {
      if (isSelectingRef.current) {
        isSelectingRef.current = false;
        return;
      }
      if (document.activeElement === inputRef.current) return;
      setShowDropdown(false);
      const currentQuery = queryRef.current;
      if (currentQuery !== lastValidCountry.current) {
        setQuery(lastValidCountry.current || '');
        if (!lastValidCountry.current) {
          onChange('');
        }
      }
    }, 200);
  };

  // Scroll selected item into view
  useEffect(() => {
    if (showDropdown && dropdownRef.current && selectedIndex >= 0) {
      const items = dropdownRef.current.querySelectorAll('.city-autocomplete-v4-item');
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showDropdown]);

  return (
    <div className={`city-autocomplete-v4 ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="city-autocomplete-v4-input"
        autoComplete="off"
      />

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="city-autocomplete-v4-dropdown"
          style={dropdownTop != null && window.innerWidth <= 767 ? { top: dropdownTop } : undefined}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={() => { isSelectingRef.current = true; }}
        >
          {/* "All Countries" option */}
          <button
            onMouseDown={(e) => { e.preventDefault(); handleSelect(null); }}
            onMouseEnter={() => setSelectedIndex(0)}
            className={`city-autocomplete-v4-item ${selectedIndex === 0 ? 'selected' : ''} ${!value ? 'skill-active' : ''}`}
          >
            <div>
              <div className="city-autocomplete-v4-item-name">All Countries</div>
            </div>
            {!value && (
              <svg className="skill-autocomplete-check" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {results.length > 0 && results.map((country, index) => {
            const itemIndex = index + 1;
            const isActive = value === country.name;
            return (
              <button
                key={country.code}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(country); }}
                onMouseEnter={() => setSelectedIndex(itemIndex)}
                className={`city-autocomplete-v4-item ${selectedIndex === itemIndex ? 'selected' : ''} ${isActive ? 'skill-active' : ''}`}
              >
                <div>
                  <div className="city-autocomplete-v4-item-name">{country.name}</div>
                </div>
                {isActive && (
                  <svg className="skill-autocomplete-check" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}

          {isLoading && (
            <div className="city-autocomplete-v4-loading" style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-tertiary)' }}>
              Loading...
            </div>
          )}

          {!isLoading && results.length === 0 && query.length >= 1 && (
            <div className="city-autocomplete-v4-empty">
              No countries match "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CountryAutocomplete;

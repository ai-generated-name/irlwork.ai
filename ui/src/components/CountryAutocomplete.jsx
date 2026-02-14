import React, { useState, useRef, useEffect } from 'react';

const COUNTRIES = [
  'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium', 'Brazil',
  'Canada', 'Chile', 'China', 'Colombia', 'Czech Republic', 'Denmark',
  'Egypt', 'Finland', 'France', 'Germany', 'Greece', 'India', 'Indonesia',
  'Ireland', 'Israel', 'Italy', 'Japan', 'Kenya', 'Malaysia', 'Mexico',
  'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Russia', 'Saudi Arabia', 'Singapore',
  'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Thailand',
  'Turkey', 'UAE', 'UK', 'Ukraine', 'USA', 'Venezuela', 'Vietnam',
];

const CountryAutocomplete = ({
  value,
  onChange,
  placeholder = "Any country...",
  className = "",
}) => {
  const [query, setQuery] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownTop, setDropdownTop] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const isSelectingRef = useRef(false);

  const filtered = query.length === 0
    ? COUNTRIES
    : COUNTRIES.filter(c => c.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const handleSelect = (country) => {
    isSelectingRef.current = false;
    if (country) {
      setQuery(country);
      onChange(country);
    } else {
      setQuery('');
      onChange('');
    }
    setShowDropdown(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    setSelectedIndex(0);
    onChange(val);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setShowDropdown(true);
        setSelectedIndex(0);
      }
      return;
    }

    const totalItems = 1 + filtered.length;

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
          handleSelect(null);
        } else if (filtered[selectedIndex - 1]) {
          handleSelect(filtered[selectedIndex - 1]);
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
    setSelectedIndex(0);
    if (inputRef.current && window.innerWidth <= 767) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownTop(rect.bottom + 4);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (isSelectingRef.current) {
        isSelectingRef.current = false;
        return;
      }
      if (document.activeElement === inputRef.current) return;
      setShowDropdown(false);
    }, 200);
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
        onChange={handleInputChange}
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
          {/* "Any Country" option */}
          <button
            onMouseDown={(e) => { e.preventDefault(); handleSelect(null); }}
            onMouseEnter={() => setSelectedIndex(0)}
            className={`city-autocomplete-v4-item ${selectedIndex === 0 ? 'selected' : ''} ${!value ? 'skill-active' : ''}`}
          >
            <div>
              <div className="city-autocomplete-v4-item-name">Any Country</div>
            </div>
          </button>

          {filtered.length > 0 ? (
            filtered.map((country, index) => {
              const itemIndex = index + 1;
              const isActive = value === country;
              return (
                <button
                  key={country}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(country); }}
                  onMouseEnter={() => setSelectedIndex(itemIndex)}
                  className={`city-autocomplete-v4-item ${selectedIndex === itemIndex ? 'selected' : ''} ${isActive ? 'skill-active' : ''}`}
                >
                  <div>
                    <div className="city-autocomplete-v4-item-name">{country}</div>
                  </div>
                </button>
              );
            })
          ) : (
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

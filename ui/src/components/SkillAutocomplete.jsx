import React, { useState, useRef, useEffect } from 'react';
import { TASK_CATEGORIES } from './CategoryPills';

// All skill options (excluding the "All" entry which has empty value)
const ALL_SKILLS = TASK_CATEGORIES.filter(c => c.value !== '');

const SkillAutocomplete = ({
  value,
  onChange,
  placeholder = "Search skills...",
  className = "",
  allLabel = "All Skills",
}) => {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownTop, setDropdownTop] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const isSelectingRef = useRef(false);

  // Filter skills based on query
  const filtered = query.length === 0
    ? ALL_SKILLS
    : ALL_SKILLS.filter(s =>
        s.label.toLowerCase().includes(query.toLowerCase())
      );

  // Check if typed query matches any preset exactly (case-insensitive)
  const queryTrimmed = query.trim();
  const exactMatch = queryTrimmed
    ? ALL_SKILLS.find(s => s.label.toLowerCase() === queryTrimmed.toLowerCase())
    : null;
  // Show "Search for custom skill" option when user typed something that isn't an exact preset match
  const showCustomOption = queryTrimmed.length > 0 && !exactMatch;

  // Sync display text with value prop
  useEffect(() => {
    if (value) {
      const match = ALL_SKILLS.find(s => s.value === value);
      if (match) {
        setQuery(match.label);
      } else {
        // Custom skill value — display it nicely
        setQuery(value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
      }
    } else {
      setQuery('');
    }
  }, [value]);

  const handleSelect = (skill) => {
    isSelectingRef.current = false;
    if (skill) {
      setQuery(skill.label);
      onChange(skill.value);
    } else {
      // "All" option
      setQuery('');
      onChange('');
    }
    setShowDropdown(false);
  };

  const handleSelectCustom = () => {
    isSelectingRef.current = false;
    const customValue = queryTrimmed.toLowerCase().replace(/\s+/g, '_');
    onChange(customValue);
    setShowDropdown(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    // When user is typing, default to the first result (not "All")
    // The filtered list updates synchronously so we can check it after setQuery
    const willHaveResults = val.trim().length > 0
      ? ALL_SKILLS.some(s => s.label.toLowerCase().includes(val.toLowerCase()))
      : true;
    setSelectedIndex(val.trim().length > 0 && willHaveResults ? 1 : 0);
    // If user clears the input, reset the filter
    if (!val.trim()) {
      onChange('');
    }
  };

  // Total items in dropdown: "All" + filtered presets + optional custom
  const getTotalItems = () => 1 + filtered.length + (showCustomOption ? 1 : 0);

  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setShowDropdown(true);
        // When user has typed a query, default to the first result (not "All")
        setSelectedIndex(query.trim().length > 0 && filtered.length > 0 ? 1 : 0);
      }
      return;
    }

    const totalItems = getTotalItems();

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
        } else if (selectedIndex <= filtered.length) {
          handleSelect(filtered[selectedIndex - 1]);
        } else if (showCustomOption && selectedIndex === 1 + filtered.length) {
          handleSelectCustom();
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
    // When user has typed a query, default to the first result (not "All")
    setSelectedIndex(query.trim().length > 0 && filtered.length > 0 ? 1 : 0);
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
      // Revert to the current value label if user typed something invalid
      if (value) {
        const match = ALL_SKILLS.find(s => s.value === value);
        if (match) {
          setQuery(match.label);
        } else {
          // Custom skill — keep the display
          setQuery(value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
        }
      } else {
        setQuery('');
      }
    }, 200);
  };

  // Close on click outside
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

  // Scroll selected item into view
  useEffect(() => {
    if (showDropdown && dropdownRef.current && selectedIndex >= 0) {
      const items = dropdownRef.current.querySelectorAll('.skill-autocomplete-item');
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showDropdown]);

  const customItemIndex = 1 + filtered.length;

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
          {/* "All Skills" option */}
          <button
            onMouseDown={(e) => { e.preventDefault(); handleSelect(null); }}
            onMouseEnter={() => setSelectedIndex(0)}
            className={`skill-autocomplete-item city-autocomplete-v4-item ${selectedIndex === 0 ? 'selected' : ''} ${!value ? 'skill-active' : ''}`}
          >
            <div>
              <div className="city-autocomplete-v4-item-name">{allLabel}</div>
            </div>
            {!value && (
              <svg className="skill-autocomplete-check" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {filtered.length > 0 && (
            filtered.map((skill, index) => {
              const itemIndex = index + 1; // offset by 1 for the "All" option
              const isActive = value === skill.value;
              return (
                <button
                  key={skill.value}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(skill); }}
                  onMouseEnter={() => setSelectedIndex(itemIndex)}
                  className={`skill-autocomplete-item city-autocomplete-v4-item ${selectedIndex === itemIndex ? 'selected' : ''} ${isActive ? 'skill-active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{skill.icon}</span>
                    <div className="city-autocomplete-v4-item-name">{skill.label}</div>
                  </div>
                  {isActive && (
                    <svg className="skill-autocomplete-check" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })
          )}

          {/* Custom skill option — search for whatever the user typed */}
          {showCustomOption && (
            <button
              onMouseDown={(e) => { e.preventDefault(); handleSelectCustom(); }}
              onMouseEnter={() => setSelectedIndex(customItemIndex)}
              className={`skill-autocomplete-item city-autocomplete-v4-item ${selectedIndex === customItemIndex ? 'selected' : ''}`}
              style={{ borderTop: filtered.length > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>🔎</span>
                <div className="city-autocomplete-v4-item-name">
                  Search for "<strong>{queryTrimmed}</strong>"
                </div>
              </div>
            </button>
          )}

          {filtered.length === 0 && !showCustomOption && (
            <div className="city-autocomplete-v4-empty">
              No skills match "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillAutocomplete;

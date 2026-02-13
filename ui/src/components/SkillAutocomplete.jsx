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
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const isSelectingRef = useRef(false);

  // Filter skills based on query
  const filtered = query.length === 0
    ? ALL_SKILLS
    : ALL_SKILLS.filter(s =>
        s.label.toLowerCase().includes(query.toLowerCase())
      );

  // Sync display text with value prop
  useEffect(() => {
    if (value) {
      const match = ALL_SKILLS.find(s => s.value === value);
      if (match) {
        setQuery(match.label);
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

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    setSelectedIndex(0);
    // If user clears the input, reset the filter
    if (!val.trim()) {
      onChange('');
    }
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

    // Build the list: "All" option + filtered results
    const totalItems = 1 + filtered.length; // 1 for "All Skills"

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
        if (match) setQuery(match.label);
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

          {filtered.length > 0 ? (
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
          ) : (
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

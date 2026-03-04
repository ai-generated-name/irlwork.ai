import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Clock, Search, X } from 'lucide-react'
import { formatTimezoneShort, TIMEZONE_OPTIONS } from '../utils/timezone'

export default function TimezoneDropdown({ value, onChange, className, name }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus()
  }, [open])

  const filtered = search
    ? TIMEZONE_OPTIONS.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.value.toLowerCase().includes(search.toLowerCase())
      )
    : TIMEZONE_OPTIONS

  const displayLabel = value ? formatTimezoneShort(value) : ''

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={value || ''} />}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          width: '100%',
          cursor: 'pointer',
          textAlign: 'left',
          background: 'white',
          minHeight: 42
        }}
      >
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: value ? 'var(--text-primary, #1A1A1A)' : 'var(--text-tertiary, #888888)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          <Clock size={14} style={{ flexShrink: 0, color: 'var(--text-tertiary, #888888)' }} />
          {value
            ? TIMEZONE_OPTIONS.find(o => o.value === value)?.label || `${value.split('/').pop().replace(/_/g, ' ')} (${displayLabel})`
            : 'Select timezone...'
          }
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            color: 'var(--text-tertiary, #888888)',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'none'
          }}
        />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'white',
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
          zIndex: 100,
          maxHeight: 280,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Search */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Search size={14} style={{ color: 'var(--text-tertiary, #888888)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timezones..."
              style={{
                border: 'none',
                outline: 'none',
                flex: 1,
                fontSize: 13,
                color: 'var(--text-primary, #1A1A1A)',
                background: 'transparent',
                padding: '4px 0'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
              >
                <X size={12} style={{ color: 'var(--text-tertiary, #888888)' }} />
              </button>
            )}
          </div>

          {/* Options */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange?.('')
                  setOpen(false)
                  setSearch('')
                }}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--text-tertiary, #888888)',
                  textAlign: 'left',
                  fontStyle: 'italic'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(232,133,61,0.04)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'none' }}
              >
                Clear selection
              </button>
            )}
            {filtered.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange?.(opt.value)
                  setOpen(false)
                  setSearch('')
                }}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: opt.value === value ? 'rgba(232,133,61,0.06)' : 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  // eslint-disable-next-line irlwork/no-orange-outside-button -- selected item uses brand color
                  color: opt.value === value ? '#E8853D' : 'var(--text-primary, #1A1A1A)',
                  fontWeight: opt.value === value ? 500 : 400,
                  textAlign: 'left',
                  transition: 'background 0.15s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(232,133,61,0.06)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = opt.value === value ? 'rgba(232,133,61,0.06)' : 'none' }}
              >
                {opt.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-tertiary, #888888)', textAlign: 'center' }}>
                No timezones found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

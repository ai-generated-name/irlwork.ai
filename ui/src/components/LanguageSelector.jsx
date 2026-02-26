import React, { useState, useRef, useEffect } from 'react'
import { useLanguage, LANGUAGES } from '../context/LanguageContext'

export default function LanguageSelector({ variant = 'default' }) {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = LANGUAGES[language]

  return (
    <div className={`lang-selector notranslate ${variant === 'compact' ? 'lang-selector--compact' : ''}`} translate="no" ref={ref}>
      <button
        className="lang-selector__toggle"
        onClick={() => setOpen(!open)}
        aria-label="Select language"
        aria-expanded={open}
      >
        <svg className="lang-selector__globe" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="lang-selector__name">{current.name}</span>
        <svg
          className={`lang-selector__chevron ${open ? 'lang-selector__chevron--open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {open && (
        <div className="lang-selector__dropdown">
          {Object.entries(LANGUAGES).map(([code, lang]) => (
            <button
              key={code}
              className={`lang-selector__option ${code === language ? 'lang-selector__option--active' : ''}`}
              onClick={() => { setLanguage(code); setOpen(false) }}
            >
              <span className="lang-selector__option-name">{lang.name}</span>
              {code === language && (
                <svg className="lang-selector__check" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7L6 10L11 4" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

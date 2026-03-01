import React, { useState } from 'react'
import CityAutocomplete from './CityAutocomplete'
import SkillAutocomplete from './SkillAutocomplete'
import { TASK_CATEGORIES } from './CategoryPills'
import API_URL from '../config/api'

// Onboarding skill categories (exclude "All" filter option)
const ONBOARDING_CATEGORIES = TASK_CATEGORIES.filter(c => c.value !== '')

function Onboarding({ onComplete, user }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    city: '',
    latitude: null,
    longitude: null,
    country: '',
    country_code: '',
    selectedCategories: [],
    otherSkills: '',
    bio: '',
    travel_radius: 10,
    hourly_rate: 25
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nearbyTasks, setNearbyTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  const userName = user?.name?.split(' ')[0] || 'there'
  const userAvatar = user?.avatar_url

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  // Fetch nearby tasks after city selection
  const fetchNearbyTasks = async (lat, lng, city) => {
    setLoadingTasks(true)
    try {
      const params = new URLSearchParams()
      if (lat && lng) {
        params.set('user_lat', lat)
        params.set('user_lng', lng)
        params.set('radius_km', '80')
      } else if (city) {
        params.set('city', city)
      }
      const res = await fetch(`${API_URL}/tasks/available?${params}`)
      if (res.ok) {
        const data = await res.json()
        setNearbyTasks((data || []).slice(0, 3))
      }
    } catch (e) {
      // Silently fail - task preview is optional
    } finally {
      setLoadingTasks(false)
    }
  }

  const toggleCategory = (value) => {
    setForm(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(value)
        ? prev.selectedCategories.filter(c => c !== value)
        : [...prev.selectedCategories, value]
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      // Combine selected categories with any freeform "other" skills
      const skills = [
        ...form.selectedCategories,
        ...form.otherSkills.split(',').map(s => s.trim()).filter(Boolean)
      ]
      await onComplete({
        city: form.city,
        latitude: form.latitude,
        longitude: form.longitude,
        country: form.country,
        country_code: form.country_code,
        skills,
        bio: form.bio,
        travel_radius: form.travel_radius,
        hourly_rate: form.hourly_rate
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="onboarding-v4">
      <div className="onboarding-v4-container">
        {/* Header with greeting and optional avatar */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {userAvatar && (
            <img
              src={userAvatar}
              alt={`${userName}'s profile picture`}
              style={{ width: 56, height: 56, borderRadius: '50%', marginBottom: 8, objectFit: 'cover' }}
            />
          )}
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Hey {userName}, let's set up your profile
          </p>
        </div>

        {/* Progress */}
        <div className="onboarding-v4-progress">
          <div className="onboarding-v4-progress-header">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="onboarding-v4-progress-bar">
            <div
              className="onboarding-v4-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Global error display */}
        {error && (
          <div className="auth-v4-error" style={{ marginBottom: '1rem' }}>{error}</div>
        )}

        {/* Step 1: City */}
        {step === 1 && (
          <div>
            <h1 className="onboarding-v4-title">Where are you based?</h1>
            <p className="onboarding-v4-subtitle">This helps show you relevant tasks in your area</p>
            <CityAutocomplete
              value={form.city}
              onChange={(locationData) => {
                setForm({
                  ...form,
                  city: locationData.city,
                  latitude: locationData.latitude,
                  longitude: locationData.longitude,
                  country: locationData.country,
                  country_code: locationData.country_code
                })
                fetchNearbyTasks(locationData.latitude, locationData.longitude, locationData.city)
              }}
              placeholder="Search for your city..."
              className="onboarding-v4-city-input"
            />

            {/* Task preview after city selection */}
            {form.city && (
              <div style={{ marginTop: '1rem' }}>
                {loadingTasks ? (
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    Checking for tasks near {form.city}...
                  </p>
                ) : nearbyTasks.length > 0 ? (
                  <div>
                    <p style={{ fontSize: 13, color: '#16A34A', fontWeight: 500, marginBottom: 8 }}>
                      {nearbyTasks.length} task{nearbyTasks.length !== 1 ? 's' : ''} near {form.city} — complete setup to apply
                    </p>
                    {nearbyTasks.map((task, i) => (
                      <div key={task.id || i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8,
                        marginBottom: 4, fontSize: 13
                      }}>
                        <span style={{ color: 'var(--text-primary)' }}>{task.title}</span>
                        <span style={{ color: '#16A34A', fontWeight: 600 }}>${task.budget}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    No tasks near {form.city} yet — be one of the first workers in your area
                  </p>
                )}
              </div>
            )}

            <button
              className="onboarding-v4-btn-next"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={() => setStep(2)}
              disabled={!form.city.trim()}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Skills (Category Pills) */}
        {step === 2 && (
          <div>
            <h1 className="onboarding-v4-title">What can you help with?</h1>
            <p className="onboarding-v4-subtitle">Select the categories that match your skills</p>
            <div className="onboarding-v4-skills-grid">
              {ONBOARDING_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  aria-pressed={form.selectedCategories.includes(cat.value)}
                  aria-label={`${cat.label}${form.selectedCategories.includes(cat.value) ? ' (selected)' : ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 10,
                    border: form.selectedCategories.includes(cat.value) ? '2px solid #16A34A' : '2px solid rgba(0,0,0,0.12)',
                    background: form.selectedCategories.includes(cat.value) ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.03)',
                    color: form.selectedCategories.includes(cat.value) ? '#16A34A' : '#3d3d3d',
                    cursor: 'pointer', fontSize: 14, transition: 'all 0.15s',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: 18 }} role="img" aria-hidden="true">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Other skills (comma separated, optional)"
              value={form.otherSkills}
              onChange={e => setForm({ ...form, otherSkills: e.target.value })}
              className="onboarding-v4-input"
              style={{ marginTop: 4 }}
              aria-label="Other skills, comma separated"
            />
            {form.selectedCategories.length === 0 && !form.otherSkills.trim() && (
              <p style={{ fontSize: 13, color: '#FEBC2E', marginTop: 8 }}>Select at least one skill or add your own</p>
            )}
            <div className="onboarding-v4-buttons">
              <button className="onboarding-v4-btn-back" onClick={() => setStep(1)}>Back</button>
              <button
                className="onboarding-v4-btn-next"
                onClick={() => setStep(3)}
                disabled={form.selectedCategories.length === 0 && !form.otherSkills.trim()}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Bio */}
        {step === 3 && (
          <div>
            <h1 className="onboarding-v4-title">Tell agents about yourself</h1>
            <p className="onboarding-v4-subtitle">A short bio helps you stand out and get more task offers</p>
            <textarea
              placeholder="e.g. Experienced handyman with 5 years of home repair work. Reliable and detail-oriented."
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              className="onboarding-v4-input"
              style={{ minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
              autoFocus
              aria-label="Bio"
              id="onboard-bio"
            />
            <p className="onboarding-v4-hint">2-3 sentences about your experience (optional but recommended)</p>
            <div className="onboarding-v4-buttons">
              <button className="onboarding-v4-btn-back" onClick={() => setStep(2)}>Back</button>
              <button className="onboarding-v4-btn-next" onClick={() => setStep(4)}>Continue</button>
            </div>
          </div>
        )}

        {/* Step 4: Travel Radius + Hourly Rate */}
        {step === 4 && (
          <div>
            <h1 className="onboarding-v4-title">Almost done!</h1>
            <p className="onboarding-v4-subtitle">Set your travel distance and hourly rate</p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                How far can you travel?
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={form.travel_radius}
                onChange={e => setForm({ ...form, travel_radius: parseInt(e.target.value) })}
                className="onboarding-v4-slider"
                aria-label="Travel distance in miles"
                id="onboard-travel-radius"
              />
              <p className="onboarding-v4-slider-value">
                {form.travel_radius} miles
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Minimum hourly rate
              </label>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                transition: 'all var(--duration-fast)'
              }}>
                <span style={{
                  padding: '16px 14px', fontSize: 16, fontWeight: 600,
                  color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)',
                  borderRight: '1px solid rgba(0, 0, 0, 0.08)'
                }}>$</span>
                <input
                  type="number"
                  placeholder="25"
                  value={form.hourly_rate}
                  onChange={e => setForm({ ...form, hourly_rate: parseInt(e.target.value) || 0 })}
                  aria-label="Minimum hourly rate in dollars"
                  id="onboard-hourly-rate"
                  style={{
                    flex: 1, padding: '16px 14px', border: 'none', background: 'transparent',
                    fontSize: 15, color: 'var(--text-primary)', outline: 'none',
                    fontFamily: 'var(--font-body)'
                  }}
                />
                <span style={{
                  padding: '16px 14px', fontSize: 13, color: 'var(--text-tertiary)'
                }}>per hour</span>
              </div>
            </div>

            <div className="onboarding-v4-buttons">
              <button className="onboarding-v4-btn-back" onClick={() => setStep(3)}>Back</button>
              <button
                className="onboarding-v4-btn-next"
                onClick={handleSubmit}
                disabled={loading || !form.hourly_rate}
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Onboarding

// Extracted from Dashboard.jsx — hiring mode browse humans with filters
import React from 'react'
import { Users, Plus, ChevronDown } from 'lucide-react'
import HumanProfileCard from '../HumanProfileCard'
import SkillAutocomplete from '../SkillAutocomplete'
import CityAutocomplete from '../CityAutocomplete'
import CountryAutocomplete from '../CountryAutocomplete'
import CustomDropdown from '../CustomDropdown'
import { navigate as spaNavigate } from '../../utils/navigate'
import { trackPageView } from '../../utils/analytics'
import { Icons } from '../../utils/dashboardConstants'

export default function BrowseHumansTab({
  humans,
  humansError,
  humansSubTab, setHumansSubTab,
  searchQuery, setSearchQuery,
  filterCategory, setFilterCategory,
  browseCityFilter, setBrowseCityFilter,
  browseCountryFilter, setBrowseCountryFilter,
  browseCountryCodeFilter, setBrowseCountryCodeFilter,
  browseMaxRate, setBrowseMaxRate,
  browseSort, setBrowseSort,
  bookmarkedHumans,
  toggleBookmark,
  fetchHumans,
  setHireTarget,
  setTasksSubTab,
  setActiveTab,
  setActiveTabState,
}) {
  return (
          <div>
            <h1 className="dashboard-v4-page-title">Humans</h1>

            {/* Sub-tabs: Browse / Hired */}
            <div className="dashboard-v4-sub-tabs">
              <button
                className={`dashboard-v4-sub-tab ${humansSubTab === 'browse' ? 'active' : ''}`}
                onClick={() => setHumansSubTab('browse')}
              >
                Browse
              </button>
              <button
                className={`dashboard-v4-sub-tab ${humansSubTab === 'hired' ? 'active' : ''}`}
                onClick={() => setHumansSubTab('hired')}
              >
                Hired
              </button>
            </div>

            {humansSubTab === 'browse' && (
              <>
                {/* Search & Filters */}
                <div className="browse-humans-filters" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>{Icons.search}</span>
                    <input
                      type="text"
                      placeholder="Search by name..."
                      className="dashboard-v4-form-input"
                      style={{ paddingLeft: 44 }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {/* Mobile: Filters toggle button */}
                  <button
                    className="browse-filters-toggle-btn"
                    onClick={() => {
                      const el = document.querySelector('.browse-extra-filters')
                      if (el) el.classList.toggle('browse-extra-filters-hidden')
                    }}
                    style={{ display: 'none', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--bg-tertiary)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    <ChevronDown size={16} /> Filters
                  </button>
                  <div className="browse-extra-filters browse-extra-filters-hidden" style={{ display: 'contents' }}>
                    <div style={{ flex: '0 1 180px' }}>
                      <SkillAutocomplete
                        value={filterCategory}
                        onChange={setFilterCategory}
                        placeholder="Search skills..."
                        allLabel="All Skills"
                      />
                    </div>
                    <div style={{ flex: '0 1 180px' }}>
                      <CityAutocomplete
                        value={browseCityFilter}
                        onChange={(cityData) => setBrowseCityFilter(cityData.city || '')}
                        placeholder="Search city..."
                      />
                    </div>
                    <div style={{ flex: '0 1 180px' }}>
                      <CountryAutocomplete
                        value={browseCountryFilter}
                        onChange={(name, code) => {
                          setBrowseCountryFilter(name)
                          setBrowseCountryCodeFilter(code || '')
                        }}
                        placeholder="Search country..."
                      />
                    </div>
                    <div style={{ flex: '0 1 120px' }}>
                      <input
                        type="number"
                        placeholder="Max $/hr"
                        min="1"
                        className="dashboard-v4-form-input"
                        value={browseMaxRate}
                        onChange={(e) => setBrowseMaxRate(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: '0 1 160px' }}>
                      <CustomDropdown
                        value={browseSort}
                        onChange={setBrowseSort}
                        options={[
                          { value: 'rating', label: 'Top Rated' },
                          { value: 'most_reviewed', label: 'Most Reviewed' },
                          { value: 'price_low', label: 'Price: Low to High' },
                          { value: 'price_high', label: 'Price: High to Low' },
                          { value: 'newest', label: 'Newest' },
                        ]}
                        placeholder="Top Rated"
                      />
                    </div>
                  </div>
                </div>

                {(() => {
                  if (humansError) {
                    return (
                      <div className="dashboard-v4-empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>&#9888;&#65039;</div>
                        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>Failed to load humans</p>
                        <p style={{ fontSize: 14, maxWidth: 300, margin: '0 auto 16px', color: 'var(--text-secondary)' }}>{humansError}</p>
                        <button
                          onClick={fetchHumans}
                          style={{ background: 'var(--coral-500, #E8853D)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Try Again
                        </button>
                      </div>
                    )
                  }
                  const filtered = humans
                    .filter(h => !searchQuery || h.name?.toLowerCase().includes(searchQuery.toLowerCase()) || h.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
                    .filter(h => !filterCategory || h.skills?.includes(filterCategory))
                    .filter(h => !browseCityFilter || h.city?.toLowerCase().includes(browseCityFilter.toLowerCase()))
                    .filter(h => !browseCountryFilter || (browseCountryCodeFilter ? h.country_code?.toLowerCase() === browseCountryCodeFilter.toLowerCase() : h.country?.toLowerCase().includes(browseCountryFilter.trim().toLowerCase())))
                    .filter(h => !browseMaxRate || (h.hourly_rate || 25) <= Number(browseMaxRate))
                    .sort((a, b) => {
                      switch (browseSort) {
                        case 'rating': return (b.rating || 0) - (a.rating || 0)
                        case 'most_reviewed': return (b.total_ratings_count || 0) - (a.total_ratings_count || 0)
                        case 'price_low': return (a.hourly_rate || 25) - (b.hourly_rate || 25)
                        case 'price_high': return (b.hourly_rate || 25) - (a.hourly_rate || 25)
                        case 'newest': return new Date(b.created_at || 0) - new Date(a.created_at || 0)
                        default: return 0
                      }
                    })
                  return filtered.length === 0 ? (
                    <div className="dashboard-v4-empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
                      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><Users size={48} style={{ color: 'var(--text-muted, #AAAAAA)' }} /></div>
                      <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>No humans match your search</p>
                      <p style={{ fontSize: 14, maxWidth: 300, margin: '0 auto 16px', color: 'var(--text-secondary)' }}>
                        Humans are joining daily. Try broadening your filters or post a task and let humans come to you.
                      </p>
                      <button
                        onClick={() => { setTasksSubTab('create'); setActiveTab('posted') }}
                        style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                      >
                        <Plus size={16} /> Post a Task
                      </button>
                    </div>
                  ) : (
                    <div className="browse-humans-grid">
                      {filtered.map(human => (
                        <HumanProfileCard
                          key={human.id}
                          human={human}
                          variant="dashboard"
                          onExpand={(h) => spaNavigate(`/humans/${h.id}`)}
                          onHire={(human) => { setHireTarget(human); setTasksSubTab('create'); setActiveTabState('posted'); window.history.pushState({}, '', `/dashboard/hiring/create?hire=${human.id}`); trackPageView('/dashboard/hiring/create'); }}
                          onBookmark={toggleBookmark}
                          isBookmarked={bookmarkedHumans.includes(human.id)}
                        />
                      ))}
                    </div>
                  )
                })()}
              </>
            )}

            {humansSubTab === 'hired' && (
              <div className="dashboard-v4-empty">
                <div className="dashboard-v4-empty-icon">{Icons.humans}</div>
                <p className="dashboard-v4-empty-title">No humans hired yet</p>
                <p className="dashboard-v4-empty-text">Hire someone for a task</p>
              </div>
            )}
          </div>
  )
}

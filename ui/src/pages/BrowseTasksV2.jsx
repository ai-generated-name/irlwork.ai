import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { MapPin, Search, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
const TaskMap = lazy(() => import('../components/TaskMap'));
import { TASK_CATEGORIES } from '../components/CategoryPills';
import TaskCardV2 from '../components/TaskCardV2';
import QuickApplyModal from '../components/QuickApplyModal';
import ReportTaskModal from '../components/ReportTaskModal';
import CityAutocomplete from '../components/CityAutocomplete';
import CustomDropdown from '../components/CustomDropdown';
import SkillAutocomplete from '../components/SkillAutocomplete';

import API_URL from '../config/api';

const SORT_OPTIONS = [
  { value: 'distance', label: 'Nearest First' },
  { value: 'pay_high', label: 'Highest Pay' },
  { value: 'pay_low', label: 'Lowest Pay' },
  { value: 'newest', label: 'Newest First' },
];

const RADIUS_OPTIONS = [
  { value: '5', label: 'Within 5 km' },
  { value: '10', label: 'Within 10 km' },
  { value: '25', label: 'Within 25 km' },
  { value: '50', label: 'Within 50 km' },
  { value: '100', label: 'Within 100 km' },
  { value: 'anywhere', label: 'Anywhere' },
];

const CATEGORY_OPTIONS = TASK_CATEGORIES.map(cat => ({
  value: cat.value,
  label: cat.label,
}));

const ITEMS_PER_PAGE = 16;

// Loading skeleton component
function TaskCardSkeleton() {
  return (
    <div className="task-card-skeleton">
      <div className="skeleton-row">
        <div className="skeleton-line" style={{ width: 100, height: 20 }} />
        <div className="skeleton-line" style={{ width: 60, height: 20 }} />
      </div>
      <div className="skeleton-line" style={{ width: '80%', height: 24, marginTop: 12 }} />
      <div className="skeleton-line" style={{ width: '100%', height: 16, marginTop: 8 }} />
      <div className="skeleton-line" style={{ width: '60%', height: 16, marginTop: 4 }} />
      <div className="skeleton-row" style={{ marginTop: 16 }}>
        <div className="skeleton-line" style={{ width: 80, height: 28 }} />
        <div className="skeleton-line" style={{ width: 80, height: 28 }} />
      </div>
      <div className="skeleton-row" style={{ marginTop: 12 }}>
        <div className="skeleton-line" style={{ width: 120, height: 16 }} />
        <div className="skeleton-line" style={{ width: 60, height: 16 }} />
      </div>
      <div className="skeleton-row" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="skeleton-line" style={{ width: 100, height: 14 }} />
        <div className="skeleton-line" style={{ width: 90, height: 36, borderRadius: 8 }} />
      </div>
    </div>
  );
}

export default function BrowseTasksV2({
  user,
  initialLocation = null,
  initialRadius = '25',
}) {
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('distance');
  const [radius, setRadius] = useState(initialRadius || '25');
  const [includeRemote, setIncludeRemote] = useState(true);
  const [filterByMySkills, setFilterByMySkills] = useState(false);

  // Location state
  const [location, setLocation] = useState({
    city: initialLocation?.city || user?.city || '',
    lat: initialLocation?.lat || user?.latitude || null,
    lng: initialLocation?.lng || user?.longitude || null,
  });

  // Map-driven search state (true when user searched via map panning)
  const [mapDrivenSearch, setMapDrivenSearch] = useState(false);

  // UI state
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'list';
    return 'split';
  });
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [showMobileMap, setShowMobileMap] = useState(false);

  // Apply modal state
  const [applyModalTask, setApplyModalTask] = useState(null);
  const [appliedTaskIds, setAppliedTaskIds] = useState(new Set());

  // Report modal state
  const [reportModalTask, setReportModalTask] = useState(null);

  // Refs
  const taskListRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [location, radius, category, debouncedSearch, sort, includeRemote, filterByMySkills]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (location.lat && location.lng) {
        params.set('user_lat', location.lat);
        params.set('user_lng', location.lng);
      }

      if (radius !== 'anywhere') {
        params.set('radius_km', radius);
      } else {
        params.set('radius_km', 'anywhere');
      }

      if (category) params.set('category', category);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sort) params.set('sort', sort);
      // Don't send city when "Anywhere" is selected — we want all tasks regardless of location
      if (location.city && radius !== 'anywhere') params.set('city', location.city);
      params.set('include_remote', includeRemote ? 'true' : 'false');

      // Filter by user's skills if enabled
      if (filterByMySkills && user?.skills) {
        const userSkills = Array.isArray(user.skills) ? user.skills : [];
        if (userSkills.length > 0) {
          params.set('skills', userSkills.join(','));
        }
      }

      params.set('limit', String(ITEMS_PER_PAGE));
      params.set('offset', String((currentPage - 1) * ITEMS_PER_PAGE));

      const res = await fetch(`${API_URL}/tasks/available?${params}`, {
        headers: user?.id ? { Authorization: user.token || '' } : {}
      });

      if (!res.ok) {
        let errorMsg = `Server error (${res.status})`;
        try { const errData = await res.json(); errorMsg = errData.error || errorMsg; } catch {}
        throw new Error(errorMsg);
      }

      const data = await res.json();

      // Handle both old format (array) and new format ({ tasks: [] })
      const tasksList = Array.isArray(data) ? data : (data.tasks || []);
      setTasks(tasksList);
      setTasksTotal(data.total || tasksList.length);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [location, radius, category, debouncedSearch, sort, includeRemote, filterByMySkills, user, currentPage]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle location change from CityAutocomplete
  // CityAutocomplete passes a single object: { city, latitude, longitude, country, ... }
  const handleLocationChange = (locationData) => {
    setMapDrivenSearch(false);
    if (typeof locationData === 'object' && locationData !== null) {
      setLocation({
        city: locationData.city || '',
        lat: locationData.latitude || null,
        lng: locationData.longitude || null,
      });
    } else {
      // Fallback for string value (e.g., manual typing)
      setLocation({
        city: locationData || '',
        lat: null,
        lng: null,
      });
    }
  };

  // Handle map-driven search ("Search this area" button)
  const handleMapBoundsChange = useCallback(({ lat, lng, radiusKm }) => {
    setMapDrivenSearch(true);
    // Snap to the nearest radius preset that covers the visible area
    // If zoomed out beyond 100km, cap at 100km to avoid "anywhere" which ignores coordinates
    const presets = [5, 10, 25, 50, 100];
    const snapped = presets.find(p => p >= radiusKm) || 100;
    setRadius(String(snapped));
    setLocation({ city: 'Map Area', lat, lng });
  }, []);

  // Handle task selection - navigate to task detail page
  const handleTaskSelect = (taskId) => {
    window.location.href = `/tasks/${taskId}`;
  };

  // Handle apply success
  const handleApplySuccess = (taskId) => {
    setAppliedTaskIds(prev => new Set([...prev, taskId]));
    setApplyModalTask(null);
  };

  // Get map center (memoized to prevent unnecessary map re-centering on every render)
  const mapCenter = useMemo(() => {
    return location.lat && location.lng
      ? [location.lat, location.lng]
      : [10.8231, 106.6297]; // Default HCMC
  }, [location.lat, location.lng]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(tasksTotal / ITEMS_PER_PAGE));
  const startItem = tasksTotal === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, tasksTotal);

  function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    if (taskListRef.current) {
      taskListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function getPageNumbers() {
    const pages = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  // Responsive view mode
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="browse-tasks-v2">
      {/* Header */}
      <div className="browse-tasks-v2-header">
        <h1 className="browse-tasks-v2-title">Browse Tasks</h1>

        {/* Search bar */}
        <div className="browse-tasks-v2-search-row">
          <div className="browse-tasks-v2-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="browse-tasks-v2-search-clear"
                onClick={() => setSearchQuery('')}
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="browse-tasks-v2-filters">
            <SkillAutocomplete
              value={category}
              onChange={setCategory}
              placeholder="Search categories..."
              allLabel="All Categories"
              className="browse-tasks-v2-category-dropdown"
            />
            <CustomDropdown
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
              placeholder="Sort by"
            />

            {!isMobile && (
              <div className="browse-tasks-v2-view-toggle">
                <button
                  className={viewMode === 'split' ? 'active' : ''}
                  onClick={() => setViewMode('split')}
                  title="Split view"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="18" rx="1" />
                    <rect x="14" y="3" width="7" height="18" rx="1" />
                  </svg>
                </button>
                <button
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
                <button
                  className={viewMode === 'map' ? 'active' : ''}
                  onClick={() => setViewMode('map')}
                  title="Map view"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                    <line x1="8" y1="2" x2="8" y2="18" />
                    <line x1="16" y1="6" x2="16" y2="22" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Location bar */}
        <div className="browse-tasks-v2-location-bar">
          <span className="browse-tasks-v2-location-icon"><MapPin size={16} /></span>
          <span className="browse-tasks-v2-location-label">Within</span>
          <CustomDropdown
            value={radius}
            onChange={setRadius}
            options={RADIUS_OPTIONS}
            className="browse-tasks-v2-radius-dropdown"
          />
          <span className="browse-tasks-v2-location-label">of</span>
          <CityAutocomplete
            value={location.city}
            onChange={handleLocationChange}
            placeholder="Select city..."
            className="browse-tasks-v2-city-input"
          />
          {!location.lat && !location.lng && (
            <button
              className="browse-tasks-v2-use-location-btn"
              onClick={() => {
                setMapDrivenSearch(false);
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setLocation({
                        city: 'Current Location',
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                      });
                    },
                    (err) => console.error('Geolocation error:', err)
                  );
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Use my location
            </button>
          )}
          <button
            className={`browse-tasks-v2-remote-toggle ${includeRemote ? 'active' : ''}`}
            onClick={() => setIncludeRemote(!includeRemote)}
            type="button"
            title={includeRemote ? 'Remote tasks shown' : 'Remote tasks hidden'}
          >
            <Globe size={14} /> Remote
          </button>
          {user && user.type === 'human' && Array.isArray(user.skills) && user.skills.length > 0 && (
            <button
              className={`browse-tasks-v2-remote-toggle ${filterByMySkills ? 'active' : ''}`}
              onClick={() => setFilterByMySkills(!filterByMySkills)}
              type="button"
              title={filterByMySkills ? 'Showing tasks matching your skills' : 'Show tasks matching your skills'}
              style={filterByMySkills ? { background: '#EEF2FF', color: '#4338CA', borderColor: '#C7D2FE' } : {}}
            >
              <span>🎯</span> My Skills
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={`browse-tasks-v2-content ${viewMode}`}>
        {/* Task list */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div className="browse-tasks-v2-list" ref={taskListRef}>
            {loading ? (
              // Loading skeletons
              <>
                <TaskCardSkeleton />
                <TaskCardSkeleton />
                <TaskCardSkeleton />
              </>
            ) : error ? (
              <div className="browse-tasks-v2-error">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h3>Failed to load tasks</h3>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Try Again</button>
              </div>
            ) : tasks.length === 0 ? (
              <div className="browse-tasks-v2-empty">
                <div className="browse-tasks-v2-empty-icon"><Search size={24} /></div>
                <h3>No tasks found</h3>
                <p>
                  {radius !== 'anywhere'
                    ? `No tasks within ${radius} km of your location.`
                    : 'No tasks match your current filters.'}
                </p>
                <div className="browse-tasks-v2-empty-actions">
                  {radius !== 'anywhere' && (
                    <button onClick={() => setRadius('50')}>
                      Expand to 50 km
                    </button>
                  )}
                  <button onClick={() => {
                    setCategory('');
                    setSearchQuery('');
                    setRadius('anywhere');
                  }}>
                    Clear Filters
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Result count */}
                <div style={{ padding: '0 4px 12px', fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {tasksTotal === 0 ? 'No results' : `Showing ${startItem}\u2013${endItem} of ${tasksTotal} tasks`}
                </div>
                {tasks.map(task => (
                  <div key={task.id} data-task-id={task.id}>
                    <TaskCardV2
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      isHovered={task.id === hoveredTaskId}
                      onSelect={handleTaskSelect}
                      onHover={setHoveredTaskId}
                      onApply={setApplyModalTask}
                      hasApplied={appliedTaskIds.has(task.id)}
                      onReport={setReportModalTask}
                      showReport={!!user}
                    />
                  </div>
                ))}
                {/* Pagination */}
                {tasksTotal > ITEMS_PER_PAGE && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 6,
                    padding: '24px 0 8px',
                  }}>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 36, height: 36, borderRadius: 8,
                        border: '1px solid rgba(0,0,0,0.1)', background: 'white',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 1 ? 0.4 : 1,
                        transition: 'all 0.15s', color: 'var(--text-primary)',
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {getPageNumbers().map((page, idx) =>
                      page === '...' ? (
                        <span key={`dots-${idx}`} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          style={{
                            width: 36, height: 36, borderRadius: 8,
                            border: page === currentPage ? '1px solid var(--coral-500)' : '1px solid rgba(0,0,0,0.08)',
                            background: page === currentPage ? 'var(--coral-500)' : 'white',
                            color: page === currentPage ? 'white' : 'var(--text-primary)',
                            fontWeight: page === currentPage ? 700 : 500,
                            fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {page}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 36, height: 36, borderRadius: 8,
                        border: '1px solid rgba(0,0,0,0.1)', background: 'white',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        opacity: currentPage === totalPages ? 0.4 : 1,
                        transition: 'all 0.15s', color: 'var(--text-primary)',
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Map */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div className="browse-tasks-v2-map">
            <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>Loading map...</div>}>
              <TaskMap
                tasks={tasks}
                center={mapCenter}
                zoom={12}
                radius={radius !== 'anywhere' ? parseFloat(radius) : null}
                selectedTaskId={selectedTaskId}
                hoveredTaskId={hoveredTaskId}
                onTaskSelect={handleTaskSelect}
                onTaskHover={setHoveredTaskId}
                onBoundsChange={handleMapBoundsChange}
                disableFitBounds={mapDrivenSearch}
              />
            </Suspense>
          </div>
        )}
      </div>

      {/* Mobile map toggle */}
      {isMobile && (
        <button
          className="browse-tasks-v2-map-fab"
          onClick={() => setShowMobileMap(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          Map
        </button>
      )}

      {/* Mobile map overlay */}
      {showMobileMap && (
        <div className="browse-tasks-v2-mobile-map-overlay">
          <button
            className="browse-tasks-v2-mobile-map-close"
            onClick={() => setShowMobileMap(false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>Loading map...</div>}>
            <TaskMap
              tasks={tasks}
              center={mapCenter}
              zoom={12}
              radius={radius !== 'anywhere' ? parseFloat(radius) : null}
              selectedTaskId={selectedTaskId}
              hoveredTaskId={hoveredTaskId}
              onTaskSelect={(id) => {
                handleTaskSelect(id);
                setShowMobileMap(false);
              }}
              onTaskHover={setHoveredTaskId}
              onBoundsChange={handleMapBoundsChange}
              disableFitBounds={mapDrivenSearch}
            />
          </Suspense>
        </div>
      )}

      {/* Quick apply modal */}
      <QuickApplyModal
        task={applyModalTask}
        isOpen={!!applyModalTask}
        onClose={() => setApplyModalTask(null)}
        onSuccess={handleApplySuccess}
        userToken={user?.token || user?.id}
      />

      {/* Report task modal */}
      <ReportTaskModal
        task={reportModalTask}
        isOpen={!!reportModalTask}
        onClose={() => setReportModalTask(null)}
        userToken={user?.id}
      />
    </div>
  );
}

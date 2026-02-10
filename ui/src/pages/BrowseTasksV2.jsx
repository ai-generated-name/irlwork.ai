import React, { useState, useEffect, useCallback, useRef } from 'react';
import TaskMap from '../components/TaskMap';
import CategoryPills, { TASK_CATEGORIES } from '../components/CategoryPills';
import TaskCardV2 from '../components/TaskCardV2';
import QuickApplyModal from '../components/QuickApplyModal';
import ReportTaskModal from '../components/ReportTaskModal';
import CityAutocomplete from '../components/CityAutocomplete';
import CustomDropdown from '../components/CustomDropdown';

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
      <div className="skeleton-row" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(26,26,26,0.06)' }}>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('distance');
  const [radius, setRadius] = useState(initialRadius || '25');
  const [includeRemote, setIncludeRemote] = useState(true);

  // Location state
  const [location, setLocation] = useState({
    city: initialLocation?.city || user?.city || '',
    lat: initialLocation?.lat || user?.latitude || null,
    lng: initialLocation?.lng || user?.longitude || null,
  });

  // UI state
  const [viewMode, setViewMode] = useState('split'); // 'split', 'list', 'map'
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

      params.set('limit', '50');

      const res = await fetch(`${API_URL}/tasks/available?${params}`, {
        headers: user?.id ? { Authorization: user.id } : {}
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch tasks');
      }

      // Handle both old format (array) and new format ({ tasks: [] })
      const tasksList = Array.isArray(data) ? data : (data.tasks || []);
      setTasks(tasksList);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [location, radius, category, debouncedSearch, sort, includeRemote]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle location change from CityAutocomplete
  // CityAutocomplete passes a single object: { city, latitude, longitude, country, ... }
  const handleLocationChange = (locationData) => {
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

  // Handle task selection - navigate to task detail page
  const handleTaskSelect = (taskId) => {
    window.location.href = `/tasks/${taskId}`;
  };

  // Handle apply success
  const handleApplySuccess = (taskId) => {
    setAppliedTaskIds(prev => new Set([...prev, taskId]));
    setApplyModalTask(null);
  };

  // Get map center
  const mapCenter = location.lat && location.lng
    ? [location.lat, location.lng]
    : [10.8231, 106.6297]; // Default HCMC

  // Responsive view mode
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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

        {/* Category pills */}
        <CategoryPills selected={category} onChange={setCategory} />

        {/* Location bar */}
        <div className="browse-tasks-v2-location-bar">
          <span className="browse-tasks-v2-location-icon">📍</span>
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
            <span>🌐</span> Remote
          </button>
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
                <button onClick={fetchTasks}>Try Again</button>
              </div>
            ) : tasks.length === 0 ? (
              <div className="browse-tasks-v2-empty">
                <div className="browse-tasks-v2-empty-icon">🔍</div>
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
              tasks.map(task => (
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
              ))
            )}
          </div>
        )}

        {/* Map */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div className="browse-tasks-v2-map">
            <TaskMap
              tasks={tasks}
              center={mapCenter}
              zoom={12}
              radius={radius !== 'anywhere' ? parseFloat(radius) : null}
              selectedTaskId={selectedTaskId}
              hoveredTaskId={hoveredTaskId}
              onTaskSelect={handleTaskSelect}
              onTaskHover={setHoveredTaskId}
            />
          </div>
        )}
      </div>

      {/* Mobile map toggle */}
      {isMobile && viewMode === 'list' && (
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
          />
        </div>
      )}

      {/* Quick apply modal */}
      <QuickApplyModal
        task={applyModalTask}
        isOpen={!!applyModalTask}
        onClose={() => setApplyModalTask(null)}
        onSuccess={handleApplySuccess}
        userToken={user?.id}
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

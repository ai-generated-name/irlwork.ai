import CustomDropdown from './CustomDropdown';
import CityAutocomplete from './CityAutocomplete';
import SkillAutocomplete from './SkillAutocomplete';

// Radius filter options
const radiusOptions = [
  { value: '0', label: 'Exact City' },
  { value: '25', label: 'Within 25km' },
  { value: '50', label: 'Within 50km' },
  { value: '100', label: 'Within 100km' },
  { value: 'anywhere', label: 'Anywhere' }
];

export default function TopFilterBar({
  searchQuery,
  onSearchChange,
  locationFilter,
  onLocationChange,
  onLocationSelect,
  radiusFilter = '50',
  onRadiusChange,
  categoryFilter,
  onCategoryChange,
  onMenuClick,
  categories = ['delivery', 'photography', 'data_collection', 'errands', 'cleaning', 'moving', 'manual_labor', 'inspection', 'tech', 'translation', 'verification', 'general']
}) {
  // Format categories for CustomDropdown
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map(c => ({
      value: c,
      label: c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }))
  ];

  // Handle city selection from autocomplete
  const handleCitySelect = (locationData) => {
    // Update display value
    if (onLocationChange) {
      onLocationChange(locationData.city);
    }
    // Pass full location data to parent
    if (onLocationSelect) {
      onLocationSelect(locationData);
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)] border-b border-[rgba(26,26,26,0.06)] px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        {/* Mobile Header Row */}
        <div className="flex items-center gap-3 md:hidden">
          {/* Hamburger Menu Button */}
          <button
            onClick={onMenuClick}
            className="p-2 -ml-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            aria-label="Open menu"
          >
            <svg
              className="w-6 h-6 text-[var(--text-secondary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Search Input - Mobile */}
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="city-autocomplete-v4-input w-full pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Desktop Search */}
        <div className="hidden md:block flex-1 relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="city-autocomplete-v4-input w-full pl-12 pr-4 py-2.5"
          />
        </div>

        {/* Filters Row - Always visible but responsive */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Location Filter with CityAutocomplete */}
          <div className="relative flex-1 md:flex-none md:w-48">
            <CityAutocomplete
              value={locationFilter}
              onChange={handleCitySelect}
              placeholder="Location"
              className="topfilter-city-input"
            />
          </div>

          {/* Radius Filter */}
          {onRadiusChange && (
            <CustomDropdown
              value={radiusFilter}
              onChange={onRadiusChange}
              options={radiusOptions}
              placeholder="50km"
              className="flex-shrink-0 md:w-32"
            />
          )}

          {/* Category Filter */}
          <SkillAutocomplete
            value={categoryFilter}
            onChange={onCategoryChange}
            placeholder="Search categories..."
            allLabel="All Categories"
            className="flex-1 md:flex-none md:w-44"
          />
        </div>
      </div>
    </div>
  )
}

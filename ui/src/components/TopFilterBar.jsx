export default function TopFilterBar({
  searchQuery,
  onSearchChange,
  locationFilter,
  onLocationChange,
  categoryFilter,
  onCategoryChange,
  categories = ['delivery', 'pickup', 'errands', 'dog_walking', 'cleaning', 'moving', 'general']
}) {
  return (
    <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 shadow-v4-sm">
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-all"
          />
        </div>

        {/* Location Filter */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Location"
            value={locationFilter}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-40 pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-all"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-all appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
            backgroundPosition: 'right 12px center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '16px',
            paddingRight: '40px'
          }}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>
              {c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

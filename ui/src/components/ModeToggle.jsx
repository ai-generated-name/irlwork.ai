export default function ModeToggle({ hiringMode, onToggle }) {
  return (
    <div className="bg-teal-dark/50 rounded-xl p-3 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white/70">Mode</span>
      </div>
      <div className="flex rounded-lg bg-teal-dark p-1">
        <button
          onClick={() => hiringMode && onToggle()}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
            !hiringMode
              ? 'bg-white text-teal shadow-v4-sm'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Working
        </button>
        <button
          onClick={() => !hiringMode && onToggle()}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
            hiringMode
              ? 'bg-coral text-white shadow-v4-sm'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Hiring
        </button>
      </div>
    </div>
  )
}

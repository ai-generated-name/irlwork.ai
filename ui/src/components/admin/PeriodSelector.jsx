/**
 * Period Selector — shared across BI tabs
 * Allows selecting 7d / 30d / 90d / All time
 */
export default function PeriodSelector({ value, onChange }) {
  const options = [
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' },
    { id: '90d', label: '90 days' },
    { id: 'all', label: 'All time' },
  ]

  return (
    <div className="flex gap-1 bg-[#F0EAE2] rounded-lg p-1">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            value === opt.id
              ? 'bg-white text-[#1A1A1A] shadow-sm'
              : 'text-[#8C8580] hover:text-[#1A1A1A]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

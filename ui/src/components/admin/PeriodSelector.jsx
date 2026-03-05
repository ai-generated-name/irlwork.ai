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
    <div className="flex gap-1 bg-[rgba(220,200,180,0.15)] rounded-lg p-1">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            value === opt.id
              ? 'bg-white text-[#1A1410] shadow-sm'
              : 'text-[rgba(26,20,16,0.50)] hover:text-[#1A1410]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

import { StatCard } from './ui'

export default function QuickStats({ totalEarned = 0, tasksCompleted = 0, rating = 0 }) {
  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
      <StatCard
        label="Total earned"
        value={`$${totalEarned.toLocaleString()}`}
      />
      <StatCard
        label="Tasks done"
        value={tasksCompleted}
      />
      <StatCard
        label="Rating"
        value={
          <span className="flex items-center gap-1">
            {rating > 0 ? rating.toFixed(1) : '-'}
            <span className="text-yellow-400 text-base md:text-lg">&#9733;</span>
          </span>
        }
      />
    </div>
  )
}

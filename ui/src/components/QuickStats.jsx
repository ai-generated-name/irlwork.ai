export default function QuickStats({ totalEarned = 0, tasksCompleted = 0, rating = 0 }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-v4-sm hover:shadow-v4-md transition-shadow">
        <p className="text-2xl font-bold text-teal">${totalEarned.toLocaleString()}</p>
        <p className="text-sm text-gray-500">Total Earned</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-v4-sm hover:shadow-v4-md transition-shadow">
        <p className="text-2xl font-bold text-teal">{tasksCompleted}</p>
        <p className="text-sm text-gray-500">Tasks Completed</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-v4-sm hover:shadow-v4-md transition-shadow">
        <p className="text-2xl font-bold text-teal flex items-center gap-1">
          {rating > 0 ? rating.toFixed(1) : '-'}
          <span className="text-yellow-400 text-lg">★</span>
        </p>
        <p className="text-sm text-gray-500">Rating</p>
      </div>
    </div>
  )
}

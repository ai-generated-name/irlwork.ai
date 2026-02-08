export default function ActivityFeed({ activities = [] }) {
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'completed':
        return '✓'
      case 'posted':
        return '📋'
      case 'accepted':
        return '🤝'
      default:
        return '📌'
    }
  }

  const getActivityColor = (type) => {
    switch (type) {
      case 'completed':
        return 'bg-green-100 text-green-600'
      case 'posted':
        return 'bg-teal/10 text-teal'
      case 'accepted':
        return 'bg-amber-100 text-amber-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-v4-sm mt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No recent activity</p>
        ) : (
          activities.slice(0, 5).map((activity, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{activity.message}</p>
                <p className="text-xs text-gray-400">{formatTimeAgo(activity.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

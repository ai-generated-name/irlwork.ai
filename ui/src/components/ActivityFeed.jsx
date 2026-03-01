import { Check, ClipboardList, Handshake, Pin } from 'lucide-react'
import { Card, EmptyState } from './ui'

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
        return <Check size={16} />
      case 'posted':
        return <ClipboardList size={16} />
      case 'accepted':
        return <Handshake size={16} />
      default:
        return <Pin size={16} />
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
    <Card className="p-4 md:p-6 mt-6 md:mt-8">
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Recent activity</h3>
      <div className="space-y-2 md:space-y-3">
        {activities.length === 0 ? (
          <EmptyState
            icon={<Pin size={32} />}
            title="No recent activity"
          />
        ) : (
          activities.slice(0, 5).map((activity, i) => (
            <div key={i} className="flex items-start gap-2 md:gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm flex-shrink-0 ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm text-gray-700 line-clamp-2">{activity.message}</p>
                <p className="text-xs text-gray-400">{formatTimeAgo(activity.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

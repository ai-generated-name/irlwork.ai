import React from 'react'
import { ClipboardList, CheckCircle, Handshake, FileText, AlertTriangle, DollarSign, Clock, Trophy, Star, BarChart3 } from 'lucide-react'

const styles = {
  card: 'bg-white/5 border border-white/10 rounded-2xl p-6',
  statCard: 'bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col',
  statValue: 'text-2xl font-bold text-white mb-1',
  statLabel: 'text-sm text-gray-400',
  badge: 'px-3 py-1 rounded-full text-sm font-medium',
  progressBar: 'w-full h-2 bg-white/10 rounded-full overflow-hidden',
  progressFill: 'h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-300',
}

const Icons = {
  tasks: <ClipboardList size={20} />,
  completed: <CheckCircle size={20} />,
  accepted: <Handshake size={20} />,
  posted: <FileText size={20} />,
  disputes: <AlertTriangle size={20} />,
  money: <DollarSign size={20} />,
  clock: <Clock size={20} />,
  trophy: <Trophy size={20} />,
  star: <Star size={20} />,
  chart: <BarChart3 size={20} />,
}

function StatCard({ icon, label, value, subtitle }) {
  return (
    <div className={styles.statCard}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
      <div className={styles.statValue}>{value}</div>
      {subtitle && <span className="text-xs text-gray-500 mt-1">{subtitle}</span>}
    </div>
  )
}

function MetricBar({ label, value, maxValue, color = 'orange' }) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{value} / {maxValue}</span>
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}

function ReputationBadge({ completionRate, paymentRate }) {
  let badge = { label: 'New', color: 'bg-gray-500/20 text-gray-400', icon: '🌱' }

  if (completionRate >= 90 && paymentRate >= 95) {
    badge = { label: 'Elite', color: 'bg-purple-500/20 text-purple-400', icon: '👑' }
  } else if (completionRate >= 80 && paymentRate >= 90) {
    badge = { label: 'Pro', color: 'bg-blue-500/20 text-blue-400', icon: '💎' }
  } else if (completionRate >= 70) {
    badge = { label: 'Reliable', color: 'bg-green-500/20 text-green-400', icon: <CheckCircle size={14} /> }
  } else if (completionRate >= 50) {
    badge = { label: 'Active', color: 'bg-orange-500/20 text-orange-400', icon: '⚡' }
  }

  return (
    <div className={`${styles.badge} ${badge.color} flex items-center gap-2`}>
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
    </div>
  )
}

export default function ReputationMetrics({ user, isHiringMode }) {
  const {
    total_tasks_completed = 0,
    total_tasks_accepted = 0,
    total_tasks_posted = 0,
    total_disputes_filed = 0,
    total_paid = 0,
    completion_rate,
    payment_rate,
    last_active_at,
  } = user

  // Format currency
  const formatUSD = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Format date
  const formatDate = (date) => {
    if (!date) return 'Never'
    const d = new Date(date)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  // Parse rates
  const completionRateNum = completion_rate ? parseFloat(completion_rate) : null
  const paymentRateNum = payment_rate ? parseFloat(payment_rate) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            {Icons.trophy} Reputation Metrics
          </h2>
          <p className="text-gray-400 text-sm">Your performance and activity stats</p>
        </div>
        {completionRateNum !== null && (
          <ReputationBadge
            completionRate={completionRateNum}
            paymentRate={paymentRateNum || 100}
          />
        )}
      </div>

      {/* Human Stats */}
      {!isHiringMode && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              icon={Icons.completed}
              label="Tasks Completed"
              value={total_tasks_completed}
              subtitle="Successfully finished"
            />
            <StatCard
              icon={Icons.accepted}
              label="Tasks Accepted"
              value={total_tasks_accepted}
              subtitle="Total accepted"
            />
            <StatCard
              icon={Icons.clock}
              label="Last Active"
              value={formatDate(last_active_at)}
              subtitle="Recent activity"
            />
          </div>

          {/* Performance Metrics */}
          {total_tasks_accepted > 0 && (
            <div className={styles.card}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                {Icons.chart} Performance
              </h3>

              <div className="space-y-4">
                <MetricBar
                  label="Completion Rate"
                  value={total_tasks_completed}
                  maxValue={total_tasks_accepted}
                />

                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-400 text-sm">Success Rate</span>
                  <span className={`text-2xl font-bold ${
                    completionRateNum >= 80 ? 'text-green-400' :
                    completionRateNum >= 60 ? 'text-orange-400' :
                    'text-gray-400'
                  }`}>
                    {completionRateNum !== null ? `${completionRateNum}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {total_tasks_accepted === 0 && (
            <div className={`${styles.card} text-center py-8`}>
              <span className="text-6xl mb-4 block">🎯</span>
              <h3 className="text-lg font-semibold text-white mb-2">Start Building Your Reputation</h3>
              <p className="text-gray-400 text-sm mb-4">
                Accept and complete tasks to build your reputation score
              </p>
            </div>
          )}
        </>
      )}

      {/* Agent/Hiring Stats */}
      {isHiringMode && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              icon={Icons.posted}
              label="Tasks Posted"
              value={total_tasks_posted}
              subtitle="Total created"
            />
            <StatCard
              icon={Icons.money}
              label="Total Paid"
              value={formatUSD(total_paid)}
              subtitle="To humans"
            />
            <StatCard
              icon={Icons.disputes}
              label="Disputes Filed"
              value={total_disputes_filed}
              subtitle="Issues reported"
            />
          </div>

          {/* Payment Stats */}
          {total_tasks_posted > 0 && (
            <div className={styles.card}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                {Icons.chart} Activity Overview
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">Average per Task</span>
                  <span className="text-white font-semibold">
                    {formatUSD(total_paid / total_tasks_posted)}
                  </span>
                </div>

                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">Dispute Rate</span>
                  <span className={`font-semibold ${
                    total_disputes_filed === 0 ? 'text-green-400' :
                    (total_disputes_filed / total_tasks_posted) < 0.1 ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {total_tasks_posted > 0
                      ? `${((total_disputes_filed / total_tasks_posted) * 100).toFixed(1)}%`
                      : '0%'}
                  </span>
                </div>

                {paymentRateNum !== null && (
                  <div className="flex justify-between py-3">
                    <span className="text-gray-400">Payment Rate</span>
                    <span className={`font-semibold ${
                      paymentRateNum >= 95 ? 'text-green-400' :
                      paymentRateNum >= 80 ? 'text-orange-400' :
                      'text-red-400'
                    }`}>
                      {paymentRateNum}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {total_tasks_posted === 0 && (
            <div className={`${styles.card} text-center py-8`}>
              <span className="text-6xl mb-4 block">🚀</span>
              <h3 className="text-lg font-semibold text-white mb-2">Start Posting Tasks</h3>
              <p className="text-gray-400 text-sm mb-4">
                Create your first task to start building your reputation as an agent
              </p>
            </div>
          )}
        </>
      )}

      {/* Last Active */}
      <div className={styles.card}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{Icons.clock}</span>
            <div>
              <p className="text-white font-medium">Last Active</p>
              <p className="text-sm text-gray-400">Last platform interaction</p>
            </div>
          </div>
          <span className="text-orange-400 font-semibold">
            {formatDate(last_active_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

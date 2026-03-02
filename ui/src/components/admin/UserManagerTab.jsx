import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, ChevronDown, ChevronUp, X, AlertTriangle, Star, Shield, Bot, User as UserIcon, Users, Calendar, Briefcase, Mail, MapPin, CreditCard, ExternalLink, MessageSquare, FileText, Clock, DollarSign } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import API_URL from '../../config/api'
import TierBadge from '../TierBadge'

const MODERATION_COLORS = {
  good_standing: 'bg-green-100 text-green-700',
  warned: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-orange-100 text-orange-700',
  banned: 'bg-red-100 text-red-700',
}

const MODERATION_LABELS = {
  good_standing: 'Good',
  warned: 'Warned',
  suspended: 'Suspended',
  banned: 'Banned',
}

const TYPE_COLORS = {
  human: 'bg-blue-100 text-blue-700',
  agent: 'bg-purple-100 text-purple-700',
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most_active', label: 'Most Active' },
  { value: 'highest_rated', label: 'Highest Rated' },
]

const PAGE_SIZE = 25

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatCents(cents) {
  if (!cents) return '$0.00'
  return '$' + (cents / 100).toFixed(2)
}

// ─── Detail Sub-Tabs ──────────────────────────────────────────

function OverviewPanel({ user, detail, onModerate, actionLoading }) {
  const modStatus = user.moderation_status || 'good_standing'
  const canWarn = modStatus !== 'banned'
  const canSuspend = modStatus !== 'banned' && modStatus !== 'suspended'
  const canBan = modStatus !== 'banned'
  const canRestore = modStatus !== 'good_standing'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Profile info */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Profile</h4>
        <div className="space-y-1.5 text-sm">
          {user.headline && <p className="text-[#1A1A1A] italic">&ldquo;{user.headline}&rdquo;</p>}
          {user.bio && <p className="text-[#6B7280] text-xs line-clamp-3">{user.bio}</p>}
          {(user.city || user.state) && (
            <p className="text-[#9CA3AF] flex items-center gap-1">
              <MapPin size={12} /> {[user.city, user.state].filter(Boolean).join(', ')}
            </p>
          )}
          <p className="text-[#9CA3AF] flex items-center gap-1">
            <Calendar size={12} /> Joined {new Date(user.created_at).toLocaleDateString()}
          </p>
          {user.last_active_at && (
            <p className="text-[#9CA3AF] text-xs">Last active: {timeAgo(user.last_active_at)}</p>
          )}
        </div>

        {/* Plan + USDC */}
        <div className="flex flex-wrap gap-2 text-xs pt-1">
          {user.subscription_tier && user.subscription_tier !== 'free' ? (
            <TierBadge tier={user.subscription_tier} size="xs" />
          ) : (
            <span className="px-2 py-1 rounded-lg bg-[#F3F4F6] text-[#9CA3AF] text-[10px] font-semibold">Free</span>
          )}
          {(Number(user.total_usdc_paid) > 0 || user.wallet_address) && (
            <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700">
              <DollarSign size={10} className="inline mr-0.5" />
              USDC {Number(user.total_usdc_paid || 0) > 0 ? `$${Number(user.total_usdc_paid).toFixed(2)}` : 'wallet set'}
            </span>
          )}
        </div>

        {/* Profile link */}
        <a
          href={`/humans/${user.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FAFAF8] text-[#1A1A1A] hover:bg-[#ECECEC] border border-[#ECECEC] transition-colors"
        >
          View Profile <ExternalLink size={10} />
        </a>

        {/* Moderation stats */}
        <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide pt-2">Moderation</h4>
        <div className="flex flex-wrap gap-3 text-xs text-[#6B7280]">
          <span>Warnings: <strong className="text-[#1A1A1A]">{user.warning_count || 0}</strong></span>
          <span>Reports upheld: <strong className="text-[#1A1A1A]">{user.total_reports_upheld || 0}</strong></span>
          <span>Status: <strong className={modStatus === 'good_standing' ? 'text-[#16A34A]' : 'text-orange-600'}>{MODERATION_LABELS[modStatus] || modStatus}</strong></span>
          {user.suspended_until && (
            <span>Suspended until: <strong className="text-orange-600">{new Date(user.suspended_until).toLocaleDateString()}</strong></span>
          )}
        </div>

        {/* Action buttons */}
        <div className="pt-2">
          <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Actions</h4>
          <div className="flex flex-wrap gap-2">
            {canWarn && (
              <button onClick={e => { e.stopPropagation(); onModerate(user, 'warn') }} disabled={!!actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FEFCE8] text-yellow-700 hover:bg-yellow-100 border border-yellow-200 disabled:opacity-50">Warn</button>
            )}
            {canSuspend && (
              <button onClick={e => { e.stopPropagation(); onModerate(user, 'suspend') }} disabled={!!actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 disabled:opacity-50">Suspend</button>
            )}
            {canBan && (
              <button onClick={e => { e.stopPropagation(); onModerate(user, 'ban') }} disabled={!!actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FEF2F2] text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-50">Ban</button>
            )}
            {canRestore && (
              <button onClick={e => { e.stopPropagation(); onModerate(user, 'restore') }} disabled={!!actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#F0FDF4] text-green-700 hover:bg-green-100 border border-green-200 disabled:opacity-50">Restore</button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Recent tasks (scrollable) */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
          Recent Tasks ({user.type === 'agent' ? 'Posted' : 'Assigned'})
        </h4>
        <div className="max-h-60 overflow-y-auto">
          {detail?.recent_tasks?.length > 0 ? (
            <div className="space-y-1">
              {detail.recent_tasks.map(task => (
                <a key={task.id} href={`/tasks/${task.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white text-sm group">
                  <span className="truncate text-[#1A1A1A] group-hover:text-orange-600 flex-1 mr-2">{task.title}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      task.status === 'completed' || task.status === 'paid' ? 'bg-green-100 text-green-700'
                      : task.status === 'cancelled' ? 'bg-red-100 text-red-700'
                      : task.status === 'open' ? 'bg-blue-100 text-blue-700'
                      : 'bg-[#F3F4F6] text-[#6B7280]'
                    }`}>{task.status}</span>
                    <ExternalLink size={10} className="text-[#9CA3AF] group-hover:text-orange-400" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#9CA3AF] py-2">No tasks found</p>
          )}
        </div>

        {detail?.recent_ratings?.length > 0 && (
          <>
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide pt-2">Recent Ratings</h4>
            <div className="space-y-1">
              {detail.recent_ratings.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center gap-2 text-xs text-[#6B7280] px-2 py-1">
                  <span className="flex items-center gap-0.5">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    {r.rating_score}
                  </span>
                  {r.comment && <span className="truncate text-[#9CA3AF]">&ldquo;{r.comment}&rdquo;</span>}
                  <span className="text-[#9CA3AF] flex-shrink-0">{timeAgo(r.created_at)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PaymentsPanel({ user, detail }) {
  const totalEarned = detail?.total_earned_cents || 0
  const totalSpent = detail?.total_spent_cents || 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {user.type === 'human' ? (
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-green-600 mb-1">Total Earned</p>
            <p className="text-lg font-bold text-green-700">{formatCents(totalEarned)}</p>
          </div>
        ) : (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 mb-1">Total Spent</p>
            <p className="text-lg font-bold text-blue-700">{formatCents(totalSpent)}</p>
          </div>
        )}
        <div className="bg-[#FAFAF8] rounded-lg p-3">
          <p className="text-xs text-[#6B7280] mb-1">Stripe</p>
          <p className="text-sm font-semibold text-[#1A1A1A]">
            {user.stripe_account_id || user.stripe_customer_id ? (
              <span className="text-green-600">Connected</span>
            ) : (
              <span className="text-[#9CA3AF]">Not connected</span>
            )}
          </p>
        </div>
        <div className="bg-[#FAFAF8] rounded-lg p-3">
          <p className="text-xs text-[#6B7280] mb-1">Plan</p>
          <div className="mt-0.5">
            {user.subscription_tier && user.subscription_tier !== 'free' ? (
              <TierBadge tier={user.subscription_tier} size="sm" />
            ) : (
              <span className="text-sm font-semibold text-[#9CA3AF]">Free</span>
            )}
          </div>
        </div>
        {(Number(user.total_usdc_paid) > 0 || user.wallet_address) && (
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-green-600 mb-1">USDC Paid</p>
            <p className="text-sm font-bold text-green-700">${Number(user.total_usdc_paid || 0).toFixed(2)}</p>
            {user.wallet_address && (
              <p className="text-[10px] text-[#9CA3AF] mt-1 truncate font-mono" title={user.wallet_address}>
                {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatsPanel({ user, detail }) {
  const stats = [
    { label: 'Tasks Posted', value: user.total_tasks_posted || 0, icon: <FileText size={14} /> },
    { label: 'Tasks Completed', value: user.total_tasks_completed || 0, icon: <Briefcase size={14} /> },
    { label: 'Tasks Accepted', value: user.total_tasks_accepted || 0, icon: <Shield size={14} /> },
    { label: 'Tasks Applied', value: detail?.tasks_applied_count || 0, icon: <Users size={14} /> },
    { label: 'Messages Sent', value: detail?.messages_sent_count || 0, icon: <MessageSquare size={14} /> },
    { label: 'Disputes Filed', value: user.total_disputes_filed || 0, icon: <AlertTriangle size={14} /> },
    { label: 'Jobs Completed', value: user.jobs_completed || 0, icon: <Briefcase size={14} /> },
    { label: 'Rating', value: user.rating ? `${Number(user.rating).toFixed(1)} (${user.review_count || 0})` : 'N/A', icon: <Star size={14} /> },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-[#FAFAF8] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[#9CA3AF] mb-1">
            {s.icon}
            <span className="text-xs">{s.label}</span>
          </div>
          <p className="text-lg font-bold text-[#1A1A1A]">{s.value}</p>
        </div>
      ))}
    </div>
  )
}

function AuditLogPanel({ userId }) {
  const { authenticatedFetch } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetchLog = async () => {
      setLoading(true)
      try {
        const res = await authenticatedFetch(`${API_URL}/admin/users/${userId}/audit-log?limit=20`)
        if (!res.ok) throw new Error('Failed to fetch audit log')
        const data = await res.json()
        if (!cancelled) setEntries(data.entries || [])
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchLog()
    return () => { cancelled = true }
  }, [userId, authenticatedFetch])

  if (loading) return <div className="py-6 text-center text-sm text-[#9CA3AF]">Loading moderation log...</div>
  if (error) return <div className="py-6 text-center text-sm text-red-500">{error}</div>

  if (entries.length === 0) {
    return <div className="py-6 text-center text-sm text-[#9CA3AF]">No moderation history found</div>
  }

  const ACTION_LABELS = {
    moderate_user_warn: 'Warning Issued',
    moderate_user_suspend: 'Account Suspended',
    moderate_user_ban: 'Account Banned',
    moderate_user_restore: 'Account Restored',
    view_user_detail: 'Profile Viewed',
  }

  return (
    <div className="max-h-60 overflow-y-auto space-y-2">
      {entries.map(entry => (
        <div key={entry.id} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-[#FAFAF8] text-xs">
          <Clock size={12} className="text-[#9CA3AF] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[#1A1A1A]">
                {ACTION_LABELS[entry.action] || entry.action}
              </span>
              <span className="text-[#9CA3AF]">{new Date(entry.created_at).toLocaleString()}</span>
            </div>
            {entry.admin_name && (
              <p className="text-[#9CA3AF]">by {entry.admin_name}</p>
            )}
            {entry.request_body?.notes && (
              <p className="text-[#6B7280] mt-0.5">&ldquo;{entry.request_body.notes}&rdquo;</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── UserRow ──────────────────────────────────────────────────
const DETAIL_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'payments', label: 'Payments' },
  { id: 'stats', label: 'Stats' },
  { id: 'logs', label: 'View Logs' },
]

function UserRow({ user, onModerate, loading: actionLoading }) {
  const { authenticatedFetch } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState('overview')

  const fetchDetail = async () => {
    if (detail) return
    setDetailLoading(true)
    try {
      const res = await authenticatedFetch(`${API_URL}/admin/users/${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setDetail(data)
      }
    } catch { /* ignore */ }
    finally { setDetailLoading(false) }
  }

  const handleExpand = () => {
    const next = !expanded
    setExpanded(next)
    if (next) fetchDetail()
  }

  const modStatus = user.moderation_status || 'good_standing'

  return (
    <div className={`transition-colors ${expanded ? 'bg-[#FAFAF8]/50' : 'hover:bg-[#FAFAF8]/50'}`}>
      {/* Collapsed row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={handleExpand}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#ECECEC] flex items-center justify-center text-xs font-bold text-[#6B7280]">
              {getInitials(user.name)}
            </div>
          )}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1A1A1A] truncate">{user.name || 'Unnamed'}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLORS[user.type] || 'bg-[#F3F4F6] text-[#6B7280]'}`}>
              {user.type || 'unknown'}
            </span>
            {user.subscription_tier && user.subscription_tier !== 'free' && (
              <TierBadge tier={user.subscription_tier} size="xs" />
            )}
            {modStatus !== 'good_standing' && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${MODERATION_COLORS[modStatus] || 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                {MODERATION_LABELS[modStatus] || modStatus}
              </span>
            )}
          </div>
          <p className="text-xs text-[#9CA3AF] truncate">{user.email}</p>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-[#9CA3AF] flex-shrink-0">
          {user.rating != null && user.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              {Number(user.rating).toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Briefcase size={12} />
            {user.task_count || 0}
          </span>
          <span>{timeAgo(user.created_at)}</span>
        </div>

        {/* Chevron */}
        <div className="flex-shrink-0 text-[#9CA3AF]">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#ECECEC]">
          {detailLoading ? (
            <div className="py-6 text-center text-sm text-[#9CA3AF]">Loading user details...</div>
          ) : (
            <>
              {/* Detail sub-tabs */}
              <div className="flex gap-1 pt-3 pb-3 border-b border-[#ECECEC] mb-4">
                {DETAIL_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={e => { e.stopPropagation(); setDetailTab(tab.id) }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      detailTab === tab.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#ECECEC]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {detailTab === 'overview' && (
                <OverviewPanel user={user} detail={detail} onModerate={onModerate} actionLoading={actionLoading} />
              )}
              {detailTab === 'payments' && (
                <PaymentsPanel user={user} detail={detail} />
              )}
              {detailTab === 'stats' && (
                <StatsPanel user={user} detail={detail} />
              )}
              {detailTab === 'logs' && (
                <AuditLogPanel userId={user.id} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── UserModerateModal ────────────────────────────────────────
function UserModerateModal({ targetUser, action: initialAction, onClose, onConfirm, loading }) {
  const [action, setAction] = useState(initialAction)
  const [notes, setNotes] = useState('')
  const [suspendDays, setSuspendDays] = useState(7)

  const actions = [
    { value: 'warn', label: 'Issue Warning', desc: 'Increment warning count. The user will be notified.', color: 'border-yellow-300 bg-[#FEFCE8]', ring: 'ring-yellow-400' },
    { value: 'suspend', label: 'Suspend Account', desc: 'Temporarily block access for a set number of days.', color: 'border-orange-300 bg-orange-50', ring: 'ring-orange-400' },
    { value: 'ban', label: 'Ban Permanently', desc: 'Permanently remove access. This is hard to undo.', color: 'border-red-300 bg-[#FEF2F2]', ring: 'ring-red-400' },
    { value: 'restore', label: 'Restore Account', desc: 'Return the user to good standing and remove restrictions.', color: 'border-green-300 bg-[#F0FDF4]', ring: 'ring-green-400' },
  ]

  const modStatus = targetUser.moderation_status || 'good_standing'
  const available = actions.filter(a => {
    if (a.value === 'restore' && modStatus === 'good_standing') return false
    if (a.value === 'ban' && modStatus === 'banned') return false
    if (a.value === 'suspend' && (modStatus === 'banned' || modStatus === 'suspended')) return false
    if (a.value === 'warn' && modStatus === 'banned') return false
    return true
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">Moderate User</h3>
        <p className="text-sm text-[#6B7280] mb-4">
          Taking action on <strong>{targetUser.name || targetUser.email}</strong> ({targetUser.type})
        </p>

        {/* User preview */}
        <div className="bg-[#FAFAF8] rounded-lg p-3 mb-4 flex items-center gap-3">
          {targetUser.avatar_url ? (
            <img src={targetUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#ECECEC] flex items-center justify-center text-xs font-bold text-[#6B7280]">
              {getInitials(targetUser.name)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">{targetUser.name || 'Unnamed'}</p>
            <p className="text-xs text-[#9CA3AF]">{targetUser.email} · {MODERATION_LABELS[modStatus]} · {targetUser.warning_count || 0} warnings</p>
          </div>
        </div>

        {/* Action selection */}
        <div className="space-y-2 mb-4">
          {available.map(a => (
            <label key={a.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                action === a.value ? `${a.color} ring-2 ${a.ring}` : 'border-[#ECECEC] hover:border-[#ECECEC]'
              }`}>
              <input type="radio" name="mod-action" value={a.value} checked={action === a.value}
                onChange={() => setAction(a.value)} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">{a.label}</p>
                <p className="text-xs text-[#6B7280]">{a.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {action === 'suspend' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Suspension Duration (days)</label>
            <input type="number" min={1} max={365} value={suspendDays}
              onChange={e => setSuspendDays(parseInt(e.target.value) || 7)}
              className="w-32 border border-[#ECECEC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300" />
          </div>
        )}

        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for this action..."
          rows={3} className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 resize-none" />

        <div className="flex items-center justify-end gap-3 mt-5">
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:text-[#1A1A1A] disabled:opacity-50">Cancel</button>
          <button onClick={() => onConfirm({ action, notes, suspension_days: action === 'suspend' ? suspendDays : undefined })}
            disabled={loading || !action}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 ${
              action === 'ban' ? 'bg-red-500 hover:bg-[#DC2626]'
              : action === 'warn' ? 'bg-yellow-500 hover:bg-[#EAB308]'
              : action === 'suspend' ? 'bg-orange-500 hover:bg-orange-600'
              : action === 'restore' ? 'bg-[#16A34A] hover:bg-green-700'
              : 'bg-orange-500 hover:bg-orange-600'
            }`}>
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────
export default function UserManagerTab({ user }) {
  const { authenticatedFetch } = useAuth()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [moderationFilter, setModerationFilter] = useState('all')
  const [sort, setSort] = useState('newest')

  // Moderation
  const [actionLoading, setActionLoading] = useState(null)
  const [modal, setModal] = useState(null)

  const searchRef = useRef(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [typeFilter, moderationFilter, sort])

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort })
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (moderationFilter !== 'all') params.set('moderation', moderationFilter)

      const res = await authenticatedFetch(`${API_URL}/admin/users/search?${params}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, sort, debouncedSearch, typeFilter, moderationFilter, authenticatedFetch])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Moderation
  const openModal = (targetUser, action) => setModal({ user: targetUser, action })

  const executeModeration = async ({ action, notes, suspension_days }) => {
    if (!modal) return
    setActionLoading(modal.user.id)
    try {
      const res = await authenticatedFetch(`${API_URL}/admin/users/${modal.user.id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes, suspension_days })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Failed to ${action} user`)
      }
      setModal(null)
      fetchUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">User Manager</h2>
          <p className="text-sm text-[#9CA3AF] mt-0.5">Browse, search, and moderate all users and agents.</p>
        </div>
        <p className="text-sm text-[#9CA3AF]">{total} user{total !== 1 ? 's' : ''} found</p>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-[#ECECEC] p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-10 py-2.5 border border-[#ECECEC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300" />
          {search && (
            <button onClick={() => { setSearch(''); searchRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Type pills */}
          <div className="flex rounded-lg border border-[#ECECEC] overflow-hidden">
            {[
              { value: 'all', label: 'All' },
              { value: 'human', label: 'Humans', icon: <UserIcon size={12} /> },
              { value: 'agent', label: 'Agents', icon: <Bot size={12} /> },
            ].map(opt => (
              <button key={opt.value} onClick={() => setTypeFilter(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                  typeFilter === opt.value ? 'bg-orange-500 text-white' : 'bg-white text-[#6B7280] hover:bg-[#FAFAF8]'
                }`}>
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>

          {/* Moderation filter */}
          <div className="relative">
            <select value={moderationFilter} onChange={e => setModerationFilter(e.target.value)}
              className="appearance-none bg-[#FAFAF8] border border-[#ECECEC] rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-[#1A1A1A] cursor-pointer hover:border-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-orange-200">
              <option value="all">All Status</option>
              <option value="good_standing">Good Standing</option>
              <option value="warned">Warned</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative ml-auto">
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="appearance-none bg-[#FAFAF8] border border-[#ECECEC] rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-[#1A1A1A] cursor-pointer hover:border-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-orange-200">
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#FEF2F2] border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* User list */}
      <div className="bg-white rounded-xl border border-[#ECECEC] divide-y divide-[#ECECEC]">
        {loading ? (
          <div className="py-16 text-center text-[#9CA3AF] text-sm">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-[#9CA3AF] text-sm">No users match your filters</div>
        ) : (
          users.map(u => (
            <UserRow key={u.id} user={u} onModerate={(targetUser, action) => openModal(targetUser, action)}
              loading={actionLoading === u.id} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#9CA3AF]">
            Showing {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[#F3F4F6] text-[#6B7280] hover:bg-[#ECECEC] disabled:opacity-50">
              Previous
            </button>
            <span className="text-sm text-[#6B7280]">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[#F3F4F6] text-[#6B7280] hover:bg-[#ECECEC] disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Moderation Modal */}
      {modal && (
        <UserModerateModal targetUser={modal.user} action={modal.action}
          onClose={() => setModal(null)} onConfirm={executeModeration} loading={!!actionLoading} />
      )}
    </div>
  )
}

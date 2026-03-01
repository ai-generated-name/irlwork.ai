import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, ChevronDown, ChevronUp, X, AlertTriangle, Star, Shield, Bot, User as UserIcon, Calendar, Briefcase, Mail, MapPin, CreditCard, ExternalLink } from 'lucide-react'
import { Button } from '../ui'
import { adminFetch } from '../../utils/adminFetch'
import API_URL from '../../config/api'
import Card from '../ui/Card'

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

// ─── UserRow ──────────────────────────────────────────────────
function UserRow({ user, onModerate, loading: actionLoading }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchDetail = async () => {
    if (detail) return // already fetched
    setDetailLoading(true)
    try {
      const res = await adminFetch(`${API_URL}/admin/users/${user.id}`)
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
  const canWarn = modStatus !== 'banned'
  const canSuspend = modStatus !== 'banned' && modStatus !== 'suspended'
  const canBan = modStatus !== 'banned'
  const canRestore = modStatus !== 'good_standing'

  return (
    <div className={`transition-colors ${expanded ? 'bg-[#FAFAF8]/50' : 'hover:bg-[#FAFAF8]/50'}`}>
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={handleExpand}
      >
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
              {/* Left: Profile info */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Profile</h4>
                <div className="space-y-1.5 text-sm">
                  {user.headline && <p className="text-[#1A1A1A] italic">"{user.headline}"</p>}
                  {user.bio && <p className="text-[#6B7280] text-xs line-clamp-3">{user.bio}</p>}
                  {(user.city || user.state) && (
                    <p className="text-[#9CA3AF] flex items-center gap-1">
                      <MapPin size={12} /> {[user.city, user.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {user.phone && (
                    <p className="text-[#9CA3AF] flex items-center gap-1">
                      <Mail size={12} /> {user.phone}
                    </p>
                  )}
                  <p className="text-[#9CA3AF] flex items-center gap-1">
                    <Calendar size={12} /> Joined {new Date(user.created_at).toLocaleDateString()}
                  </p>
                  {user.last_active_at && (
                    <p className="text-[#9CA3AF] text-xs">Last active: {timeAgo(user.last_active_at)}</p>
                  )}
                </div>

                {/* Financial */}
                <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide pt-2">Financial</h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`px-2 py-1 rounded-lg ${user.stripe_account_id || user.stripe_customer_id ? 'bg-[#F0FDF4] text-green-700' : 'bg-[#F3F4F6] text-[#9CA3AF]'}`}>
                    <CreditCard size={10} className="inline mr-1" />
                    Stripe {user.stripe_account_id || user.stripe_customer_id ? 'Connected' : 'Not connected'}
                  </span>
                  {user.subscription_tier && user.subscription_tier !== 'free' && (
                    <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700">
                      {user.subscription_tier} tier
                    </span>
                  )}
                  {user.verified && (
                    <span className="px-2 py-1 rounded-lg bg-[#EFF6FF] text-blue-700">Verified</span>
                  )}
                </div>

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
              </div>

              {/* Right: Tasks + Ratings */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                  Recent Tasks ({user.type === 'agent' ? 'Posted' : 'Assigned'})
                </h4>
                {detail?.recent_tasks?.length > 0 ? (
                  <div className="space-y-1">
                    {detail.recent_tasks.map(task => (
                      <a
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white text-sm group"
                      >
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
                          {r.comment && <span className="truncate text-[#9CA3AF]">"{r.comment}"</span>}
                          <span className="text-[#9CA3AF] flex-shrink-0">{timeAgo(r.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Action buttons */}
                <div className="pt-3 border-t border-[#ECECEC]">
                  <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {canWarn && (
                      <button
                        onClick={e => { e.stopPropagation(); onModerate(user, 'warn') }}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FEFCE8] text-yellow-700 hover:bg-yellow-100 border border-yellow-200 disabled:opacity-50"
                      >
                        Warn
                      </button>
                    )}
                    {canSuspend && (
                      <button
                        onClick={e => { e.stopPropagation(); onModerate(user, 'suspend') }}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 disabled:opacity-50"
                      >
                        Suspend
                      </button>
                    )}
                    {canBan && (
                      /* eslint-disable-next-line irlwork/no-inline-button-pattern -- soft destructive admin moderation style */
                      <button
                        onClick={e => { e.stopPropagation(); onModerate(user, 'ban') }}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FEF2F2] text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-50"
                      >
                        Ban
                      </button>
                    )}
                    {canRestore && (
                      /* eslint-disable-next-line irlwork/no-inline-button-pattern -- soft success admin moderation style */
                      <button
                        onClick={e => { e.stopPropagation(); onModerate(user, 'restore') }}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#F0FDF4] text-green-700 hover:bg-green-100 border border-green-200 disabled:opacity-50"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
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

  // Filter contextually
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
            <label
              key={a.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                action === a.value ? `${a.color} ring-2 ${a.ring}` : 'border-[#ECECEC] hover:border-[#ECECEC]'
              }`}
            >
              <input
                type="radio"
                name="mod-action"
                value={a.value}
                checked={action === a.value}
                onChange={() => setAction(a.value)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">{a.label}</p>
                <p className="text-xs text-[#6B7280]">{a.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Suspension days */}
        {action === 'suspend' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Suspension Duration (days)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={suspendDays}
              onChange={e => setSuspendDays(parseInt(e.target.value) || 7)}
              className="w-32 border border-[#ECECEC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
            />
          </div>
        )}

        {/* Notes */}
        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Reason for this action..."
          rows={3}
          className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 resize-none"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:text-[#1A1A1A] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ action, notes, suspension_days: action === 'suspend' ? suspendDays : undefined })}
            disabled={loading || !action}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 ${
              action === 'ban' ? 'bg-red-500 hover:bg-[#DC2626]'
              : action === 'warn' ? 'bg-yellow-500 hover:bg-[#EAB308]'
              : action === 'suspend' ? 'bg-orange-500 hover:bg-orange-600'
              : action === 'restore' ? 'bg-[#16A34A] hover:bg-green-700'
              : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────
export default function UserManagerTab({ user }) {
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
  const [modal, setModal] = useState(null) // { user, action }

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
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort,
      })
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (moderationFilter !== 'all') params.set('moderation', moderationFilter)

      const res = await adminFetch(`${API_URL}/admin/users/search?${params}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, sort, debouncedSearch, typeFilter, moderationFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Moderation
  const openModal = (targetUser, action) => setModal({ user: targetUser, action })

  const executeModeration = async ({ action, notes, suspension_days }) => {
    if (!modal) return
    setActionLoading(modal.user.id)
    try {
      const res = await adminFetch(`${API_URL}/admin/users/${modal.user.id}/moderate`, {
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
      <Card padding="none" className="p-4 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-10 py-2.5 border border-[#ECECEC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); searchRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Type pills */}
          <div className="flex rounded-lg border border-[#ECECEC] overflow-hidden">
            {[
              { value: 'all', label: 'All' },
              { value: 'human', label: 'Humans', icon: <UserIcon size={12} /> },
              { value: 'agent', label: 'Agents', icon: <Bot size={12} /> },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                  typeFilter === opt.value
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-[#6B7280] hover:bg-[#FAFAF8]'
                }`}
              >
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>

          {/* Moderation filter */}
          <div className="relative">
            <select
              value={moderationFilter}
              onChange={e => setModerationFilter(e.target.value)}
              className="appearance-none bg-[#FAFAF8] border border-[#ECECEC] rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-[#1A1A1A] cursor-pointer hover:border-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
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
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="appearance-none bg-[#FAFAF8] border border-[#ECECEC] rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-[#1A1A1A] cursor-pointer hover:border-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          </div>
        </div>
      </Card>

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
      {/* eslint-disable-next-line irlwork/no-inline-card-pattern -- complex admin user list with divide-y rows */}
      <div className="bg-white rounded-xl border border-[#ECECEC] divide-y divide-[#ECECEC]">
        {loading ? (
          <div className="py-16 text-center text-[#9CA3AF] text-sm">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-[#9CA3AF] text-sm">No users match your filters</div>
        ) : (
          users.map(u => (
            <UserRow
              key={u.id}
              user={u}
              onModerate={(targetUser, action) => openModal(targetUser, action)}
              loading={actionLoading === u.id}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#9CA3AF]">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-[#6B7280]">Page {page} of {totalPages}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Moderation Modal */}
      {modal && (
        <UserModerateModal
          targetUser={modal.user}
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={executeModeration}
          loading={!!actionLoading}
        />
      )}
    </div>
  )
}

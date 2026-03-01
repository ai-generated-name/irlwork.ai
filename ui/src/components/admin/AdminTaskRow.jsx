import { useState } from 'react'
import { Eye, Users, Clock, MapPin, Globe, ChevronDown, ChevronUp, EyeOff, Trash2, RotateCcw, Copy } from 'lucide-react'

// ── Shared constants ─────────────────────────────────────────

export const STATUS_COLORS = {
  open: 'bg-green-100 text-green-700',
  pending_acceptance: 'bg-blue-100 text-blue-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  pending_review: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  disputed: 'bg-red-100 text-red-700',
  paid: 'bg-[#F3F4F6] text-[#6B7280]',
  cancelled: 'bg-[#F3F4F6] text-[#9CA3AF]',
  expired: 'bg-[#F3F4F6] text-[#9CA3AF]',
}

export const STATUS_LABELS = {
  open: 'Open',
  pending_acceptance: 'Pending Accept',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  completed: 'Completed',
  disputed: 'Disputed',
  paid: 'Paid',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

export const CATEGORY_LABELS = {
  general: 'General',
  delivery: 'Delivery',
  photography: 'Photography',
  data_collection: 'Data Collection',
  mystery_shopping: 'Mystery Shopping',
  event_support: 'Event Support',
  research: 'Research',
  cleaning: 'Cleaning',
  moving: 'Moving',
  handyman: 'Handyman',
  other: 'Other',
}

const MODERATION_COLORS = {
  hidden: 'bg-orange-100 text-orange-700',
  removed: 'bg-red-100 text-red-700',
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 0) return 'just now'
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function durationLabel(task) {
  if (task.deadline) {
    const diff = new Date(task.deadline).getTime() - Date.now()
    if (diff < 0) {
      const days = Math.ceil(Math.abs(diff) / (1000 * 60 * 60 * 24))
      return { text: `Overdue ${days}d`, color: 'text-red-500' }
    }
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 24) return { text: `Due in ${hours}h`, color: 'text-orange-500' }
    const days = Math.floor(hours / 24)
    return { text: `Due in ${days}d`, color: 'text-[#9CA3AF]' }
  }
  if (task.duration_hours) return { text: `~${task.duration_hours}h`, color: 'text-[#9CA3AF]' }
  if (task.duration) return { text: task.duration, color: 'text-[#9CA3AF]' }
  return null
}

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

// ── Component ────────────────────────────────────────────────

export default function AdminTaskRow({
  task,
  isNew = false,
  actions = false,
  onHide,
  onRemove,
  onUnflag,
  loading = false,
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const statusColor = STATUS_COLORS[task.status] || 'bg-[#F3F4F6] text-[#6B7280]'
  const statusLabel = STATUS_LABELS[task.status] || task.status
  const dur = durationLabel(task)
  const modStatus = task.moderation_status && task.moderation_status !== 'clean' ? task.moderation_status : null

  const copyId = () => {
    navigator.clipboard.writeText(task.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`transition-colors duration-1000 ${isNew ? 'bg-orange-50' : 'hover:bg-[#FAFAF8]'}`}>
      {/* Main row */}
      <div className="px-5 py-3.5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: task info */}
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${statusColor}`}>
                {statusLabel}
              </span>
              {modStatus && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${MODERATION_COLORS[modStatus]}`}>
                  {modStatus}
                </span>
              )}
              <span className="text-[11px] font-medium text-[#9CA3AF] uppercase">
                {CATEGORY_LABELS[task.category] || task.category || 'General'}
              </span>
              {task.is_remote ? (
                <span className="flex items-center gap-0.5 text-[11px] text-blue-500">
                  <Globe size={10} /> Remote
                </span>
              ) : task.location ? (
                <span className="flex items-center gap-0.5 text-[11px] text-[#9CA3AF] truncate max-w-[140px]">
                  <MapPin size={10} /> {task.location}
                </span>
              ) : null}
            </div>

            {/* Title */}
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">{task.title}</p>

            {/* Description preview */}
            {task.description && (
              <p className="text-xs text-[#6B7280] mt-0.5 truncate">{truncate(task.description, 120)}</p>
            )}

            {/* Meta line */}
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              by {task.agent_name || 'Unknown'}
              {task.task_type === 'open' && task.quantity > 1 && (
                <span className="ml-2">{task.spots_filled}/{task.quantity} filled</span>
              )}
            </p>
          </div>

          {/* Right: metrics + actions */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold text-[#1A1A1A]">${task.budget}</p>
            </div>

            {dur && (
              <div className={`flex items-center gap-1 text-xs ${dur.color}`} title="Duration">
                <Clock size={13} />
                <span>{dur.text}</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-xs text-[#9CA3AF]" title="Applicants">
              <Users size={13} />
              <span>{task.applicant_count || 0}</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-[#9CA3AF]" title="Views">
              <Eye size={13} />
              <span>{task.view_count || 0}</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-[#9CA3AF] w-16 justify-end" title={task.created_at ? new Date(task.created_at).toLocaleString() : ''}>
              <Clock size={13} />
              <span>{timeAgo(task.created_at)}</span>
            </div>

            {/* Action buttons (Task Manager only) */}
            {actions && (
              <div className="flex items-center gap-1.5 ml-2">
                {(!modStatus || modStatus === 'clean') && onHide && (
                  <button
                    onClick={() => onHide(task)}
                    disabled={loading}
                    className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50"
                    title="Hide task"
                  >
                    <EyeOff size={15} />
                  </button>
                )}
                {modStatus === 'hidden' && onUnflag && (
                  /* eslint-disable-next-line irlwork/no-inline-button-pattern -- icon-only admin action button */
                  <button
                    onClick={() => onUnflag(task)}
                    disabled={loading}
                    className="p-1.5 rounded-lg text-[#16A34A] hover:bg-[#F0FDF4] transition-colors disabled:opacity-50"
                    title="Restore task"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                {modStatus !== 'removed' && onRemove && (
                  /* eslint-disable-next-line irlwork/no-inline-button-pattern -- icon-only admin action button */
                  <button
                    onClick={() => onRemove(task)}
                    disabled={loading}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
                    title="Remove task"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}

            {/* Expand toggle */}
            {/* eslint-disable-next-line irlwork/no-inline-button-pattern -- icon-only toggle button */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] transition-colors"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 pt-0 border-t border-[#ECECEC]">
          <div className="pt-3 space-y-3">
            {/* Full description */}
            {task.description && (
              <div>
                <p className="text-xs font-semibold text-[#6B7280] uppercase mb-1">Description</p>
                <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Detail grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[#9CA3AF]">Task ID</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <code className="text-[#1A1A1A] font-mono text-[11px]">{task.id?.slice(0, 8)}...</code>
                  <button onClick={copyId} className="text-[#9CA3AF] hover:text-[#6B7280]" title="Copy full ID">
                    <Copy size={11} />
                  </button>
                  {copied && <span className="text-[#16A34A] text-[10px]">Copied</span>}
                </div>
              </div>
              {task.agent_email && (
                <div>
                  <span className="text-[#9CA3AF]">Agent Email</span>
                  <p className="text-[#1A1A1A] mt-0.5">{task.agent_email}</p>
                </div>
              )}
              {task.escrow_status && (
                <div>
                  <span className="text-[#9CA3AF]">Escrow</span>
                  <p className="text-[#1A1A1A] mt-0.5 capitalize">{task.escrow_status}</p>
                </div>
              )}
              {task.deadline && (
                <div>
                  <span className="text-[#9CA3AF]">Deadline</span>
                  <p className="text-[#1A1A1A] mt-0.5">{new Date(task.deadline).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {/* Moderation info */}
            {task.hidden_at && (
              <div className="bg-orange-50 rounded-lg p-2.5 text-xs">
                <span className="font-medium text-orange-700">Moderated: </span>
                <span className="text-orange-600">{task.hidden_reason || 'No reason given'}</span>
                <span className="text-orange-400 ml-2">{timeAgo(task.hidden_at)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

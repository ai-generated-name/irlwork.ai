// TaskRow — Compact row component for task lists (hiring + working dashboards)
// Adapted from AdminTaskRow layout with expandable action sections.

import { useState } from 'react'
import { Eye, Users, Clock, MapPin, Globe, ChevronDown, ChevronUp, FolderOpen, FileText, Ban, Star, MessageCircle, ArrowDownLeft, AlertTriangle, Timer } from 'lucide-react'
import { StatusPill, Button } from './ui'
import EscrowBadge from './EscrowBadge'
import { navigate } from '../utils/navigate'
import { timeAgo } from './admin/AdminTaskRow'

const CATEGORY_LABELS = {
  general: 'General',
  delivery: 'Delivery',
  photography: 'Photography',
  data_collection: 'Data Collection',
  'data-collection': 'Data Collection',
  errands: 'Errands',
  cleaning: 'Cleaning',
  moving: 'Moving',
  manual_labor: 'Manual Labor',
  inspection: 'Inspection',
  tech: 'Tech',
  'tech-setup': 'Tech Setup',
  translation: 'Translation',
  verification: 'Verification',
  other: 'Other',
}

const PLATFORM_FEE_PERCENT = 15

function durationLabel(task) {
  if (task.deadline) {
    const diff = new Date(task.deadline).getTime() - Date.now()
    if (diff < 0) {
      const days = Math.ceil(Math.abs(diff) / (1000 * 60 * 60 * 24))
      return { text: `Overdue ${days}d`, color: 'text-red-500' }
    }
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 24) return { text: `Due ${hours}h`, color: 'text-orange-500' }
    const days = Math.floor(hours / 24)
    return { text: `Due ${days}d`, color: 'text-[#9CA3AF]' }
  }
  if (task.duration_hours) return { text: `~${task.duration_hours}h`, color: 'text-[#9CA3AF]' }
  return null
}

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

function calculatePayout(budget) {
  const amount = Number(budget) || 0
  const fee = Math.round(amount * PLATFORM_FEE_PERCENT) / 100
  const payout = Math.round((amount - fee) * 100) / 100
  return { fee: fee.toFixed(2), payout: payout.toFixed(2) }
}

// ── Component ────────────────────────────────────────────────

export default function TaskRow({
  task,
  variant = 'hiring', // 'hiring' | 'working'
  // Hiring-specific
  onAssignHuman,
  onDeclineApplication,
  onNegotiate,
  onFetchApplications,
  applications = [],
  onReviewProof,
  onEditTask,
  onCancelTask,
  editingTaskId,
  editForm = {},
  setEditForm,
  cancelConfirmId,
  setCancelConfirmId,
  cancellingTaskId,
  assigningHuman,
  decliningAppId,
  negotiateAppId,
  setNegotiateAppId,
  negotiateMsg = '',
  setNegotiateMsg,
  assignNotes = {},
  setAssignNotes,
  // Worker-specific
  onAccept,
  onDecline,
  onStartWork,
  onSubmitProof,
  // Shared
  onClick,
  user,
}) {
  const [expanded, setExpanded] = useState(false)

  if (!task) return null

  const dur = durationLabel(task)
  const isInactive = task.status === 'cancelled'
  const isOpen = task.status === 'open'
  const isEditing = editingTaskId === task.id
  const cancellable = ['open', 'pending_acceptance', 'assigned', 'in_progress'].includes(task.status)
  const needsReview = task.status === 'pending_review'
  const pendingCount = applications.filter?.(a => a.status === 'pending').length || task.pending_applicant_count || 0
  const { fee, payout } = calculatePayout(task.budget)

  const handleRowClick = () => {
    if (onClick) {
      onClick(task)
    } else {
      navigate(`/tasks/${task.id}`)
    }
  }

  const stop = (e) => e.stopPropagation()

  return (
    <div className={`transition-colors ${isInactive ? 'opacity-55' : 'hover:bg-[#FAFAF8]'}`}>
      {/* Main row */}
      <div className="px-4 sm:px-5 py-3 sm:py-3.5 cursor-pointer" onClick={handleRowClick}>
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          {/* Left: task info */}
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <StatusPill status={task.status} size="sm" />
              <span className="text-[11px] font-medium text-[#9CA3AF] uppercase">
                {CATEGORY_LABELS[task.category] || task.category || 'General'}
              </span>
              {task.is_remote || (!task.city && !task.location) ? (
                <span className="flex items-center gap-0.5 text-[11px] text-blue-500">
                  <Globe size={10} /> Remote
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[11px] text-[#9CA3AF] truncate max-w-[140px]">
                  <MapPin size={10} /> {task.city || task.location}
                </span>
              )}
              {variant === 'hiring' && pendingCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#E8853D]">
                  <Users size={10} /> {pendingCount} pending
                </span>
              )}
            </div>

            {/* Title */}
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">{task.title}</p>

            {/* Description preview */}
            {task.description && (
              <p className="text-xs text-[#6B7280] mt-0.5 truncate">{truncate(task.description, 120)}</p>
            )}

            {/* Worker payout line (working variant) */}
            {variant === 'working' && (
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                You earn <span className="font-semibold text-[#16A34A]">${payout}</span>
                <span className="ml-2">Fee ${fee}</span>
              </p>
            )}
          </div>

          {/* Right: metrics */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <p className="text-sm font-bold text-[#1A1A1A]">${task.budget}</p>

            {dur && (
              <div className={`hidden sm:flex items-center gap-1 text-xs ${dur.color}`} title="Deadline">
                <Clock size={13} />
                <span>{dur.text}</span>
              </div>
            )}

            {variant === 'hiring' && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-[#9CA3AF]" title="Applicants">
                <Users size={13} />
                <span>{task.applicant_count || 0}</span>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-1 text-xs text-[#9CA3AF]" title="Views">
              <Eye size={13} />
              <span>{task.view_count || 0}</span>
            </div>

            <div className="hidden md:flex items-center gap-1 text-xs text-[#9CA3AF] w-14 justify-end" title={task.created_at ? new Date(task.created_at).toLocaleString() : ''}>
              <Clock size={13} />
              <span>{timeAgo(task.created_at)}</span>
            </div>

            {/* Expand toggle */}
            <button
              onClick={(e) => { stop(e); setExpanded(!expanded) }}
              className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] transition-colors"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Expanded section ─────────────────────────────── */}
      {expanded && (
        <div className="px-4 sm:px-5 pb-4 pt-0 border-t border-[#ECECEC]" onClick={stop}>
          <div className="pt-3 space-y-3">

            {/* ── HIRING variant actions ─────────────────── */}
            {variant === 'hiring' && (
              <>
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {isOpen && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (isEditing) {
                          // Cancel editing handled by parent
                        }
                        if (setEditForm) {
                          setEditForm(isEditing ? {} : {
                            title: task.title,
                            description: task.description || '',
                            budget: task.budget,
                            category: task.category || '',
                            location: task.city || '',
                            is_remote: task.is_remote || false,
                            deadline: task.deadline || '',
                          })
                        }
                      }}
                    >
                      <FileText size={14} className="mr-1" />
                      {isEditing ? 'Cancel edit' : 'Edit'}
                    </Button>
                  )}
                  {cancellable && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setCancelConfirmId?.(cancelConfirmId === task.id ? null : task.id)}
                    >
                      <Ban size={14} className="mr-1" />
                      Cancel task
                    </Button>
                  )}
                  {needsReview && onReviewProof && (
                    <Button variant="primary" size="sm" onClick={() => onReviewProof(task.id)}>
                      Review proof
                    </Button>
                  )}
                </div>

                {/* Cancel confirmation */}
                {cancelConfirmId === task.id && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600 font-medium mb-3">Are you sure you want to cancel this task?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={cancellingTaskId === task.id}
                        onClick={() => onCancelTask?.(task.id)}
                      >
                        {cancellingTaskId === task.id ? 'Cancelling...' : 'Yes, cancel'}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setCancelConfirmId?.(null)}>
                        No, keep
                      </Button>
                    </div>
                  </div>
                )}

                {/* Inline edit form */}
                {isEditing && (
                  <div className="p-4 bg-[#FAFAF8] rounded-xl space-y-3">
                    <div>
                      <label className="text-xs font-medium text-[#6B7280] block mb-1">Title</label>
                      <input
                        type="text"
                        value={editForm.title || ''}
                        onChange={e => setEditForm?.(f => ({ ...f, title: e.target.value }))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#ECECEC] focus:border-[#E8853D] focus:ring-1 focus:ring-[#E8853D]/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#6B7280] block mb-1">Description</label>
                      <textarea
                        value={editForm.description || ''}
                        onChange={e => setEditForm?.(f => ({ ...f, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#ECECEC] focus:border-[#E8853D] focus:ring-1 focus:ring-[#E8853D]/20 outline-none resize-y"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-[#6B7280] block mb-1">Budget ($)</label>
                        <input
                          type="number"
                          value={editForm.budget || ''}
                          onChange={e => setEditForm?.(f => ({ ...f, budget: parseFloat(e.target.value) || '' }))}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#ECECEC] focus:border-[#E8853D] focus:ring-1 focus:ring-[#E8853D]/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#6B7280] block mb-1">Category</label>
                        <input
                          type="text"
                          value={editForm.category || ''}
                          onChange={e => setEditForm?.(f => ({ ...f, category: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#ECECEC] focus:border-[#E8853D] focus:ring-1 focus:ring-[#E8853D]/20 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-[#6B7280] block mb-1">Location</label>
                        <input
                          type="text"
                          value={editForm.location || ''}
                          onChange={e => setEditForm?.(f => ({ ...f, location: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#ECECEC] focus:border-[#E8853D] focus:ring-1 focus:ring-[#E8853D]/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#6B7280] block mb-1">Deadline</label>
                        <input
                          type="datetime-local"
                          value={editForm.deadline ? editForm.deadline.slice(0, 16) : ''}
                          onChange={e => setEditForm?.(f => ({ ...f, deadline: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#ECECEC] focus:border-[#E8853D] focus:ring-1 focus:ring-[#E8853D]/20 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" size="sm" onClick={() => { setEditForm?.({}); }}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={() => onEditTask?.(task.id)}>Save changes</Button>
                    </div>
                  </div>
                )}

                {/* Applicants section */}
                {isOpen && onFetchApplications && (
                  <ApplicantsSection
                    task={task}
                    applications={applications}
                    onFetch={() => onFetchApplications(task.id)}
                    onAssign={onAssignHuman}
                    onDecline={onDeclineApplication}
                    onNegotiate={onNegotiate}
                    assigningHuman={assigningHuman}
                    decliningAppId={decliningAppId}
                    negotiateAppId={negotiateAppId}
                    setNegotiateAppId={setNegotiateAppId}
                    negotiateMsg={negotiateMsg}
                    setNegotiateMsg={setNegotiateMsg}
                    assignNotes={assignNotes}
                    setAssignNotes={setAssignNotes}
                    user={user}
                  />
                )}

                {/* Payment released */}
                {task.status === 'paid' && (
                  <p className="text-sm text-[#16A34A] flex items-center gap-1">
                    <ArrowDownLeft size={14} /> Payment released
                  </p>
                )}
              </>
            )}

            {/* ── WORKING variant actions ─────────────────── */}
            {variant === 'working' && (
              <>
                {/* Escrow badge */}
                {task.escrow_status && (
                  <EscrowBadge status={task.escrow_status} amount={task.budget} paymentMethod={task.payment_method} />
                )}

                <div className="flex flex-wrap gap-2">
                  {task.status === 'pending_acceptance' && onAccept && (
                    <>
                      <Button variant="primary" size="sm" onClick={() => onAccept(task.id)}>Accept task</Button>
                      {onDecline && (
                        <Button variant="secondary" size="sm" onClick={() => onDecline(task.id)}>Decline</Button>
                      )}
                    </>
                  )}
                  {task.status === 'open' && onAccept && (
                    <Button variant="primary" size="sm" onClick={() => onAccept(task.id)}>Accept task</Button>
                  )}
                  {(task.status === 'accepted' || task.status === 'assigned') && onStartWork && (
                    <Button variant="primary" size="sm" onClick={() => onStartWork(task.id)}>Start work</Button>
                  )}
                  {task.status === 'in_progress' && onSubmitProof && (
                    <Button variant="primary" size="sm" onClick={() => onSubmitProof(task.id)}>Submit proof</Button>
                  )}
                  {task.status === 'pending_review' && (
                    <Button variant="secondary" size="sm" disabled>Waiting for approval</Button>
                  )}
                  {task.status === 'approved' && (
                    <span className="text-sm text-[#6B7280]">Work approved, payment pending</span>
                  )}
                  {task.status === 'completed' && (
                    <span className="text-sm text-[#16A34A]">Task completed, payment pending</span>
                  )}
                  {task.status === 'paid' && (
                    <span className="text-sm text-[#16A34A] flex items-center gap-1">
                      <ArrowDownLeft size={14} /> Payment received
                    </span>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}


// ── Applicants sub-section (hiring only) ────────────────────

function ApplicantsSection({
  task,
  applications,
  onFetch,
  onAssign,
  onDecline,
  onNegotiate,
  assigningHuman,
  decliningAppId,
  negotiateAppId,
  setNegotiateAppId,
  negotiateMsg,
  setNegotiateMsg,
  assignNotes,
  setAssignNotes,
  user,
}) {
  const [showApplicants, setShowApplicants] = useState(false)
  const pendingCount = applications.filter?.(a => a.status === 'pending').length || 0

  return (
    <div className="border-t border-[#ECECEC] pt-3">
      <button
        onClick={() => {
          if (!showApplicants) onFetch?.()
          setShowApplicants(!showApplicants)
        }}
        className="text-sm font-medium text-[#E8853D] hover:text-[#D4742E] transition-colors bg-transparent border-none cursor-pointer p-0"
      >
        {showApplicants ? '▼ Hide applicants' : `▶ View applicants${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
      </button>

      {showApplicants && (
        <div className="mt-3 space-y-2">
          {applications.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] text-center py-3">No applicants yet</p>
          ) : (
            applications.map(app => (
              <div key={app.id} className="p-3 bg-[#FAFAF8] rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E8853D] to-[#D4742E] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {app.applicant?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A]">{app.applicant?.name || 'Anonymous'}</p>
                      <p className="text-xs text-[#6B7280]">
                        <Star size={11} className="inline align-[-1px]" /> {app.applicant?.rating?.toFixed(1) || 'New'} · {app.applicant?.jobs_completed || 0} jobs
                        {app.applicant?.success_rate != null && app.applicant?.success_rate < 70 && (
                          <span className="text-amber-600 ml-1.5">
                            <AlertTriangle size={10} className="inline align-[-1px]" /> {app.applicant.success_rate}%
                          </span>
                        )}
                      </p>
                      {app.cover_letter && (
                        <p className="text-xs text-[#6B7280] mt-1 truncate"><strong>Fit:</strong> {app.cover_letter}</p>
                      )}
                      {app.proposed_rate != null && (
                        <p className="text-xs text-[#E8853D] font-semibold mt-0.5">Counter: ${app.proposed_rate}</p>
                      )}
                    </div>
                  </div>

                  {app.status === 'rejected' ? (
                    <span className="text-xs text-red-600 font-medium shrink-0">Declined</span>
                  ) : (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onAssign?.(task.id, app.human_id)}
                        disabled={assigningHuman === app.human_id}
                      >
                        {assigningHuman === app.human_id ? 'Assigning...' : `Accept${user?.default_payment_method === 'usdc' ? ' (USDC)' : ' (Card)'}`}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDecline?.(task.id, app.id)}
                        disabled={decliningAppId === app.id}
                      >
                        {decliningAppId === app.id ? 'Declining...' : 'Decline'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setNegotiateAppId?.(negotiateAppId === app.id ? null : app.id); setNegotiateMsg?.('') }}
                      >
                        <MessageCircle size={13} className="mr-1" /> Negotiate
                      </Button>
                    </div>
                  )}
                </div>

                {/* Note input */}
                {app.status !== 'rejected' && (
                  <input
                    type="text"
                    placeholder="Note for worker (optional)..."
                    value={assignNotes?.[app.human_id] || ''}
                    onChange={e => setAssignNotes?.(prev => ({ ...prev, [app.human_id]: e.target.value }))}
                    className="mt-2 w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#ECECEC] focus:border-[#E8853D] outline-none"
                  />
                )}

                {/* Negotiate message */}
                {negotiateAppId === app.id && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Send a message to negotiate..."
                      value={negotiateMsg}
                      onChange={e => setNegotiateMsg?.(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') onNegotiate?.(task.id, app.human_id) }}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[#ECECEC] focus:border-[#E8853D] outline-none"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onNegotiate?.(task.id, app.human_id)}
                      disabled={!negotiateMsg?.trim()}
                    >
                      Send
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

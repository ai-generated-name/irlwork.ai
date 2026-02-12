import { useState, useEffect } from 'react'
import { Scale } from 'lucide-react'
import API_URL from '../config/api'

export default function DisputePanel({ user }) {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, open, resolved
  const [resolvingId, setResolvingId] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolution, setResolution] = useState('approved')
  const [submitting, setSubmitting] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const isAdmin = user && user.type === 'admin'

  useEffect(() => {
    fetchDisputes()
  }, [user, filter])

  const fetchDisputes = async () => {
    try {
      setLoading(true)
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`${API_URL}/disputes${params}`, {
        headers: { Authorization: user.id }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch disputes')
      }

      const data = await res.json()
      setDisputes(data.disputes || [])
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching disputes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (disputeId) => {
    if (!resolutionNotes.trim()) return

    try {
      setSubmitting(true)
      const res = await fetch(`${API_URL}/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: {
          Authorization: user.id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resolution,
          resolution_notes: resolutionNotes.trim(),
          refund_agent: resolution === 'approved'
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to resolve dispute')
      }

      setResolvingId(null)
      setResolutionNotes('')
      setResolution('approved')
      fetchDisputes()
    } catch (err) {
      setError(err.message)
      console.error('Error resolving dispute:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCategoryLabel = (category) => {
    const labels = {
      quality: 'Quality Issue',
      incomplete: 'Incomplete Work',
      no_show: 'No Show',
      payment: 'Payment Dispute',
      communication: 'Communication',
      other: 'Other'
    }
    return labels[category] || category || 'General'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#525252]">Loading disputes...</div>
      </div>
    )
  }

  if (error && disputes.length === 0) {
    return (
      <div className="bg-[#FEE2E2] border border-[#DC2626]/20 rounded-xl p-4">
        <p className="text-[#DC2626]">Error: {error}</p>
        <button
          onClick={fetchDisputes}
          className="mt-2 text-sm text-[#DC2626] hover:text-[#B91C1C] underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-teal">Disputes</h2>
          <p className="text-sm text-[#8A8A8A] mt-1">
            {disputes.length} dispute{disputes.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-[#F5F2ED] rounded-xl p-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'resolved', label: 'Resolved' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === tab.value
                  ? 'bg-white text-teal shadow-v4-sm'
                  : 'text-[#8A8A8A] hover:text-[#525252]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner (non-blocking) */}
      {error && (
        <div className="bg-[#FEE2E2] border border-[#DC2626]/20 rounded-xl p-3 flex items-center justify-between">
          <p className="text-[#DC2626] text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-[#DC2626] hover:text-[#B91C1C] text-sm font-medium ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Empty State */}
      {disputes.length === 0 ? (
        <div className="bg-white border-2 border-[rgba(26,26,26,0.08)] rounded-xl p-8 md:p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-teal/10 rounded-2xl flex items-center justify-center">
            <Scale size={28} />
          </div>
          <p className="text-[#525252] font-medium text-sm md:text-base">No disputes found</p>
          <p className="text-xs md:text-sm text-[#8A8A8A] mt-2">
            {filter !== 'all'
              ? `No ${filter} disputes. Try changing the filter.`
              : 'Disputes will appear here when filed on your tasks.'}
          </p>
        </div>
      ) : (
        /* Dispute List */
        <div className="space-y-3">
          {disputes.map((dispute) => {
            const isOpen = dispute.status === 'open'
            const isExpanded = expandedId === dispute.id
            const isResolving = resolvingId === dispute.id
            const taskTitle = dispute.task?.title || `Task #${dispute.task_id?.substring(0, 8)}`
            const filedByName = dispute.filed_by_user?.name || 'Unknown'
            const filedAgainstName = dispute.filed_against_user?.name || 'Unknown'
            const isFiler = dispute.filed_by === user.id

            return (
              <div
                key={dispute.id}
                className="bg-white border-2 border-[rgba(26,26,26,0.08)] rounded-xl hover:shadow-v4-md transition-shadow"
              >
                {/* Dispute Summary Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : dispute.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-[#1A1A1A] font-semibold text-sm md:text-base truncate">
                          {taskTitle}
                        </p>
                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                            isOpen
                              ? 'bg-[#FEF3C7] text-[#D97706]'
                              : 'bg-[#D1FAE5] text-[#059669]'
                          }`}
                        >
                          {isOpen ? 'Open' : 'Resolved'}
                        </span>
                        {/* Category Badge */}
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal/10 text-teal flex-shrink-0">
                          {getCategoryLabel(dispute.category)}
                        </span>
                      </div>

                      <p className="text-sm text-[#525252] line-clamp-1">
                        {dispute.reason}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs text-[#8A8A8A]">
                        <span>
                          Filed by {isFiler ? 'you' : filedByName}
                        </span>
                        <span>against {isFiler ? filedAgainstName : 'you'}</span>
                        <span>{formatDate(dispute.created_at)}</span>
                      </div>
                    </div>

                    {/* Expand Arrow */}
                    <div className="text-[#8A8A8A] flex-shrink-0 pt-1">
                      <svg
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-[rgba(26,26,26,0.08)] px-4 pb-4 pt-3 space-y-3">
                    {/* Full Reason */}
                    <div>
                      <p className="text-xs font-semibold text-teal uppercase tracking-wide mb-1">Reason</p>
                      <p className="text-sm text-[#525252]">{dispute.reason}</p>
                    </div>

                    {/* Evidence URLs */}
                    {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-teal uppercase tracking-wide mb-1">Evidence</p>
                        <div className="space-y-1">
                          {dispute.evidence_urls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-coral hover:text-coral-dark underline block truncate"
                            >
                              {url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parties */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-teal uppercase tracking-wide mb-1">Filed By</p>
                        <p className="text-sm text-[#525252]">
                          {filedByName}
                          {dispute.filed_by_user?.email && (
                            <span className="text-[#8A8A8A] text-xs block">{dispute.filed_by_user.email}</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-teal uppercase tracking-wide mb-1">Filed Against</p>
                        <p className="text-sm text-[#525252]">
                          {filedAgainstName}
                          {dispute.filed_against_user?.email && (
                            <span className="text-[#8A8A8A] text-xs block">{dispute.filed_against_user.email}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Resolution (if resolved) */}
                    {dispute.status === 'resolved' && dispute.resolution_notes && (
                      <div className="bg-[#D1FAE5] border border-[#059669]/20 rounded-lg p-3">
                        <p className="text-xs font-semibold text-[#059669] uppercase tracking-wide mb-1">Resolution</p>
                        <p className="text-sm text-[#065F46]">{dispute.resolution_notes}</p>
                        {dispute.resolved_at && (
                          <p className="text-xs text-[#059669]/70 mt-1">
                            Resolved {formatDate(dispute.resolved_at)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Admin Resolve UI */}
                    {isAdmin && isOpen && !isResolving && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setResolvingId(dispute.id)
                          setResolutionNotes('')
                          setResolution('approved')
                        }}
                        className="px-4 py-2 bg-coral text-white rounded-xl text-sm font-semibold hover:bg-coral-dark shadow-v4-sm hover:shadow-v4-md transition-all"
                      >
                        Resolve Dispute
                      </button>
                    )}

                    {isAdmin && isResolving && (
                      <div className="bg-cream border-2 border-teal/20 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-teal">Resolve This Dispute</p>

                        {/* Resolution Type */}
                        <div>
                          <label className="text-xs font-medium text-[#525252] block mb-1.5">
                            Resolution
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setResolution('approved')}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                                resolution === 'approved'
                                  ? 'border-[#059669] bg-[#D1FAE5] text-[#059669]'
                                  : 'border-[rgba(26,26,26,0.08)] bg-white text-[#525252] hover:border-[#059669]/30'
                              }`}
                            >
                              Approve (Refund)
                            </button>
                            <button
                              onClick={() => setResolution('rejected')}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                                resolution === 'rejected'
                                  ? 'border-[#DC2626] bg-[#FEE2E2] text-[#DC2626]'
                                  : 'border-[rgba(26,26,26,0.08)] bg-white text-[#525252] hover:border-[#DC2626]/30'
                              }`}
                            >
                              Reject
                            </button>
                          </div>
                        </div>

                        {/* Resolution Notes */}
                        <div>
                          <label className="text-xs font-medium text-[#525252] block mb-1.5">
                            Resolution Notes
                          </label>
                          <textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Explain the resolution decision..."
                            rows={3}
                            className="w-full px-3 py-2 border-2 border-[rgba(26,26,26,0.08)] rounded-xl text-sm text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:border-teal/40 resize-none"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolve(dispute.id)}
                            disabled={submitting || !resolutionNotes.trim()}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                              submitting || !resolutionNotes.trim()
                                ? 'bg-[#F5F2ED] text-[#8A8A8A] cursor-not-allowed'
                                : 'bg-teal text-white hover:bg-teal-dark shadow-v4-sm hover:shadow-v4-md'
                            }`}
                          >
                            {submitting ? 'Submitting...' : 'Submit Resolution'}
                          </button>
                          <button
                            onClick={() => {
                              setResolvingId(null)
                              setResolutionNotes('')
                            }}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A8A] hover:text-[#525252] hover:bg-[#F5F2ED] transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

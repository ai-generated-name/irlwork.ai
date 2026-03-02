import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, ChevronDown, X, AlertTriangle } from 'lucide-react'
import { Button } from '../ui'
import { adminFetch } from '../../utils/adminFetch'
import API_URL from '../../config/api'
import AdminTaskRow, { STATUS_LABELS, CATEGORY_LABELS } from './AdminTaskRow'
import Card from '../ui/Card'

const MODERATION_OPTIONS = [
  { value: 'all', label: 'All Moderation' },
  { value: 'clean', label: 'Clean' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'removed', label: 'Removed' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'budget_high', label: 'Budget (High → Low)' },
  { value: 'budget_low', label: 'Budget (Low → High)' },
]

const PAGE_SIZE = 25

export default function TaskManagerTab({ user }) {
  const [tasks, setTasks] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [moderationFilter, setModerationFilter] = useState('all')
  const [sort, setSort] = useState('newest')

  // Moderation
  const [actionLoading, setActionLoading] = useState(null)
  const [modal, setModal] = useState(null) // { task, action, notes }

  const searchRef = useRef(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page on new search
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [statusFilter, categoryFilter, moderationFilter, sort])

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort,
      })
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (moderationFilter !== 'all') params.set('moderation', moderationFilter)

      const res = await adminFetch(`${API_URL}/admin/tasks/search?${params}`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      const data = await res.json()
      setTasks(data.tasks || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, sort, debouncedSearch, statusFilter, categoryFilter, moderationFilter])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // Moderation actions
  const openModal = (task, action) => {
    setModal({ task, action, notes: '' })
  }

  const executeModeration = async () => {
    if (!modal) return
    const { task, action, notes } = modal
    setActionLoading(task.id)
    try {
      const res = await adminFetch(`${API_URL}/admin/tasks/${task.id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Failed to ${action} task`)
      }
      setModal(null)
      fetchTasks()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const actionLabels = {
    hide: { title: 'Hide Task', desc: 'This task will be hidden from public browse. The creator will be notified.', color: 'bg-orange-500 hover:bg-orange-600' },
    remove: { title: 'Remove Task', desc: 'This task will be removed and cancelled. The creator will be notified. This action is harder to undo.', color: 'bg-red-500 hover:bg-[#DC2626]' },
    unflag: { title: 'Restore Task', desc: 'This task will be restored to clean moderation status and visible again.', color: 'bg-[#16A34A] hover:bg-green-700' },
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">Task Manager</h2>
          <p className="text-sm text-[#9CA3AF] mt-0.5">Search, filter, and moderate all tasks. Hide or remove policy-violating content.</p>
        </div>
        <p className="text-sm text-[#9CA3AF]">{total} task{total !== 1 ? 's' : ''} found</p>
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
            placeholder="Search by title, description, or task ID..."
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
        <div className="flex flex-wrap gap-3">
          {/* Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none bg-[#FAFAF8] border border-[#ECECEC] rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-[#1A1A1A] cursor-pointer hover:border-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          </div>

          {/* Category */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="appearance-none bg-[#FAFAF8] border border-[#ECECEC] rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-[#1A1A1A] cursor-pointer hover:border-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          </div>

          {/* Moderation */}
          <div className="relative">
            <select
              value={moderationFilter}
              onChange={e => setModerationFilter(e.target.value)}
              className="appearance-none bg-[#FAFAF8] border border-[#ECECEC] rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-[#1A1A1A] cursor-pointer hover:border-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              {MODERATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
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

      {/* Task list */}
      {/* eslint-disable-next-line irlwork/no-inline-card-pattern -- complex admin task list with divide-y rows */}
      <div className="bg-white rounded-xl border border-[#ECECEC] divide-y divide-[#ECECEC]">
        {loading ? (
          <div className="py-16 text-center text-[#9CA3AF] text-sm">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center text-[#9CA3AF] text-sm">
            No tasks match your filters
          </div>
        ) : (
          tasks.map(task => (
            <AdminTaskRow
              key={task.id}
              task={task}
              actions={true}
              onHide={(t) => openModal(t, 'hide')}
              onRemove={(t) => openModal(t, 'remove')}
              onUnflag={(t) => openModal(t, 'unflag')}
              loading={actionLoading === task.id}
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
            <span className="text-sm text-[#6B7280]">
              Page {page} of {totalPages}
            </span>
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

      {/* Confirmation Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">
              {actionLabels[modal.action]?.title || modal.action}
            </h3>
            <p className="text-sm text-[#6B7280] mb-4">
              {actionLabels[modal.action]?.desc}
            </p>

            {/* Task preview */}
            <div className="bg-[#FAFAF8] rounded-lg p-3 mb-4">
              <p className="text-sm font-semibold text-[#1A1A1A] truncate">{modal.task.title}</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">ID: {modal.task.id?.slice(0, 8)}... • by {modal.task.agent_name || 'Unknown'}</p>
            </div>

            {/* Notes */}
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Notes (optional)</label>
            <textarea
              value={modal.notes}
              onChange={e => setModal(m => ({ ...m, notes: e.target.value }))}
              placeholder="Reason for this action..."
              rows={3}
              className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 resize-none"
            />

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => setModal(null)}
                disabled={!!actionLoading}
                className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:text-[#1A1A1A] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeModeration}
                disabled={!!actionLoading}
                className={`px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 ${actionLabels[modal.action]?.color || 'bg-orange-500 hover:bg-orange-600'}`}
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

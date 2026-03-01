import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { adminFetch } from '../../utils/adminFetch'
import API_URL from '../../config/api'
import AdminTaskRow from './AdminTaskRow'

export default function LiveFeedTab({ user }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [newTaskIds, setNewTaskIds] = useState(new Set())
  const [isPaused, setIsPaused] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [, setTick] = useState(0) // force re-render for time-ago updates
  const feedRef = useRef(null)
  const pendingTasksRef = useRef([])

  // Fetch initial tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filter !== 'all') params.set('status', filter)
      const res = await adminFetch(`${API_URL}/admin/tasks/recent?${params}`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      const data = await res.json()
      setTasks(data)
      setNewTaskIds(new Set())
      setPendingCount(0)
      pendingTasksRef.current = []
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // Refresh time-ago labels every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel('admin-live-feed')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = {
              ...payload.new,
              applicant_count: 0,
              view_count: 0,
              agent_name: 'Loading...',
              spots_filled: Array.isArray(payload.new.human_ids) ? payload.new.human_ids.length : 0,
            }

            // If a status filter is active and new task doesn't match, skip
            if (filter !== 'all' && newTask.status !== filter) return

            if (isPaused) {
              pendingTasksRef.current = [newTask, ...pendingTasksRef.current]
              setPendingCount(c => c + 1)
            } else {
              setTasks(prev => [newTask, ...prev.slice(0, 99)])
              setNewTaskIds(prev => new Set([...prev, newTask.id]))
              // Clear highlight after 5s
              setTimeout(() => {
                setNewTaskIds(prev => {
                  const next = new Set(prev)
                  next.delete(newTask.id)
                  return next
                })
              }, 5000)
            }
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t =>
              t.id === payload.new.id
                ? { ...t, ...payload.new, spots_filled: Array.isArray(payload.new.human_ids) ? payload.new.human_ids.length : 0 }
                : t
            ))
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [filter, isPaused])

  // Flush pending tasks when unpaused
  const flushPending = () => {
    if (pendingTasksRef.current.length > 0) {
      setTasks(prev => [...pendingTasksRef.current, ...prev].slice(0, 100))
      const ids = new Set(pendingTasksRef.current.map(t => t.id))
      setNewTaskIds(ids)
      setTimeout(() => setNewTaskIds(new Set()), 5000)
      pendingTasksRef.current = []
      setPendingCount(0)
    }
    setIsPaused(false)
  }

  // Detect scroll for auto-pause
  useEffect(() => {
    const el = feedRef.current
    if (!el) return
    const onScroll = () => {
      setIsPaused(el.scrollTop > 100)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-400">Loading live feed...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-red-600 font-medium mb-3">{error}</p>
        <button onClick={fetchTasks} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Live Task Feed</h2>
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">Real-time stream of task activity. New tasks and status changes appear automatically.</p>
        </div>
        {/* Status filter */}
        <div className="relative">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="pending_review">Pending Review</option>
            <option value="disputed">Disputed</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Pending banner */}
      {isPaused && pendingCount > 0 && (
        <button
          onClick={flushPending}
          className="w-full py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
        >
          {pendingCount} new task{pendingCount !== 1 ? 's' : ''} — click to show
        </button>
      )}

      {/* Feed */}
      <div
        ref={feedRef}
        className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-[calc(100vh-280px)] overflow-y-auto"
      >
        {tasks.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No tasks found
          </div>
        ) : (
          tasks.map(task => (
            <AdminTaskRow
              key={task.id}
              task={task}
              isNew={newTaskIds.has(task.id)}
            />
          ))
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Showing {tasks.length} most recent tasks. New tasks appear automatically.
      </p>
    </div>
  )
}

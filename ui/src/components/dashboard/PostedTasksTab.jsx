// Extracted from Dashboard.jsx — hiring mode task management (create, list, applicants, disputes)
import React from 'react'
import {
  Plus, ClipboardList, MapPin, FolderOpen, CalendarDays, Timer,
  User, FileText, Ban, Star, MessageCircle, ArrowDownLeft, Hourglass, AlertTriangle
} from 'lucide-react'
import { Button } from '../ui'
import CustomDropdown from '../CustomDropdown'
import CityAutocomplete from '../CityAutocomplete'
import DisputePanel from '../DisputePanel'
import { Icons } from '../../utils/dashboardConstants'
import { trackPageView } from '../../utils/analytics'
import { navigate as spaNavigate } from '../../utils/navigate'

export default function PostedTasksTab({
  user,
  postedTasks,
  loading,
  tasksSubTab, setTasksSubTab,
  taskForm, setTaskForm,
  taskFormTouched, setTaskFormTouched,
  creatingTask,
  createTaskError, setCreateTaskError,
  hireTarget, setHireTarget,
  expandedTask, setExpandedTask,
  taskApplications,
  editingTaskId, setEditingTaskId,
  editForm, setEditForm,
  cancelConfirmId, setCancelConfirmId,
  cancellingTaskId,
  decliningAppId,
  negotiateAppId, setNegotiateAppId,
  negotiateMsg, setNegotiateMsg,
  assignNotes, setAssignNotes,
  assigningHuman,
  handleCreateTask,
  handleAssignHuman,
  handleCancelTask,
  handleEditTask,
  handleDeclineApplication,
  handleNegotiate,
  fetchApplicationsForTask,
  showProofReview, setShowProofReview,
  getStatusLabel,
  setActiveTab,
  setActiveTabState,
}) {
  return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
              <h1 className="dashboard-v4-page-title" style={{ marginBottom: 0 }}>My Tasks</h1>
              <button className="hiring-dash-create-btn" onClick={() => { setTasksSubTab('create'); setCreateTaskError(''); setHireTarget(null); window.history.pushState({}, '', '/dashboard/hiring/create'); trackPageView('/dashboard/hiring/create'); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create Task
              </button>
            </div>

            {/* Sub-tabs: Status filters + Disputes */}
            <div className="dashboard-v4-sub-tabs">
              <button
                className={`dashboard-v4-sub-tab ${tasksSubTab === 'tasks' ? 'active' : ''}`}
                onClick={() => { setTasksSubTab('tasks'); setCreateTaskError(''); setHireTarget(null); window.history.pushState({}, '', '/dashboard/hiring/my-tasks'); trackPageView('/dashboard/hiring/my-tasks'); }}
              >
                All
              </button>
              <button
                className={`dashboard-v4-sub-tab ${tasksSubTab === 'active' ? 'active' : ''}`}
                onClick={() => { setTasksSubTab('active'); setCreateTaskError(''); window.history.pushState({}, '', '/dashboard/hiring/my-tasks'); trackPageView('/dashboard/hiring/my-tasks'); }}
              >
                Active
              </button>
              <button
                className={`dashboard-v4-sub-tab ${tasksSubTab === 'in_review' ? 'active' : ''}`}
                onClick={() => { setTasksSubTab('in_review'); setCreateTaskError(''); window.history.pushState({}, '', '/dashboard/hiring/my-tasks'); trackPageView('/dashboard/hiring/my-tasks'); }}
              >
                In Review
              </button>
              <button
                className={`dashboard-v4-sub-tab ${tasksSubTab === 'completed' ? 'active' : ''}`}
                onClick={() => { setTasksSubTab('completed'); setCreateTaskError(''); window.history.pushState({}, '', '/dashboard/hiring/my-tasks'); trackPageView('/dashboard/hiring/my-tasks'); }}
              >
                Completed
              </button>
              <button
                className={`dashboard-v4-sub-tab ${tasksSubTab === 'disputes' ? 'active' : ''}`}
                onClick={() => { setTasksSubTab('disputes'); setCreateTaskError(''); window.history.pushState({}, '', '/dashboard/hiring/my-tasks'); trackPageView('/dashboard/hiring/my-tasks'); }}
              >
                Disputes
              </button>
            </div>

            {tasksSubTab === 'create' && (
              <div style={{ marginTop: 16 }}>
                <div className="create-task-container">
                  <div className="create-task-header">
                    <h2 className="create-task-title">{hireTarget ? `Hire ${hireTarget.name?.split(' ')[0] || 'Worker'}` : 'Create a New Task'}</h2>
                    <p className="create-task-subtitle">{hireTarget ? 'This task will be sent directly to this worker for acceptance' : 'Fill in the details below to post your task'}</p>
                  </div>

                  {/* Direct hire banner */}
                  {hireTarget && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                      background: 'rgba(232,133,61,0.06)', borderRadius: 12,
                      border: '1px solid rgba(232,133,61,0.15)', marginBottom: 20
                    }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {hireTarget.avatar_url ? (
                          <img src={hireTarget.avatar_url} alt="" style={{
                            width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                            border: '2px solid rgba(232,133,61,0.25)'
                          }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
                        ) : null}
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%', background: '#E8853D', // eslint-disable-line irlwork/no-orange-outside-button -- avatar fallback uses brand color
                          display: hireTarget.avatar_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 700, fontSize: 18,
                          border: '2px solid rgba(232,133,61,0.25)'
                        }}>
                          {hireTarget.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{hireTarget.name || 'Worker'}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 1 }}>
                          {hireTarget.headline || hireTarget.city || 'Direct hire'}
                          {hireTarget.hourly_rate ? ` · $${hireTarget.hourly_rate}/hr` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setHireTarget(null); window.history.pushState({}, '', '/dashboard/hiring/create'); }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                          color: 'var(--text-tertiary)', borderRadius: 8, flexShrink: 0
                        }}
                        title="Switch to open task"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}

                  <form onSubmit={(e) => { handleCreateTask(e); }}>
                    {/* Section 1: Basics */}
                    <div className="create-task-section">
                      <div className="create-task-section-label">Basics</div>
                      <div className="dashboard-v4-form-group">
                        <label className="dashboard-v4-form-label">
                          Task Title <span className="dashboard-v4-form-required">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="What do you need done?"
                          className="dashboard-v4-form-input"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>

                      <div className="create-task-row-3col">
                        <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                          <label className="dashboard-v4-form-label">
                            Category <span className="dashboard-v4-form-required">*</span>
                          </label>
                          <CustomDropdown
                            value={taskForm.category}
                            onChange={(val) => setTaskForm(prev => ({ ...prev, category: val }))}
                            options={[
                              { value: '', label: 'Select category' },
                              ...['delivery', 'photography', 'data_collection', 'errands', 'cleaning', 'moving', 'manual_labor', 'inspection', 'tech', 'translation', 'verification', 'general'].map(c => ({
                                value: c,
                                label: c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                              }))
                            ]}
                            placeholder="Select category"
                          />
                        </div>
                        <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                          <label className="dashboard-v4-form-label">
                            Budget (USD) <span className="dashboard-v4-form-required">*</span>
                          </label>
                          <input
                            type="number"
                            placeholder="$"
                            className="dashboard-v4-form-input"
                            style={taskFormTouched.budget && (!taskForm.budget || parseFloat(taskForm.budget) < 5) ? { borderColor: '#DC2626' } : {}}
                            value={taskForm.budget}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, budget: e.target.value }))}
                            onBlur={() => setTaskFormTouched(prev => ({ ...prev, budget: true }))}
                            min="5"
                          />
                          {taskFormTouched.budget && (!taskForm.budget || parseFloat(taskForm.budget) < 5) && (
                            <p style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>Budget must be at least $5</p>
                          )}
                        </div>
                        <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                          <label className="dashboard-v4-form-label">
                            Duration <span style={{ color: '#DC2626' }}>*</span> <span className="dashboard-v4-form-optional">(hours)</span>
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 2"
                            className="dashboard-v4-form-input"
                            value={taskForm.duration_hours}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, duration_hours: e.target.value }))}
                            min="0.5"
                            step="0.5"
                            required
                            onBlur={() => setTaskFormTouched(prev => ({ ...prev, duration_hours: true }))}
                          />
                          {taskFormTouched.duration_hours && (!taskForm.duration_hours || parseFloat(taskForm.duration_hours) <= 0) && (
                            <p style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>Duration is required</p>
                          )}
                        </div>
                      </div>

                      <div className="dashboard-v4-form-group">
                        <label className="dashboard-v4-form-label">
                          Description <span className="dashboard-v4-form-optional">(optional)</span>
                        </label>
                        <textarea
                          placeholder="Provide details about the task..."
                          className="dashboard-v4-form-input dashboard-v4-form-textarea"
                          style={{ minHeight: 80 }}
                          value={taskForm.description}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Section 2: Location & Schedule */}
                    <div className="create-task-section">
                      <div className="create-task-section-label">Location & Schedule</div>
                      <div className="create-task-toggle-row">
                        <label className={`create-task-toggle-chip ${taskForm.is_remote ? 'active-green' : ''}`}>
                          <input
                            type="checkbox"
                            checked={taskForm.is_remote}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, is_remote: e.target.checked }))}
                          />
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                          Remote task
                        </label>
                        <label className={`create-task-toggle-chip ${taskForm.is_anonymous ? 'active-purple' : ''}`}>
                          <input
                            type="checkbox"
                            checked={taskForm.is_anonymous}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                          />
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="8"/></svg>
                          Post anonymously
                        </label>
                      </div>

                      <div className="create-task-row-2col">
                        {!taskForm.is_remote && (
                          <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                            <label className="dashboard-v4-form-label">
                              City <span className="dashboard-v4-form-required">*</span>
                            </label>
                            <CityAutocomplete
                              value={taskForm.city}
                              onChange={(locationData) => setTaskForm(prev => ({
                                ...prev,
                                city: locationData.city,
                                latitude: locationData.latitude,
                                longitude: locationData.longitude,
                                country: locationData.country,
                                country_code: locationData.country_code
                              }))}
                              placeholder="Where should this be done?"
                              className="dashboard-v4-city-input"
                            />
                          </div>
                        )}
                        <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                          <label className="dashboard-v4-form-label">
                            Deadline <span className="dashboard-v4-form-optional">(optional)</span>
                          </label>
                          <input
                            type="datetime-local"
                            className="dashboard-v4-form-input"
                            value={taskForm.deadline}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Requirements (optional) */}
                    <div className="create-task-section create-task-section-last">
                      <div className="create-task-section-label">Additional Details <span className="dashboard-v4-form-optional">(optional)</span></div>
                      <div className="dashboard-v4-form-group">
                        <label className="dashboard-v4-form-label">Requirements</label>
                        <textarea
                          placeholder="Any specific requirements or qualifications needed..."
                          className="dashboard-v4-form-input dashboard-v4-form-textarea"
                          style={{ minHeight: 60 }}
                          value={taskForm.requirements}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, requirements: e.target.value }))}
                          rows={2}
                        />
                      </div>

                      <div className="dashboard-v4-form-group" style={{ position: 'relative' }}>
                        <label className="dashboard-v4-form-label">Required Skills</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: taskForm.required_skills.length > 0 ? 8 : 0 }}>
                          {taskForm.required_skills.map((skill, i) => (
                            <span key={i} className="create-task-skill-chip">
                              {skill}
                              <button type="button" onClick={() => setTaskForm(prev => ({
                                ...prev, required_skills: prev.required_skills.filter((_, idx) => idx !== i)
                              }))} className="create-task-skill-remove">×</button>
                            </span>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Type a skill and press Enter"
                          className="dashboard-v4-form-input"
                          value={taskForm.skillInput}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, skillInput: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault()
                              const skill = taskForm.skillInput.trim().toLowerCase()
                              if (skill && !taskForm.required_skills.includes(skill)) {
                                setTaskForm(prev => ({
                                  ...prev,
                                  required_skills: [...prev.required_skills, skill],
                                  skillInput: ''
                                }))
                              }
                            }
                          }}
                        />
                        {/* Skill autocomplete suggestions */}
                        {taskForm.skillInput.trim().length > 0 && (() => {
                          const allSkills = ['driving', 'photography', 'videography', 'cleaning', 'cooking', 'moving', 'handyman', 'painting', 'gardening', 'delivery', 'data entry', 'translation', 'transcription', 'research', 'writing', 'graphic design', 'web development', 'social media', 'customer service', 'teaching', 'tutoring', 'pet care', 'childcare', 'elderly care', 'personal shopping', 'event planning', 'organization', 'assembly', 'installation', 'repair']
                          const matches = allSkills.filter(s => s.includes(taskForm.skillInput.trim().toLowerCase()) && !taskForm.required_skills.includes(s)).slice(0, 5)
                          return matches.length > 0 ? (
                            <div style={{ position: 'absolute', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, marginTop: 4, overflow: 'hidden' }}>
                              {matches.map(skill => (
                                <button key={skill} type="button" onClick={() => {
                                  setTaskForm(prev => ({ ...prev, required_skills: [...prev.required_skills, skill], skillInput: '' }))
                                }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#F5F2ED'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                >{skill}</button>
                              ))}
                            </div>
                          ) : null
                        })()}
                      </div>
                    </div>

                    {createTaskError && (
                      <div className="dashboard-v4-form-error">{createTaskError}</div>
                    )}
                    <button type="submit" className="dashboard-v4-form-submit" disabled={creatingTask}>
                      {creatingTask ? 'Creating...' : 'Create Task'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {['tasks', 'active', 'in_review', 'completed'].includes(tasksSubTab) && (
              <>
                {loading ? (
                  <div className="dashboard-v4-empty">
                    <div className="dashboard-v4-empty-icon"><Hourglass size={24} /></div>
                    <p className="dashboard-v4-empty-text">Loading...</p>
                  </div>
                ) : (() => {
                  const filteredTasks = tasksSubTab === 'tasks' ? postedTasks
                    : tasksSubTab === 'active' ? postedTasks.filter(t => ['open', 'assigned', 'in_progress'].includes(t.status))
                    : tasksSubTab === 'in_review' ? postedTasks.filter(t => t.status === 'pending_review')
                    : postedTasks.filter(t => ['completed', 'paid'].includes(t.status))
                  return filteredTasks.length === 0 ? (
                  <div className="dashboard-v4-empty" style={{ padding: '40px 24px' }}>
                    <div className="dashboard-v4-empty-icon" style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      {tasksSubTab === 'tasks' ? <ClipboardList size={28} style={{ color: 'var(--text-tertiary)' }} /> : Icons.task}
                    </div>
                    <p className="dashboard-v4-empty-title" style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{tasksSubTab === 'tasks' ? 'No tasks posted yet' : `No ${tasksSubTab.replace('_', ' ')} tasks`}</p>
                    <p className="dashboard-v4-empty-text" style={{ marginBottom: 20, color: 'var(--text-secondary)' }}>{tasksSubTab === 'tasks' ? 'Post a task and get matched with verified humans near you.' : 'Tasks matching this filter will appear here'}</p>
                    {tasksSubTab === 'tasks' && (
                      <button
                        onClick={() => { setTasksSubTab('create'); window.history.pushState({}, '', '/dashboard/hiring/my-tasks/create'); }}
                        style={{ margin: '0 auto', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                      >
                        <Plus size={16} /> Create Task
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {filteredTasks.map(task => {
                      const needsAction = task.status === 'pending_review'
                      const isOpen = task.status === 'open'
                      const isExpanded = expandedTask === task.id
                      const applications = taskApplications[task.id] || []
                      const pendingCount = isExpanded
                        ? applications.filter(a => a.status === 'pending').length
                        : (task.pending_applicant_count || 0)
                      const cancellable = ['open', 'pending_acceptance', 'assigned', 'in_progress'].includes(task.status)
                      const isEditing = editingTaskId === task.id

                      return (
                        <div key={task.id} className="dashboard-v4-task-card" style={{ cursor: 'pointer' }} onClick={() => spaNavigate(`/tasks/${task.id}`)}>
                          <div className="dashboard-v4-task-header">
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className={`dashboard-v4-task-status ${task.status === 'open' ? 'open' : task.status === 'in_progress' ? 'in-progress' : task.status === 'completed' || task.status === 'paid' ? 'completed' : 'pending'}`}>
                                  {getStatusLabel(task.status)}
                                </span>
                                {pendingCount > 0 && (
                                  <span style={{ background: 'var(--orange-600)', color: 'white', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 12 }}>
                                    {pendingCount} applicant{pendingCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <h3 className="dashboard-v4-task-title" style={{ marginTop: 8 }}>{task.title}</h3>
                            </div>
                            <span className="dashboard-v4-task-budget">${task.budget || 0}</span>
                          </div>

                          <div className="dashboard-v4-task-meta">
                            <span className="dashboard-v4-task-meta-item"><FolderOpen size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {task.category || 'General'}</span>
                            <span className="dashboard-v4-task-meta-item"><MapPin size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {task.city || 'Remote'}</span>
                            <span className="dashboard-v4-task-meta-item"><CalendarDays size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {new Date(task.created_at || Date.now()).toLocaleDateString()}</span>
                            {task.deadline && (
                              <>
                                <span className="dashboard-v4-task-meta-item" style={new Date(task.deadline) < new Date(Date.now() + 86400000) ? { color: '#dc2626', fontWeight: 500 } : {}}>
                                  <Timer size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Due {new Date(task.deadline).toLocaleDateString()}
                                </span>
                                {new Date(task.deadline) < new Date() && ['in_progress', 'assigned'].includes(task.status) && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(255, 95, 87, 0.15)', color: '#FF5F57', letterSpacing: '0.5px' }}>OVERDUE</span>
                                )}
                              </>
                            )}
                            {task.assignee && (
                              <span className="dashboard-v4-task-meta-item"><User size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {task.assignee.name}</span>
                            )}
                          </div>

                          {/* Action buttons row */}
                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                            {isOpen && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setEditingTaskId(isEditing ? null : task.id)
                                  if (!isEditing) setEditForm({ title: task.title, description: task.description || '', budget: task.budget, category: task.category || '', location: task.city || '', is_remote: task.is_remote || false, deadline: task.deadline || '' })
                                }}
                              >
                                <FileText size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                                {isEditing ? 'Cancel edit' : 'Edit'}
                              </Button>
                            )}
                            {cancellable && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setCancelConfirmId(cancelConfirmId === task.id ? null : task.id)}
                              >
                                <Ban size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                                Cancel task
                              </Button>
                            )}
                          </div>

                          {/* Cancel confirmation */}
                          {cancelConfirmId === task.id && (
                            <div style={{ marginTop: 12, padding: 16, background: '#fef2f2', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca' }} onClick={e => e.stopPropagation()}>
                              <p style={{ fontSize: 14, color: '#dc2626', fontWeight: 500, marginBottom: 12 }}>Are you sure you want to cancel this task?</p>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={cancellingTaskId === task.id}
                                  onClick={() => handleCancelTask(task.id)}
                                >
                                  {cancellingTaskId === task.id ? 'Cancelling...' : 'Yes, cancel'}
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => setCancelConfirmId(null)}>No, keep</Button>
                              </div>
                            </div>
                          )}

                          {/* Inline edit form */}
                          {isEditing && (
                            <div style={{ marginTop: 12, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'grid', gap: 12 }}>
                                <div>
                                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Title</label>
                                  <input type="text" value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14 }} />
                                </div>
                                <div>
                                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Description</label>
                                  <textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14, resize: 'vertical' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                  <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Budget ($)</label>
                                    <input type="number" value={editForm.budget || ''} onChange={e => setEditForm(f => ({ ...f, budget: parseFloat(e.target.value) || '' }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14 }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Category</label>
                                    <input type="text" value={editForm.category || ''} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14 }} />
                                  </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                  <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Location</label>
                                    <input type="text" value={editForm.location || ''} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14 }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Deadline</label>
                                    <input type="datetime-local" value={editForm.deadline ? editForm.deadline.slice(0, 16) : ''} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14 }} />
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                  <Button variant="secondary" size="sm" onClick={() => { setEditingTaskId(null); setEditForm({}) }}>Cancel</Button>
                                  <Button variant="primary" size="sm" onClick={() => handleEditTask(task.id)}>Save changes</Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* View Applicants Button for open tasks */}
                          {isOpen && (
                            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }} onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedTask(null)
                                  } else {
                                    setExpandedTask(task.id)
                                    fetchApplicationsForTask(task.id)
                                  }
                                }}
                                style={{ color: 'var(--orange-600)', fontWeight: 500, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                {isExpanded ? '▼ Hide Applicants' : `▶ View Applicants${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
                              </button>

                              {/* Applicants List */}
                              {isExpanded && (
                                <div style={{ marginTop: 16 }}>
                                  {applications.length === 0 ? (
                                    <p style={{ color: 'var(--text-tertiary)', fontSize: 14, textAlign: 'center', padding: 16 }}>No applicants yet</p>
                                  ) : (
                                    applications.map(app => (
                                      <div key={app.id} style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, flexShrink: 0 }}>
                                              {app.applicant?.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                              <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{app.applicant?.name || 'Anonymous'}</p>
                                              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                <Star size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {app.applicant?.rating?.toFixed(1) || 'New'} • {app.applicant?.jobs_completed || 0} jobs
                                                {app.applicant?.success_rate !== null && app.applicant?.success_rate !== undefined && app.applicant?.success_rate < 70 && (
                                                  <span style={{ color: '#D97706', fontSize: 12, marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 2 }} title="Below average success rate">
                                                    <AlertTriangle size={11} /> {app.applicant.success_rate}% success
                                                  </span>
                                                )}
                                              </p>
                                              {app.cover_letter && (
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}><strong>Why a good fit:</strong> {app.cover_letter}</p>
                                              )}
                                              {app.availability && (
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}><strong>Availability:</strong> {app.availability}</p>
                                              )}
                                              {app.questions && (
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}><strong>Questions:</strong> {app.questions}</p>
                                              )}
                                              {app.proposed_rate != null && (
                                                <p style={{ fontSize: 13, color: 'var(--orange-600)', marginTop: 2, fontWeight: 600 }}>Counter offer: ${app.proposed_rate}</p>
                                              )}
                                            </div>
                                          </div>
                                          {app.status === 'rejected' ? (
                                            <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>Declined</span>
                                          ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                                              <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleAssignHuman(task.id, app.human_id)}
                                                disabled={assigningHuman === app.human_id}
                                              >
                                                {assigningHuman === app.human_id ? 'Assigning...' : 'Accept (Card)'}
                                              </Button>
                                              <Button
                                                variant="secondary"
                                                size="sm"
                                                className="!text-[#2563eb] !border-[#2563eb] !bg-[#eff6ff]"
                                                onClick={() => handleAssignHuman(task.id, app.human_id, 'usdc')}
                                                disabled={assigningHuman === app.human_id}
                                              >
                                                {assigningHuman === app.human_id ? 'Assigning...' : 'Accept (USDC)'}
                                              </Button>
                                              <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeclineApplication(task.id, app.id)}
                                                disabled={decliningAppId === app.id}
                                              >
                                                {decliningAppId === app.id ? 'Declining...' : 'Decline'}
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => { setNegotiateAppId(negotiateAppId === app.id ? null : app.id); setNegotiateMsg('') }}
                                              >
                                                <MessageCircle size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                                                Negotiate
                                              </Button>
                                            </div>
                                          )}
                                        </div>

                                        {/* Note for accept */}
                                        {app.status !== 'rejected' && (
                                          <div style={{ marginTop: 10 }}>
                                            <input
                                              type="text"
                                              placeholder="Add a note for the worker (optional)..."
                                              value={assignNotes[app.human_id] || ''}
                                              onClick={e => e.stopPropagation()}
                                              onChange={e => setAssignNotes(prev => ({ ...prev, [app.human_id]: e.target.value }))}
                                              style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                            />
                                          </div>
                                        )}

                                        {/* Negotiate message input */}
                                        {negotiateAppId === app.id && (
                                          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                                            <input
                                              type="text"
                                              placeholder="Send a message to negotiate..."
                                              value={negotiateMsg}
                                              onChange={e => setNegotiateMsg(e.target.value)}
                                              onKeyDown={e => { if (e.key === 'Enter') handleNegotiate(task.id, app.human_id) }}
                                              style={{ flex: 1, padding: '6px 10px', fontSize: 13, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
                                            />
                                            <Button
                                              variant="primary"
                                              size="sm"
                                              onClick={() => handleNegotiate(task.id, app.human_id)}
                                              disabled={!negotiateMsg.trim()}
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
                          )}

                          {needsAction && (
                            <div className="dashboard-v4-task-actions" onClick={e => e.stopPropagation()}>
                              <Button variant="primary" size="md" onClick={() => setShowProofReview(task.id)}>
                                Review proof
                              </Button>
                            </div>
                          )}
                          {task.status === 'paid' && (
                            <p style={{ color: 'var(--success)', fontSize: 14, marginTop: 12 }}><ArrowDownLeft size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Payment released</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
                })()}
              </>
            )}

            {tasksSubTab === 'disputes' && (
              <DisputePanel user={user} />
            )}
          </div>
  )
}

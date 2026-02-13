import React, { useState } from 'react';
import MyTaskCard from '../components/MyTaskCard';

const ACTIVE_STATUSES = ['pending_acceptance', 'open', 'accepted', 'assigned', 'in_progress'];
const REVIEW_STATUSES = ['pending_review', 'approved', 'completed'];
const COMPLETED_STATUSES = ['paid'];
const OTHER_STATUSES = ['disputed', 'cancelled'];

function TaskSection({ title, count, tasks, defaultOpen = true, variant, cardProps }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mytasks-section">
      <button className="mytasks-section__header" onClick={() => setOpen(!open)}>
        <div className="mytasks-section__header-left">
          <h2 className="mytasks-section__title">{title}</h2>
          <span className="mytasks-section__count">{count}</span>
        </div>
        <span className={`mytasks-section__chevron ${open ? 'mytasks-section__chevron--open' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="mytasks-section__list">
          {tasks.length === 0 ? (
            <div className="mytasks-section__empty">
              No tasks in this section
            </div>
          ) : (
            tasks.map(task => (
              <MyTaskCard key={task.id} task={task} variant={variant} {...cardProps} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function MyTasksPage({
  user,
  tasks,
  loading,
  acceptTask,
  declineTask,
  onStartWork,
  setShowProofSubmit,
  notifications,
  onNavigate,
}) {
  const [taskFilter, setTaskFilter] = useState('all');

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const activeTasks = safeTasks.filter(t => ACTIVE_STATUSES.includes(t.status));
  const reviewTasks = safeTasks.filter(t => REVIEW_STATUSES.includes(t.status));
  const completedTasks = safeTasks.filter(t => COMPLETED_STATUSES.includes(t.status));
  const otherTasks = safeTasks.filter(t => OTHER_STATUSES.includes(t.status));

  const totalEarned = safeTasks
    .filter(t => t.status === 'paid')
    .reduce((sum, t) => sum + (Number(t.budget) || 0), 0);

  const handleCardClick = (task) => {
    window.location.href = '/tasks/' + task.id;
  };

  const cardActions = {
    onAccept: acceptTask,
    onDecline: declineTask,
    onStartWork: onStartWork,
    onSubmitProof: (taskId) => setShowProofSubmit(taskId),
    onClick: handleCardClick,
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getContextualMessage = () => {
    if (safeTasks.length === 0) return 'Browse tasks to start earning';
    const inProgressCount = activeTasks.filter(t => t.status === 'in_progress').length;
    if (inProgressCount > 0)
      return `You have ${inProgressCount} task${inProgressCount > 1 ? 's' : ''} in progress`;
    if (reviewTasks.length > 0)
      return `${reviewTasks.length} task${reviewTasks.length > 1 ? 's' : ''} awaiting review`;
    if (activeTasks.length > 0)
      return `${activeTasks.length} task${activeTasks.length > 1 ? 's' : ''} ready to work on`;
    return `${completedTasks.length} task${completedTasks.length > 1 ? 's' : ''} completed`;
  };

  // Filter tasks based on selected pill
  const getFilteredTasks = () => {
    if (taskFilter === 'all') return null; // show all sections
    if (taskFilter === 'in_progress') return safeTasks.filter(t => t.status === 'in_progress');
    if (taskFilter === 'pending_review') return safeTasks.filter(t => REVIEW_STATUSES.includes(t.status));
    if (taskFilter === 'paid') return completedTasks;
    return null;
  };

  const filteredTasks = getFilteredTasks();
  const showAllSections = taskFilter === 'all';

  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  return (
    <div>
      {/* Personalized Header */}
      <div className="mytasks-page-header">
        <div>
          <h1 className="dashboard-v4-page-title dashboard-v4-page-title--greeting" style={{ marginBottom: 4 }}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="dashboard-v4-page-subtitle">
            {getContextualMessage()}
          </p>
        </div>
        <span className="mytasks-active-count">{activeTasks.length} active</span>
      </div>

      {/* Enhanced Stats */}
      <div className="dashboard-v4-stats dashboard-v4-stats--enhanced">
        <div className="dashboard-v4-stat-card">
          <div className="dashboard-v4-stat-icon-wrap dashboard-v4-stat-icon--orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div className="dashboard-v4-stat-content">
            <div className="dashboard-v4-stat-label">Total Earned</div>
            <div className="dashboard-v4-stat-value orange">${totalEarned}</div>
          </div>
        </div>

        <div className="dashboard-v4-stat-card">
          <div className="dashboard-v4-stat-icon-wrap dashboard-v4-stat-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="dashboard-v4-stat-content">
            <div className="dashboard-v4-stat-label">Active Tasks</div>
            <div className="dashboard-v4-stat-value">{activeTasks.length}</div>
          </div>
        </div>

        <div className="dashboard-v4-stat-card">
          <div className="dashboard-v4-stat-icon-wrap dashboard-v4-stat-icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="dashboard-v4-stat-content">
            <div className="dashboard-v4-stat-label">Completed</div>
            <div className="dashboard-v4-stat-value">{completedTasks.length}</div>
          </div>
        </div>

        <div className="dashboard-v4-stat-card">
          <div className="dashboard-v4-stat-icon-wrap dashboard-v4-stat-icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="dashboard-v4-stat-content">
            <div className="dashboard-v4-stat-label">Success Rate</div>
            <div className="dashboard-v4-stat-value">
              {safeTasks.length > 0
                ? Math.round((completedTasks.length / safeTasks.length) * 100) + '%'
                : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      {!loading && (
        <div className="dashboard-v4-quick-actions">
          <button
            className="v4-btn v4-btn-primary"
            onClick={() => onNavigate?.('browse')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            Browse Tasks
          </button>

          {activeTasks.some(t => t.status === 'in_progress') && (
            <button
              className="v4-btn v4-btn-secondary"
              onClick={() => {
                const task = activeTasks.find(t => t.status === 'in_progress');
                if (task) setShowProofSubmit(task.id);
              }}
            >
              Submit Proof
            </button>
          )}

          {!user?.bio && (
            <button
              className="v4-btn v4-btn-secondary"
              onClick={() => onNavigate?.('profile')}
            >
              Complete Profile
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="dashboard-v4-empty">
          <div className="dashboard-v4-empty-icon">&#8987;</div>
          <p className="dashboard-v4-empty-text">Loading...</p>
        </div>
      ) : safeTasks.length === 0 ? (
        /* Rich Empty State with Onboarding Checklist */
        <div className="dashboard-v4-zero-state">
          <div className="dashboard-v4-zero-state-header">
            <div className="dashboard-v4-zero-state-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="dashboard-v4-zero-state-title">Welcome to irlwork.ai</h2>
            <p className="dashboard-v4-zero-state-subtitle">Complete these steps to start earning money on real-world tasks</p>
          </div>

          <div className="dashboard-v4-checklist">
            <div className={`dashboard-v4-checklist-item ${user?.city ? 'completed' : ''}`}>
              <div className="dashboard-v4-checklist-check">
                {user?.city ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>1</span>
                )}
              </div>
              <div className="dashboard-v4-checklist-content">
                <span className="dashboard-v4-checklist-label">
                  {user?.city ? 'Location set' : 'Set your location'}
                </span>
                <span className="dashboard-v4-checklist-meta">
                  {user?.city || 'Helps match you with nearby tasks'}
                </span>
              </div>
            </div>

            <div className={`dashboard-v4-checklist-item ${user?.bio ? 'completed' : ''}`}>
              <div className="dashboard-v4-checklist-check">
                {user?.bio ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>2</span>
                )}
              </div>
              <div className="dashboard-v4-checklist-content">
                <span className="dashboard-v4-checklist-label">
                  {user?.bio ? 'Profile complete' : 'Complete your profile'}
                </span>
                <span className="dashboard-v4-checklist-meta">
                  {user?.bio ? 'Looking good!' : 'Add a bio to stand out to agents'}
                </span>
              </div>
            </div>

            <div className="dashboard-v4-checklist-item">
              <div className="dashboard-v4-checklist-check"><span>3</span></div>
              <div className="dashboard-v4-checklist-content">
                <span className="dashboard-v4-checklist-label">Browse and accept a task</span>
                <span className="dashboard-v4-checklist-meta">Find tasks that match your skills</span>
              </div>
            </div>
          </div>

          <div className="dashboard-v4-zero-state-actions">
            <button
              className="dashboard-v4-empty-action"
              onClick={() => onNavigate?.('browse')}
            >
              <div className="dashboard-v4-empty-action-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <div>
                <div className="dashboard-v4-empty-action-title">Browse Tasks</div>
                <div className="dashboard-v4-empty-action-text">Find tasks near you</div>
              </div>
            </button>

            {!user?.bio && (
              <button
                className="dashboard-v4-empty-action"
                onClick={() => onNavigate?.('profile')}
              >
                <div className="dashboard-v4-empty-action-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <div className="dashboard-v4-empty-action-title">Complete Profile</div>
                  <div className="dashboard-v4-empty-action-text">Stand out to AI agents</div>
                </div>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Quick Filter Pills */}
          <div className="mytasks-filters">
            {[
              { id: 'all', label: 'All', count: safeTasks.length },
              { id: 'in_progress', label: 'In Progress', count: safeTasks.filter(t => t.status === 'in_progress').length },
              { id: 'pending_review', label: 'Pending Review', count: safeTasks.filter(t => REVIEW_STATUSES.includes(t.status)).length },
              { id: 'paid', label: 'Paid', count: completedTasks.length },
            ].filter(f => f.id === 'all' || f.count > 0).map(filter => (
              <button
                key={filter.id}
                className={`mytasks-filter-pill ${taskFilter === filter.id ? 'active' : ''}`}
                onClick={() => setTaskFilter(filter.id)}
              >
                {filter.label}
                <span className="mytasks-filter-count">{filter.count}</span>
              </button>
            ))}
          </div>

          {/* Task Sections */}
          {showAllSections ? (
            <div className="mytasks-sections">
              {activeTasks.length > 0 && (
                <TaskSection
                  title="Active"
                  count={activeTasks.length}
                  tasks={activeTasks}
                  defaultOpen={true}
                  variant="active"
                  cardProps={cardActions}
                />
              )}

              {reviewTasks.length > 0 && (
                <TaskSection
                  title="In Review"
                  count={reviewTasks.length}
                  tasks={reviewTasks}
                  defaultOpen={true}
                  variant="review"
                  cardProps={cardActions}
                />
              )}

              {completedTasks.length > 0 && (
                <TaskSection
                  title="Completed"
                  count={completedTasks.length}
                  tasks={completedTasks}
                  defaultOpen={activeTasks.length === 0 && reviewTasks.length === 0}
                  variant="compact"
                  cardProps={cardActions}
                />
              )}

              {otherTasks.length > 0 && (
                <TaskSection
                  title="Other"
                  count={otherTasks.length}
                  tasks={otherTasks}
                  defaultOpen={false}
                  variant="active"
                  cardProps={cardActions}
                />
              )}
            </div>
          ) : (
            <div className="mytasks-sections">
              {filteredTasks && filteredTasks.length > 0 ? (
                filteredTasks.map(task => (
                  <MyTaskCard
                    key={task.id}
                    task={task}
                    variant={taskFilter === 'paid' ? 'compact' : 'active'}
                    {...cardActions}
                  />
                ))
              ) : (
                <div className="mytasks-section__empty">
                  No tasks match this filter
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Activity & Next Steps */}
      <div className="dashboard-v4-activity-section">
        <h3 className="dashboard-v4-activity-title">
          {safeNotifications.length > 0 ? 'Recent Updates' : 'Next Steps'}
        </h3>

        {safeNotifications.length > 0 ? (
          <div className="dashboard-v4-activity-list">
            {safeNotifications.slice(0, 4).map(n => (
              <div key={n.id} className={`dashboard-v4-activity-item ${!n.read_at ? 'unread' : ''}`}>
                <div className="dashboard-v4-activity-dot" />
                <div className="dashboard-v4-activity-content">
                  <p className="dashboard-v4-activity-message">{n.title}</p>
                  <p className="dashboard-v4-activity-time">
                    {new Date(n.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-v4-next-steps">
            {activeTasks.length === 0 && (
              <button className="dashboard-v4-next-step" onClick={() => onNavigate?.('browse')}>
                <span className="dashboard-v4-next-step-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                </span>
                <span>Browse available tasks near you</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
            {activeTasks.some(t => t.status === 'in_progress') && (
              <button className="dashboard-v4-next-step" onClick={() => {
                const task = activeTasks.find(t => t.status === 'in_progress');
                if (task) handleCardClick(task);
              }}>
                <span className="dashboard-v4-next-step-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </span>
                <span>Submit proof for your in-progress task</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
            {!user?.bio && (
              <button className="dashboard-v4-next-step" onClick={() => onNavigate?.('profile')}>
                <span className="dashboard-v4-next-step-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span>Complete your profile to stand out</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import MyTaskCard from '../components/MyTaskCard';
import ActivityFeed from '../components/ActivityFeed';

const ACTIVE_STATUSES = ['open', 'accepted', 'assigned', 'in_progress'];
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
  onStartWork,
  setShowProofSubmit,
  activities,
}) {
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
    onStartWork: onStartWork,
    onSubmitProof: (taskId) => setShowProofSubmit(taskId),
    onClick: handleCardClick,
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mytasks-page-header">
        <h1 className="dashboard-v4-page-title" style={{ marginBottom: 0 }}>My Tasks</h1>
        <span className="mytasks-active-count">{activeTasks.length} active</span>
      </div>

      {/* Stats */}
      <div className="dashboard-v4-stats">
        <div className="dashboard-v4-stat-card">
          <div className="dashboard-v4-stat-label">Total Earned</div>
          <div className="dashboard-v4-stat-value orange">${totalEarned}</div>
        </div>
        <div className="dashboard-v4-stat-card">
          <div className="dashboard-v4-stat-label">Active Tasks</div>
          <div className="dashboard-v4-stat-value">{activeTasks.length}</div>
        </div>
        <div className="dashboard-v4-stat-card">
          <div className="dashboard-v4-stat-label">Tasks Completed</div>
          <div className="dashboard-v4-stat-value">{completedTasks.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-v4-empty">
          <div className="dashboard-v4-empty-icon">⏳</div>
          <p className="dashboard-v4-empty-text">Loading...</p>
        </div>
      ) : safeTasks.length === 0 ? (
        <div className="dashboard-v4-empty">
          <div className="dashboard-v4-empty-icon">📋</div>
          <p className="dashboard-v4-empty-title">No tasks yet</p>
          <p className="dashboard-v4-empty-text">Browse available tasks to start earning money</p>
        </div>
      ) : (
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
      )}

      <ActivityFeed activities={activities} />
    </div>
  );
}

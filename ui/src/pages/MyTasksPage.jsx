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

  return (
    <div>
      {/* Page Title */}
      <h1 className="dashboard-v4-page-title" style={{ marginBottom: 16 }}>My Tasks</h1>

      {/* Always-visible tab headers showing task lifecycle */}
      <div className="mytasks-filters">
        {[
          { id: 'all', label: 'All', count: safeTasks.length },
          { id: 'in_progress', label: 'In Progress', count: safeTasks.filter(t => t.status === 'in_progress').length },
          { id: 'pending_review', label: 'Pending Review', count: safeTasks.filter(t => REVIEW_STATUSES.includes(t.status)).length },
          { id: 'paid', label: 'Paid', count: completedTasks.length },
        ].map(filter => (
          <button
            key={filter.id}
            className={`mytasks-filter-pill ${taskFilter === filter.id ? 'active' : ''} ${filter.count === 0 && filter.id !== 'all' ? 'mytasks-filter-pill--empty' : ''}`}
            onClick={() => setTaskFilter(filter.id)}
          >
            {filter.label}
            <span className="mytasks-filter-count">{filter.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="dashboard-v4-empty">
          <div className="dashboard-v4-empty-icon">&#8987;</div>
          <p className="dashboard-v4-empty-text">Loading...</p>
        </div>
      ) : safeTasks.length === 0 ? (
        /* Rich empty state with preview cards */
        <div className="mytasks-empty-state">
          <div className="mytasks-empty-state-content">
            <div className="mytasks-empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="mytasks-empty-state-title">No tasks yet</h2>
            <p className="mytasks-empty-state-description">
              Tasks you apply to and get accepted for will appear here. Browse available tasks to find work that matches your skills.
            </p>
            <button
              className="v4-btn v4-btn-primary mytasks-empty-state-cta"
              onClick={() => onNavigate?.('browse')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              Browse Available Tasks
            </button>
          </div>

          {/* Preview task cards to show what the page will look like */}
          <div className="mytasks-empty-state-previews">
            <h4 className="mytasks-empty-state-previews-label">What your tasks will look like:</h4>
            {[
              { title: 'Take photos of local restaurant menus', budget: 25, category: 'Photography', status: 'In Progress' },
              { title: 'Verify business hours at 3 locations', budget: 18, category: 'Verification', status: 'Applied' },
              { title: 'Deliver package to downtown office', budget: 32, category: 'Delivery', status: 'Completed' },
            ].map((preview, i) => (
              <div key={i} className="mytasks-preview-card">
                <div className="mytasks-preview-card-header">
                  <span className={`mytasks-preview-card-status mytasks-preview-card-status--${preview.status.toLowerCase().replace(' ', '-')}`}>
                    {preview.status}
                  </span>
                  <span className="mytasks-preview-card-category">{preview.category}</span>
                </div>
                <p className="mytasks-preview-card-title">{preview.title}</p>
                <span className="mytasks-preview-card-budget">${preview.budget}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
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
    </div>
  );
}

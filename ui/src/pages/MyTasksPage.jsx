import { useState } from 'react';
import TaskRow from '../components/TaskRow';
import { PageHeader, EmptyState, Button } from '../components/ui';
import { navigate } from '../utils/navigate';
import { PageLoader } from '../components/ui/PageLoader';
import { usePageTitle } from '../hooks/usePageTitle';

const ACTIVE_STATUSES = ['pending_acceptance', 'open', 'accepted', 'assigned', 'in_progress'];
const REVIEW_STATUSES = ['pending_review', 'approved', 'completed'];
const COMPLETED_STATUSES = ['paid'];
const OTHER_STATUSES = ['disputed', 'cancelled'];

function TaskSection({ title, count, tasks, defaultOpen = true, cardProps }) {
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
        <div className="bg-white rounded-xl border border-[#ECECEC] divide-y divide-[#ECECEC]">
          {tasks.length === 0 ? (
            <div className="text-sm text-[#9CA3AF] text-center py-6">
              Tasks will appear here when they match this status.
            </div>
          ) : (
            tasks.map(task => (
              <TaskRow key={task.id} task={task} variant="working" {...cardProps} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function MyTasksPage({
  tasks,
  loading,
  acceptTask,
  declineTask,
  onStartWork,
  setShowProofSubmit,
  onNavigate,
}) {
  usePageTitle('My Tasks');
  const [taskFilter, setTaskFilter] = useState('all');

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const activeTasks = safeTasks.filter(t => ACTIVE_STATUSES.includes(t.status));
  const reviewTasks = safeTasks.filter(t => REVIEW_STATUSES.includes(t.status));
  const completedTasks = safeTasks.filter(t => COMPLETED_STATUSES.includes(t.status));
  const otherTasks = safeTasks.filter(t => OTHER_STATUSES.includes(t.status));

  const handleCardClick = (task) => {
    navigate('/tasks/' + task.id);
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
      <PageHeader title="My tasks" />

      {/* Always-visible tab headers showing task lifecycle */}
      <div className="mytasks-filters">
        {[
          { id: 'all', label: 'All', count: safeTasks.length },
          { id: 'in_progress', label: 'In progress', count: safeTasks.filter(t => t.status === 'in_progress').length },
          { id: 'pending_review', label: 'Pending review', count: safeTasks.filter(t => REVIEW_STATUSES.includes(t.status)).length },
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
        <PageLoader message="Loading your tasks..." />
      ) : safeTasks.length === 0 ? (
        /* Clean Empty State */
        <EmptyState
          icon={
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
          }
          title="No active tasks"
          description="Your tasks will appear here when you accept or get assigned one."
          action={
            <Button variant="primary" onClick={() => onNavigate?.('browse')}>
              Browse tasks
            </Button>
          }
        />
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
                  cardProps={cardActions}
                />
              )}

              {reviewTasks.length > 0 && (
                <TaskSection
                  title="In review"
                  count={reviewTasks.length}
                  tasks={reviewTasks}
                  defaultOpen={true}
                  cardProps={cardActions}
                />
              )}

              {completedTasks.length > 0 && (
                <TaskSection
                  title="Completed"
                  count={completedTasks.length}
                  tasks={completedTasks}
                  defaultOpen={activeTasks.length === 0 && reviewTasks.length === 0}
                  cardProps={cardActions}
                />
              )}

              {otherTasks.length > 0 && (
                <TaskSection
                  title="Other"
                  count={otherTasks.length}
                  tasks={otherTasks}
                  defaultOpen={false}
                  cardProps={cardActions}
                />
              )}
            </div>
          ) : (
            <div className="mytasks-sections">
              {filteredTasks && filteredTasks.length > 0 ? (
                <div className="bg-white rounded-xl border border-[#ECECEC] divide-y divide-[#ECECEC]">
                  {filteredTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      variant="working"
                      {...cardActions}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[#9CA3AF] text-center py-6">
                  Tasks will appear here when they match this filter.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

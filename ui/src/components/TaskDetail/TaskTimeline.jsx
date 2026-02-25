// Task Timeline Component
// Horizontal stepper showing task progress stages for participants

import React from 'react';

const TIMELINE_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'escrow', label: 'Escrow Paid' },
  { key: 'work', label: 'Complete Task' },
  { key: 'approval', label: 'Approval' },
  { key: 'paid', label: 'Paid' },
];

function getActiveStageIndex(task, taskStatus) {
  const status = task.status;
  const escrow = task.escrow_status || taskStatus?.escrow_status;

  switch (status) {
    case 'accepted':
      return escrow === 'deposited' ? 1 : 0;
    case 'in_progress':
      return 2;
    case 'pending_review':
      return 3;
    case 'completed':
      return escrow === 'released' ? 4 : 3;
    case 'paid':
      return 4;
    case 'disputed':
      return 3;
    default:
      return 0;
  }
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function TaskTimeline({ task, taskStatus }) {
  if (!task) return null;

  const activeIndex = getActiveStageIndex(task, taskStatus);
  const isDisputed = task.status === 'disputed';

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(0,0,0,0.08)] p-4 sm:p-6 shadow-sm">
      <div className="relative flex items-start justify-between">
        {/* Background connecting line */}
        <div
          className="absolute h-0.5 bg-[rgba(0,0,0,0.1)]"
          style={{ top: 12, left: '10%', right: '10%' }}
        />
        {/* Completed portion of connecting line */}
        {activeIndex > 0 && (
          <div
            className="absolute h-0.5 bg-[#16A34A] transition-all duration-500"
            style={{
              top: 12,
              left: '10%',
              width: `${(activeIndex / (TIMELINE_STAGES.length - 1)) * 80}%`,
            }}
          />
        )}

        {TIMELINE_STAGES.map((stage, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;

          let circleClasses;
          if (isCompleted) {
            circleClasses = 'bg-[#16A34A] text-white';
          } else if (isActive) {
            circleClasses = isDisputed
              ? 'bg-[#FF5F57] text-white ring-4 ring-[rgba(220,38,38,0.15)]'
              : 'bg-[#E8853D] text-white ring-4 ring-[rgba(232,133,61,0.15)]';
          } else {
            circleClasses = 'bg-[#F5F3F0] text-[#888888]';
          }

          let labelClasses;
          if (isCompleted) {
            labelClasses = 'text-[#16A34A]';
          } else if (isActive) {
            labelClasses = isDisputed ? 'text-[#FF5F57]' : 'text-[#E8853D]';
          } else {
            labelClasses = 'text-[#888888]';
          }

          return (
            <div
              key={stage.key}
              className="flex flex-col items-center z-10"
              style={{ width: `${100 / TIMELINE_STAGES.length}%` }}
            >
              <div
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all ${circleClasses}`}
              >
                {isCompleted ? (
                  <CheckIcon />
                ) : isActive && isDisputed ? (
                  '!'
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight ${labelClasses}`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

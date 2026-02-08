// Task Header Component
// Displays task title, description, requirements, and metadata

import React from 'react';

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-[#D1E9F0] text-[#0F4C5C]' },
  accepted: { label: 'Accepted', color: 'bg-[#E8D5F0] text-[#6B21A8]' },
  in_progress: { label: 'In Progress', color: 'bg-[#FEF3C7] text-[#D97706]' },
  pending_review: { label: 'Pending Review', color: 'bg-[#FFE4DB] text-[#C45F4A]' },
  completed: { label: 'Completed', color: 'bg-[#D1FAE5] text-[#059669]' },
  paid: { label: 'Paid', color: 'bg-[#F5F2ED] text-[#525252]' },
  disputed: { label: 'Disputed', color: 'bg-[#FEE2E2] text-[#DC2626]' }
};

export default function TaskHeader({ task }) {
  if (!task) return null;

  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 mb-6 shadow-sm">
      {/* Status Badge */}
      <div className="mb-4">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">
        {task.title}
      </h1>

      {/* Description */}
      <div className="mb-6">
        <p className="text-[#525252] text-base leading-relaxed whitespace-pre-wrap">
          {task.description}
        </p>
      </div>

      {/* Metadata Row */}
      <div className="flex flex-wrap gap-4 text-sm text-[#525252]">
        {/* Posted Date */}
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span>Posted {new Date(task.created_at).toLocaleDateString()}</span>
        </div>

        {/* Deadline */}
        {task.deadline && (
          <div className="flex items-center gap-2">
            <span>⏰</span>
            <span>Due {new Date(task.deadline).toLocaleDateString()}</span>
          </div>
        )}

        {/* Location */}
        <div className="flex items-center gap-2">
          <span>📍</span>
          <span>{task.city || 'Remote'}</span>
        </div>

        {/* Category */}
        {task.category && (
          <div className="flex items-center gap-2">
            <span>🏷️</span>
            <span>{task.category}</span>
          </div>
        )}
      </div>

      {/* Budget - Large and Prominent */}
      <div className="mt-6 pt-6 border-t border-[rgba(26,26,26,0.08)]">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-[#059669] font-mono">
            ${task.budget}
          </span>
          <span className="text-xl text-[#525252]">USDC</span>
        </div>
        <p className="text-[#8A8A8A] text-sm mt-1">Payment for this task</p>
      </div>
    </div>
  );
}

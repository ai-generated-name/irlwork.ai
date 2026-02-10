// Task Header Component
// Displays task title, status badge, category, and date metadata

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

const CATEGORY_ICONS = {
  delivery: '📦',
  photography: '📸',
  'data-collection': '📊',
  errands: '🏃',
  'tech-setup': '💻',
  translation: '🌐',
  verification: '✅',
  other: '📋',
};

export default function TaskHeader({ task }) {
  if (!task) return null;

  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;
  const categoryIcon = CATEGORY_ICONS[task.category] || '📋';

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 mb-6 shadow-sm">
      {/* Badges row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Category badge */}
        {task.category && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-[#F5F2ED] text-[#525252]">
            <span>{categoryIcon}</span>
            <span>{task.category}</span>
          </span>
        )}

        {/* Status Badge */}
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">
        {task.title}
      </h1>

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
      </div>
    </div>
  );
}

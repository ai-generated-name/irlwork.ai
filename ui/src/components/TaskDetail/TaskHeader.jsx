// Task Header Component
// Displays task title, description, requirements, skills, and metadata

import React from 'react';
import { CalendarDays, Timer, MapPin } from 'lucide-react';

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
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-4 sm:p-6 shadow-sm">
      {/* Status Badge */}
      <div className="mb-3 sm:mb-4">
        <span className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
        {/* Compact budget shown inline on mobile only */}
        <span className="lg:hidden text-lg font-bold text-[#059669] font-mono">
          ${task.budget} <span className="text-xs font-normal text-[#8A8A8A]">USD</span>
        </span>
      </div>

      {/* Title */}
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1A1A1A] mb-2 sm:mb-4">
        {task.title}
      </h1>

      {/* Description */}
      <div className="mb-3 sm:mb-6">
        <p className="text-[#525252] text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
          {task.description}
        </p>
      </div>

      {/* Requirements */}
      {task.requirements && (
        <div className="mb-3 sm:mb-6">
          <h3 className="text-xs sm:text-sm font-semibold text-[#1A1A1A] mb-1 sm:mb-2">Requirements</h3>
          <p className="text-[#525252] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
            {task.requirements}
          </p>
        </div>
      )}

      {/* Instructions (only visible to task participants - API strips for non-participants) */}
      {task.instructions && (
        <div className="mb-3 sm:mb-6">
          <h3 className="text-xs sm:text-sm font-semibold text-[#1A1A1A] mb-1 sm:mb-2">Instructions</h3>
          <p className="text-[#525252] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
            {task.instructions}
          </p>
        </div>
      )}

      {/* Metadata Row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 sm:gap-4 text-xs sm:text-sm text-[#525252]">
        {/* Posted Date */}
        <div className="flex items-center gap-1 sm:gap-2">
          <CalendarDays size={14} />
          <span>Posted {new Date(task.created_at).toLocaleDateString()}</span>
        </div>

        {/* Deadline */}
        {task.deadline && (
          <div className="flex items-center gap-1 sm:gap-2">
            <Timer size={14} />
            <span>Due {new Date(task.deadline).toLocaleDateString()}</span>
          </div>
        )}

        {/* Duration */}
        {task.duration_hours && (
          <div className="flex items-center gap-1 sm:gap-2">
            <Timer size={14} />
            <span>~{task.duration_hours}h</span>
          </div>
        )}

        {/* Location */}
        <div className="flex items-center gap-1 sm:gap-2">
          <MapPin size={14} />
          <span>{task.city || task.location || 'Remote'}</span>
        </div>

        {/* Category */}
        {task.category && (
          <div className="flex items-center gap-1 sm:gap-2">
            <span>🏷️</span>
            <span>{task.category}</span>
          </div>
        )}
      </div>

      {/* Budget - Large and Prominent (desktop only, mobile shows inline above) */}
      <div className="hidden lg:block mt-6 pt-6 border-t border-[rgba(26,26,26,0.08)]">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-[#059669] font-mono">
            ${task.budget}
          </span>
          <span className="text-xl text-[#525252]">USD</span>
        </div>
      </div>

      {/* Skills Needed */}
      {task.category && (
        <div className="mt-3 sm:mt-6 pt-3 sm:pt-6 border-t border-[rgba(26,26,26,0.08)]">
          <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider mb-2 sm:mb-3">Skills Needed</h3>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-[rgba(15,76,92,0.1)] text-[#0F4C5C]">
              {CATEGORY_ICONS[task.category] || '📋'} {task.category.replace('-', ' ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

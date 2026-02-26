// Task Header Component
// Displays task title, description, requirements, skills, and metadata

import React from 'react';
import { CalendarDays, Timer, MapPin, Users } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

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
  pending_acceptance: { label: 'Pending Acceptance', color: 'bg-[#FEF3C7] text-[#D97706]' },
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
  const isBounty = task.task_type === 'bounty';
  const quantity = task.quantity || 1;
  const spotsFilled = task.spots_filled || (task.human_ids ? task.human_ids.length : (task.human_id ? 1 : 0));

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-4 sm:p-6 shadow-sm">
      {/* Status Badge + Type Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <span className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
        {isBounty && (
          <span className="inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-semibold" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#7C3AED' }}>
            Bounty
          </span>
        )}
        {quantity > 1 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold" style={{ background: spotsFilled >= quantity ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: spotsFilled >= quantity ? '#059669' : '#2563EB' }}>
            <Users size={14} />
            {spotsFilled}/{quantity} filled
          </span>
        )}
        {task.applicant_count > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-medium" style={{ background: 'rgba(15, 76, 92, 0.08)', color: '#0F4C5C' }}>
            {task.applicant_count} applicant{task.applicant_count !== 1 ? 's' : ''}
          </span>
        )}
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

      {/* Required Skills */}
      {task.required_skills && task.required_skills.length > 0 && (
        <div className="mb-3 sm:mb-6">
          <h3 className="text-xs sm:text-sm font-semibold text-[#1A1A1A] mb-1 sm:mb-2">Required Skills</h3>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {task.required_skills.map((skill, i) => (
              <span key={i} className="inline-block px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium bg-[#EEF2FF] text-[#4338CA]">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Instructions (only visible to task participants - API strips for non-participants) */}
      {task.instructions && (
        <div className="mb-3 sm:mb-6">
          <h3 className="text-xs sm:text-sm font-semibold text-[#1A1A1A] mb-1 sm:mb-2">Instructions</h3>
          <div className="text-[#525252] text-xs sm:text-sm leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{task.instructions}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Instructions Attachments — reference files for the task */}
      {task.instructions_attachments && task.instructions_attachments.length > 0 && (
        <div className="mb-3 sm:mb-6">
          <h3 className="text-xs sm:text-sm font-semibold text-[#1A1A1A] mb-1 sm:mb-2">Reference Files</h3>
          <div className="flex flex-wrap gap-2">
            {task.instructions_attachments.map((att, i) => {
              const isImage = att.type?.startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.filename);
              return isImage ? (
                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={att.url} alt={att.filename} className="max-w-[200px] max-h-[150px] rounded-lg border border-[rgba(26,26,26,0.08)] hover:opacity-80 transition-opacity" />
                </a>
              ) : (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F5F2ED] text-[#0F4C5C] hover:bg-[#EDE9E3] transition-colors text-xs sm:text-sm"
                >
                  <span>📎</span>
                  <span className="truncate max-w-[200px]">{att.filename}</span>
                  {att.size > 0 && <span className="text-[#8A8A8A]">({(att.size / 1024).toFixed(0)}KB)</span>}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Rejection Feedback — shown alongside instructions when agent requests revision */}
      {task.rejection_feedback && (
        <div className="mb-3 sm:mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="text-xs sm:text-sm font-semibold text-amber-700 mb-1 sm:mb-2">
            Revision Requested
          </h3>
          <p className="text-amber-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
            {task.rejection_feedback}
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

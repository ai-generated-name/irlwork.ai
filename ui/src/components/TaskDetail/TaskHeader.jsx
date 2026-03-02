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
  open: { label: 'Open', color: 'bg-[rgba(232,133,61,0.1)] text-[#E8853D]' },
  pending_acceptance: { label: 'Pending Acceptance', color: 'bg-[rgba(254, 188, 46, 0.1)] text-[#FEBC2E]' },
  accepted: { label: 'Accepted', color: 'bg-[#E8D5F0] text-[#6B21A8]' },
  assigned: { label: 'Assigned', color: 'bg-[rgba(59,130,246,0.1)] text-[#3B82F6]' },
  in_progress: { label: 'In Progress', color: 'bg-[rgba(254, 188, 46, 0.1)] text-[#FEBC2E]' },
  pending_review: { label: 'Pending Review', color: 'bg-[#FFE4DB] text-[#D4703A]' },
  rejected: { label: 'Rejected', color: 'bg-[rgba(255,95,87,0.1)] text-[#FF5F57]' },
  completed: { label: 'Completed', color: 'bg-[rgba(22, 163, 74, 0.08)] text-[#16A34A]' },
  paid: { label: 'Paid', color: 'bg-[#F5F3F0] text-[#333333]' },
  disputed: { label: 'Disputed', color: 'bg-[rgba(255, 95, 87, 0.1)] text-[#FF5F57]' },
  cancelled: { label: 'Cancelled', color: 'bg-[rgba(0,0,0,0.06)] text-[#8A8A8A]' },
};

export default function TaskHeader({ task }) {
  if (!task) return null;

  const statusConfig = STATUS_CONFIG[task.status] || { label: task.status || 'Unknown', color: 'bg-[rgba(0,0,0,0.06)] text-[#8A8A8A]' };
  const isBounty = task.task_type === 'bounty';
  const quantity = task.quantity || 1;
  const spotsFilled = task.spots_filled || (task.human_ids ? task.human_ids.length : (task.human_id ? 1 : 0));

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(0,0,0,0.08)] p-4 sm:p-6 shadow-sm">
      {/* Status Badge + Task ID + Type Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <span className={`inline-block px-3 py-1 rounded-[6px] text-xs sm:text-sm font-medium ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
        {isBounty && (
          <span className="inline-block px-3 py-1 rounded-[6px] text-xs sm:text-sm font-semibold" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#7C3AED' }}>
            Bounty
          </span>
        )}
        {quantity > 1 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs sm:text-sm font-semibold" style={{ background: spotsFilled >= quantity ? 'rgba(22, 163, 74, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: spotsFilled >= quantity ? '#16A34A' : '#2563EB' }}>
            <Users size={14} />
            {spotsFilled}/{quantity} filled
          </span>
        )}
        {task.applicant_count > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs sm:text-sm font-medium" style={{ background: 'rgba(0, 0, 0, 0.08)', color: '#E8853D' }}>
            {task.applicant_count} applicant{task.applicant_count !== 1 ? 's' : ''}
          </span>
        )}
        {/* Compact budget shown inline on mobile only */}
        <span className="lg:hidden text-lg font-bold text-[#16A34A] font-mono">
          ${task.budget} <span className="text-xs font-normal text-[#888888]">{task.payment_method === 'stripe' ? 'USD' : 'USDC'}</span>
        </span>
      </div>

      {/* Title */}
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1A1A1A] mb-2 sm:mb-4">
        {task.title}
      </h1>

      {/* Description */}
      <div className="mb-3 sm:mb-6">
        <p className="text-[#333333] text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
          {task.description}
        </p>
      </div>

      {/* Requirements */}
      {task.requirements && (
        <div className="mb-3 sm:mb-6">
          <h3 className="text-xs sm:text-sm font-semibold text-[#1A1A1A] mb-1 sm:mb-2">Requirements</h3>
          <p className="text-[#333333] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
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
              <span key={i} className="inline-block px-2.5 py-1 rounded-[6px] text-xs sm:text-sm font-medium bg-[#EEF2FF] text-[#4338CA]">
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
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 sm:gap-4 text-xs sm:text-sm text-[#333333]">
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

      {/* Skills Needed */}
      {task.category && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[rgba(0,0,0,0.08)]">
          <h3 className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-1.5 sm:mb-2">Skills Needed</h3>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs sm:text-sm font-medium bg-[rgba(232,133,61,0.1)] text-[#E8853D]">
              {CATEGORY_ICONS[task.category] || '📋'} {task.category.replace('-', ' ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

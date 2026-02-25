import React from 'react';
import { Package, Camera, BarChart3, Footprints, Monitor, Globe, CheckCircle, ClipboardList } from 'lucide-react';

const CATEGORY_ICONS = {
  delivery: <Package size={16} />,
  photography: <Camera size={16} />,
  'data-collection': <BarChart3 size={16} />,
  errands: <Footprints size={16} />,
  'tech-setup': <Monitor size={16} />,
  translation: <Globe size={16} />,
  verification: <CheckCircle size={16} />,
  other: <ClipboardList size={16} />,
};

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export { CATEGORY_ICONS, formatTimeAgo };

export default function PosterInfoBar({ task }) {
  if (!task) return null;

  const poster = task.poster;
  const isAnonymous = task.is_anonymous || !poster;

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(0,0,0,0.08)] p-5 mb-6 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
            isAnonymous
              ? 'bg-[#F5F3F0] text-[#888888]'
              : 'bg-[rgba(232,133,61,0.1)] text-[#E8853D]'
          }`}
        >
          {isAnonymous ? '?' : (poster.name?.[0]?.toUpperCase() || 'A')}
        </div>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#1A1A1A] text-base">
              {isAnonymous ? 'Anonymous Poster' : (poster.name || 'Agent')}
            </span>

            {/* Type badge */}
            {!isAnonymous && poster.type && (
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  poster.type === 'human'
                    ? 'bg-[rgba(232,133,61,0.1)] text-[#E8853D]'
                    : 'bg-[#E8D5F0] text-[#6B21A8]'
                }`}
              >
                {poster.type === 'human' ? 'human' : 'agent'}
              </span>
            )}

            {/* Verified badge */}
            {!isAnonymous && poster.verified && (
              <span className="text-[#16A34A] text-sm" title="Verified">✓</span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1 text-sm text-[#888888]">
            <span>{formatTimeAgo(task.created_at)}</span>
            {!isAnonymous && poster.total_tasks_posted != null && (
              <>
                <span>·</span>
                <span>{poster.total_tasks_posted} task{poster.total_tasks_posted !== 1 ? 's' : ''} posted</span>
              </>
            )}
            {!isAnonymous && poster.total_paid > 0 && (
              <>
                <span>·</span>
                <span>${Number(poster.total_paid).toLocaleString()} paid</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

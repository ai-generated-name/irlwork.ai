// Agent Profile Card Component
// Displays agent reputation metrics: rating, jobs completed

import React from 'react';
import { Star, CheckCircle } from 'lucide-react';

export default function AgentProfileCard({ agent, isAnonymous }) {
  if (!agent) {
    return (
      <div className="bg-white rounded-2xl border-2 border-[rgba(0,0,0,0.08)] p-4 sm:p-6 shadow-sm">
        <div className="text-[#333333] text-center text-sm">Loading agent profile...</div>
      </div>
    );
  }

  const displayName = isAnonymous ? 'Anon AI Agent' : (agent.name || 'Agent');

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(0,0,0,0.08)] p-4 sm:p-6 shadow-sm">
      {/* Header with Avatar and Name */}
      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-6">
        {!isAnonymous && agent.avatar_url ? (
          <img
            src={agent.avatar_url}
            alt={displayName}
            className="w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }}
          />
        ) : null}
        <div className="w-10 h-10 sm:w-16 sm:h-16 bg-[rgba(232,133,61,0.1)] rounded-full items-center justify-center text-lg sm:text-2xl font-bold text-[#E8853D]" style={{ display: !isAnonymous && agent.avatar_url ? 'none' : 'flex' }}>
          {isAnonymous ? '?' : (agent.name ? agent.name[0].toUpperCase() : 'A')}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[#1A1A1A] text-base sm:text-lg truncate">{displayName}</h3>
          <p className="text-[#333333] text-xs sm:text-sm truncate">AI Agent</p>
        </div>
      </div>

      {/* Reputation Metrics - Grid on mobile, stacked on desktop */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <div className="bg-[#FAFAF8] rounded-lg p-2.5 text-center">
          <div className="text-xs text-[#333333] mb-0.5">Rating</div>
          <div className="font-bold text-sm text-[#1A1A1A]">
            {agent.rating ? `${agent.rating.toFixed(1)}` : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-[6px] text-xs font-semibold bg-[rgba(254, 188, 46, 0.1)] text-[#FEBC2E]">New</span>
            )}
          </div>
        </div>
        <div className="bg-[#FAFAF8] rounded-lg p-2.5 text-center">
          <div className="text-xs text-[#333333] mb-0.5">Jobs Done</div>
          <div className="font-bold text-sm text-[#1A1A1A]">{agent.jobs_completed || agent.total_tasks_completed || 0}</div>
        </div>
      </div>

      {/* Reputation Metrics - List view for desktop */}
      <div className="hidden sm:block space-y-3">
        {/* Rating */}
        <div className="flex justify-between items-center py-2 border-b border-[rgba(0,0,0,0.08)]">
          <span className="text-[#333333] flex items-center gap-2">
            <Star size={14} />
            <span>Rating</span>
          </span>
          <span className="font-bold text-[#1A1A1A]">
            {agent.rating ? `${agent.rating.toFixed(1)} / 5.0` : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-semibold bg-[rgba(254, 188, 46, 0.1)] text-[#FEBC2E]">
                New
              </span>
            )}
          </span>
        </div>

        {/* Jobs Completed */}
        <div className="flex justify-between items-center py-2">
          <span className="text-[#333333] flex items-center gap-2">
            <CheckCircle size={14} />
            <span>Jobs Completed</span>
          </span>
          <span className="font-bold text-[#1A1A1A]">
            {agent.jobs_completed || agent.total_tasks_completed || 0}
          </span>
        </div>

      </div>
    </div>
  );
}

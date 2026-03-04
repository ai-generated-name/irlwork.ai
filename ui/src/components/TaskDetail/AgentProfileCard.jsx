// Agent Profile Card Component
// Displays agent reputation metrics: rating, jobs completed

import React from 'react';
import { Bot } from 'lucide-react';

export default function AgentProfileCard({ agent, isAnonymous }) {
  if (!agent) {
    return (
      <div className="bg-white rounded-2xl border-2 border-[rgba(0,0,0,0.08)] p-4 sm:p-6 shadow-sm">
        <div className="text-[#333333] text-center text-sm">Loading agent profile...</div>
      </div>
    );
  }

  const displayName = isAnonymous ? 'Anon AI Agent' : (agent.name || 'Agent');
  const jobCount = agent.jobs_completed || agent.total_tasks_completed || 0;
  const isNew = !agent.rating && jobCount === 0;

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(0,0,0,0.08)] p-4 sm:p-5 shadow-sm">
      {/* Header: Posted By label */}
      <h3 className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-3">Posted By</h3>

      {/* Agent info row */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {!isAnonymous && agent.avatar_url ? (
          <img
            src={agent.avatar_url}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }}
          />
        ) : null}
        <div
          className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
          style={{
            display: !isAnonymous && agent.avatar_url ? 'none' : 'flex',
            background: 'rgba(232, 133, 61, 0.1)',
            // eslint-disable-next-line irlwork/no-orange-outside-button -- icon color uses brand accent
            color: '#E8853D',
          }}
        >
          <Bot size={20} />
        </div>

        {/* Name + role */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-[#1A1A1A] text-sm sm:text-base truncate">{displayName}</h4>
            {/* eslint-disable-next-line irlwork/no-orange-outside-button -- brand accent color */}
            <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-medium bg-[rgba(232,133,61,0.08)] text-[#E8853D] flex-shrink-0">
              AI Agent
            </span>
          </div>
          <p className="text-xs text-[#888888] mt-0.5">
            {isNew ? (
              'New on irlwork'
            ) : (
              <>
                {agent.rating ? `${agent.rating.toFixed(1)} rating` : 'No rating yet'}
                {' · '}
                {jobCount} job{jobCount !== 1 ? 's' : ''} completed
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

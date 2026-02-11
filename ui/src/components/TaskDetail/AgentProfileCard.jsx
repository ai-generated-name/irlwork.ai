// Agent Profile Card Component
// Displays agent reputation metrics: rating, payment rate, jobs completed, total USDC paid

import React from 'react';

export default function AgentProfileCard({ agent }) {
  if (!agent) {
    return (
      <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-4 sm:p-6 shadow-sm">
        <div className="text-[#525252] text-center text-sm">Loading agent profile...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-4 sm:p-6 shadow-sm">
      {/* Header with Avatar and Name */}
      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-6">
        {agent.avatar_url ? (
          <img
            src={agent.avatar_url}
            alt={agent.name || 'Agent'}
            className="w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }}
          />
        ) : null}
        <div className="w-10 h-10 sm:w-16 sm:h-16 bg-[rgba(15,76,92,0.1)] rounded-full items-center justify-center text-lg sm:text-2xl font-bold text-[#0F4C5C]" style={{ display: agent.avatar_url ? 'none' : 'flex' }}>
          {agent.name ? agent.name[0].toUpperCase() : 'A'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[#1A1A1A] text-base sm:text-lg truncate">{agent.name || 'Agent'}</h3>
          <p className="text-[#525252] text-xs sm:text-sm truncate">{agent.email || 'AI Agent'}</p>
        </div>
      </div>

      {/* Reputation Metrics - Grid on mobile, stacked on desktop */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <div className="bg-[#FAF8F5] rounded-lg p-2.5 text-center">
          <div className="text-xs text-[#525252] mb-0.5">Rating</div>
          <div className="font-bold text-sm text-[#1A1A1A]">
            {agent.rating ? `${agent.rating.toFixed(1)}` : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706]">New</span>
            )}
          </div>
        </div>
        <div className="bg-[#FAF8F5] rounded-lg p-2.5 text-center">
          <div className="text-xs text-[#525252] mb-0.5">Rate</div>
          <div className="font-bold text-sm text-[#1A1A1A]">${agent.hourly_rate || 'N/A'}/hr</div>
        </div>
        <div className="bg-[#FAF8F5] rounded-lg p-2.5 text-center">
          <div className="text-xs text-[#525252] mb-0.5">Jobs Done</div>
          <div className="font-bold text-sm text-[#1A1A1A]">{agent.jobs_completed || agent.total_tasks_completed || 0}</div>
        </div>
        <div className="bg-[#FAF8F5] rounded-lg p-2.5 text-center">
          <div className="text-xs text-[#525252] mb-0.5">Total Paid</div>
          <div className="font-bold text-sm text-[#059669]">${(agent.total_usdc_paid || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Reputation Metrics - List view for desktop */}
      <div className="hidden sm:block space-y-3">
        {/* Rating */}
        <div className="flex justify-between items-center py-2 border-b border-[rgba(26,26,26,0.08)]">
          <span className="text-[#525252] flex items-center gap-2">
            <span>⭐</span>
            <span>Rating</span>
          </span>
          <span className="font-bold text-[#1A1A1A]">
            {agent.rating ? `${agent.rating.toFixed(1)} / 5.0` : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706]">
                New
              </span>
            )}
          </span>
        </div>

        {/* Payment Rate */}
        <div className="flex justify-between items-center py-2 border-b border-[rgba(26,26,26,0.08)]">
          <span className="text-[#525252] flex items-center gap-2">
            <span>💰</span>
            <span>Payment Rate</span>
          </span>
          <span className="font-bold text-[#1A1A1A]">
            ${agent.hourly_rate || 'N/A'}/hr
          </span>
        </div>

        {/* Jobs Completed */}
        <div className="flex justify-between items-center py-2 border-b border-[rgba(26,26,26,0.08)]">
          <span className="text-[#525252] flex items-center gap-2">
            <span>✅</span>
            <span>Jobs Completed</span>
          </span>
          <span className="font-bold text-[#1A1A1A]">
            {agent.jobs_completed || agent.total_tasks_completed || 0}
          </span>
        </div>

        {/* Total USDC Paid */}
        <div className="flex justify-between items-center py-2">
          <span className="text-[#525252] flex items-center gap-2">
            <span>💵</span>
            <span>Total Paid Out</span>
          </span>
          <span className="font-bold text-[#059669]">
            ${(agent.total_usdc_paid || 0).toLocaleString()} USDC
          </span>
        </div>
      </div>

      {/* Trust Indicator */}
      {agent.total_usdc_paid > 1000 && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[rgba(26,26,26,0.08)]">
          <div className="flex items-center gap-2 text-[#059669] text-xs sm:text-sm">
            <span>✓</span>
            <span className="font-medium">Verified Agent</span>
          </div>
          <p className="text-[#8A8A8A] text-xs mt-1">
            High transaction volume and positive track record
          </p>
        </div>
      )}
    </div>
  );
}

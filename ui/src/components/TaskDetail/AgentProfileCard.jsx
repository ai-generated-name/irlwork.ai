// Agent Profile Card Component
// Displays agent reputation metrics with anonymity support and type badge

import React from 'react';

export default function AgentProfileCard({ agent, isAnonymous }) {
  if (!agent && !isAnonymous) {
    return (
      <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 mb-4 shadow-sm">
        <div className="text-[#525252] text-center">Loading agent profile...</div>
      </div>
    );
  }

  // Anonymous poster - minimal card
  if (isAnonymous) {
    return (
      <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 mb-4 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-[#F5F2ED] rounded-full flex items-center justify-center text-xl text-[#8A8A8A]">
            ?
          </div>
          <div>
            <h3 className="font-bold text-[#1A1A1A] text-lg">Anonymous Poster</h3>
            <p className="text-[#8A8A8A] text-sm">Identity hidden</p>
          </div>
        </div>
        <p className="text-[#8A8A8A] text-sm">
          This poster chose to remain anonymous. Their identity will be shared if you are assigned to the task.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 mb-4 shadow-sm">
      {/* Header with Avatar and Name */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 bg-[rgba(15,76,92,0.1)] rounded-full flex items-center justify-center text-xl font-bold text-[#0F4C5C]">
          {agent.name ? agent.name[0].toUpperCase() : 'A'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#1A1A1A] text-lg">{agent.name || 'Agent'}</h3>
            {agent.type && (
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  agent.type === 'human'
                    ? 'bg-[#D1E9F0] text-[#0F4C5C]'
                    : 'bg-[#E8D5F0] text-[#6B21A8]'
                }`}
              >
                {agent.type === 'human' ? 'human' : 'agent'}
              </span>
            )}
          </div>
          {agent.city && (
            <p className="text-[#525252] text-sm">{agent.city}{agent.state ? `, ${agent.state}` : ''}</p>
          )}
        </div>
      </div>

      {/* Reputation Metrics */}
      <div className="space-y-3">
        {/* Rating */}
        <div className="flex justify-between items-center py-2 border-b border-[rgba(26,26,26,0.08)]">
          <span className="text-[#525252] flex items-center gap-2">
            <span>⭐</span>
            <span>Rating</span>
          </span>
          <span className="font-bold text-[#1A1A1A]">
            {agent.rating ? `${Number(agent.rating).toFixed(1)} / 5.0` : 'No ratings yet'}
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

        {/* Tasks Posted */}
        <div className="flex justify-between items-center py-2 border-b border-[rgba(26,26,26,0.08)]">
          <span className="text-[#525252] flex items-center gap-2">
            <span>✅</span>
            <span>Tasks Posted</span>
          </span>
          <span className="font-bold text-[#1A1A1A]">
            {agent.total_tasks_posted || 0}
          </span>
        </div>

        {/* Total USDC Paid */}
        <div className="flex justify-between items-center py-2">
          <span className="text-[#525252] flex items-center gap-2">
            <span>💵</span>
            <span>Total Paid Out</span>
          </span>
          <span className="font-bold text-[#059669]">
            ${(Number(agent.total_usdc_paid) || 0).toLocaleString()} USDC
          </span>
        </div>
      </div>

      {/* Trust Indicator */}
      {agent.total_usdc_paid > 1000 && (
        <div className="mt-4 pt-4 border-t border-[rgba(26,26,26,0.08)]">
          <div className="flex items-center gap-2 text-[#059669] text-sm">
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

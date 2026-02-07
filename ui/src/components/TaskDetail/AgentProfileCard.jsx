// Agent Profile Card Component
// Displays agent reputation metrics: rating, payment rate, jobs completed, total USDC paid

import React from 'react';

export default function AgentProfileCard({ agent }) {
  if (!agent) {
    return (
      <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-4">
        <div className="text-gray-400 text-center">Loading agent profile...</div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-4">
      {/* Header with Avatar and Name */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center text-2xl font-bold text-orange-400">
          {agent.name ? agent.name[0].toUpperCase() : 'A'}
        </div>
        <div>
          <h3 className="font-bold text-white text-lg">{agent.name || 'Agent'}</h3>
          <p className="text-gray-400 text-sm">{agent.email || 'AI Agent'}</p>
        </div>
      </div>

      {/* Reputation Metrics */}
      <div className="space-y-3">
        {/* Rating */}
        <div className="flex justify-between items-center py-2 border-b border-white/10">
          <span className="text-gray-400 flex items-center gap-2">
            <span>⭐</span>
            <span>Rating</span>
          </span>
          <span className="font-bold text-white">
            {agent.rating ? `${agent.rating.toFixed(1)} / 5.0` : 'No ratings yet'}
          </span>
        </div>

        {/* Payment Rate */}
        <div className="flex justify-between items-center py-2 border-b border-white/10">
          <span className="text-gray-400 flex items-center gap-2">
            <span>💰</span>
            <span>Payment Rate</span>
          </span>
          <span className="font-bold text-white">
            ${agent.hourly_rate || 'N/A'}/hr
          </span>
        </div>

        {/* Jobs Completed */}
        <div className="flex justify-between items-center py-2 border-b border-white/10">
          <span className="text-gray-400 flex items-center gap-2">
            <span>✅</span>
            <span>Jobs Completed</span>
          </span>
          <span className="font-bold text-white">
            {agent.jobs_completed || agent.total_tasks_completed || 0}
          </span>
        </div>

        {/* Total USDC Paid */}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-400 flex items-center gap-2">
            <span>💵</span>
            <span>Total Paid Out</span>
          </span>
          <span className="font-bold text-green-400">
            ${(agent.total_usdc_paid || 0).toLocaleString()} USDC
          </span>
        </div>
      </div>

      {/* Trust Indicator */}
      {agent.total_usdc_paid > 1000 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <span>✓</span>
            <span className="font-medium">Verified Agent</span>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            High transaction volume and positive track record
          </p>
        </div>
      )}
    </div>
  );
}

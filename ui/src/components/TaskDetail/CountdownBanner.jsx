// Countdown Banner Component
// Displays a prominent auto-release countdown timer when proof is pending review

import React from 'react';

export default function CountdownBanner({ disputeWindowInfo }) {
  // Only show if dispute window is open
  if (!disputeWindowInfo || !disputeWindowInfo.dispute_window_open) {
    return null;
  }

  const { hours_remaining } = disputeWindowInfo;

  // Calculate hours, minutes, seconds from hours_remaining
  const totalHours = Math.floor(hours_remaining);
  const minutes = Math.floor((hours_remaining - totalHours) * 60);
  const seconds = Math.floor(((hours_remaining - totalHours) * 60 - minutes) * 60);

  return (
    <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-l-4 border-orange-500 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="text-3xl">⏰</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold text-white">Auto-Release Countdown</h3>
            <div className="font-mono text-2xl font-bold text-orange-400">
              {totalHours}h {minutes}m {seconds}s
            </div>
          </div>
          <p className="text-gray-300 text-sm">
            Payment will automatically release to you if the agent doesn't respond within the dispute window
          </p>
        </div>
      </div>
    </div>
  );
}

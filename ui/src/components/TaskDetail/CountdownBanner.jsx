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
    <div className="bg-gradient-to-r from-[rgba(224,122,95,0.15)] to-[rgba(217,119,6,0.15)] border-l-4 border-[#E07A5F] rounded-xl p-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="text-3xl">⏰</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold text-[#1A1A1A]">Auto-Release Countdown</h3>
            <div className="font-mono text-2xl font-bold text-[#E07A5F]">
              {totalHours}h {minutes}m {seconds}s
            </div>
          </div>
          <p className="text-[#525252] text-sm">
            Payment will automatically release to you if the agent doesn't respond within the dispute window
          </p>
        </div>
      </div>
    </div>
  );
}

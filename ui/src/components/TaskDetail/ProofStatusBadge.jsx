// Proof Status Badge Component
// Simple status indicator after proof submission (countdown is shown in banner)

import React from 'react';

const STATUS_CONFIG = {
  pending_review: {
    label: 'Pending Agent Review',
    icon: '⏳',
    color: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
    description: 'Your proof has been submitted and is awaiting agent review'
  },
  completed: {
    label: 'Approved',
    icon: '✓',
    color: 'bg-green-500/20 border-green-500/50 text-green-400',
    description: 'Your proof has been approved by the agent'
  },
  paid: {
    label: 'Paid',
    icon: '✓',
    color: 'bg-green-500/20 border-green-500/50 text-green-400',
    description: 'Payment has been released to your wallet'
  },
  disputed: {
    label: 'Disputed',
    icon: '⚠️',
    color: 'bg-red-500/20 border-red-500/50 text-red-400',
    description: 'The agent has disputed your proof. Please check messages for feedback.'
  },
  rejected: {
    label: 'Rejected',
    icon: '✕',
    color: 'bg-red-500/20 border-red-500/50 text-red-400',
    description: 'Your proof was rejected. Check messages for details.'
  }
};

export default function ProofStatusBadge({ task, proofs }) {
  // Don't show if no proof has been submitted yet
  if (!task || task.status === 'in_progress' || task.status === 'open' || task.status === 'accepted') {
    return null;
  }

  const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending_review;

  return (
    <div className={`rounded-xl border-2 p-6 mb-6 ${config.color}`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{config.icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-1">{config.label}</h3>
          <p className="text-sm opacity-90">{config.description}</p>

          {/* Show latest proof details if available */}
          {proofs && proofs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-current/20">
              <p className="text-xs opacity-70">
                Submitted on {new Date(proofs[0].created_at).toLocaleDateString()} at{' '}
                {new Date(proofs[0].created_at).toLocaleTimeString()}
              </p>
              {proofs[0].proof_text && (
                <p className="text-sm mt-2 opacity-80 italic">
                  "{proofs[0].proof_text.slice(0, 100)}{proofs[0].proof_text.length > 100 ? '...' : ''}"
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Additional Actions */}
      {task.status === 'disputed' && (
        <div className="mt-4 pt-4 border-t border-current/20">
          <button className="text-sm font-medium hover:underline">
            View Dispute Details →
          </button>
        </div>
      )}
    </div>
  );
}

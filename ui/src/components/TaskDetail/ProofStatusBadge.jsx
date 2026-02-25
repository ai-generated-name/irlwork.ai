// Proof Status Badge Component
// Simple status indicator after proof submission (countdown is shown in banner)

import React from 'react';
import { Hourglass, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG = {
  pending_review: {
    label: 'Pending Agent Review',
    icon: <Hourglass size={14} />,
    color: 'bg-[#FFE4DB] border-[#E8853D] text-[#D4703A]',
    description: 'Your proof has been submitted and is awaiting agent review'
  },
  completed: {
    label: 'Approved',
    icon: '✓',
    color: 'bg-[rgba(22, 163, 74, 0.08)] border-[#16A34A] text-[#16A34A]',
    description: 'Your proof has been approved by the agent'
  },
  paid: {
    label: 'Paid',
    icon: '✓',
    color: 'bg-[rgba(22, 163, 74, 0.08)] border-[#16A34A] text-[#16A34A]',
    description: 'Payment has been released to your bank account'
  },
  disputed: {
    label: 'Disputed',
    icon: <AlertTriangle size={14} />,
    color: 'bg-[rgba(255, 95, 87, 0.1)] border-[#FF5F57] text-[#FF5F57]',
    description: 'The agent has disputed your proof. Please check messages for feedback.'
  },
  rejected: {
    label: 'Rejected',
    icon: '✕',
    color: 'bg-[rgba(255, 95, 87, 0.1)] border-[#FF5F57] text-[#FF5F57]',
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
    <div className={`rounded-xl border-2 p-3 sm:p-6 ${config.color}`}>
      <div className="flex items-start gap-2 sm:gap-3">
        <span className="text-xl sm:text-3xl">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-lg font-bold mb-0.5 sm:mb-1">{config.label}</h3>
          <p className="text-xs sm:text-sm opacity-90">{config.description}</p>

          {/* Show latest proof details if available */}
          {proofs && proofs.length > 0 && (
            <div className="mt-2.5 sm:mt-4 pt-2.5 sm:pt-4 border-t border-current/20">
              <p className="text-xs opacity-70">
                Submitted {new Date(proofs[0].created_at).toLocaleDateString()}
              </p>
              {proofs[0].proof_text && (
                <p className="text-xs sm:text-sm mt-1.5 sm:mt-2 opacity-80 italic truncate sm:whitespace-normal">
                  "{proofs[0].proof_text.slice(0, 100)}{proofs[0].proof_text.length > 100 ? '...' : ''}"
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Additional Actions */}
      {task.status === 'disputed' && (
        <div className="mt-2.5 sm:mt-4 pt-2.5 sm:pt-4 border-t border-current/20">
          <button className="text-xs sm:text-sm font-medium hover:underline">
            View Dispute Details →
          </button>
        </div>
      )}
    </div>
  );
}

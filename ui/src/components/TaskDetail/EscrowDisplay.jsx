// Escrow Display Component
// Shows escrow status with badge and details

import React from 'react';
import EscrowBadge from '../EscrowBadge';

export default function EscrowDisplay({ task }) {
  if (!task) return null;

  const escrowStatus = task.escrow_status || 'pending';
  const escrowAmount = task.escrow_amount || task.budget;

  const getStatusMessage = () => {
    switch (escrowStatus) {
      case 'deposited':
        return {
          icon: '✓',
          text: 'Funds secured in escrow. Work can begin safely.',
          color: 'text-[#059669]'
        };
      case 'released':
        return {
          icon: '✓',
          text: 'Payment has been released to you.',
          color: 'text-[#059669]'
        };
      case 'pending':
        return {
          icon: '⏳',
          text: 'Waiting for agent to fund escrow...',
          color: 'text-[#D97706]'
        };
      case 'refunded':
        return {
          icon: '↩',
          text: 'Funds returned to agent.',
          color: 'text-[#525252]'
        };
      default:
        return {
          icon: '⏳',
          text: 'Escrow status pending...',
          color: 'text-[#525252]'
        };
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 mb-4 shadow-sm">
      <h3 className="text-[#1A1A1A] font-bold mb-4">Escrow Status</h3>

      {/* Escrow Badge */}
      <div className="mb-4">
        <EscrowBadge
          status={escrowStatus}
          amount={escrowAmount}
          showDetails={true}
        />
      </div>

      {/* Status Message */}
      <div className="flex items-start gap-2">
        <span className={`text-lg ${statusMessage.color}`}>{statusMessage.icon}</span>
        <div className="flex-1">
          <p className={`text-sm ${statusMessage.color}`}>
            {statusMessage.text}
          </p>

          {/* Deposit Timestamp */}
          {task.escrow_deposited_at && (
            <p className="text-[#8A8A8A] text-xs mt-2">
              Deposited on {new Date(task.escrow_deposited_at).toLocaleDateString()} at{' '}
              {new Date(task.escrow_deposited_at).toLocaleTimeString()}
            </p>
          )}

          {/* Release Timestamp */}
          {task.escrow_released_at && (
            <p className="text-[#8A8A8A] text-xs mt-2">
              Released on {new Date(task.escrow_released_at).toLocaleDateString()} at{' '}
              {new Date(task.escrow_released_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Security Note */}
      {escrowStatus === 'deposited' && (
        <div className="mt-4 pt-4 border-t border-[rgba(26,26,26,0.08)]">
          <div className="text-xs text-[#8A8A8A]">
            🔒 Your payment is protected. Funds will only be released when you submit proof and the agent approves,
            or automatically after the dispute window closes.
          </div>
        </div>
      )}
    </div>
  );
}

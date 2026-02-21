// Escrow Badge Component
// Shows the current escrow status for a task
import React from 'react';
import { Hourglass } from 'lucide-react';

const STATUS_CONFIG = {
  pending: {
    label: 'Awaiting Deposit',
    color: 'bg-[#8A8A8A]',
    textColor: 'text-[#525252]',
    icon: <Hourglass size={14} />,
    description: 'Waiting for agent to fund escrow'
  },
  deposited: {
    label: 'In Escrow',
    color: 'bg-[#0F4C5C]',
    textColor: 'text-[#0F4C5C]',
    icon: '🔒',
    description: 'Funds secured, work can begin'
  },
  released: {
    label: 'Paid',
    color: 'bg-[#059669]',
    textColor: 'text-[#059669]',
    icon: '✓',
    description: 'Payment released to human'
  },
  refunded: {
    label: 'Refunded',
    color: 'bg-[#DC2626]',
    textColor: 'text-[#DC2626]',
    icon: '↩',
    description: 'Funds returned to agent'
  }
};

export default function EscrowBadge({
  status = 'pending',
  amount,
  paymentMethod = 'stripe',
  showDetails = false,
  onClick
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all hover:scale-105 ${
        showDetails ? 'bg-[#F5F2ED] border border-[rgba(26,26,26,0.1)]' : ''
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${config.color} ${!showDetails ? 'animate-pulse' : ''}`}></span>
      <span className={`text-sm font-medium ${config.textColor}`}>
        {config.icon} {config.label}
      </span>

      {showDetails && amount != null && (
        <span className="text-[#1A1A1A] font-mono ml-2">
          {Number(amount).toFixed(2)} {paymentMethod === 'usdc' ? 'USDC' : 'USD'}
        </span>
      )}
    </div>
  );
}

// Extended escrow status display with details
export function EscrowStatusCard({
  status,
  amount,
  paymentMethod = 'stripe',
  showDetails = false,
  depositedAt,
  releasedAt
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div className="bg-white rounded-xl border-2 border-[rgba(26,26,26,0.08)] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${config.color}/20 rounded-full flex items-center justify-center text-2xl`}>
            {config.icon}
          </div>
          <div>
            <h4 className="text-[#1A1A1A] font-bold">{config.label}</h4>
            <p className={`text-sm ${config.textColor}`}>{config.description}</p>
          </div>
        </div>

        {amount != null && (
          <div className="text-right">
            <p className="text-2xl font-bold text-[#1A1A1A] font-mono">{Number(amount).toFixed(2)}</p>
            <p className="text-[#8A8A8A] text-sm">{paymentMethod === 'usdc' ? 'USDC' : 'USD'}</p>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="space-y-2 pt-3 border-t border-[rgba(26,26,26,0.08)]">
          {depositedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-[#8A8A8A]">Deposited</span>
              <span className="text-[#1A1A1A]">
                {new Date(depositedAt).toLocaleDateString()} {new Date(depositedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
          {releasedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-[#8A8A8A]">Released</span>
              <span className="text-[#1A1A1A]">
                {new Date(releasedAt).toLocaleDateString()} {new Date(releasedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Escrow Badge Component
// Shows the current escrow status for a task
import React from 'react';
import { Hourglass, Lock, Check, RotateCcw } from 'lucide-react';
import { Card } from './ui';

const STATUS_CONFIG = {
  pending: {
    label: 'Awaiting Deposit',
    color: 'bg-[#888888]',
    textColor: 'text-[#333333]',
    icon: <Hourglass size={14} />,
    description: 'Waiting for agent to fund escrow'
  },
  deposited: {
    label: 'In Escrow',
    color: 'bg-[#E8853D]',
    textColor: 'text-[#E8853D]',
    icon: <Lock size={14} />,
    description: 'Funds secured, work can begin'
  },
  released: {
    label: 'Paid',
    color: 'bg-[#16A34A]',
    textColor: 'text-[#16A34A]',
    icon: <Check size={14} />,
    description: 'Payment released to human'
  },
  refunded: {
    label: 'Refunded',
    color: 'bg-[#FF5F57]',
    textColor: 'text-[#FF5F57]',
    icon: <RotateCcw size={14} />,
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
  const currencyLabel = paymentMethod === 'usdc' ? 'USDC' : 'USD';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] cursor-pointer transition-all hover:scale-105 ${
        showDetails ? 'bg-[#F5F3F0] border border-[rgba(0,0,0,0.1)]' : ''
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${config.color} ${!showDetails ? 'animate-pulse' : ''}`}></span>
      <span className={`text-sm font-medium ${config.textColor}`}>
        {config.icon} {config.label}
      </span>

      {showDetails && amount != null && (
        <span className="text-[#1A1A1A] font-mono ml-2">
          {Number(amount).toFixed(2)} {currencyLabel}
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
  const currencyLabel = paymentMethod === 'usdc' ? 'USDC' : 'USD';

  return (
    <Card className="p-4">
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
            <p className="text-[#888888] text-sm">{currencyLabel}</p>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="space-y-2 pt-3 border-t border-[rgba(0,0,0,0.08)]">
          {depositedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-[#888888]">Deposited</span>
              <span className="text-[#1A1A1A]">
                {new Date(depositedAt).toLocaleDateString()} {new Date(depositedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
          {releasedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-[#888888]">Released</span>
              <span className="text-[#1A1A1A]">
                {new Date(releasedAt).toLocaleDateString()} {new Date(releasedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

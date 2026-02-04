// Escrow Badge Component
// Shows the current escrow status for a task
import React from 'react';

const STATUS_CONFIG = {
  pending: {
    label: 'Awaiting Deposit',
    color: 'bg-gray-500',
    textColor: 'text-gray-400',
    icon: '⏳',
    description: 'Waiting for agent to fund escrow'
  },
  deposited: {
    label: 'In Escrow',
    color: 'bg-orange-500',
    textColor: 'text-orange-400',
    icon: '🔒',
    description: 'Funds secured, work can begin'
  },
  released: {
    label: 'Paid',
    color: 'bg-green-500',
    textColor: 'text-green-400',
    icon: '✓',
    description: 'Payment released to human'
  },
  refunded: {
    label: 'Refunded',
    color: 'bg-red-500',
    textColor: 'text-red-400',
    icon: '↩',
    description: 'Funds returned to agent'
  }
};

export default function EscrowBadge({ 
  status = 'pending', 
  amount, 
  showDetails = false,
  onClick 
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all hover:scale-105 ${
        showDetails ? 'bg-gray-800 border border-gray-700' : ''
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${config.color} ${!showDetails ? 'animate-pulse' : ''}`}></span>
      <span className={`text-sm font-medium ${config.textColor}`}>
        {config.icon} {config.label}
      </span>
      
      {showDetails && amount && (
        <span className="text-white font-mono ml-2">
          {amount.toFixed(2)} USDC
        </span>
      )}
    </div>
  );
}

// Extended escrow status display with details
export function EscrowStatusCard({ 
  status, 
  amount, 
  depositedAt, 
  releasedAt,
  txHash 
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${config.color}/20 rounded-full flex items-center justify-center text-2xl`}>
            {config.icon}
          </div>
          <div>
            <h4 className="text-white font-bold">{config.label}</h4>
            <p className={`text-sm ${config.textColor}`}>{config.description}</p>
          </div>
        </div>
        
        {amount && (
          <div className="text-right">
            <p className="text-2xl font-bold text-white font-mono">{amount.toFixed(2)}</p>
            <p className="text-gray-500 text-sm">USDC</p>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="space-y-2 pt-3 border-t border-gray-700">
          {depositedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Deposited</span>
              <span className="text-white">
                {new Date(depositedAt).toLocaleDateString()} {new Date(depositedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
          {releasedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Released</span>
              <span className="text-white">
                {new Date(releasedAt).toLocaleDateString()} {new Date(releasedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
          {txHash && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Transaction</span>
              <a 
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-6)}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// PayoutHistory.jsx - Shows human's payout history
import React from 'react';

const API_URL = 'http://localhost:3002/api';

export default function PayoutHistory({ payouts = [] }) {
  if (payouts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">💸</div>
        <p className="text-gray-400">No payouts yet</p>
        <p className="text-gray-500 text-sm">Complete tasks to start earning</p>
      </div>
    );
  }

  const truncateTx = (tx) => {
    if (!tx) return '-';
    return `${tx.slice(0, 8)}...${tx.slice(-6)}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-3">
      {payouts.map((payout) => (
        <div key={payout.id} className="bg-gray-800/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-green-400 font-bold">+${payout.amount.toFixed(2)}</span>
              <span className="text-gray-500 text-sm">USDC</span>
            </div>
            <p className="text-gray-500 text-xs">
              {formatDate(payout.created_at)}
            </p>
          </div>
          <div className="text-right">
            {payout.tx_hash ? (
              <a
                href={`https://basescan.org/tx/${payout.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 text-sm hover:text-orange-300 font-mono"
              >
                {truncateTx(payout.tx_hash)}
              </a>
            ) : (
              <span className="text-gray-500 text-sm font-mono">-</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

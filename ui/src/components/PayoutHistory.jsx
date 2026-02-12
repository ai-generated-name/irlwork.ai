// PayoutHistory.jsx - Shows human's payout history
import React from 'react';
import { ArrowDownLeft } from 'lucide-react';
import API_URL from '../config/api';

export default function PayoutHistory({ payouts = [] }) {
  if (payouts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mb-3"><ArrowDownLeft size={32} /></div>
        <p className="text-[#525252]">No payouts yet</p>
        <p className="text-[#8A8A8A] text-sm">Complete tasks to start earning</p>
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
        <div key={payout.id} className="bg-white border-2 border-[rgba(26,26,26,0.08)] rounded-xl p-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#059669] font-bold">+${payout.amount.toFixed(2)}</span>
              <span className="text-[#8A8A8A] text-sm">USDC</span>
            </div>
            <p className="text-[#8A8A8A] text-xs">
              {formatDate(payout.created_at)}
            </p>
          </div>
          <div className="text-right">
            {payout.tx_hash ? (
              <a
                href={`https://basescan.org/tx/${payout.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#E07A5F] text-sm hover:text-[#C45F4A] font-mono"
              >
                {truncateTx(payout.tx_hash)}
              </a>
            ) : (
              <span className="text-[#8A8A8A] text-sm font-mono">-</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

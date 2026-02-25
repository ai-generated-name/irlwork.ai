// PayoutHistory.jsx - Shows human's payout history
import React from 'react';
import { ArrowDownLeft } from 'lucide-react';
import API_URL from '../config/api';

export default function PayoutHistory({ payouts = [] }) {
  if (payouts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mb-3"><ArrowDownLeft size={32} /></div>
        <p className="text-[#333333]">No payouts yet</p>
        <p className="text-[#888888] text-sm">Complete tasks to start earning</p>
      </div>
    );
  }

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
        <div key={payout.id} className="bg-white border-2 border-[rgba(0,0,0,0.08)] rounded-xl p-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#16A34A] font-bold">+${payout.amount.toFixed(2)}</span>
              <span className="text-[#888888] text-sm">USD</span>
            </div>
            <p className="text-[#888888] text-xs">
              {formatDate(payout.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

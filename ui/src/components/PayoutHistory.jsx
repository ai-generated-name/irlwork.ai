// PayoutHistory.jsx - Shows human's payout history
import React from 'react';
import { ArrowDownLeft } from 'lucide-react';
import { Card, EmptyState } from './ui';
import API_URL from '../config/api';

export default function PayoutHistory({ payouts = [] }) {
  if (payouts.length === 0) {
    return (
      <EmptyState
        icon={<ArrowDownLeft size={32} />}
        title="No payouts yet"
        description="Complete tasks to start earning"
      />
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
        <Card key={payout.id} className="p-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#16A34A] font-bold font-['DM_Mono']">+${payout.amount.toFixed(2)}</span>
              <span className="text-[#888888] text-sm">USD</span>
            </div>
            <p className="text-[#888888] text-xs">
              {formatDate(payout.created_at)}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

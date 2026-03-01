import React from 'react';

const STATUS_STYLES = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-purple-50 text-purple-700',
  pending_acceptance: 'bg-purple-50 text-purple-700',
  approved: 'bg-green-50 text-green-700',
  completed: 'bg-green-50 text-green-700',
  paid: 'bg-green-50 text-green-700',
  disputed: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  expired: 'bg-gray-100 text-gray-500',
  applied: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-700',
  refunded: 'bg-amber-50 text-amber-700',
};

function formatStatus(status) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function StatusPill({ status }) {
  const styles = STATUS_STYLES[status] || 'bg-gray-100 text-gray-500';

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-xl text-xs font-medium ${styles}`}
    >
      {formatStatus(status)}
    </span>
  );
}

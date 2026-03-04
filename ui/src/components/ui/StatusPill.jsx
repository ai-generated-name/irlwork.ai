import React from 'react';

const STATUS_STYLES = {
  open: 'bg-blue-50 text-blue-700',
  assigned: 'bg-blue-50 text-blue-700',
  accepted: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-purple-50 text-purple-700',
  pending_acceptance: 'bg-purple-50 text-purple-700',
  in_review: 'bg-purple-50 text-purple-700',
  approved: 'bg-green-50 text-green-700',
  completed: 'bg-green-50 text-green-700',
  paid: 'bg-green-50 text-green-700',
  disputed: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  expired: 'bg-gray-100 text-gray-500',
  applied: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-700',
  refunded: 'bg-amber-50 text-amber-700',
  overdue: 'bg-red-50 text-red-700',
  new: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  resolved: 'bg-green-50 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
};

const SIZE_STYLES = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

function formatStatus(status) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function StatusPill({ status, size = 'md', color, children }) {
  const sizeClass = SIZE_STYLES[size] || SIZE_STYLES.md;

  // Custom color override
  if (color && typeof color === 'object') {
    return (
      <span
        className={`inline-flex rounded-xl font-medium ${sizeClass}`}
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        {children || formatStatus(status)}
      </span>
    );
  }

  const styles = STATUS_STYLES[status] || 'bg-gray-100 text-gray-500';

  return (
    <span
      className={`inline-flex rounded-xl font-medium ${styles} ${sizeClass}`}
    >
      {children || formatStatus(status)}
    </span>
  );
}

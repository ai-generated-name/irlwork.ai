// Task Header Component
// Displays task title, description, requirements, and metadata

import React from 'react';

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-blue-500/20 text-blue-400' },
  accepted: { label: 'Accepted', color: 'bg-purple-500/20 text-purple-400' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-400' },
  pending_review: { label: 'Pending Review', color: 'bg-orange-500/20 text-orange-400' },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400' },
  paid: { label: 'Paid', color: 'bg-gray-500/20 text-gray-400' },
  disputed: { label: 'Disputed', color: 'bg-red-500/20 text-red-400' }
};

export default function TaskHeader({ task }) {
  if (!task) return null;

  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
      {/* Status Badge */}
      <div className="mb-4">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-white mb-4">
        {task.title}
      </h1>

      {/* Description */}
      <div className="mb-6">
        <p className="text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
          {task.description}
        </p>
      </div>

      {/* Metadata Row */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
        {/* Posted Date */}
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span>Posted {new Date(task.created_at).toLocaleDateString()}</span>
        </div>

        {/* Deadline */}
        {task.deadline && (
          <div className="flex items-center gap-2">
            <span>⏰</span>
            <span>Due {new Date(task.deadline).toLocaleDateString()}</span>
          </div>
        )}

        {/* Location */}
        <div className="flex items-center gap-2">
          <span>📍</span>
          <span>{task.city || 'Remote'}</span>
        </div>

        {/* Category */}
        {task.category && (
          <div className="flex items-center gap-2">
            <span>🏷️</span>
            <span>{task.category}</span>
          </div>
        )}
      </div>

      {/* Budget - Large and Prominent */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-green-400 font-mono">
            ${task.budget}
          </span>
          <span className="text-xl text-gray-400">USDC</span>
        </div>
        <p className="text-gray-500 text-sm mt-1">Payment for this task</p>
      </div>
    </div>
  );
}

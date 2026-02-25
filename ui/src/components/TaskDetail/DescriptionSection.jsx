import React from 'react';

export default function DescriptionSection({ task }) {
  if (!task?.description) return null;

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(0,0,0,0.08)] p-6 mb-6 shadow-sm">
      <h3 className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-4">
        Description
      </h3>
      <p className="text-[#333333] text-base leading-relaxed whitespace-pre-wrap">
        {task.description}
      </p>
    </div>
  );
}

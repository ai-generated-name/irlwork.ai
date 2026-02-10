import React from 'react';

export default function DescriptionSection({ task }) {
  if (!task?.description) return null;

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 mb-6 shadow-sm">
      <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider mb-4">
        Description
      </h3>
      <p className="text-[#525252] text-base leading-relaxed whitespace-pre-wrap">
        {task.description}
      </p>
    </div>
  );
}

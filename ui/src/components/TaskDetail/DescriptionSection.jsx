import React from 'react';

export default function DescriptionSection({ task }) {
  if (!task?.description) return null;

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E8E0D8] p-6 mb-6 shadow-sm">
      <h3 className="text-xs font-bold text-[rgba(26,20,16,0.40)] uppercase tracking-wider mb-4">
        Description
      </h3>
      <p className="text-[rgba(26,20,16,0.65)] text-base leading-relaxed whitespace-pre-wrap">
        {task.description}
      </p>
    </div>
  );
}

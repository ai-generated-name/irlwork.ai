import React from 'react';

export default function DescriptionSection({ task }) {
  if (!task?.description) return null;

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E8E0D8] p-6 mb-6 shadow-sm">
      <h3 className="text-xs font-bold text-[#B3AFAC] uppercase tracking-wider mb-4">
        Description
      </h3>
      <p className="text-[#7B7672] text-base leading-relaxed whitespace-pre-wrap">
        {task.description}
      </p>
    </div>
  );
}

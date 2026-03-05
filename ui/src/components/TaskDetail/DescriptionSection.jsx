import React from 'react';

export default function DescriptionSection({ task }) {
  if (!task?.description) return null;

  return (
    <div className="bg-white border border-[rgba(220,200,180,0.35)] p-6 mb-6" style={{ borderRadius: 20, boxShadow: '0 4px 24px rgba(200,150,100,0.08), 0 1px 0 rgba(255,255,255,0.9) inset' }}>
      <h3 className="text-xs font-bold text-[rgba(26,20,16,0.40)] uppercase tracking-wider mb-4">
        About this task
      </h3>
      <p className="text-[rgba(26,20,16,0.65)] text-base leading-relaxed whitespace-pre-wrap">
        {task.description}
      </p>
    </div>
  );
}

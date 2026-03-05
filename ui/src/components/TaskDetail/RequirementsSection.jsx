import React from 'react';

export default function RequirementsSection({ task }) {
  if (!task?.requirements) return null;

  const lines = task.requirements.split('\n').filter(l => l.trim());
  const isList = lines.length > 1;

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(220,200,180,0.35)] p-6 mb-6 shadow-sm">
      <h3 className="text-xs font-bold text-[rgba(26,20,16,0.40)] uppercase tracking-wider mb-4">
        Requirements
      </h3>
      {isList ? (
        <ul className="space-y-2 text-[rgba(26,20,16,0.65)] text-base">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2">
              {/* eslint-disable-next-line irlwork/no-orange-outside-button -- brand accent color */}
              <span className="text-[#E8703D] mt-0.5">•</span>
              <span>{line.replace(/^[-•*]\s*/, '')}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[rgba(26,20,16,0.65)] text-base leading-relaxed whitespace-pre-wrap">
          {task.requirements}
        </p>
      )}
    </div>
  );
}

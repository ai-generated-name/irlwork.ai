import React from 'react';

export default function RequirementsSection({ task }) {
  if (!task?.requirements) return null;

  const lines = task.requirements.split('\n').filter(l => l.trim());
  const isList = lines.length > 1;

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 mb-6 shadow-sm">
      <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider mb-4">
        Requirements
      </h3>
      {isList ? (
        <ul className="space-y-2 text-[#525252] text-base">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[#0F4C5C] mt-0.5">•</span>
              <span>{line.replace(/^[-•*]\s*/, '')}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[#525252] text-base leading-relaxed whitespace-pre-wrap">
          {task.requirements}
        </p>
      )}
    </div>
  );
}

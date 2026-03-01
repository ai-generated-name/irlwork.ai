import React from 'react';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="w-12 h-12 text-[#9CA3AF] flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[#1A1A1A] mt-3">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#6B7280] mt-2 max-w-xs text-center">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

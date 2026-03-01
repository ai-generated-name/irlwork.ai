import React from 'react';

export default function EmptyState({ icon, title, description, action, dark = false }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className={`w-12 h-12 flex items-center justify-center ${
          dark ? 'text-white/40' : 'text-[#9CA3AF]'
        }`}>
          {icon}
        </div>
      )}
      <h3 className={`text-base font-semibold mt-3 ${
        dark ? 'text-white' : 'text-[#1A1A1A]'
      }`}>
        {title}
      </h3>
      {description && (
        <p className={`text-sm mt-2 max-w-xs text-center ${
          dark ? 'text-white/60' : 'text-[#6B7280]'
        }`}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

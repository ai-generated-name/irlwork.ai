import React from 'react';

export default function PageHeader({ title, subtitle, action, dark = false }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div>
        <h1 className={`text-2xl font-['DM_Sans'] font-semibold ${
          dark ? 'text-white' : 'text-[#1A1A1A]'
        }`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-sm mt-1 ${
            dark ? 'text-white/60' : 'text-[#6B7280]'
          }`}>{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

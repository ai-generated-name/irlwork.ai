import React from 'react';

export default function LocationSection({ task }) {
  if (!task) return null;

  const hasLocation = task.city || task.location || task.country;
  const isRemote = task.is_remote;

  if (!hasLocation && !isRemote) return null;

  const locationParts = [];
  if (task.city) locationParts.push(task.city);
  if (task.country) locationParts.push(task.country);
  const locationStr = locationParts.join(', ') || task.location;

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 mb-6 shadow-sm">
      <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider mb-4">
        Location
      </h3>
      <div className="flex items-center gap-3">
        <span className="text-lg">📍</span>
        <div>
          <p className="text-[#1A1A1A] font-medium">
            {locationStr || 'Remote'}
            {isRemote && locationStr && (
              <span className="text-[#525252] font-normal"> (Remote OK)</span>
            )}
          </p>
          {isRemote && !locationStr && (
            <p className="text-[#525252] text-sm mt-0.5">Work from anywhere</p>
          )}
        </div>
      </div>
    </div>
  );
}

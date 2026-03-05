import React from 'react';
import { MapPin } from 'lucide-react';

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
    <div className="bg-white border border-[rgba(220,200,180,0.35)] p-6 mb-6" style={{ borderRadius: 20, boxShadow: '0 4px 24px rgba(200,150,100,0.08), 0 1px 0 rgba(255,255,255,0.9) inset' }}>
      <h3 className="text-xs font-bold text-[rgba(26,20,16,0.40)] uppercase tracking-wider mb-4">
        Location
      </h3>
      <div className="flex items-center gap-3">
        <MapPin size={18} />
        <div>
          <p className="text-[#1A1410] font-medium">
            {locationStr || 'Remote'}
            {isRemote && locationStr && (
              <span className="text-[rgba(26,20,16,0.65)] font-normal"> (Remote OK)</span>
            )}
          </p>
          {isRemote && !locationStr && (
            <p className="text-[rgba(26,20,16,0.65)] text-sm mt-0.5">Work from anywhere</p>
          )}
        </div>
      </div>
    </div>
  );
}

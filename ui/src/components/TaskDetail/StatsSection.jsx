import React, { useState, useEffect } from 'react';
import API_URL from '../../config/api';

export default function StatsSection({ taskId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!taskId) return;
    fetch(`${API_URL}/tasks/${taskId}/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {});
  }, [taskId]);

  if (!stats) return null;

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-3 sm:p-6 shadow-sm">
      <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider mb-2.5 sm:mb-4">
        Stats
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="text-center py-2 sm:py-3 bg-[#FAF8F5] rounded-xl">
          <div className="text-xl sm:text-2xl font-bold text-[#0F4C5C] font-mono">{stats.applications}</div>
          <div className="text-xs sm:text-sm text-[#525252] mt-0.5 sm:mt-1">Applications</div>
        </div>
        <div className="text-center py-2 sm:py-3 bg-[#FAF8F5] rounded-xl">
          <div className="text-xl sm:text-2xl font-bold text-[#0F4C5C] font-mono">{stats.views}</div>
          <div className="text-xs sm:text-sm text-[#525252] mt-0.5 sm:mt-1">Views</div>
        </div>
      </div>
    </div>
  );
}

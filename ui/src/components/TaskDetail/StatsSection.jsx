import React, { useState, useEffect } from 'react';
import { Card } from '../ui';
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
    <Card className="p-3 sm:p-6">
      <h3 className="text-xs font-bold text-[rgba(26,20,16,0.40)] uppercase tracking-wider mb-2.5 sm:mb-4">
        Stats
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="text-center py-2 sm:py-3 bg-[#FDF6EE] rounded-xl">
          {/* eslint-disable-next-line irlwork/no-orange-outside-button -- brand accent color */}
          <div className="text-xl sm:text-2xl font-bold text-[#E8764B] font-mono">{stats.applications}</div>
          <div className="text-xs sm:text-sm text-[rgba(26,20,16,0.65)] mt-0.5 sm:mt-1">Applications</div>
        </div>
        <div className="text-center py-2 sm:py-3 bg-[#FDF6EE] rounded-xl">
          {/* eslint-disable-next-line irlwork/no-orange-outside-button -- brand accent color */}
          <div className="text-xl sm:text-2xl font-bold text-[#E8764B] font-mono">{stats.views}</div>
          <div className="text-xs sm:text-sm text-[rgba(26,20,16,0.65)] mt-0.5 sm:mt-1">Views</div>
        </div>
      </div>
    </Card>
  );
}

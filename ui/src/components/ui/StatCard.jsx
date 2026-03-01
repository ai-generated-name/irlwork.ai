import React from 'react';
import Card from './Card';

export default function StatCard({ label, value, icon, trend }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#6B7280] font-medium">
            {label}
          </p>
          <p className="text-2xl font-['DM_Mono'] font-medium text-[#1A1A1A] mt-1">
            {value}
          </p>
          {trend && <TrendIndicator trend={trend} />}
        </div>
        {icon && (
          <div className="w-5 h-5 text-[#9CA3AF] flex-shrink-0">{icon}</div>
        )}
      </div>
    </Card>
  );
}

function TrendIndicator({ trend }) {
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center text-xs text-green-600 mt-1">
        <svg
          className="w-3 h-3 mr-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        Up
      </span>
    );
  }

  if (trend === 'down') {
    return (
      <span className="inline-flex items-center text-xs text-red-600 mt-1">
        <svg
          className="w-3 h-3 mr-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        Down
      </span>
    );
  }

  return (
    <span className="inline-flex items-center text-xs text-gray-500 mt-1">
      <svg
        className="w-3 h-3 mr-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
      Flat
    </span>
  );
}

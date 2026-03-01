import React from 'react';
import Card from './Card';

const ICON_COLORS = {
  gray: { text: 'text-[#9CA3AF]', bg: '' },
  orange: { text: 'text-[#E8853D]', bg: 'bg-[#FFF7ED]' },
  green: { text: 'text-[#16A34A]', bg: 'bg-[#F0FDF4]' },
  blue: { text: 'text-[#2563EB]', bg: 'bg-[#EFF6FF]' },
  red: { text: 'text-[#DC2626]', bg: 'bg-[#FEF2F2]' },
  gold: { text: 'text-[#D4A017]', bg: 'bg-[#FEF9E7]' },
};

const SIZE_CONFIG = {
  sm: { padding: 'sm', valueClass: 'text-base', labelClass: 'text-[10px]', iconSize: 'w-4 h-4', circleSize: 'w-7 h-7' },
  md: { padding: 'md', valueClass: 'text-2xl', labelClass: 'text-xs', iconSize: 'w-5 h-5', circleSize: 'w-9 h-9' },
  lg: { padding: 'lg', valueClass: 'text-[32px]', labelClass: 'text-sm', iconSize: 'w-6 h-6', circleSize: 'w-11 h-11' },
};

export default function StatCard({ label, value, icon, trend, dark = false, iconColor = 'gray', size = 'md' }) {
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const colorConfig = ICON_COLORS[iconColor] || ICON_COLORS.gray;
  const showCircle = iconColor !== 'gray' && colorConfig.bg;

  return (
    <Card dark={dark} padding={sizeConfig.padding}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`${sizeConfig.labelClass} uppercase tracking-wider font-medium ${
            dark ? 'text-white/60' : 'text-[#6B7280]'
          }`}>
            {label}
          </p>
          <p className={`${sizeConfig.valueClass} font-['DM_Mono'] font-medium mt-1 ${
            dark ? 'text-white' : 'text-[#1A1A1A]'
          }`}>
            {value}
          </p>
          {trend && <TrendIndicator trend={trend} />}
        </div>
        {icon && (
          dark ? (
            <div className={`${sizeConfig.iconSize} text-white/40 flex-shrink-0`}>{icon}</div>
          ) : showCircle ? (
            <div className={`${sizeConfig.circleSize} rounded-full ${colorConfig.bg} ${colorConfig.text} flex items-center justify-center flex-shrink-0`}>
              <div className={sizeConfig.iconSize}>{icon}</div>
            </div>
          ) : (
            <div className={`${sizeConfig.iconSize} ${colorConfig.text} flex-shrink-0`}>{icon}</div>
          )
        )}
      </div>
    </Card>
  );
}

function TrendIndicator({ trend }) {
  // Support object format: { direction, value, period }
  if (typeof trend === 'object' && trend !== null && trend.direction) {
    const dir = trend.direction;
    const trendColor = dir === 'up' ? 'text-green-600' : dir === 'down' ? 'text-red-600' : 'text-gray-500';
    const arrow = dir === 'up'
      ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      : dir === 'down'
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />;

    return (
      <span className={`inline-flex items-center text-xs ${trendColor} mt-1 gap-0.5`}>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {arrow}
        </svg>
        {trend.value && <span className="font-medium">{trend.value}</span>}
        {trend.period && <span className="text-gray-400 ml-0.5">{trend.period}</span>}
      </span>
    );
  }

  // Legacy string format
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

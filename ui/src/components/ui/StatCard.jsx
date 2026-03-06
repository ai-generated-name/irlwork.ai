import React from 'react';
import Card from './Card';

const ICON_COLORS = {
  gray:   { text: '#A69E98', bg: '' },
  orange: { text: '#E8764B', bg: '#FDEEE7' },
  green:  { text: '#2D7A3A', bg: 'rgba(45,122,58,0.09)' },
  blue:   { text: '#2563EB', bg: '#EFF6FF' },
  red:    { text: '#D44B4B', bg: 'rgba(212,75,75,0.08)' },
  gold:   { text: '#D4963F', bg: 'rgba(212,150,63,0.08)' },
};

const SIZE_CONFIG = {
  sm: { padding: 'sm', valueSize: 16, labelSize: 9, iconSize: 16, circleSize: 28 },
  md: { padding: 'md', valueSize: 24, labelSize: 12, iconSize: 20, circleSize: 36 },
  lg: { padding: 'lg', valueSize: 32, labelSize: 14, iconSize: 24, circleSize: 44 },
};

export default function StatCard({ label, value, icon, trend, dark = false, iconColor = 'gray', size = 'md' }) {
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const colorConfig = ICON_COLORS[iconColor] || ICON_COLORS.gray;
  const showCircle = iconColor !== 'gray' && colorConfig.bg;

  return (
    <Card dark={dark} padding={sizeConfig.padding}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{
            fontSize: sizeConfig.labelSize,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontWeight: 500,
            color: dark ? 'rgba(255,255,255,0.60)' : '#A69E98',
          }}>
            {label}
          </p>
          <p style={{
            fontSize: sizeConfig.valueSize,
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            marginTop: 4,
            color: dark ? '#fff' : '#1A1A1A',
            letterSpacing: '-0.02em',
          }}>
            {value}
          </p>
          {trend && <TrendIndicator trend={trend} />}
        </div>
        {icon && (
          dark ? (
            <div style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{icon}</div>
          ) : showCircle ? (
            <div style={{
              width: sizeConfig.circleSize, height: sizeConfig.circleSize,
              borderRadius: '50%', background: colorConfig.bg, color: colorConfig.text,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }}>{icon}</div>
            </div>
          ) : (
            <div style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize, color: colorConfig.text, flexShrink: 0 }}>{icon}</div>
          )
        )}
      </div>
    </Card>
  );
}

function TrendIndicator({ trend }) {
  if (typeof trend === 'object' && trend !== null && trend.direction) {
    const dir = trend.direction;
    const trendColor = dir === 'up' ? '#2D7A3A' : dir === 'down' ? '#D44B4B' : '#8C8580';
    const arrow = dir === 'up'
      ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      : dir === 'down'
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />;

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, color: trendColor, marginTop: 4, gap: 2 }}>
        <svg style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {arrow}
        </svg>
        {trend.value && <span style={{ fontWeight: 500 }}>{trend.value}</span>}
        {trend.period && <span style={{ color: '#A69E98', marginLeft: 2 }}>{trend.period}</span>}
      </span>
    );
  }

  const dir = trend;
  const trendColor = dir === 'up' ? '#2D7A3A' : dir === 'down' ? '#D44B4B' : '#8C8580';
  const arrow = dir === 'up'
    ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    : dir === 'down'
      ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />;
  const label = dir === 'up' ? 'Up' : dir === 'down' ? 'Down' : 'Flat';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, color: trendColor, marginTop: 4 }}>
      <svg style={{ width: 12, height: 12, marginRight: 2 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {arrow}
      </svg>
      {label}
    </span>
  );
}

import React from 'react';

export default function PageHeader({ title, subtitle, action, dark = false }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            lineHeight: 1.08,
            color: dark ? '#fff' : '#1A1410',
            fontFamily: "'Sora', sans-serif",
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: 14,
              marginTop: 4,
              color: dark ? 'rgba(255,255,255,0.60)' : 'rgba(26,20,16,0.50)',
            }}>{subtitle}</p>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
    </div>
  );
}

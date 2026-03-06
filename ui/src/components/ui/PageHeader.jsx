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
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: dark ? '#fff' : '#1A1A1A',
            fontFamily: "'Satoshi', system-ui, -apple-system, sans-serif",
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: 14,
              marginTop: 4,
              color: dark ? 'rgba(255,255,255,0.60)' : '#8C8580',
            }}>{subtitle}</p>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
    </div>
  );
}

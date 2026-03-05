import React from 'react';

export default function EmptyState({ icon, title, description, action, cta, onCta, dark = false }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center py-10 text-center">
      {icon && (
        <div style={{
          fontSize: 32,
          marginBottom: 10,
          opacity: 0.6,
          color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(26,20,16,0.28)',
        }}>
          {icon}
        </div>
      )}
      <h3 style={{
        fontSize: 14,
        fontWeight: 600,
        marginBottom: 4,
        color: dark ? '#fff' : '#1A1410',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: 12,
          color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(26,20,16,0.50)',
          lineHeight: 1.5,
          marginBottom: 14,
          maxWidth: 220,
        }}>
          {description}
        </p>
      )}
      {cta && (
        <button
          onClick={onCta}
          style={{
            padding: '9px 20px',
            borderRadius: 20,
            background: 'linear-gradient(135deg, #F0905A 0%, #E8703D 100%)',
            color: '#fff',
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Sora', sans-serif",
            boxShadow: '0 8px 32px rgba(232,112,61,0.22), 0 1px 0 rgba(255,255,255,0.25) inset',
          }}
        >
          {cta}
        </button>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

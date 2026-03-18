import React from 'react';

export default function EmptyState({ icon, title, description, action, cta, onCta, dark = false }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center py-10 text-center">
      {icon && (
        <div style={{
          fontSize: 32,
          marginBottom: 10,
          opacity: 0.6,
          color: dark ? 'rgba(255,255,255,0.4)' : '#A69E98',
        }}>
          {icon}
        </div>
      )}
      <h3 style={{
        fontSize: 14,
        fontWeight: 600,
        marginBottom: 4,
        color: dark ? '#fff' : '#1A1A1A',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: 12,
          color: dark ? 'rgba(255,255,255,0.6)' : '#8C8580',
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
            borderRadius: 16,
            background: '#E8764B',
            color: '#fff',
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Satoshi', sans-serif",
            boxShadow: 'none',
          }}
        >
          {cta}
        </button>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default function ModeToggle({ hiringMode, onToggle }) {
  return (
    <div style={{
      display: 'flex',
      background: '#EDE6DE',
      borderRadius: '30px',
      padding: '3px',
      gap: '2px',
    }}>
      {[
        { label: 'Hiring', active: hiringMode },
        { label: 'Working', active: !hiringMode },
      ].map(({ label, active }) => (
        <button
          key={label}
          onClick={() => {
            const wantHiring = label === 'Hiring'
            if (wantHiring !== hiringMode) onToggle()
          }}
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: '11px',
            fontWeight: 600,
            padding: '5px 13px',
            borderRadius: '22px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s',
            background: active ? 'var(--ink)' : 'transparent',
            color: active ? '#fff' : 'var(--ink3)',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

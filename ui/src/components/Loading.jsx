function Loading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
      width: '100%',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '2px solid rgba(220,200,180,0.35)',
          borderTopColor: '#E8703D',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{
          fontSize: 13,
          color: 'rgba(26,20,16,0.50)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>Loading...</p>
      </div>
    </div>
  )
}

export default Loading

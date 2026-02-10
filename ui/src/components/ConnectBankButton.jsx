import { useState, useEffect } from 'react';
import API_URL from '../config/api';

export default function ConnectBankButton({ user, compact = false }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [user.id]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/stripe/connect/status`, {
        headers: { Authorization: user.id },
      });
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch Connect status:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch(`${API_URL}/stripe/connect/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start onboarding');
      }

      const data = await res.json();

      if (data.already_connected) {
        await fetchStatus();
        return;
      }

      // Redirect to Stripe-hosted onboarding
      window.location.href = data.onboarding_url;
    } catch (e) {
      console.error('Connect error:', e);
      alert(e.message);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    if (compact) return null;
    return <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Checking bank status...</span>;
  }

  // ── Compact variant (for inline/zero-balance contexts) ──
  if (compact) {
    // Fully connected
    if (status?.connected && status?.payouts_enabled) {
      return (
        <span style={{ fontSize: '0.75rem', color: '#059669' }}>
          &#9989; Bank account connected
        </span>
      );
    }

    // Incomplete onboarding
    if (status?.connected && !status?.payouts_enabled) {
      return (
        <button
          onClick={handleConnect}
          disabled={connecting}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '0.75rem',
            color: '#D97706',
            cursor: connecting ? 'not-allowed' : 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}
        >
          {connecting ? 'Loading...' : 'Bank setup incomplete — Complete setup \u2192'}
        </button>
      );
    }

    // Not connected
    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          fontSize: '0.75rem',
          color: '#059669',
          cursor: connecting ? 'not-allowed' : 'pointer',
          opacity: connecting ? 0.6 : 0.8,
        }}
      >
        {connecting ? 'Setting up...' : '\uD83C\uDFE6 Connect bank account for future withdrawals \u2192'}
      </button>
    );
  }

  // ── Standard variant (full-size, for WithdrawalMethodPicker) ──

  // Fully connected
  if (status?.connected && status?.payouts_enabled) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '10px 16px',
        background: '#f0fdf4',
        border: '1.5px solid #86efac',
        borderRadius: '12px',
      }}>
        <span style={{ fontSize: '1rem' }}>&#9989;</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#16a34a' }}>
          Bank Account Connected
        </span>
      </div>
    );
  }

  // Connected but onboarding incomplete
  if (status?.connected && !status?.payouts_enabled) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: '#fffbeb',
        border: '1.5px solid #fcd34d',
        borderRadius: '12px',
      }}>
        <span style={{ fontSize: '0.875rem', color: '#92400e' }}>
          Bank setup incomplete
        </span>
        <button
          onClick={handleConnect}
          disabled={connecting}
          style={{
            padding: '6px 16px',
            background: '#f59e0b',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: connecting ? 'not-allowed' : 'pointer',
          }}
        >
          {connecting ? 'Loading...' : 'Complete Setup'}
        </button>
      </div>
    );
  }

  // Not connected
  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: '100%',
        padding: '12px 24px',
        background: connecting ? '#9ca3af' : '#6366f1',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '0.875rem',
        fontWeight: 600,
        cursor: connecting ? 'not-allowed' : 'pointer',
      }}
    >
      {connecting ? 'Setting up...' : 'Connect Bank Account'}
    </button>
  );
}

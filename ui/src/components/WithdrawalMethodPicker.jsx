import { useState, useEffect } from 'react';
import API_URL from '../config/api';
import ConnectBankButton from './ConnectBankButton';

export default function WithdrawalMethodPicker({ user, availableBalance, onWithdraw }) {
  const [loading, setLoading] = useState(false);
  const [connectStatus, setConnectStatus] = useState(null);

  useEffect(() => {
    fetchConnectStatus();
  }, [user.id]);

  const fetchConnectStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/stripe/connect/status`, {
        headers: { Authorization: user.token || '' },
      });
      if (res.ok) setConnectStatus(await res.json());
    } catch (e) {
      console.error('Failed to fetch connect status:', e);
    }
  };

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      await onWithdraw('stripe');
    } finally {
      setLoading(false);
    }
  };

  const stripeReady = connectStatus?.connected && connectStatus?.payouts_enabled;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a2e', margin: 0 }}>
        Withdraw to:
      </p>

      {/* Stripe / Bank option */}
      <div
        style={{
          padding: '14px 16px',
          border: '2px solid #6366f1',
          borderRadius: '12px',
          background: '#eef2ff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a2e' }}>
              Bank Account
            </span>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '2px 0 0' }}>
              Direct deposit via Stripe (2-3 business days)
            </p>
          </div>
          {stripeReady && (
            <span style={{ fontSize: '0.675rem', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
              Connected
            </span>
          )}
        </div>
        {!stripeReady && (
          <div style={{ marginTop: '0.75rem' }}>
            <ConnectBankButton user={user} compact />
          </div>
        )}
      </div>

      {/* Withdraw button */}
      <button
        onClick={handleWithdraw}
        disabled={!stripeReady || loading || availableBalance <= 0}
        style={{
          marginTop: '0.25rem',
          padding: '12px 24px',
          background: (!stripeReady || loading || availableBalance <= 0) ? '#d1d5db' : '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: (!stripeReady || loading || availableBalance <= 0) ? 'not-allowed' : 'pointer',
          width: '100%',
        }}
      >
        {loading
          ? 'Processing...'
          : `Withdraw $${availableBalance.toFixed(2)} to Bank`
        }
      </button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import API_URL from '../config/api';
import ConnectBankButton from './ConnectBankButton';

export default function WithdrawalMethodPicker({ user, availableBalance, onWithdraw }) {
  const [method, setMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connectStatus, setConnectStatus] = useState(null);

  useEffect(() => {
    fetchConnectStatus();
  }, [user.id]);

  const fetchConnectStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/stripe/connect/status`, {
        headers: { Authorization: user.token || user.id },
      });
      if (res.ok) setConnectStatus(await res.json());
    } catch (e) {
      console.error('Failed to fetch connect status:', e);
    }
  };

  const handleWithdraw = async () => {
    if (!method) return;
    setLoading(true);
    try {
      await onWithdraw(method);
    } finally {
      setLoading(false);
    }
  };

  const stripeReady = connectStatus?.connected && connectStatus?.payouts_enabled;
  const walletReady = !!user.wallet_address;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a2e', margin: 0 }}>
        Withdraw to:
      </p>

      {/* Stripe / Bank option */}
      <div
        onClick={() => stripeReady && setMethod('stripe')}
        style={{
          padding: '14px 16px',
          border: method === 'stripe' ? '2px solid #6366f1' : '1.5px solid #e5e7eb',
          borderRadius: '12px',
          cursor: stripeReady ? 'pointer' : 'default',
          background: method === 'stripe' ? '#eef2ff' : '#fff',
          opacity: stripeReady ? 1 : 0.7,
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
            <ConnectBankButton user={user} />
          </div>
        )}
      </div>

      {/* USDC / Wallet option */}
      <div
        onClick={() => walletReady && setMethod('usdc')}
        style={{
          padding: '14px 16px',
          border: method === 'usdc' ? '2px solid #6366f1' : '1.5px solid #e5e7eb',
          borderRadius: '12px',
          cursor: walletReady ? 'pointer' : 'default',
          background: method === 'usdc' ? '#eef2ff' : '#fff',
          opacity: walletReady ? 1 : 0.7,
        }}
      >
        <div>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a2e' }}>
            Crypto Wallet (USDC)
          </span>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '2px 0 0' }}>
            USDC on Base network to your wallet
          </p>
        </div>
        {walletReady ? (
          <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '4px' }}>
            {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
          </p>
        ) : (
          <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem' }}>
            Add a wallet address in your profile settings to use this option.
          </p>
        )}
      </div>

      {/* Withdraw button */}
      <button
        onClick={handleWithdraw}
        disabled={!method || loading || availableBalance <= 0}
        style={{
          marginTop: '0.25rem',
          padding: '12px 24px',
          background: (!method || loading || availableBalance <= 0) ? '#d1d5db' : '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: (!method || loading || availableBalance <= 0) ? 'not-allowed' : 'pointer',
          width: '100%',
        }}
      >
        {loading
          ? 'Processing...'
          : `Withdraw $${availableBalance.toFixed(2)} ${method === 'usdc' ? 'USDC' : method === 'stripe' ? 'to Bank' : ''}`
        }
      </button>
    </div>
  );
}

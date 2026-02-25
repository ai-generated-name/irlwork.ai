import { useState, useEffect } from 'react';
import API_URL from '../config/api';
import ConnectBankButton from './ConnectBankButton';
import ConnectWalletSection from './ConnectWalletSection';

export default function WithdrawalMethodPicker({ user, availableBalance, stripeAvailable = 0, usdcAvailable = 0, onWithdraw }) {
  const [loading, setLoading] = useState(false);
  const [connectStatus, setConnectStatus] = useState(null);
  const [walletStatus, setWalletStatus] = useState(null);

  useEffect(() => {
    fetchConnectStatus();
    fetchWalletStatus();
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

  const fetchWalletStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/wallet/address`, {
        headers: { Authorization: user.token || '' },
      });
      if (res.ok) setWalletStatus(await res.json());
    } catch (e) {
      console.error('Failed to fetch wallet status:', e);
    }
  };

  const handleWithdraw = async (method) => {
    setLoading(true);
    try {
      await onWithdraw(method);
    } finally {
      setLoading(false);
    }
  };

  const stripeReady = connectStatus?.connected && connectStatus?.payouts_enabled;
  const walletReady = !!walletStatus?.wallet_address;
  const hasStripeBalance = stripeAvailable > 0;
  const hasUsdcBalance = usdcAvailable > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a2e', margin: 0 }}>
        Withdraw to:
      </p>

      {/* Stripe / Bank option */}
      {hasStripeBalance && (
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
                ${stripeAvailable.toFixed(2)} via Stripe (2-3 business days)
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
          {stripeReady && (
            <button
              onClick={() => handleWithdraw('stripe')}
              disabled={loading || stripeAvailable <= 0}
              style={{
                marginTop: '0.75rem',
                padding: '10px 20px',
                background: (loading || stripeAvailable <= 0) ? '#d1d5db' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.813rem',
                fontWeight: 600,
                cursor: (loading || stripeAvailable <= 0) ? 'not-allowed' : 'pointer',
                width: '100%',
              }}
            >
              {loading ? 'Processing...' : `Withdraw $${stripeAvailable.toFixed(2)} to Bank`}
            </button>
          )}
        </div>
      )}

      {/* USDC / Wallet option */}
      {hasUsdcBalance && (
        <div
          style={{
            padding: '14px 16px',
            border: walletReady ? '2px solid #2563eb' : '2px solid #e5e7eb',
            borderRadius: '12px',
            background: walletReady ? '#eff6ff' : '#fafafa',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a2e' }}>
                USDC Wallet
              </span>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '2px 0 0' }}>
                ${usdcAvailable.toFixed(2)} USDC on Base (instant)
              </p>
            </div>
            {walletReady && (
              <span style={{ fontSize: '0.675rem', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                Connected
              </span>
            )}
          </div>
          {!walletReady && (
            <div style={{ marginTop: '0.75rem' }}>
              <ConnectWalletSection user={user} compact />
            </div>
          )}
          {walletReady && (
            <button
              onClick={() => handleWithdraw('usdc')}
              disabled={loading || usdcAvailable <= 0}
              style={{
                marginTop: '0.75rem',
                padding: '10px 20px',
                background: (loading || usdcAvailable <= 0) ? '#d1d5db' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.813rem',
                fontWeight: 600,
                cursor: (loading || usdcAvailable <= 0) ? 'not-allowed' : 'pointer',
                width: '100%',
              }}
            >
              {loading ? 'Processing...' : `Withdraw ${usdcAvailable.toFixed(2)} USDC to Wallet`}
            </button>
          )}
        </div>
      )}

      {/* Fallback if no per-rail breakdown but there's a total balance */}
      {!hasStripeBalance && !hasUsdcBalance && availableBalance > 0 && (
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
          {stripeReady && (
            <button
              onClick={() => handleWithdraw('stripe')}
              disabled={loading || availableBalance <= 0}
              style={{
                marginTop: '0.75rem',
                padding: '10px 20px',
                background: (loading || availableBalance <= 0) ? '#d1d5db' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.813rem',
                fontWeight: 600,
                cursor: (loading || availableBalance <= 0) ? 'not-allowed' : 'pointer',
                width: '100%',
              }}
            >
              {loading ? 'Processing...' : `Withdraw $${availableBalance.toFixed(2)} to Bank`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

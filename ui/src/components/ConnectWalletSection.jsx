import { useState, useEffect } from 'react';
import { Button } from './ui';
import API_URL from '../config/api';

export default function ConnectWalletSection({ user, compact = false }) {
  const [walletAddress, setWalletAddress] = useState('');
  const [savedAddress, setSavedAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWalletAddress();
  }, [user.id]);

  const fetchWalletAddress = async () => {
    try {
      const res = await fetch(`${API_URL}/wallet/address`, {
        headers: { Authorization: user.token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setSavedAddress(data.wallet_address);
        setWalletAddress(data.wallet_address || '');
      }
    } catch (e) {
      console.error('Failed to fetch wallet address:', e);
    } finally {
      setLoading(false);
    }
  };

  const isValidAddress = (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  const handleSave = async () => {
    if (!walletAddress) {
      setError('Please enter a wallet address');
      return;
    }
    if (!isValidAddress(walletAddress)) {
      setError('Invalid address. Must be a 0x... Ethereum/Base address (42 characters)');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/wallet/address`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.token || '',
        },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save wallet address');
      }

      setSavedAddress(walletAddress);
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/wallet/address`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.token || '',
        },
        body: JSON.stringify({ wallet_address: null }),
      });

      if (!res.ok) {
        throw new Error('Failed to remove wallet address');
      }

      setSavedAddress(null);
      setWalletAddress('');
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    if (compact) return null;
    return (
      <div className="bg-white border-2 border-[rgba(26,26,26,0.08)] rounded-2xl p-6 md:p-8 animate-pulse">
        <div className="h-5 bg-[#ECECEC] rounded w-1/3 mb-3"></div>
        <div className="h-4 bg-[#F3F4F6] rounded w-2/3"></div>
      </div>
    );
  }

  // ── Compact variant (inline, for WithdrawalMethodPicker) ──
  if (compact) {
    if (savedAddress) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#f0fdf4] border border-[#86efac] rounded-lg">
          <svg className="w-4 h-4 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          <span className="text-xs font-semibold text-[#16a34a] truncate">
            {savedAddress.slice(0, 6)}...{savedAddress.slice(-4)}
          </span>
          <button
            onClick={() => { setEditing(true); }}
            disabled={saving}
            className="ml-auto text-xs text-[#6366f1] hover:text-[#4f46e5] font-medium disabled:opacity-50"
          >
            Change
          </button>
        </div>
      );
    }

    if (editing) {
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => { setWalletAddress(e.target.value); setError(null); }}
            placeholder="0x..."
            className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg font-mono focus:outline-none focus:border-[#6366f1]"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            {/* eslint-disable-next-line irlwork/no-inline-button-pattern -- wallet branding uses indigo */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-[#9ca3af] text-white rounded-lg text-xs font-semibold transition-colors"
            >
              {saving ? 'Saving...' : 'Save address'}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setEditing(false); setError(null); setWalletAddress(savedAddress || ''); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      /* eslint-disable-next-line irlwork/no-inline-button-pattern -- wallet branding uses indigo */
      <button
        onClick={() => setEditing(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl text-sm font-semibold transition-colors"
      >
        Connect wallet
      </button>
    );
  }

  // ── Prominent variant (full card, for EarningsDashboard) ──

  // Connected — show address and manage options
  if (savedAddress && !editing) {
    return (
      <div className="bg-white border-2 border-[#059669]/20 rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#D1FAE5] rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[#1A1A1A] font-bold text-base">USDC wallet connected</h3>
            <p className="text-[#525252] text-sm mt-0.5 font-mono truncate">{savedAddress}</p>
            <p className="text-[#8A8A8A] text-xs mt-1">Base network (USDC)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#E5E5E5]">
          {/* eslint-disable-next-line irlwork/no-inline-button-pattern -- wallet branding uses indigo */}
          <button
            onClick={() => { setEditing(true); setWalletAddress(savedAddress); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#6366f1] hover:text-[#4f46e5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-lg transition-colors"
          >
            Change wallet
          </button>
          {/* eslint-disable-next-line irlwork/no-inline-button-pattern -- soft destructive style not in Button variants */}
          <button
            onClick={handleRemove}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#DC2626] hover:text-[#B91C1C] bg-[#FEE2E2] hover:bg-[#FECACA] rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Removing...' : 'Remove wallet'}
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
    );
  }

  // Editing or not connected — show input form
  return (
    <div className="bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] border-2 border-[#6366f1]/15 rounded-2xl p-6 md:p-8">
      {error && (
        <div className="mb-4 p-3 bg-[#FEE2E2] border border-[#DC2626]/20 rounded-xl flex items-start gap-2.5">
          <p className="text-[#DC2626] text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-[#DC2626]/50 hover:text-[#DC2626] flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center flex-shrink-0">
          <svg className="w-7 h-7 text-[#6366f1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
          </svg>
        </div>

        <div className="flex-1 w-full">
          <h3 className="text-[#1A1A1A] font-bold text-lg">
            {savedAddress ? 'Update wallet address' : 'Set up USDC wallet'}
          </h3>
          <p className="text-[#525252] text-sm mt-1.5 leading-relaxed">
            {savedAddress
              ? 'Enter your new Base wallet address for receiving USDC payouts.'
              : 'Paste your Base wallet address to receive USDC payouts for crypto-funded tasks.'}
          </p>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => { setWalletAddress(e.target.value); setError(null); }}
              placeholder="0x..."
              className="w-full px-4 py-3 text-sm border-2 border-[#e5e7eb] rounded-xl font-mono focus:outline-none focus:border-[#6366f1] bg-white"
            />

            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line irlwork/no-inline-button-pattern -- wallet branding uses indigo */}
              <button
                onClick={handleSave}
                disabled={saving || !walletAddress}
                className="px-6 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-[#9ca3af] text-white rounded-xl text-sm font-bold transition-all"
              >
                {saving ? 'Saving...' : 'Save wallet address'}
              </button>
              {editing && (
                <button
                  onClick={() => { setEditing(false); setError(null); setWalletAddress(savedAddress || ''); }}
                  className="px-4 py-2.5 text-sm text-[#525252] hover:bg-white/50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 mt-4 text-xs text-[#6366f1]/70">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Base network
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              USDC payouts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

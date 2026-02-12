import { useState, useEffect } from 'react';
import API_URL from '../config/api';

export default function ConnectBankButton({ user, compact = false }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

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
    setError(null);
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
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleManageBank = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/stripe/connect/dashboard`, {
        headers: { Authorization: user.id },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to open dashboard');
      }

      const data = await res.json();
      window.open(data.dashboard_url, '_blank');
    } catch (e) {
      console.error('Dashboard link error:', e);
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleUpdateBank = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/stripe/connect/update-bank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start bank update');
      }

      const data = await res.json();
      window.location.href = data.onboarding_url;
    } catch (e) {
      console.error('Update bank error:', e);
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    if (compact) return null;
    return (
      <div className="bg-white border-2 border-[rgba(26,26,26,0.08)] rounded-2xl p-6 md:p-8 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
        <div className="h-4 bg-gray-100 rounded w-2/3"></div>
      </div>
    );
  }

  // ── Compact variant (inline, for WithdrawalMethodPicker) ──
  if (compact) {
    if (status?.connected && status?.payouts_enabled) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#f0fdf4] border border-[#86efac] rounded-lg">
          <span className="text-sm">&#9989;</span>
          <span className="text-xs font-semibold text-[#16a34a]">Bank Connected</span>
          <button
            onClick={handleManageBank}
            disabled={connecting}
            className="ml-auto text-xs text-[#6366f1] hover:text-[#4f46e5] font-medium disabled:opacity-50"
          >
            Manage
          </button>
        </div>
      );
    }

    if (status?.connected && !status?.payouts_enabled) {
      return (
        <div className="flex items-center justify-between px-3 py-2 bg-[#fffbeb] border border-[#fcd34d] rounded-lg">
          <span className="text-xs text-[#92400e]">Bank setup incomplete</span>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="text-xs font-semibold text-[#f59e0b] hover:text-[#d97706] disabled:opacity-50"
          >
            {connecting ? 'Loading...' : 'Complete Setup'}
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-[#9ca3af] text-white rounded-xl text-sm font-semibold transition-colors"
      >
        {connecting ? 'Setting up...' : 'Connect Bank Account'}
      </button>
    );
  }

  // ── Prominent variant (full card, for EarningsDashboard setup prompt) ──

  // Fully connected — show manage options
  if (status?.connected && status?.payouts_enabled) {
    return (
      <div className="bg-white border-2 border-[#059669]/20 rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#D1FAE5] rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[#1A1A1A] font-bold text-base">Bank Account Connected</h3>
            <p className="text-[#525252] text-sm mt-0.5">Your earnings will be deposited directly to your bank account</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#E5E5E5]">
          <button
            onClick={handleManageBank}
            disabled={connecting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#525252] hover:text-[#1A1A1A] bg-[#F5F5F5] hover:bg-[#EBEBEB] rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Account
          </button>
          <button
            onClick={handleUpdateBank}
            disabled={connecting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#6366f1] hover:text-[#4f46e5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 9h16.5M5.25 21V9m13.5 12V9M9 21v-6a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v6M12 3.75l8.25 5.25H3.75L12 3.75z" />
            </svg>
            Change Bank
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
    );
  }

  // Connected but onboarding incomplete
  if (status?.connected && !status?.payouts_enabled) {
    return (
      <div className="bg-white border-2 border-[#f59e0b]/30 rounded-2xl p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#FEF3C7] rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[#1A1A1A] font-bold text-base">Finish Setting Up Your Bank</h3>
            <p className="text-[#525252] text-sm mt-1">Your bank connection is incomplete. Complete the setup to start receiving payments.</p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="mt-4 px-6 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-[#9ca3af] text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {connecting ? 'Loading...' : 'Complete Setup'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not connected — big prominent setup card
  return (
    <div className="bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] border-2 border-[#6366f1]/15 rounded-2xl p-6 md:p-8">
      {error && (
        <div className="mb-4 p-3 bg-[#FEE2E2] border border-[#DC2626]/20 rounded-xl flex items-start gap-2.5">
          <svg className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
          <div className="flex-1">
            <p className="text-[#DC2626] text-sm font-medium">Connection failed</p>
            <p className="text-[#DC2626]/70 text-xs mt-0.5">{error}</p>
          </div>
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 9h16.5M5.25 21V9m13.5 12V9M9 21v-6a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v6M12 3.75l8.25 5.25H3.75L12 3.75z" />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-[#1A1A1A] font-bold text-lg">Set Up Your Payment Account</h3>
          <p className="text-[#525252] text-sm mt-1.5 leading-relaxed">
            Connect your bank account to receive earnings directly. Takes about 2 minutes to set up through our secure partner, Stripe.
          </p>

          <div className="flex items-center gap-6 mt-4 text-xs text-[#6366f1]/70">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure & encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              2 min setup
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Free to connect
            </span>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full md:w-auto px-8 py-3 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-[#9ca3af] text-white rounded-xl text-sm font-bold transition-all hover:shadow-lg hover:shadow-[#6366f1]/25 flex items-center justify-center gap-2 flex-shrink-0"
        >
          {connecting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Setting up...
            </>
          ) : (
            <>
              Get Started
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

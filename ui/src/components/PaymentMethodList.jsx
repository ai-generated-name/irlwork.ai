import { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react'
import { EmptyState } from './ui';
import API_URL from '../config/api';

const brandIcons = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
};

export default function PaymentMethodList({ user, onUpdate, onMethodsLoaded }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const fetchMethods = async () => {
    try {
      const res = await fetch(`${API_URL}/stripe/payment-methods`, {
        headers: { Authorization: user.token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        const m = data.payment_methods || [];
        setMethods(m);
        if (onMethodsLoaded) onMethodsLoaded(m);
      }
    } catch (e) {
      console.error('Failed to fetch payment methods:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMethods(); }, [user.id]);

  // Allow parent to trigger refresh
  useEffect(() => {
    if (onUpdate) onUpdate(fetchMethods);
  }, []);

  const handleDelete = async (pmId) => {
    if (!confirm('Remove this card?')) return;
    setDeleting(pmId);
    try {
      await fetch(`${API_URL}/stripe/payment-methods/${pmId}`, {
        method: 'DELETE',
        headers: { Authorization: user.token || '' },
      });
      const updated = methods.filter(m => m.id !== pmId);
      setMethods(updated);
      if (onMethodsLoaded) onMethodsLoaded(updated);
    } catch (e) {
      console.error('Failed to delete payment method:', e);
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (pmId) => {
    try {
      await fetch(`${API_URL}/stripe/payment-methods/${pmId}/default`, {
        method: 'POST',
        headers: { Authorization: user.token || '' },
      });
      const updated = methods.map(m => ({ ...m, is_default: m.id === pmId }));
      setMethods(updated);
      if (onMethodsLoaded) onMethodsLoaded(updated);
    } catch (e) {
      console.error('Failed to set default:', e);
    }
  };

  if (loading) {
    return <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading payment methods...</p>;
  }

  if (methods.length === 0) {
    return (
      <p className="text-sm text-[#888888] py-1">No cards saved yet — add one below.</p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {methods.map((pm) => (
        <div
          key={pm.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: pm.is_default ? '#f0fdf4' : '#fff',
            border: pm.is_default ? '1.5px solid #86efac' : '1.5px solid #e5e7eb',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem' }}>
              <><CreditCard size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {brandIcons[pm.brand] || pm.brand}</>
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1a1a2e', fontFamily: "'DM Mono', monospace" }}>
              •••• {pm.last4}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {pm.exp_month}/{pm.exp_year}
            </span>
            {pm.is_default && (
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#16a34a',
                background: '#dcfce7',
                padding: '2px 8px',
                borderRadius: '6px',
              }}>
                Default
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!pm.is_default && (
              <button
                onClick={() => handleSetDefault(pm.id)}
                style={{
                  fontSize: '0.75rem',
                  color: '#6366f1',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Set as default
              </button>
            )}
            <button
              onClick={() => handleDelete(pm.id)}
              disabled={deleting === pm.id}
              style={{
                fontSize: '0.75rem',
                color: '#FF5F57',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {deleting === pm.id ? '...' : 'Remove card'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

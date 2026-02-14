import { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react'
import API_URL from '../config/api';

const brandIcons = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
};

export default function PaymentMethodList({ user, onUpdate }) {
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
        setMethods(data.payment_methods || []);
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
      setMethods(methods.filter(m => m.id !== pmId));
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
      setMethods(methods.map(m => ({ ...m, is_default: m.id === pmId })));
    } catch (e) {
      console.error('Failed to set default:', e);
    }
  };

  if (loading) {
    return <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading payment methods...</p>;
  }

  if (methods.length === 0) {
    return (
      <div style={{
        padding: '1.5rem',
        background: '#fef3c7',
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
          No payment methods saved. Add a card below to pay for tasks instantly.
        </p>
      </div>
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
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1a1a2e' }}>
              •••• {pm.last4}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {pm.exp_month}/{pm.exp_year}
            </span>
            {pm.is_default && (
              <span style={{
                fontSize: '0.675rem',
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
                Set default
              </button>
            )}
            <button
              onClick={() => handleDelete(pm.id)}
              disabled={deleting === pm.id}
              style={{
                fontSize: '0.75rem',
                color: '#ef4444',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {deleting === pm.id ? '...' : 'Remove'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

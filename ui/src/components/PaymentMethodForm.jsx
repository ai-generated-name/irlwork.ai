import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import API_URL from '../config/api';

const cardStyle = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1a1a2e',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#ef4444' },
  },
};

export default function PaymentMethodForm({ user, onSaved }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Get SetupIntent client_secret from backend
      const res = await fetch(`${API_URL}/stripe/setup-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.token || '',
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create setup intent');
      }

      const { client_secret } = await res.json();

      // Confirm card setup with Stripe
      const { error: stripeError } = await stripe.confirmCardSetup(client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { email: user.email, name: user.name },
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      setSuccess(true);
      elements.getElement(CardElement).clear();
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
      <div style={{
        padding: '12px 16px',
        border: '1.5px solid #e5e7eb',
        borderRadius: '12px',
        background: '#fafafa',
      }}>
        <CardElement options={cardStyle} />
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>{error}</p>
      )}

      {success && (
        <p style={{ color: '#22c55e', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Card saved successfully!
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          marginTop: '0.75rem',
          padding: '10px 24px',
          background: loading ? '#9ca3af' : '#6366f1',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          width: '100%',
        }}
      >
        {loading ? 'Saving...' : 'Save Card'}
      </button>
    </form>
  );
}

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export default function StripeProvider({ children }) {
  if (!stripeKey) {
    console.warn('[StripeProvider] VITE_STRIPE_PUBLISHABLE_KEY is not set — Stripe features will be unavailable');
    return (
      <div className="bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-xl p-4 text-sm text-[#92400E]">
        <p className="font-semibold">Payment setup unavailable</p>
        <p className="mt-1 text-xs opacity-80">Stripe is not configured. Contact support if this persists.</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}

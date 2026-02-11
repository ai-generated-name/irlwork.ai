// Funding Instructions Component
// Shows payment confirmation after Stripe charge
import React from 'react';

export default function FundingInstructions({
  taskId,
  depositAmount,
  status = 'pending',
  paymentMethod = 'stripe'
}) {
  if (status === 'funded' || status === 'deposited') {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <span className="text-green-400 text-xl">✓</span>
          </div>
          <div>
            <h3 className="text-white font-bold">Escrow Funded!</h3>
            <p className="text-green-400 text-sm">Your payment has been received</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          The worker can now begin work. Payment will be released when the task is complete.
        </p>
      </div>
    );
  }

  // Default: Stripe payment confirmed
  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
          <span className="text-green-400 text-xl">✓</span>
        </div>
        <div>
          <h3 className="text-white font-bold">Payment Confirmed</h3>
          <p className="text-green-400 text-sm">${depositAmount?.toFixed(2)} charged to your card</p>
        </div>
      </div>
      <p className="text-gray-400 text-sm">
        The worker can now begin work. Payment will be released when the task is complete and approved.
      </p>
    </div>
  );
}

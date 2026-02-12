// Funding Instructions Component
// Shows deposit instructions when posting a task
import React from 'react';
import { DollarSign } from 'lucide-react'

export default function FundingInstructions({
  taskId,
  depositAmount,
  platformWallet,
  onCopy,
  status = 'pending',
  paymentMethod = 'usdc'
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    onCopy?.(field);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stripe payment confirmed — no deposit instructions needed
  if (paymentMethod === 'stripe') {
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
          The human can now begin work. Payment will be released when the task is complete and approved.
        </p>
      </div>
    );
  }

  if (status === 'funded') {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <span className="text-green-400 text-xl">✓</span>
          </div>
          <div>
            <h3 className="text-white font-bold">Escrow Funded!</h3>
            <p className="text-green-400 text-sm">Your deposit has been received</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          The human can now begin work. Payment will be released when the task is complete.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
          <DollarSign size={20} className="text-orange-400" />
        </div>
        <div>
          <h3 className="text-white font-bold">Fund Task Escrow</h3>
          <p className="text-orange-400 text-sm">Send exactly {depositAmount?.toFixed(2)} USDC to fund this task</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Amount (USDC)</label>
          <div className="relative">
            <input
              type="text"
              value={depositAmount?.toFixed(2) || ''}
              readOnly
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-lg"
            />
            <button
              onClick={() => handleCopy(depositAmount?.toFixed(2) || '', 'amount')}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-700 rounded text-xs text-gray-300 hover:bg-gray-600"
            >
              {copied === 'amount' ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Platform Wallet (Base)</label>
          <div className="relative">
            <input
              type="text"
              value={platformWallet || ''}
              readOnly
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm break-all"
            />
            <button
              onClick={() => handleCopy(platformWallet || '', 'wallet')}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-700 rounded text-xs text-gray-300 hover:bg-gray-600"
            >
              {copied === 'wallet' ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-sm text-gray-400 mb-2">Or scan QR code</label>
          <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center">
            <div className="text-gray-400 text-xs text-center">
              QR Code
              <br />
              (Base Wallet)
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
        <p className="text-gray-400 text-xs">
          <strong className="text-orange-400">Important:</strong> Send exactly {depositAmount?.toFixed(2)} USDC from a Base network wallet. 
          Transactions from other networks will not be credited.
        </p>
      </div>

      <div className="mt-4 flex gap-3">
        <a
          href={`https://bridge.base.org/deposit`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-center text-sm font-medium transition-colors"
        >
          Go to Base Bridge
        </a>
        <a
          href={`https://uniswap.org`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-center text-sm font-medium transition-colors"
        >
          Swap to USDC
        </a>
      </div>
    </div>
  );
}

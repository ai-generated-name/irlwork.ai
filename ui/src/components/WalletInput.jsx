// Wallet Input Component
// Used in signup and profile to add wallet address
import React from 'react';

export default function WalletInput({ 
  value, 
  onChange, 
  error, 
  showBalance = false,
  balance = 0,
  disabled = false 
}) {
  const [verifying, setVerifying] = React.useState(false);
  const [verified, setVerified] = React.useState(false);

  const validateAddress = (address) => {
    if (!address) return { valid: false, error: null };
    if (!address.startsWith('0x')) return { valid: false, error: 'Must start with 0x' };
    if (address.length !== 42) return { valid: false, error: 'Must be 42 characters' };
    return { valid: true, error: null };
  };

  const handleChange = (e) => {
    const address = e.target.value;
    onChange(address);
    
    if (address) {
      const { valid, error } = validateAddress(address);
      if (valid) {
        setVerifying(true);
        // Simulate verification
        setTimeout(() => {
          setVerified(true);
          setVerifying(false);
        }, 1000);
      } else {
        setVerified(false);
      }
    } else {
      setVerified(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Wallet Address (Base)
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="0x..."
          disabled={disabled}
          className={`w-full px-4 py-3 bg-gray-800 border rounded-lg focus:ring-2 outline-none text-white placeholder-gray-500 ${
            error || (value && !verified && !verifying) 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-gray-700 focus:ring-orange-500'
          }`}
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {verifying && (
            <span className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
          )}
          {verified && !error && (
            <span className="text-green-400">✓</span>
          )}
        </div>
      </div>
      
      {(error || (value && !verified && !verifying)) && (
        <p className="text-red-400 text-sm mt-1">
          {error || 'Invalid Base wallet address'}
        </p>
      )}
      
      {showBalance && value && verified && (
        <div className="flex items-center gap-2 mt-2 text-sm">
          <span className="text-gray-400">Balance:</span>
          <span className="text-green-400 font-mono">{balance.toFixed(2)} USDC</span>
        </div>
      )}
      
      <p className="text-gray-500 text-xs mt-2">
        You'll receive payments to this wallet. Use a Base network wallet.
      </p>
    </div>
  );
}

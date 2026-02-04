"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Zap, ArrowLeft, Wallet, Plus, ArrowUpRight,
  ArrowDownLeft, TrendingUp, Clock, CheckCircle, AlertTriangle, ExternalLink, Copy
} from "lucide-react";
import Link from "next/link";

interface WalletData {
  balance: number;
  usdcBalance: string;
  currency: string;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  amount: number;
  type: "deposit" | "withdrawal" | "payment" | "payout" | "refund";
  description: string;
  txHash?: string;
  createdAt: string;
}

export default function WalletPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [processing, setProcessing] = useState(false);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await fetch("http://localhost:3002/api/wallet");
      const data = await res.json();
      if (res.ok && data.wallet) {
        setWallet(data.wallet);
      }
    } catch (err) {
      console.error("Failed to fetch wallet:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    setProcessing(true);
    try {
      const res = await fetch("http://localhost:3002/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });
      const data = await res.json();
      if (res.ok && data.instructions) {
        setWallet({ ...wallet!, transactions: [{ id: 'new', amount: parseFloat(amount), type: 'deposit', description: 'Deposit pending', createdAt: new Date().toISOString() }, ...wallet!.transactions] });
        setShowDeposit(false);
        setAmount("");
      }
    } catch (err) {
      console.error("Deposit failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    setProcessing(true);
    try {
      const res = await fetch("http://localhost:3002/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), walletAddress }),
      });
      if (res.ok) {
        setShowWithdraw(false);
        setAmount("");
        setWalletAddress("");
        fetchWallet();
      }
    } catch (err) {
      console.error("Withdrawal failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#ff4d00]/30 border-t-[#ff4d00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-[#2a2a2a] bg-[#0a0a0a]/90 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#ff4d00] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-display font-bold">irlwork.ai</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl font-bold mb-2">Wallet</h1>
              <p className="text-gray-400">Manage your USDC balance and payments</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-[#00ff9d]/10 border border-[#00ff9d]/20 rounded-full">
              <div className="w-2 h-2 bg-[#00ff9d] rounded-full animate-pulse" />
              <span className="text-[#00ff9d] text-sm font-medium">USDC on Base</span>
            </div>
          </div>

          {/* Balance Cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-[#00ff9d]/10 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-[#00ff9d]" />
                </div>
                <TrendingUp className="w-5 h-5 text-[#00ff9d]" />
              </div>
              <div className="text-sm text-gray-400 mb-1">Available Balance</div>
              <div className="font-display text-3xl font-bold text-[#00ff9d]">
                {wallet?.balance?.toFixed(2) || "0.00"} USDC
              </div>
              {wallet?.usdcBalance && parseFloat(wallet.usdcBalance) > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  On-chain: {parseFloat(wallet.usdcBalance).toFixed(2)} USDC
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowDeposit(true)} className="flex-1 bg-[#ff4d00] hover:bg-[#cc3d00] py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Deposit
                </button>
                <button onClick={() => setShowWithdraw(true)} disabled={(wallet?.balance || 0) <= 0} className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <ArrowUpRight className="w-4 h-4" /> Withdraw
                </button>
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-400" />
                </div>
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div className="text-sm text-gray-400 mb-1">Total Earned</div>
              <div className="font-display text-3xl font-bold text-white">
                {wallet?.transactions.filter((t: Transaction) => t.type === 'payout' || t.type === 'refund').reduce((sum: number, t: Transaction) => sum + t.amount, 0).toFixed(2) || "0.00"} USDC
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Payments from completed tasks
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#00ff9d] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-black">$</span>
              </div>
              <div>
                <div className="font-medium mb-1">USDC on Base Network</div>
                <div className="text-sm text-gray-400">
                  All payments are in USDC on the Base blockchain. Fast, secure, and low fees.
                </div>
              </div>
            </div>
          </div>

          {/* Deposit Modal */}
          {showDeposit && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDeposit(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h2 className="font-display text-xl font-bold mb-4">Add USDC</h2>
                <p className="text-gray-400 text-sm mb-4">Buy USDC on Coinbase, Binance, or any exchange and transfer to your Base wallet.</p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USDC)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100.00" min="1" step="0.01" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#ff4d00]" />
                </div>
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Your Base wallet address:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-sm text-[#00ff9d] break-all">{walletAddress || 'Connect wallet to get address'}</code>
                    <button onClick={() => copyToClipboard(walletAddress)} className="text-gray-400 hover:text-white">{copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}</button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowDeposit(false)} className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] py-3 rounded-lg font-semibold transition-colors">Cancel</button>
                  <button onClick={handleDeposit} disabled={processing || !parseFloat(amount) || parseFloat(amount) < 1} className="flex-1 bg-[#ff4d00] hover:bg-[#cc3d00] py-3 rounded-lg font-semibold transition-colors disabled:opacity-50">
                    {processing ? "Processing..." : "Done"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Withdraw Modal */}
          {showWithdraw && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowWithdraw(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h2 className="font-display text-xl font-bold mb-4">Withdraw USDC</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USDC)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100.00" min="1" step="0.01" max={wallet?.balance} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#ff4d00]" />
                  <p className="text-xs text-gray-500 mt-1">Available: {wallet?.balance?.toFixed(2) || "0.00"} USDC</p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Your Base Wallet Address</label>
                  <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="0x..." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg py-3 px-4 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[#ff4d00]" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowWithdraw(false)} className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] py-3 rounded-lg font-semibold transition-colors">Cancel</button>
                  <button onClick={handleWithdraw} disabled={processing || !parseFloat(amount) || parseFloat(amount) < 1 || parseFloat(amount) > (wallet?.balance || 0) || !walletAddress} className="flex-1 bg-[#00ff9d] text-black hover:bg-[#00cc7d] py-3 rounded-lg font-semibold transition-colors disabled:opacity-50">
                    {processing ? "Processing..." : "Withdraw"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Transaction History */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#2a2a2a]">
              <h2 className="font-display font-bold">Transaction History</h2>
            </div>
            {wallet?.transactions && wallet.transactions.length > 0 ? (
              <div className="divide-y divide-[#2a2a2a]">
                {wallet.transactions.map((tx: Transaction) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.type === 'deposit' || tx.type === 'refund' ? "bg-[#00ff9d]/10" : "bg-[#2a2a2a]"}`}>
                        {tx.type === 'deposit' || tx.type === 'refund' ? (
                          <ArrowDownLeft className="w-5 h-5 text-[#00ff9d]" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium capitalize">{tx.type}</div>
                        <div className="text-sm text-gray-400">{tx.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${tx.type === 'deposit' || tx.type === 'refund' ? "text-[#00ff9d]" : "text-white"}`}>
                        {tx.type === 'deposit' || tx.type === 'refund' ? "+" : "-"}{tx.amount.toFixed(2)} USDC
                      </div>
                      <div className="text-sm text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</div>
                      {tx.txHash && (
                        <a href={`https://basescan.org/tx/${tx.txHash}`} target="_blank" rel="noopener" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 justify-end">
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <div className="font-medium mb-2">No Transactions Yet</div>
                <div className="text-sm text-gray-400">Your transaction history will appear here</div>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

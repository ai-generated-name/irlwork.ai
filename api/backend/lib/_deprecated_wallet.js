// /backend/lib/wallet.js
// Platform wallet for Base mainnet - handles USDC operations

const { createPublicClient, createWalletClient, http, parseUnits, formatUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base } = require('viem/chains');

const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS;
const PLATFORM_WALLET_PRIVATE_KEY = process.env.PLATFORM_WALLET_PRIVATE_KEY;
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const USDC_CONTRACT_ADDRESS = process.env.USDC_CONTRACT_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// USDC ABI (minimal for transfers)
const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  }
];

// Initialize clients
const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL)
});

let walletClient = null;
if (PLATFORM_WALLET_PRIVATE_KEY) {
  const account = privateKeyToAccount(PLATFORM_WALLET_PRIVATE_KEY);
  walletClient = createWalletClient({
    chain: base,
    transport: http(BASE_RPC_URL),
    account
  });
}

/**
 * Get platform wallet USDC balance
 */
async function getBalance() {
  try {
    if (!PLATFORM_WALLET_ADDRESS) {
      return { success: false, error: 'Wallet not configured' };
    }

    const balance = await publicClient.readContract({
      address: USDC_CONTRACT_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [PLATFORM_WALLET_ADDRESS]
    });

    return {
      success: true,
      address: PLATFORM_WALLET_ADDRESS,
      balance: formatUnits(balance, 6), // USDC has 6 decimals
      balanceWei: balance.toString()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send USDC to a recipient
 * @param {string} to - Recipient wallet address
 * @param {number|string} amountUSDC - Amount in USDC (e.g., 50.00)
 * @returns {object} - { success, txHash, amount }
 */
async function sendUSDC(to, amountUSDC) {
  try {
    if (!walletClient) {
      return { success: false, error: 'Wallet not configured for sending' };
    }

    if (!to || !to.match(/^0x[a-fA-F0-9]{40}$/)) {
      return { success: false, error: 'Invalid recipient address' };
    }

    // Parse amount to wei (USDC has 6 decimals)
    const amountWei = parseUnits(amountUSDC.toString(), 6);

    // Get current balance
    const balance = await publicClient.readContract({
      address: USDC_CONTRACT_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [PLATFORM_WALLET_ADDRESS]
    });

    if (balance < amountWei) {
      return { success: false, error: 'Insufficient balance', have: formatUnits(balance, 6), need: amountUSDC };
    }

    // Send transaction
    const hash = await walletClient.writeContract({
      address: USDC_CONTRACT_ADDRESS,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [to, amountWei]
    });

    return {
      success: true,
      txHash: hash,
      to,
      amount: amountUSDC,
      amountWei: amountWei.toString(),
      explorerUrl: `https://basescan.org/tx/${hash}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Validate Ethereum address
 */
function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get USDC transfer events for an address
 * @param {string} fromBlock - Starting block (or 'latest-100')
 */
async function getTransferEvents(toAddress, fromBlock = 'latest-100') {
  try {
    return {
      success: true,
      transfers: [],
      note: 'Event polling requires external indexer (Alchemy/QuickNode/The Graph)'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if transaction was confirmed
 */
async function confirmTransaction(txHash) {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    return {
      success: true,
      confirmed: receipt.status === 'success',
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getBalance,
  sendUSDC,
  isValidAddress,
  getTransferEvents,
  confirmTransaction,
  PLATFORM_WALLET_ADDRESS,
  USDC_CONTRACT_ADDRESS
};

// Platform Wallet for Base Mainnet
// Handles USDC balances and transfers
const { createPublicClient, createWalletClient, http, parseUnits, formatUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

const BASE_CHAIN_ID = 8453;
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const USDC_CONTRACT = process.env.USDC_CONTRACT_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS;
const PLATFORM_WALLET_PRIVATE_KEY = process.env.PLATFORM_WALLET_PRIVATE_KEY;

// USDC ABI (simplified)
const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  }
];

// Create clients
const publicClient = createPublicClient({
  chain: {
    id: BASE_CHAIN_ID,
    name: 'Base',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { public: { http: [BASE_RPC_URL] } }
  },
  transport: http(BASE_RPC_URL)
});

let walletClient = null;
let account = null;

// Initialize wallet
async function initWallet() {
  if (!PLATFORM_WALLET_PRIVATE_KEY || !PLATFORM_WALLET_ADDRESS) {
    console.warn('⚠️ Platform wallet not configured. Set PLATFORM_WALLET_ADDRESS and PLATFORM_WALLET_PRIVATE_KEY');
    return;
  }
  
  account = privateKeyToAccount(PLATFORM_WALLET_PRIVATE_KEY);
  
  walletClient = createWalletClient({
    chain: {
      id: BASE_CHAIN_ID,
      name: 'Base',
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: { public: { http: [BASE_RPC_URL] } }
    },
    transport: http(BASE_RPC_URL),
    account
  });
  
  console.log(`✅ Platform wallet initialized: ${account.address}`);
  console.log(`   USDC Contract: ${USDC_CONTRACT}`);
}

// Get USDC balance for an address
async function getBalance(address) {
  try {
    // Using eth_call to read balance
    const balanceData = await publicClient.call({
      to: USDC_CONTRACT,
      data: `0x70a08231000000000000000000000000${address.slice(2).toLowerCase()}`
    });
    
    const balance = BigInt(balanceData || '0x0');
    
    // USDC has 6 decimals
    const formattedBalance = formatUnits(balance, 6);
    
    return parseFloat(formattedBalance);
  } catch (e) {
    console.error('Error getting balance:', e.message);
    return 0;
  }
}

// Send USDC to a human's wallet
async function sendUSDC(to, amountUSDC) {
  if (!walletClient || !account) {
    throw new Error('Wallet not initialized');
  }
  
  try {
    // Convert amount to wei (6 decimals for USDC)
    const amountWei = parseUnits(amountUSDC.toString(), 6);
    
    console.log(`📤 Sending ${amountUSDC} USDC to ${to}`);
    
    // Send transaction
    const hash = await walletClient.sendTransaction({
      to: to,
      value: 0n, // No ETH being sent
      data: `0xa9059cbb000000000000000000000000${to.slice(2).toLowerCase()}${amountWei.toString(16).padStart(64, '0')}`
    });
    
    console.log(`✅ Transaction sent: ${hash}`);
    
    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    return hash;
  } catch (e) {
    console.error('Error sending USDC:', e.message);
    throw e;
  }
}

// Get transaction status
async function getTransactionStatus(hash) {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash });
    return {
      status: receipt.status === 'success' ? 'confirmed' : 'failed',
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString()
    };
  } catch (e) {
    return { status: 'not_found' };
  }
}

// Get platform wallet address
function getPlatformWalletAddress() {
  return PLATFORM_WALLET_ADDRESS;
}

// Get USDC contract address
function getUSDCContractAddress() {
  return USDC_CONTRACT;
}

module.exports = {
  initWallet,
  getBalance,
  sendUSDC,
  getTransactionStatus,
  getPlatformWalletAddress,
  getUSDCContractAddress
};

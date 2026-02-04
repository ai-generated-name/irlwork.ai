// USDC Wallet operations for Base blockchain
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS;
const PLATFORM_WALLET_PRIVATE_KEY = process.env.PLATFORM_WALLET_PRIVATE_KEY;
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const USDC_CONTRACT = process.env.USDC_CONTRACT_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

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

export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export async function getBalance(address = PLATFORM_WALLET_ADDRESS) {
  try {
    if (!address) {
      return { success: false, error: 'No address configured' };
    }

    const balance = await publicClient.readContract({
      address: USDC_CONTRACT,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address]
    });

    return {
      success: true,
      address,
      balance: formatUnits(balance, 6),
      balanceWei: balance.toString()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function sendUSDC(to, amountUSDC) {
  try {
    if (!walletClient) {
      return { success: false, error: 'Wallet not configured for sending' };
    }

    if (!to || !isValidAddress(to)) {
      return { success: false, error: 'Invalid recipient address' };
    }

    const amountWei = parseUnits(amountUSDC.toString(), 6);
    const balance = await publicClient.readContract({
      address: USDC_CONTRACT,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [PLATFORM_WALLET_ADDRESS]
    });

    if (balance < amountWei) {
      return { success: false, error: 'Insufficient platform balance' };
    }

    const hash = await walletClient.writeContract({
      address: USDC_CONTRACT,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [to, amountWei]
    });

    return {
      success: true,
      txHash: hash,
      explorerUrl: `https://basescan.org/tx/${hash}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function confirmTransaction(txHash) {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    return {
      success: true,
      confirmed: receipt.status === 'success',
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

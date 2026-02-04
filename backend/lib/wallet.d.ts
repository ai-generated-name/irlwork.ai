// Type declarations for wallet.js
export function getBalance(userId: string): Promise<{ success: boolean; balance: string }>;
export function sendUSDC(fromUserId: string, toAddress: string, amount: number): Promise<{ success: boolean; txHash?: string }>;
export function isValidAddress(address: string): boolean;

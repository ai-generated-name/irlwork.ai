/**
 * Circle Programmable Wallets Service
 *
 * Single interface for all Circle API interactions.
 * Every other file calls this — never call Circle APIs directly elsewhere.
 *
 * Uses developer-controlled wallets on Base with SCA (Smart Contract Account)
 * for Gas Station support (platform pays gas, users never see gas fees).
 */

const { initiateDeveloperControlledWalletsClient } = require('@circle-fin/developer-controlled-wallets');

let client = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey || !entitySecret) {
    throw new Error('Circle API not configured. Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET.');
  }
  client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  return client;
}

/**
 * Create a new wallet for a user on Base.
 * @returns {{ walletId: string, walletAddress: string, blockchain: string }}
 */
async function createUserWallet() {
  const c = getClient();
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  if (!walletSetId) {
    throw new Error('CIRCLE_WALLET_SET_ID not configured.');
  }
  let response;
  try {
    response = await c.createWallets({
      blockchains: ['BASE'],
      count: 1,
      walletSetId,
      accountType: 'SCA',
    });
  } catch (apiErr) {
    // Surface Circle API error details
    const detail = apiErr.response?.data || apiErr.response?.statusText || apiErr.message;
    console.error('[CircleService] createWallets API error:', JSON.stringify(detail, null, 2));
    throw new Error(`Circle createWallets failed: ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`);
  }
  const wallets = response?.data?.wallets;
  if (!wallets || wallets.length === 0) {
    console.error('[CircleService] createWallets returned no wallets. Response:', JSON.stringify(response?.data, null, 2));
    throw new Error('Circle createWallets returned empty wallet list.');
  }
  const wallet = wallets[0];
  return {
    walletId: wallet.id,
    walletAddress: wallet.address,
    blockchain: wallet.blockchain,
  };
}

/**
 * Get wallet balance (USDC on Base).
 * @param {string} walletId - Circle wallet ID
 * @returns {number} USDC balance as a float
 */
async function getWalletBalance(walletId) {
  const c = getClient();
  const response = await c.getWalletTokenBalance({ id: walletId });
  const usdcBalance = response.data.tokenBalances?.find(
    t => t.token?.symbol === 'USDC'
  );
  return parseFloat(usdcBalance?.amount || '0');
}

/**
 * Transfer USDC between Circle wallets (internal — no gas cost visible to user).
 * Also used for external withdrawals since the API is the same.
 * @param {{ fromWalletId: string, toAddress: string, amount: number|string, idempotencyKey: string }} opts
 * @returns {{ transactionId: string, txHash: string|null, state: string }}
 */
async function transferUSDC({ fromWalletId, toAddress, amount, idempotencyKey }) {
  const c = getClient();
  const tokenAddress = process.env.USDC_BASE_TOKEN_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  let response;
  try {
    response = await c.createTransaction({
      walletId: fromWalletId,
      tokenAddress,
      destinationAddress: toAddress,
      amounts: [amount.toString()],
      fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
      idempotencyKey,
    });
  } catch (apiErr) {
    const detail = apiErr.response?.data || apiErr.response?.statusText || apiErr.message;
    console.error('[CircleService] createTransaction API error:', JSON.stringify(detail, null, 2));
    throw new Error(`Circle transfer failed: ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`);
  }
  return {
    transactionId: response.data?.id,
    txHash: response.data?.txHash || null,
    state: response.data?.state,
  };
}

/**
 * Get transaction status by ID.
 * @param {string} transactionId
 * @returns {object} Circle transaction data
 */
async function getTransaction(transactionId) {
  const c = getClient();
  const response = await c.getTransaction({ id: transactionId });
  return response.data;
}

/**
 * List transactions for a wallet.
 * @param {string} walletId
 * @returns {Array} List of transactions
 */
async function listTransactions(walletId) {
  const c = getClient();
  const response = await c.listTransactions({ walletIds: [walletId] });
  return response.data.transactions || [];
}

module.exports = {
  createUserWallet,
  getWalletBalance,
  transferUSDC,
  getTransaction,
  listTransactions,
};

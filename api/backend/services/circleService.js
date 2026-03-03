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
const crypto = require('crypto');

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

// Cache for USDC tokenId (resolved from wallet balance on first transfer)
let cachedUsdcTokenId = process.env.CIRCLE_USDC_TOKEN_ID || null;

/**
 * Convert an arbitrary string key into a deterministic UUID v5.
 * Circle requires idempotencyKey to be in UUID format.
 * Using a fixed namespace ensures the same input always produces the same UUID.
 */
const IRLWORK_UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace UUID
function toIdempotencyUUID(key) {
  // If already a valid UUID, return as-is
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    return key;
  }
  // Generate deterministic UUID v5 from the key string
  const hash = crypto.createHash('sha1').update(IRLWORK_UUID_NAMESPACE + key).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '5' + hash.substring(13, 16),  // version 5
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.substring(18, 20),
    hash.substring(20, 32),
  ].join('-');
}

/**
 * Resolve the Circle-internal tokenId for USDC by inspecting a wallet's token balances.
 * Caches the result so subsequent transfers don't need an extra API call.
 * @param {string} walletId - Any wallet ID in our wallet set
 * @returns {string} Circle tokenId for USDC
 */
async function resolveUsdcTokenId(walletId) {
  if (cachedUsdcTokenId) return cachedUsdcTokenId;

  const c = getClient();
  const response = await c.getWalletTokenBalance({ id: walletId });
  const usdcToken = response.data?.tokenBalances?.find(
    t => t.token?.symbol === 'USDC'
  );
  if (usdcToken?.token?.id) {
    cachedUsdcTokenId = usdcToken.token.id;
    console.log(`[CircleService] Resolved USDC tokenId: ${cachedUsdcTokenId}`);
    return cachedUsdcTokenId;
  }

  // Fallback: try tokenAddress + blockchain approach
  console.warn('[CircleService] Could not resolve USDC tokenId from wallet balance — wallet may have zero USDC. Falling back to tokenAddress + blockchain.');
  return null;
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
    // Use BASE-SEPOLIA for testnet API keys, BASE for live API keys
    const blockchain = process.env.CIRCLE_BLOCKCHAIN || 'BASE-SEPOLIA';
    response = await c.createWallets({
      blockchains: [blockchain],
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
 *
 * Uses tokenId (Circle's internal UUID) for the token, resolved dynamically from
 * the wallet's token balances. Falls back to tokenAddress + blockchain if the
 * wallet has never held USDC (tokenId unknown).
 *
 * @param {{ fromWalletId: string, toAddress: string, amount: number|string, idempotencyKey: string }} opts
 * @returns {{ transactionId: string, txHash: string|null, state: string }}
 */
async function transferUSDC({ fromWalletId, toAddress, amount, idempotencyKey }) {
  const c = getClient();

  // Validate required params before calling Circle API
  if (!fromWalletId) throw new Error('Missing fromWalletId — agent has no Circle wallet');
  if (!toAddress) throw new Error('Missing toAddress — CIRCLE_ESCROW_WALLET_ADDRESS not configured');
  if (!amount || parseFloat(amount) <= 0) throw new Error(`Invalid transfer amount: ${amount}`);

  // Circle requires idempotencyKey in UUID format — convert our string keys to deterministic UUIDs
  const uuidKey = toIdempotencyUUID(idempotencyKey || crypto.randomUUID());

  // Resolve USDC tokenId (preferred by Circle API — avoids tokenAddress/blockchain ambiguity)
  const tokenId = await resolveUsdcTokenId(fromWalletId);

  let txParams;
  if (tokenId) {
    // Primary path: use tokenId (matches Circle SDK example exactly)
    txParams = {
      walletId: fromWalletId,
      tokenId,
      destinationAddress: toAddress,
      amount: [String(amount)],
      fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
      idempotencyKey: uuidKey,
    };
  } else {
    // Fallback: use tokenAddress + blockchain (when tokenId unavailable)
    const blockchain = process.env.CIRCLE_BLOCKCHAIN || 'BASE-SEPOLIA';
    const tokenAddress = process.env.USDC_BASE_TOKEN_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    txParams = {
      walletId: fromWalletId,
      tokenAddress,
      blockchain,
      destinationAddress: toAddress,
      amount: [String(amount)],
      fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
      idempotencyKey: uuidKey,
    };
  }

  console.log('[CircleService] createTransaction params:', JSON.stringify({
    ...txParams,
    walletId: txParams.walletId?.slice(0, 8) + '...',
    tokenId: txParams.tokenId ? txParams.tokenId.slice(0, 8) + '...' : undefined,
  }));

  let response;
  try {
    response = await c.createTransaction(txParams);
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
  resolveUsdcTokenId,
};

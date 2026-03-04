const readline = require('readline');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function main() {
  // Dynamic import for ESM compatibility
  const {
    registerEntitySecretCiphertext,
    initiateDeveloperControlledWalletsClient,
  } = require('@circle-fin/developer-controlled-wallets');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Circle Programmable Wallets Setup          ║');
  console.log('║   irlwork — Base Sepolia Testnet             ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // --- API Key ---
  const apiKey = (await ask('1. Paste your Circle API key: ')).trim();
  if (!apiKey) { console.log('❌ API key is required.'); process.exit(1); }
  console.log('   ✅ API key received.\n');

  // --- Generate Entity Secret ---
  console.log('2. Generating Entity Secret...');
  let entitySecret = crypto.randomBytes(32).toString('hex');
  console.log('   ┌──────────────────────────────────────────────────────────────────┐');
  console.log(`   │ ${entitySecret} │`);
  console.log('   └──────────────────────────────────────────────────────────────────┘');
  console.log('   ⚠️  SAVE THIS NOW. Circle does not store it. You cannot retrieve it later.');
  console.log('   ⚠️  Store it in a password manager or secure location.\n');
  await ask('   Press Enter after you have saved the entity secret...');

  // --- Register Entity Secret ---
  console.log('\n3. Registering Entity Secret with Circle...');
  const recoveryPath = path.resolve(__dirname);
  try {
    await registerEntitySecretCiphertext({
      apiKey,
      entitySecret,
      recoveryFileDownloadPath: recoveryPath,
    });
    console.log('   ✅ Entity Secret registered.');
    console.log(`   📁 Recovery file saved: ${recoveryPath}`);
    console.log('   ⚠️  Store the recovery file securely (NOT in git).\n');
  } catch (err) {
    if (err.message?.includes('already registered') || err.response?.status === 409) {
      console.log('   ⚠️  Entity secret already registered. If you have your existing secret, enter it below.');
      const existing = (await ask('   Existing entity secret (or Ctrl+C to abort): ')).trim();
      if (!existing) process.exit(1);
      // Override for remaining steps
      entitySecret = existing;
    } else {
      console.error('   ❌ Registration failed:', err.message);
      if (err.response?.data) console.error('   ', JSON.stringify(err.response.data));
      process.exit(1);
    }
  }

  // --- Initialize SDK Client ---
  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  // --- Create Wallet Set ---
  console.log('4. Creating Wallet Set...');
  let walletSetId;
  try {
    const wsResponse = await client.createWalletSet({ name: 'irlwork-testnet' });
    walletSetId = wsResponse.data?.walletSet?.id;
    console.log(`   ✅ Wallet Set: ${walletSetId}\n`);
  } catch (err) {
    console.error('   ❌ Failed:', err.message);
    if (err.response?.data) console.error('   ', JSON.stringify(err.response.data));
    const fallback = (await ask('   Enter existing wallet set ID (or Ctrl+C): ')).trim();
    walletSetId = fallback;
  }

  // --- Create Escrow + Treasury Wallets ---
  console.log('5. Creating Escrow + Treasury wallets on Base Sepolia...');
  let escrow, treasury;
  try {
    const wResponse = await client.createWallets({
      blockchains: ['BASE-SEPOLIA'],
      count: 2,
      walletSetId,
      accountType: 'SCA',
      metadata: [
        { name: 'irlwork-escrow' },
        { name: 'irlwork-treasury' },
      ],
    });

    const wallets = wResponse.data?.wallets;
    escrow = wallets[0];
    treasury = wallets[1];

    console.log(`   ✅ Escrow Wallet:`);
    console.log(`      ID:      ${escrow.id}`);
    console.log(`      Address: ${escrow.address}`);
    console.log(`      Chain:   ${escrow.blockchain}`);
    console.log(`      Type:    ${escrow.accountType}\n`);

    console.log(`   ✅ Treasury Wallet:`);
    console.log(`      ID:      ${treasury.id}`);
    console.log(`      Address: ${treasury.address}`);
    console.log(`      Chain:   ${treasury.blockchain}`);
    console.log(`      Type:    ${treasury.accountType}\n`);
  } catch (err) {
    console.error('   ❌ Failed:', err.message);
    if (err.response?.data) console.error('   ', JSON.stringify(err.response.data));
    process.exit(1);
  }

  // --- Output Env Vars ---
  const envBlock = [
    '# ── Circle Programmable Wallets (Base Sepolia Testnet) ──',
    `CIRCLE_API_KEY=${apiKey}`,
    `CIRCLE_ENTITY_SECRET=${entitySecret}`,
    `CIRCLE_WALLET_SET_ID=${walletSetId}`,
    `CIRCLE_ESCROW_WALLET_ID=${escrow.id}`,
    `CIRCLE_ESCROW_WALLET_ADDRESS=${escrow.address}`,
    `CIRCLE_TREASURY_WALLET_ID=${treasury.id}`,
    `CIRCLE_TREASURY_WALLET_ADDRESS=${treasury.address}`,
    `USDC_BASE_TOKEN_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e`,
    '',
  ].join('\n');

  // Write to .env.circle for easy reference
  const envFilePath = path.resolve(__dirname, '..', '.env.circle');
  fs.writeFileSync(envFilePath, envBlock);

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   COPY THESE INTO YOUR .env FILE             ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log(envBlock);
  console.log(`Also saved to: ${envFilePath}\n`);

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   MANUAL STEPS REMAINING                     ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log('1. Copy the env vars above into your .env file\n');
  console.log('2. Enable Gas Station in the Circle console:');
  console.log('   → Go to console.circle.com → Gas Station');
  console.log('   → Enable for your wallet set on Base Sepolia');
  console.log('   → Fund it with test ETH from a Base Sepolia faucet\n');
  console.log('3. Create the webhook in the Circle console:');
  console.log('   → Go to console.circle.com → Webhooks → Create Webhook');
  console.log('   → URL: https://irlwork.ai/api/webhooks/circle');
  console.log('   → Name: irlwork-deposits');
  console.log('   → Toggle "Limit to specific events" ON → select "transactions"\n');
  console.log('4. Get test USDC from faucet.circle.com');
  console.log('   → Select Base Sepolia and paste a wallet address to fund\n');
  console.log('5. Add to .gitignore:');
  console.log('   scripts/circle_recovery_file.dat');
  console.log('   .env.circle\n');

  rl.close();
}

main().catch((err) => {
  console.error('\nSetup failed:', err);
  process.exit(1);
});

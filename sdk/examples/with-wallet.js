/**
 * Example with wallet integration for paid endpoints
 * This shows how to use the SDK with a Solana wallet for x402 payments
 *
 * NOTE: This is a conceptual example. In production, you'd use a real wallet
 * like Phantom, Solflare, or a programmatic wallet.
 */

import { OnChainLedger, PaymentRequiredError } from '../src/index.js';

// Mock wallet for demonstration
const mockWallet = {
  publicKey: {
    toBase58: () => 'YourWalletPublicKeyHere'
  },
  // In production, this would actually sign and send a transaction
  sendTransaction: async (transaction, connection) => {
    console.log('   [Wallet] Would send transaction to:', transaction);
    return 'mock_signature_' + Date.now();
  }
};

async function main() {
  console.log('=== OnChainLedger SDK - Wallet Integration Example ===\n');

  // Initialize with wallet for auto-payment
  const client = new OnChainLedger({
    wallet: mockWallet,
    onPaymentRequired: async (paymentInfo) => {
      const accept = paymentInfo.accepts[0];
      console.log('   [Payment Required]');
      console.log(`   Amount: ${accept.maxAmountRequired} lamports`);
      console.log(`   Pay to: ${accept.payTo}`);
    }
  });

  const tokenAddress = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

  // Example 1: Manual payment flow
  console.log('1. Manual payment flow:');
  console.log('   Step 1: Get payment info');

  try {
    await client.analyze(tokenAddress);
  } catch (error) {
    if (error instanceof PaymentRequiredError) {
      const accept = error.paymentInfo.accepts[0];
      console.log(`   Step 2: Send ${accept.maxAmountRequired} lamports to ${accept.payTo.slice(0, 8)}...`);
      console.log('   Step 3: Get transaction signature');
      console.log('   Step 4: Retry with X-Payment header\n');
    }
  }

  // Example 2: Pre-paid request (if you already have a signature)
  console.log('2. Pre-paid request (with existing signature):');
  console.log('   const result = await client.analyze(tokenAddress, "your_tx_signature");');
  console.log('   // Skips payment, goes directly to analysis\n');

  // Example 3: Trading bot decision flow
  console.log('3. Trading bot decision flow:');
  console.log('   ```');
  console.log('   async function shouldBuy(token) {');
  console.log('     const { safe, score, reason } = await client.isSafe(token, 70);');
  console.log('     if (!safe) {');
  console.log('       console.log("ABORT:", reason);');
  console.log('       return false;');
  console.log('     }');
  console.log('     return true;');
  console.log('   }');
  console.log('   ```\n');

  // Actually run the safety check (free)
  console.log('4. Running safety check (free):');
  const safety = await client.isSafe(tokenAddress);
  console.log(`   Token: ${tokenAddress.slice(0, 8)}...`);
  console.log(`   Safe: ${safety.safe}`);
  console.log(`   Score: ${safety.score}/100`);
  console.log(`   Reason: ${safety.reason}`);

  console.log('\n=== Done! ===');
}

main().catch(console.error);

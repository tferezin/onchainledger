/**
 * Basic usage example for @onchainledger/sdk
 * Free endpoints - no wallet required
 */

import { OnChainLedger } from '../src/index.js';

async function main() {
  // Initialize client (no wallet needed for free endpoints)
  const client = new OnChainLedger();

  console.log('=== OnChainLedger SDK Basic Example ===\n');

  // 1. Check API health
  console.log('1. Checking API health...');
  const health = await client.health();
  console.log(`   Status: ${health.status}`);
  console.log(`   Version: ${health.version}\n`);

  // 2. Get free trust score for BONK
  const bonkAddress = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
  console.log(`2. Getting trust score for BONK (${bonkAddress.slice(0, 8)}...)...`);

  const score = await client.getScore(bonkAddress);
  console.log(`   Token: ${score.symbol} (${score.name})`);
  console.log(`   Score: ${score.score}/100`);
  console.log(`   Grade: ${score.grade}`);
  console.log(`   Verdict: ${score.verdict}\n`);

  // 3. Use convenience method to check if safe
  console.log('3. Quick safety check...');
  const safety = await client.isSafe(bonkAddress, 70);
  console.log(`   Safe to trade: ${safety.safe ? 'YES' : 'NO'}`);
  console.log(`   Reason: ${safety.reason}\n`);

  // 4. Get payment info for full analysis (without paying)
  console.log('4. Getting payment info for full analysis...');
  try {
    const paymentInfo = await client.getPaymentInfo('analyze', { token: bonkAddress });
    const accept = paymentInfo.accepts[0];
    console.log(`   Cost: ${accept.extra.priceUSD} USD`);
    console.log(`   Pay to: ${accept.payTo.slice(0, 8)}...`);
    console.log(`   Network: ${accept.network}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  console.log('=== Done! ===');
}

main().catch(console.error);

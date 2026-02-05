/**
 * Batch analysis example for @onchainledger/sdk
 * Shows how to analyze multiple tokens and compare them
 */

import { OnChainLedger, PaymentRequiredError } from '../src/index.js';

const TOKENS = {
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  SOL: 'So11111111111111111111111111111111111111112',
  POPCAT: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr'
};

async function main() {
  const client = new OnChainLedger();

  console.log('=== OnChainLedger SDK Batch Example ===\n');

  // Get free scores for multiple tokens
  console.log('Getting free scores for multiple tokens...\n');

  const results = [];
  for (const [name, address] of Object.entries(TOKENS)) {
    try {
      const score = await client.getScore(address);
      results.push({ name, ...score });
      console.log(`${name.padEnd(8)} | Score: ${score.score.toString().padStart(3)} | Grade: ${score.grade}`);
    } catch (error) {
      console.log(`${name.padEnd(8)} | Error: ${error.message}`);
    }
  }

  console.log('\n--- Summary ---');

  // Find safest and riskiest
  const sorted = results.sort((a, b) => b.score - a.score);
  console.log(`Safest:   ${sorted[0].name} (${sorted[0].score}/100)`);
  console.log(`Riskiest: ${sorted[sorted.length - 1].name} (${sorted[sorted.length - 1].score}/100)`);

  // Show batch pricing
  console.log('\n--- Batch Analysis Pricing ---');
  try {
    const batchInfo = await client.getPaymentInfo('batch', {
      tokens: Object.values(TOKENS)
    });
    const accept = batchInfo.accepts[0];
    console.log(`Tokens: ${accept.extra.tokenCount}`);
    console.log(`Per Token: $${accept.extra.pricePerToken}`);
    console.log(`Discount: ${accept.extra.discount}`);
    console.log(`Total: $${accept.extra.totalPriceUSD}`);
  } catch (error) {
    if (error instanceof PaymentRequiredError) {
      const accept = error.paymentInfo.accepts[0];
      console.log(`Tokens: ${accept.extra.tokenCount}`);
      console.log(`Per Token: $${accept.extra.pricePerToken}`);
      console.log(`Discount: ${accept.extra.discount}`);
      console.log(`Total: $${accept.extra.totalPriceUSD}`);
    }
  }

  console.log('\n=== Done! ===');
}

main().catch(console.error);

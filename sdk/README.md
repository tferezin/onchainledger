# @onchainledger/sdk

Official SDK for **OnChainLedger** Token Intelligence API - Solana token security analysis.

[![npm version](https://badge.fury.io/js/@onchainledger%2Fsdk.svg)](https://www.npmjs.com/package/@onchainledger/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Free Score Check** - Get basic trust score without payment
- **Full Analysis** - Detailed breakdown with 10 specialized analyzers
- **Batch Analysis** - Analyze multiple tokens with volume discounts
- **Token Comparison** - Side-by-side comparison with AI recommendations
- **TypeScript Support** - Full type definitions included
- **x402 Payment Protocol** - Automatic payment handling

## Installation

```bash
npm install @onchainledger/sdk
```

## Quick Start

```javascript
import { OnChainLedger } from '@onchainledger/sdk';

// Initialize client (no wallet needed for free endpoints)
const client = new OnChainLedger();

// Get free trust score
const score = await client.getScore('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
console.log(`Score: ${score.score}/100 (${score.grade})`);
// Output: Score: 88/100 (A)
```

## API Reference

### Free Endpoints

#### `getScore(tokenAddress)`

Get basic trust score without payment.

```javascript
const score = await client.getScore('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
// Returns: { token, symbol, score, grade, verdict, message }
```

#### `health()`

Check API health status.

```javascript
const health = await client.health();
// Returns: { status: 'ok', version: '1.0.0', config: {...} }
```

#### `isSafe(tokenAddress, minScore?)`

Convenience method to check if a token meets safety threshold.

```javascript
const safety = await client.isSafe('DezXAZ...', 70);
// Returns: { safe: true, score: 88, grade: 'A', reason: '...' }
```

### Paid Endpoints (x402)

#### `analyze(tokenAddress, paymentSignature?)`

Get full token analysis with detailed breakdown.

```javascript
// With pre-paid signature
const result = await client.analyze('DezXAZ...', 'your_tx_signature');

// Or handle payment automatically (requires wallet)
const result = await client.analyze('DezXAZ...');
```

#### `analyzeBatch(tokenAddresses, paymentSignature?)`

Analyze multiple tokens with volume discounts.

```javascript
const batch = await client.analyzeBatch([
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
], 'your_tx_signature');
// Returns: { results, summary: { safest, riskiest }, pricing }
```

**Volume Discounts:**
- 1 token: $0.01 (no discount)
- 2-5 tokens: $0.008 each (20% off)
- 6-10 tokens: $0.007 each (30% off)
- 11+ tokens: $0.006 each (40% off)

#### `compare(tokenAddresses, paymentSignature?)`

Compare 2-5 tokens side-by-side.

```javascript
const comparison = await client.compare([
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr'
], 'your_tx_signature');
// Returns: { comparison, winner, recommendation }
```

### Payment Handling

#### Getting Payment Info

```javascript
const paymentInfo = await client.getPaymentInfo('analyze', { token: 'DezXAZ...' });
console.log(`Pay ${paymentInfo.accepts[0].maxAmountRequired} lamports`);
console.log(`To: ${paymentInfo.accepts[0].payTo}`);
```

#### With Wallet (Auto-payment)

```javascript
import { OnChainLedger } from '@onchainledger/sdk';

const client = new OnChainLedger({
  wallet: myPhantomWallet,
  onPaymentRequired: async (info) => {
    console.log('Payment required:', info);
  }
});

// Will automatically send payment and retry
const result = await client.analyze('DezXAZ...');
```

## Error Handling

```javascript
import { OnChainLedger, PaymentRequiredError, OnChainLedgerError } from '@onchainledger/sdk';

try {
  const result = await client.analyze('DezXAZ...');
} catch (error) {
  if (error instanceof PaymentRequiredError) {
    // Handle payment
    console.log('Pay to:', error.paymentInfo.accepts[0].payTo);
  } else if (error instanceof OnChainLedgerError) {
    console.log('API Error:', error.message, error.statusCode);
  }
}
```

## TypeScript

Full TypeScript support with type definitions:

```typescript
import { OnChainLedger, ScoreResponse, AnalysisResponse } from '@onchainledger/sdk';

const client = new OnChainLedger();
const score: ScoreResponse = await client.getScore('DezXAZ...');
```

## Trading Bot Example

```javascript
import { OnChainLedger } from '@onchainledger/sdk';

class TradingBot {
  constructor() {
    this.ledger = new OnChainLedger();
  }

  async shouldBuy(tokenAddress) {
    const { safe, score, reason } = await this.ledger.isSafe(tokenAddress, 70);

    if (!safe) {
      console.log(`SKIP: ${reason}`);
      return false;
    }

    console.log(`BUY: Score ${score}/100 - ${reason}`);
    return true;
  }
}

const bot = new TradingBot();
const shouldBuy = await bot.shouldBuy('DezXAZ...');
```

## Links

- **API Documentation**: https://onchainledger-production.up.railway.app/docs
- **Live Demo**: https://onchainledger-production.up.railway.app
- **GitHub**: https://github.com/tferezin/onchainledger

## License

MIT

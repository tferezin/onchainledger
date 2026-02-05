# OnChainLedger

**Token Intelligence API for Solana** - Detect scams, honeypots, and rug pulls before you trade.

[![Live API](https://img.shields.io/badge/Live%20API-Railway-green)](https://onchainledger-production.up.railway.app)
[![API Docs](https://img.shields.io/badge/API%20Docs-Swagger-blue)](https://onchainledger-production.up.railway.app/docs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **10 Specialized Analyzers** - Authority, Holders, Liquidity, Honeypot, Token-2022, LP Lock, Insider, Wallet Clusters, Price History, Age
- **TrustScore 0-100** - Composite score with letter grades (A+ to F)
- **x402 Micropayments** - Pay-per-request with SOL, no API keys needed
- **Free Score Endpoint** - Basic score check without payment
- **Batch Analysis** - Analyze multiple tokens with volume discounts
- **Token Comparison** - Side-by-side analysis with AI recommendations
- **SDK** - Official npm package for easy integration
- **Telegram Bot** - Check scores directly from Telegram

## Quick Start

```bash
# Free score check (no payment required)
curl https://onchainledger-production.up.railway.app/score/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263

# Response:
# {
#   "token": "DezXAZ8z7...",
#   "symbol": "BONK",
#   "score": 88,
#   "grade": "A",
#   "verdict": "HIGH CONFIDENCE"
# }
```

## Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | Free | Health check |
| `/score/:token` | GET | Free | Basic trust score |
| `/docs` | GET | Free | Swagger UI documentation |
| `/analyze/:token` | POST | x402 | Full analysis with breakdown |
| `/analyze/batch` | POST | x402 | Batch analysis (volume discounts) |
| `/compare` | POST | x402 | Token comparison |

## Pricing

| Endpoint | Price | Notes |
|----------|-------|-------|
| `/score` | Free | 10 req/min rate limit |
| `/analyze` | $0.01 | Full breakdown |
| `/analyze/batch` | $0.006-0.01 | Volume discounts up to 40% |
| `/compare` | $0.015 | Includes AI recommendation |

## SDK Installation

```bash
npm install @onchainledger/sdk
```

```javascript
import { OnChainLedger } from '@onchainledger/sdk';

const client = new OnChainLedger();

// Free score check
const score = await client.getScore('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
console.log(`Score: ${score.score}/100 (${score.grade})`);

// Safety check
const { safe, reason } = await client.isSafe('DezXAZ...', 70);
if (!safe) console.log('AVOID:', reason);
```

## Telegram Bot

Commands:
- `/score <token>` - Get free trust score
- `/compare <token1> <token2>` - Compare two tokens
- `/help` - Show all commands

Supports token symbols: BONK, USDC, SOL, USDT, RAY, JUP, POPCAT, WIF

## Local Development

```bash
# Clone and install
git clone https://github.com/tferezin/onchainledger.git
cd onchainledger
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev

# Server runs at http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `HELIUS_API_KEY` | Yes | Helius API key |
| `BIRDEYE_API_KEY` | Yes | Birdeye API key |
| `X402_WALLET_ADDRESS` | No | Wallet for x402 payments |
| `BASE_URL` | No | Production URL |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token |

## Grade Scale

| Score | Grade | Verdict | Recommendation |
|-------|-------|---------|----------------|
| 90-100 | A+ | VERY HIGH CONFIDENCE | Safe to trade |
| 80-89 | A | HIGH CONFIDENCE | Low risk |
| 70-79 | B | MODERATE CONFIDENCE | Some risks |
| 50-69 | C | LOW CONFIDENCE | Trade carefully |
| 25-49 | D | VERY LOW CONFIDENCE | High risk |
| 0-24 | F | LIKELY SCAM | Avoid |

## Risk Detection

| Analyzer | What It Detects |
|----------|-----------------|
| Authority | Mint/freeze authorities that can manipulate supply |
| Holders | Whale concentration, coordinated wallets |
| Liquidity | Low TVL, thin order books |
| Honeypot | Tokens you can buy but cannot sell |
| Token-2022 | Dangerous extensions (permanent delegate, etc.) |
| LP Lock | Unlocked liquidity (rug pull risk) |
| Insider | Creator sniping, bundled transactions |
| Clusters | Multiple wallets controlled by same entity |
| Price | Pump & dump patterns, volume anomalies |
| Age | New token risk factor |

## Links

- **Live API**: https://onchainledger-production.up.railway.app
- **API Docs**: https://onchainledger-production.up.railway.app/docs
- **GitHub**: https://github.com/tferezin/onchainledger

## License

MIT

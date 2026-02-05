# OnChainLedger

Solana token intelligence API for AI trading agents. Get TrustScore analysis before executing trades.

## Endpoint

POST https://onchainledger-production.up.railway.app/analyze/{tokenAddress}

## Payment

- Protocol: x402 micropayments
- Cost: $0.01 USDC per analysis
- Network: Solana

## What It Does

Analyzes any Solana token and returns a TrustScore (0-100) with detailed risk breakdown:
- Authority Check (mint/freeze/update)
- Holder Analysis (concentration, clusters)
- Liquidity Analysis (TVL, LP lock)
- Honeypot Detection (sell simulation)
- Token-2022 Detection (dangerous extensions)
- Insider Detection (bundle transactions)

## Grade Scale

| Score | Grade | Verdict |
|-------|-------|---------|
| 90-100 | A+ | VERY HIGH CONFIDENCE |
| 80-89 | A | HIGH CONFIDENCE |
| 70-79 | B | MODERATE CONFIDENCE |
| 50-69 | C | LOW CONFIDENCE |
| 25-49 | D | VERY LOW CONFIDENCE |
| 0-24 | F | LIKELY SCAM |

## Example

POST /analyze/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263

Returns TrustScore JSON with risk factors and recommendations.

Built for Solana Agent Hackathon 2025

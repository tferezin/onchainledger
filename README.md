# OnChainLedger

Solana token intelligence API that returns TrustScore analysis.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev
```

## Endpoints

- `GET /health` - Health check
- `POST /analyze/:tokenAddress` - Analyze token and return TrustScore

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HELIUS_API_KEY` - Helius API key
- `BIRDEYE_API_KEY` - Birdeye API key

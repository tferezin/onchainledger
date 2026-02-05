# OnChainLedger

> Token intelligence API for Solana. Get TrustScore analysis before executing trades.

**Live API:** https://onchainledger-production.up.railway.app

---

## Quick Start

```bash
# FREE: Get basic trust score (no payment required)
curl https://onchainledger-production.up.railway.app/score/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263

# PAID: Get full analysis (x402 payment required)
curl -X POST https://onchainledger-production.up.railway.app/analyze/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263 \
  -H "X-Payment: YOUR_TX_SIGNATURE"
```

---

## Endpoints

| Method | Path | Auth | Price | Description |
|--------|------|------|-------|-------------|
| `GET` | `/health` | Free | - | Health check |
| `GET` | `/score/{token}` | Free | - | Basic trust score (rate limited) |
| `GET` | `/docs` | Free | - | Swagger UI documentation |
| `POST` | `/analyze/{token}` | x402 | $0.01 | Full analysis with breakdown |
| `POST` | `/analyze/batch` | x402 | $0.006-0.01 | Batch analysis (volume discounts) |
| `POST` | `/compare` | x402 | $0.015 | Token comparison with AI recommendation |

### Free Score Endpoint (Teaser)

The free `/score` endpoint returns a **teaser preview** - showing grade and risk level but hiding the exact score to encourage paid upgrades.

```bash
GET /score/{tokenAddress}

# Response (TEASER - exact score hidden):
{
  "token": {
    "address": "DezXAZ8z7...",
    "symbol": "BONK",
    "name": "Bonk"
  },
  "preview": {
    "grade": "A",
    "riskLevel": "LOW",
    "tradeable": true,
    "flagsDetected": 1
  },
  "teaser": {
    "scoreRange": "80-89",
    "message": "This token scored in the A range with LOW risk level. We detected 1 potential flag.",
    "unlock": "Get exact score (XX/100), full breakdown, and detailed risk analysis for $0.01"
  },
  "upgrade": {
    "endpoint": "POST /analyze/DezXAZ8z7...",
    "price": "$0.01",
    "protocol": "x402",
    "docs": "/docs"
  }
}
```

**What's FREE:** Grade (A+, A, B, C, D, F), risk level (LOW/MEDIUM/HIGH/CRITICAL), tradeable status, flags count
**What's PAID:** Exact score (XX/100), full breakdown, risk factors, positive indicators

### Batch Analysis

```bash
POST /analyze/batch
Content-Type: application/json
X-Payment: <transaction_signature>

{
  "tokens": [
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  ]
}

# Volume Discounts:
# 1 token: $0.01 (no discount)
# 2-5 tokens: $0.008 (20% off)
# 6-10 tokens: $0.007 (30% off)
# 11+ tokens: $0.006 (40% off)
```

### Token Comparison (Free Teaser / Paid Full)

The `/compare` endpoint supports **dual mode** - free teaser or paid full response.

```bash
# FREE TEASER (no X-Payment header)
POST /compare
Content-Type: application/json

{
  "tokens": ["token1_address", "token2_address"]
}

# FREE Response (scores hidden):
{
  "comparison": [
    { "token": { "address": "...", "symbol": "BONK" }, "grade": "A", "riskLevel": "LOW", "score": "??/100" },
    { "token": { "address": "...", "symbol": "WIF" }, "grade": "B", "riskLevel": "MEDIUM", "score": "??/100" }
  ],
  "preview": {
    "saferChoice": "BONK",
    "gradeDifference": "A vs B",
    "message": "BONK appears safer based on grade comparison"
  },
  "upgrade": { "price": "$0.015", "protocol": "x402" }
}

# PAID FULL (with X-Payment header)
POST /compare
Content-Type: application/json
X-Payment: <transaction_signature>

# PAID Response:
{
  "comparison": [
    { "token": "BONK", "score": 85, "grade": "A", "strengths": [...], "weaknesses": [...] },
    { "token": "WIF", "score": 72, "grade": "B", "strengths": [...], "weaknesses": [...] }
  ],
  "winner": { "token": "BONK", "score": 85, "reason": "..." },
  "recommendation": "BONK is notably safer with a 13 point advantage..."
}
```

### Request

```
POST /analyze/{tokenAddress}
Headers:
  X-Payment: <solana_transaction_signature>
  Content-Type: application/json
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenAddress` | string | Yes | Solana token mint address (32-44 chars, base58) |

---

## Payment Protocol (x402)

OnChainLedger uses the **x402 micropayment protocol** for pay-per-request billing.

### How It Works

1. **Request without payment** → Returns `402 Payment Required` with payment instructions
2. **Send SOL payment** to the specified wallet
3. **Retry with transaction signature** in `X-Payment` header
4. **Receive TrustScore** analysis

### Payment Details

| Field | Value |
|-------|-------|
| **Cost** | $0.01 USD (~10,000 lamports) |
| **Network** | Solana Mainnet |
| **Currency** | SOL |
| **Wallet** | Returned in 402 response |

### 402 Response Format

```json
{
  "error": "Payment Required",
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "solana-mainnet",
    "maxAmountRequired": "10000",
    "payTo": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "resource": "/analyze/{token}",
    "description": "OnChainLedger Token Analysis"
  }]
}
```

---

## Response Schema

### Success Response (200 OK)

```json
{
  "token": {
    "address": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "symbol": "Bonk",
    "name": "Bonk",
    "decimals": 5,
    "supply": "93526183939234.12345"
  },
  "trustScore": {
    "score": 88,
    "grade": "A",
    "verdict": "HIGH CONFIDENCE"
  },
  "breakdown": {
    "authority": {
      "score": 100,
      "weighted": 20,
      "details": {
        "mintAuthority": null,
        "freezeAuthority": null,
        "updateAuthority": null
      }
    },
    "holders": {
      "score": 85,
      "weighted": 13,
      "details": {
        "totalHolders": 850000,
        "top10Percentage": 15.2,
        "giniCoefficient": 0.72
      }
    },
    "liquidity": {
      "score": 100,
      "weighted": 12,
      "details": {
        "totalLiquidityUSD": 45000000,
        "pools": 12
      }
    },
    "honeypot": {
      "score": 100,
      "weighted": 8,
      "details": {
        "canSell": true,
        "sellTax": 0,
        "buyTax": 0
      }
    },
    "token2022": {
      "score": 100,
      "weighted": 10,
      "details": {
        "isToken2022": false,
        "extensions": []
      }
    },
    "lpLock": {
      "score": 80,
      "weighted": 4,
      "details": {
        "locked": true,
        "lockPercentage": 80,
        "unlockDate": "2025-12-31T00:00:00Z"
      }
    },
    "insider": {
      "score": 90,
      "weighted": 9,
      "details": {
        "bundledTxCount": 0,
        "creatorSniped": false
      }
    },
    "walletCluster": {
      "score": 85,
      "weighted": 7,
      "details": {
        "clustersFound": 2,
        "clusterHoldingPercentage": 3.5
      }
    },
    "priceHistory": {
      "score": 75,
      "weighted": 5,
      "details": {
        "volatility": "medium",
        "pumpDumpDetected": false
      }
    },
    "age": {
      "score": 100,
      "weighted": 5,
      "details": {
        "createdAt": "2022-12-25T00:00:00Z",
        "ageInDays": 760
      }
    }
  },
  "riskFactors": [
    "Top 10 holders control 15.2% of supply"
  ],
  "positiveFactors": [
    "All authorities revoked",
    "High liquidity ($45M+)",
    "No honeypot detected",
    "LP partially locked",
    "Established token (760+ days)"
  ],
  "metadata": {
    "analyzedAt": "2025-02-04T12:00:00.000Z",
    "cacheExpires": "2025-02-04T12:05:00.000Z",
    "version": "1.0.0"
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `trustScore.score` | integer | 0-100 composite score |
| `trustScore.grade` | string | Letter grade (A+, A, B, C, D, F) |
| `trustScore.verdict` | string | Human-readable verdict |
| `breakdown.*` | object | Individual analyzer scores and details |
| `riskFactors` | array | List of identified risks |
| `positiveFactors` | array | List of positive indicators |

---

## Grade Scale

| Score | Grade | Verdict | Recommendation |
|-------|-------|---------|----------------|
| 90-100 | A+ | VERY HIGH CONFIDENCE | Generally safe to trade |
| 80-89 | A | HIGH CONFIDENCE | Low risk, proceed with caution |
| 70-79 | B | MODERATE CONFIDENCE | Some risks present, research more |
| 50-69 | C | LOW CONFIDENCE | Significant risks, trade carefully |
| 25-49 | D | VERY LOW CONFIDENCE | High risk, likely to lose money |
| 0-24 | F | LIKELY SCAM | Avoid - high probability of scam |

---

## Risk Detection

### What We Analyze

| Check | Risk Type | What It Detects |
|-------|-----------|-----------------|
| **Authority** | Rug Pull | Mint/freeze/update authorities that allow supply manipulation |
| **Holders** | Dump Risk | Whale concentration, coordinated wallets |
| **Liquidity** | Exit Risk | Low TVL, thin order books |
| **Honeypot** | Total Loss | Tokens you can buy but cannot sell |
| **Token-2022** | Hidden Risk | Dangerous extensions (permanent delegate, transfer hooks) |
| **LP Lock** | Rug Pull | Unlocked liquidity that can be pulled |
| **Insider** | Manipulation | Creator sniping, bundled launch transactions |
| **Clusters** | Coordination | Multiple wallets controlled by same entity |
| **Price** | Pump & Dump | Artificial price manipulation patterns |
| **Age** | Newness Risk | New tokens carry higher risk |

---

## Error Responses

| Code | Error | Description |
|------|-------|-------------|
| `400` | Bad Request | Invalid token address format |
| `402` | Payment Required | No payment or invalid payment |
| `404` | Not Found | Token not found on Solana |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Error | Server error, retry later |
| `504` | Gateway Timeout | Analysis timed out |

### Error Response Format

```json
{
  "error": "Bad Request",
  "message": "Invalid Solana address format",
  "details": [{
    "field": "tokenAddress",
    "message": "Token address must be 32-44 characters"
  }]
}
```

---

## Integration Examples

### Python

```python
import requests

def analyze_token(token_address: str, payment_sig: str) -> dict:
    """Analyze a Solana token and return TrustScore."""
    response = requests.post(
        f"https://onchainledger-production.up.railway.app/analyze/{token_address}",
        headers={"X-Payment": payment_sig}
    )

    if response.status_code == 402:
        return {"error": "Payment required", "payment_info": response.json()}

    response.raise_for_status()
    return response.json()

# Usage
result = analyze_token(
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "your_transaction_signature"
)

if result["trustScore"]["score"] >= 70:
    print(f"Token is {result['trustScore']['grade']} rated - relatively safe")
else:
    print(f"WARNING: Token scored {result['trustScore']['score']} - {result['riskFactors']}")
```

### JavaScript/TypeScript

```typescript
async function analyzeToken(tokenAddress: string, paymentSig: string) {
  const response = await fetch(
    `https://onchainledger-production.up.railway.app/analyze/${tokenAddress}`,
    {
      method: 'POST',
      headers: { 'X-Payment': paymentSig }
    }
  );

  if (response.status === 402) {
    const paymentInfo = await response.json();
    throw new Error(`Payment required: send ${paymentInfo.accepts[0].maxAmountRequired} lamports to ${paymentInfo.accepts[0].payTo}`);
  }

  return response.json();
}

// Usage with trading bot
const result = await analyzeToken(tokenAddress, txSignature);

if (result.trustScore.score < 50) {
  console.log("ABORT: Token failed safety check");
  return;
}

// Proceed with trade...
```

### LangChain Tool

```python
from langchain.tools import BaseTool
from pydantic import BaseModel, Field

class TokenAnalysisInput(BaseModel):
    token_address: str = Field(description="Solana token mint address")
    payment_signature: str = Field(description="Payment transaction signature")

class OnChainLedgerTool(BaseTool):
    name = "onchainledger"
    description = """
    Analyze a Solana token before trading. Returns a TrustScore (0-100)
    indicating how safe the token is. Use this BEFORE executing any trade
    to avoid scams, honeypots, and rug pulls.
    """
    args_schema = TokenAnalysisInput

    def _run(self, token_address: str, payment_signature: str) -> str:
        import requests

        response = requests.post(
            f"https://onchainledger-production.up.railway.app/analyze/{token_address}",
            headers={"X-Payment": payment_signature}
        )

        data = response.json()

        return f"""
        Token: {data['token']['symbol']} ({data['token']['name']})
        TrustScore: {data['trustScore']['score']}/100 (Grade: {data['trustScore']['grade']})
        Verdict: {data['trustScore']['verdict']}

        Risks: {', '.join(data['riskFactors']) or 'None detected'}
        Positives: {', '.join(data['positiveFactors'][:3])}

        Recommendation: {'SAFE TO TRADE' if data['trustScore']['score'] >= 70 else 'CAUTION ADVISED' if data['trustScore']['score'] >= 50 else 'AVOID'}
        """
```

### Autonomous Agent Integration

```python
class TradingAgent:
    def __init__(self, wallet, onchainledger_payment_wallet):
        self.wallet = wallet
        self.ledger_wallet = onchainledger_payment_wallet

    async def should_trade(self, token_address: str) -> tuple[bool, str]:
        """Check if token is safe to trade using OnChainLedger."""

        # 1. Send micropayment
        payment_tx = await self.wallet.transfer(
            to=self.ledger_wallet,
            amount=10000  # lamports
        )

        # 2. Analyze token
        result = await self.analyze(token_address, payment_tx.signature)

        # 3. Decision logic
        score = result["trustScore"]["score"]

        if score >= 80:
            return True, f"High confidence ({score}/100)"
        elif score >= 60:
            return True, f"Moderate confidence ({score}/100) - smaller position recommended"
        else:
            risks = ", ".join(result["riskFactors"][:2])
            return False, f"Low score ({score}/100): {risks}"
```

---

## Rate Limits

| Tier | Requests/min | Requests/day |
|------|--------------|--------------|
| Standard | 60 | 10,000 |
| Enterprise | Custom | Custom |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Max requests per window
- `X-RateLimit-Remaining`: Remaining requests

---

## Caching

Results are cached for **5 minutes** to ensure fast responses while maintaining data freshness.

| Field | Description |
|-------|-------------|
| `metadata.analyzedAt` | When analysis was performed |
| `metadata.cacheExpires` | When cache expires |

---

## Security

- **Input Validation**: All inputs are validated (base58, length, patterns)
- **Rate Limiting**: Protection against abuse
- **HTTPS Only**: All traffic encrypted
- **No API Keys**: Pay-per-request model, no credentials to leak

---

## Support

- **API Status**: Check `/health` endpoint
- **Response Time**: < 3 seconds typical
- **Uptime**: 99.9% target

---

## Changelog

### v1.0.0 (2025-02)
- Initial release
- 10 specialized analyzers
- x402 micropayment support
- Full TrustScore breakdown

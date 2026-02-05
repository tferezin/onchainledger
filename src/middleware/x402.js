/**
 * x402 Payment Middleware for OnChainLedger
 * Implements HTTP 402 Payment Required protocol
 */

const X402_VERSION = 1;
const PRICE_LAMPORTS = "10000"; // 0.00001 SOL per request

export function createX402Middleware(options = {}) {
  const walletAddress = options.walletAddress || process.env.X402_WALLET_ADDRESS;
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'https://onchainledger-production.up.railway.app';
  const enabled = options.enabled !== false && walletAddress;

  return function x402Middleware(req, res, next) {
    // Skip if x402 is disabled or no wallet configured
    if (!enabled) {
      return next();
    }

    // Check for payment header
    const paymentHeader = req.headers['x-payment'];

    if (!paymentHeader) {
      // No payment provided - return 402 with payment requirements
      return res.status(402).json({
        error: "Payment Required",
        x402Version: X402_VERSION,
        accepts: [
          {
            scheme: "exact",
            network: "solana-mainnet",
            maxAmountRequired: PRICE_LAMPORTS,
            resource: `${baseUrl}${req.originalUrl}`,
            payTo: walletAddress,
            description: "OnChainLedger Token TrustScore Analysis",
            mimeType: "application/json",
            paymentMethods: ["solana-pay", "wallet-connect"],
            extra: {
              tokenAddress: req.params.tokenAddress,
              priceUSD: "0.001",
              currency: "SOL"
            }
          }
        ],
        message: "Payment required to access token analysis. Send SOL to the specified address and include the transaction signature in the X-Payment header."
      });
    }

    // Payment header provided - verify it
    try {
      const payment = parsePaymentHeader(paymentHeader);

      // For hackathon demo, we'll do basic validation
      // In production, you'd verify the transaction on-chain
      if (payment.signature && payment.signature.length >= 64) {
        // Store payment info for logging
        req.x402Payment = payment;
        return next();
      }

      return res.status(402).json({
        error: "Invalid Payment",
        message: "Payment signature is invalid or transaction not confirmed",
        x402Version: X402_VERSION
      });

    } catch (error) {
      return res.status(402).json({
        error: "Payment Processing Error",
        message: error.message,
        x402Version: X402_VERSION
      });
    }
  };
}

function parsePaymentHeader(header) {
  // Payment header format: "signature:TRANSACTION_SIGNATURE" or JSON
  if (header.startsWith('{')) {
    return JSON.parse(header);
  }

  // Simple format: just the signature
  if (header.includes(':')) {
    const [type, value] = header.split(':');
    return { type, signature: value };
  }

  return { signature: header };
}

// Batch pricing calculator
function calculateBatchPricing(tokenCount) {
  let pricePerToken;
  let discount;

  if (tokenCount === 1) {
    pricePerToken = 0.01;
    discount = '0%';
  } else if (tokenCount <= 5) {
    pricePerToken = 0.008;
    discount = '20%';
  } else if (tokenCount <= 10) {
    pricePerToken = 0.007;
    discount = '30%';
  } else {
    pricePerToken = 0.006;
    discount = '40%';
  }

  const totalPrice = pricePerToken * tokenCount;
  const lamports = Math.round(totalPrice * 1000000000); // Convert to lamports (SOL * 10^9)

  return {
    perToken: pricePerToken,
    total: parseFloat(totalPrice.toFixed(4)),
    discount,
    lamports: lamports.toString()
  };
}

// x402 middleware for batch requests with dynamic pricing
export function createBatchX402Middleware(options = {}) {
  const walletAddress = options.walletAddress || process.env.X402_WALLET_ADDRESS;
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'https://onchainledger-production.up.railway.app';
  const enabled = options.enabled !== false && walletAddress;

  return function batchX402Middleware(req, res, next) {
    if (!enabled) {
      return next();
    }

    const paymentHeader = req.headers['x-payment'];

    if (!paymentHeader) {
      // Calculate pricing based on token count
      const tokens = req.body?.tokens || [];
      const tokenCount = Math.min(Math.max(tokens.length, 1), 20);
      const pricing = calculateBatchPricing(tokenCount);

      return res.status(402).json({
        error: "Payment Required",
        x402Version: X402_VERSION,
        accepts: [
          {
            scheme: "exact",
            network: "solana-mainnet",
            maxAmountRequired: pricing.lamports,
            resource: `${baseUrl}/analyze/batch`,
            payTo: walletAddress,
            description: `OnChainLedger Batch Analysis (${tokenCount} tokens)`,
            mimeType: "application/json",
            paymentMethods: ["solana-pay", "wallet-connect"],
            extra: {
              tokenCount,
              pricePerToken: pricing.perToken,
              totalPriceUSD: pricing.total,
              discount: pricing.discount,
              currency: "SOL"
            }
          }
        ],
        message: `Batch analysis for ${tokenCount} tokens. ${pricing.discount} discount applied. Total: $${pricing.total}`
      });
    }

    try {
      const payment = parsePaymentHeader(paymentHeader);

      if (payment.signature && payment.signature.length >= 64) {
        req.x402Payment = payment;
        return next();
      }

      return res.status(402).json({
        error: "Invalid Payment",
        message: "Payment signature is invalid or transaction not confirmed",
        x402Version: X402_VERSION
      });
    } catch (error) {
      return res.status(402).json({
        error: "Payment Processing Error",
        message: error.message,
        x402Version: X402_VERSION
      });
    }
  };
}

// x402 middleware for compare endpoint
export function createCompareX402Middleware(options = {}) {
  const walletAddress = options.walletAddress || process.env.X402_WALLET_ADDRESS;
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'https://onchainledger-production.up.railway.app';
  const enabled = options.enabled !== false && walletAddress;
  const COMPARE_PRICE_LAMPORTS = "15000"; // $0.015 for comparison

  return function compareX402Middleware(req, res, next) {
    if (!enabled) {
      return next();
    }

    const paymentHeader = req.headers['x-payment'];

    if (!paymentHeader) {
      const tokens = req.body?.tokens || [];

      return res.status(402).json({
        error: "Payment Required",
        x402Version: X402_VERSION,
        accepts: [
          {
            scheme: "exact",
            network: "solana-mainnet",
            maxAmountRequired: COMPARE_PRICE_LAMPORTS,
            resource: `${baseUrl}/compare`,
            payTo: walletAddress,
            description: `OnChainLedger Token Comparison (${tokens.length} tokens)`,
            mimeType: "application/json",
            paymentMethods: ["solana-pay", "wallet-connect"],
            extra: {
              tokenCount: tokens.length,
              priceUSD: "0.015",
              currency: "SOL"
            }
          }
        ],
        message: "Token comparison requires payment. Includes detailed analysis and AI recommendation."
      });
    }

    try {
      const payment = parsePaymentHeader(paymentHeader);

      if (payment.signature && payment.signature.length >= 64) {
        req.x402Payment = payment;
        return next();
      }

      return res.status(402).json({
        error: "Invalid Payment",
        message: "Payment signature is invalid or transaction not confirmed",
        x402Version: X402_VERSION
      });
    } catch (error) {
      return res.status(402).json({
        error: "Payment Processing Error",
        message: error.message,
        x402Version: X402_VERSION
      });
    }
  };
}

// Helper to create payment response for clients
export function createPaymentInstructions(walletAddress, amount = PRICE_LAMPORTS) {
  return {
    network: "solana-mainnet",
    recipient: walletAddress,
    amount: amount,
    currency: "lamports",
    memo: "OnChainLedger API Payment",
    instructions: [
      "1. Send the specified amount of SOL to the recipient address",
      "2. Wait for transaction confirmation",
      "3. Include the transaction signature in the X-Payment header",
      "4. Retry the original request"
    ]
  };
}

export default createX402Middleware;

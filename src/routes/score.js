import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { calculateTrustScore } from '../services/trustscore.js';
import { isValidSolanaAddress } from '../middleware/validation.js';

const router = Router();

// Stricter rate limit for free endpoint: 10 requests/minute per IP
const freeScoreRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    error: 'Rate limit exceeded',
    message: 'Free score endpoint limited to 10 requests per minute. For higher limits, use the paid /analyze endpoint.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  }
});

// Cache for free scores (30 min TTL)
const scoreCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCachedScore(tokenAddress) {
  const cached = scoreCache.get(tokenAddress);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedScore(tokenAddress, data) {
  scoreCache.set(tokenAddress, {
    data,
    timestamp: Date.now()
  });
}

// GET /score/:tokenAddress - FREE endpoint
router.get('/:tokenAddress', freeScoreRateLimit, async (req, res) => {
  try {
    const { tokenAddress } = req.params;

    // Validate address
    if (!isValidSolanaAddress(tokenAddress)) {
      return res.status(400).json({
        error: 'Invalid Address',
        message: 'Please provide a valid Solana token address (32-44 characters, base58)'
      });
    }

    // Check cache first
    const cached = getCachedScore(tokenAddress);
    if (cached) {
      return res.json(cached);
    }

    // Calculate trust score
    const result = await calculateTrustScore(tokenAddress);

    // Return minimal data for free endpoint
    const response = {
      token: tokenAddress,
      symbol: result.token?.symbol || 'UNKNOWN',
      name: result.token?.name || 'Unknown Token',
      score: result.trustScore?.score ?? 0,
      grade: result.trustScore?.grade || 'F',
      verdict: result.trustScore?.verdict || 'UNKNOWN',
      message: 'For full analysis with risk breakdown, use POST /analyze/:token (x402 payment required)',
      cachedAt: new Date().toISOString(),
      cacheExpiresIn: '30 minutes'
    };

    // Cache the response
    setCachedScore(tokenAddress, response);

    res.json(response);
  } catch (error) {
    console.error('Score endpoint error:', error.message);
    res.status(500).json({
      error: 'Analysis Failed',
      message: 'Unable to calculate trust score. Please try again later.'
    });
  }
});

export default router;

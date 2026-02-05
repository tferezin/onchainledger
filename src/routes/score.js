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
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  },
  validate: { keyGeneratorIpFallback: false }
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

// Convert score to teaser preview data (hide exact score)
function getPreviewData(score, riskFactors = []) {
  // Grade (keep this - it's vague enough)
  const grade = score >= 90 ? 'A+' :
                score >= 80 ? 'A' :
                score >= 70 ? 'B' :
                score >= 60 ? 'C' :
                score >= 50 ? 'D' : 'F';

  // Score range (vague, not exact)
  const scoreRange = score >= 90 ? '90-100' :
                     score >= 80 ? '80-89' :
                     score >= 70 ? '70-79' :
                     score >= 60 ? '60-69' :
                     score >= 50 ? '50-59' : '0-49';

  // Risk level (vague category, not exact score)
  const riskLevel = score >= 80 ? 'LOW' :
                    score >= 60 ? 'MEDIUM' :
                    score >= 40 ? 'HIGH' : 'CRITICAL';

  // Tradeable (simple boolean)
  const tradeable = score >= 50;

  // Flags count (teaser - how many issues found)
  const flagsDetected = riskFactors.length;

  return { grade, scoreRange, riskLevel, tradeable, flagsDetected };
}

// Generate teaser message
function getTeaserMessage(grade, riskLevel, flagsDetected) {
  let message = `This token scored in the ${grade} range with ${riskLevel} risk level.`;

  if (flagsDetected > 0) {
    message += ` We detected ${flagsDetected} potential flag${flagsDetected > 1 ? 's' : ''}.`;
  } else {
    message += ' No major flags detected.';
  }

  return message;
}

// GET /score/:tokenAddress - FREE teaser endpoint
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

    const score = result.trustScore?.score ?? 0;
    const riskFactors = result.riskFactors || [];

    // Get teaser preview (hides exact score)
    const preview = getPreviewData(score, riskFactors);

    // Build teaser response
    const response = {
      token: {
        address: tokenAddress,
        symbol: result.token?.symbol || 'UNKNOWN',
        name: result.token?.name || 'Unknown Token'
      },
      preview: {
        grade: preview.grade,
        riskLevel: preview.riskLevel,
        tradeable: preview.tradeable,
        flagsDetected: preview.flagsDetected
      },
      teaser: {
        scoreRange: preview.scoreRange,
        message: getTeaserMessage(preview.grade, preview.riskLevel, preview.flagsDetected),
        unlock: 'Get exact score (XX/100), full breakdown, and detailed risk analysis for $0.01'
      },
      upgrade: {
        endpoint: `POST /analyze/${tokenAddress}`,
        price: '$0.01',
        protocol: 'x402',
        docs: '/docs'
      }
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
export { getPreviewData };

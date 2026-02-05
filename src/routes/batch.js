import { Router } from 'express';
import { calculateTrustScore } from '../services/trustscore.js';
import { isValidSolanaAddress } from '../middleware/validation.js';

const router = Router();

// Pricing tiers for batch analysis
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

  return {
    perToken: pricePerToken,
    total: parseFloat((pricePerToken * tokenCount).toFixed(4)),
    discount,
    lamports: Math.round(pricePerToken * tokenCount * 1000000) // Approximate lamports
  };
}

// POST /analyze/batch
router.post('/', async (req, res) => {
  try {
    const { tokens } = req.body;

    // Validate request
    if (!tokens || !Array.isArray(tokens)) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: 'Request body must contain a "tokens" array'
      });
    }

    if (tokens.length === 0) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: 'Tokens array cannot be empty'
      });
    }

    if (tokens.length > 20) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: 'Maximum 20 tokens per batch request'
      });
    }

    // Validate all token addresses
    const invalidTokens = tokens.filter(t => !isValidSolanaAddress(t));
    if (invalidTokens.length > 0) {
      return res.status(400).json({
        error: 'Invalid Addresses',
        message: `Invalid token addresses: ${invalidTokens.slice(0, 3).join(', ')}${invalidTokens.length > 3 ? '...' : ''}`,
        invalidCount: invalidTokens.length
      });
    }

    // Remove duplicates
    const uniqueTokens = [...new Set(tokens)];

    // Calculate pricing
    const pricing = calculateBatchPricing(uniqueTokens.length);

    // Analyze all tokens in parallel
    const analysisPromises = uniqueTokens.map(async (tokenAddress) => {
      try {
        const result = await calculateTrustScore(tokenAddress);
        return {
          success: true,
          token: tokenAddress,
          ...result
        };
      } catch (error) {
        return {
          success: false,
          token: tokenAddress,
          error: error.message || 'Analysis failed'
        };
      }
    });

    const results = await Promise.all(analysisPromises);

    // Separate successful and failed results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Find safest and riskiest tokens
    let safest = null;
    let riskiest = null;

    if (successful.length > 0) {
      const sorted = [...successful].sort((a, b) =>
        (b.trustScore?.score || 0) - (a.trustScore?.score || 0)
      );

      const safestResult = sorted[0];
      const riskiestResult = sorted[sorted.length - 1];

      safest = {
        token: safestResult.token?.symbol || 'Unknown',
        address: safestResult.token?.address || safestResult.token,
        score: safestResult.trustScore?.score || 0
      };

      riskiest = {
        token: riskiestResult.token?.symbol || 'Unknown',
        address: riskiestResult.token?.address || riskiestResult.token,
        score: riskiestResult.trustScore?.score || 0
      };
    }

    // Build response
    const response = {
      results: successful.map(r => ({
        token: r.token,
        trustScore: r.trustScore,
        breakdown: r.breakdown,
        riskFactors: r.riskFactors,
        positiveFactors: r.positiveFactors
      })),
      summary: {
        requested: tokens.length,
        analyzed: successful.length,
        failed: failed.length,
        safest,
        riskiest
      },
      pricing,
      metadata: {
        analyzedAt: new Date().toISOString()
      }
    };

    // Include failed tokens if any
    if (failed.length > 0) {
      response.errors = failed.map(f => ({
        token: f.token,
        error: f.error
      }));
    }

    res.json(response);
  } catch (error) {
    console.error('Batch analysis error:', error.message);
    res.status(500).json({
      error: 'Batch Analysis Failed',
      message: 'Unable to complete batch analysis. Please try again later.'
    });
  }
});

export default router;
export { calculateBatchPricing };

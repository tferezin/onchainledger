import { Router } from 'express';
import { calculateTrustScore } from '../services/trustscore.js';
import { isValidSolanaAddress } from '../middleware/validation.js';
import { getPreviewData } from './score.js';

const router = Router();

// Generate recommendation based on analysis results
function generateRecommendation(comparison) {
  if (comparison.length < 2) {
    return 'Unable to generate recommendation with less than 2 tokens.';
  }

  const sorted = [...comparison].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const runnerUp = sorted[1];

  const scoreDiff = winner.score - runnerUp.score;

  let recommendation = '';

  if (scoreDiff >= 20) {
    recommendation = `${winner.token} is significantly safer than the other options with a ${scoreDiff} point lead. `;
  } else if (scoreDiff >= 10) {
    recommendation = `${winner.token} is notably safer with a ${scoreDiff} point advantage. `;
  } else if (scoreDiff >= 5) {
    recommendation = `${winner.token} has a slight edge with ${scoreDiff} more points. `;
  } else {
    recommendation = `${winner.token} and ${runnerUp.token} are very close in safety scores. `;
  }

  if (winner.strengths.length > 0) {
    recommendation += `Key strengths: ${winner.strengths.slice(0, 2).join(', ')}. `;
  }

  if (winner.weaknesses.length > 0) {
    recommendation += `However, note that ${winner.weaknesses[0].toLowerCase()}.`;
  }

  return recommendation.trim();
}

// Extract strengths and weaknesses from analysis
function extractStrengthsAndWeaknesses(result) {
  const strengths = result.positiveFactors || [];
  const weaknesses = result.riskFactors || [];

  return {
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5)
  };
}

// POST /compare - FREE teaser or PAID full response
router.post('/', async (req, res) => {
  try {
    const { tokens } = req.body;
    const hasPayment = !!req.headers['x-payment'];

    // Validate request
    if (!tokens || !Array.isArray(tokens)) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: 'Request body must contain a "tokens" array'
      });
    }

    if (tokens.length < 2) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: 'Minimum 2 tokens required for comparison'
      });
    }

    if (tokens.length > 5) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: 'Maximum 5 tokens allowed for comparison'
      });
    }

    // Validate all token addresses
    const invalidTokens = tokens.filter(t => !isValidSolanaAddress(t));
    if (invalidTokens.length > 0) {
      return res.status(400).json({
        error: 'Invalid Addresses',
        message: `Invalid token addresses: ${invalidTokens.join(', ')}`
      });
    }

    // Remove duplicates
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length < 2) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: 'At least 2 unique tokens required for comparison'
      });
    }

    // Analyze all tokens in parallel
    const analysisPromises = uniqueTokens.map(async (tokenAddress) => {
      try {
        const result = await calculateTrustScore(tokenAddress);
        const { strengths, weaknesses } = extractStrengthsAndWeaknesses(result);

        return {
          success: true,
          token: result.token?.symbol || 'Unknown',
          address: tokenAddress,
          score: result.trustScore?.score || 0,
          grade: result.trustScore?.grade || 'F',
          riskFactors: result.riskFactors || [],
          strengths,
          weaknesses
        };
      } catch (error) {
        return {
          success: false,
          token: 'Unknown',
          address: tokenAddress,
          score: 0,
          grade: 'F',
          riskFactors: [],
          strengths: [],
          weaknesses: ['Analysis failed'],
          error: error.message
        };
      }
    });

    const results = await Promise.all(analysisPromises);
    const comparison = results.filter(r => r.success || r.score > 0);

    if (comparison.length < 2) {
      return res.status(500).json({
        error: 'Comparison Failed',
        message: 'Unable to analyze enough tokens for comparison'
      });
    }

    // Sort by score to find winner
    const sorted = [...comparison].sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    // FREE TEASER RESPONSE (no X-Payment header)
    if (!hasPayment) {
      const teaserComparison = comparison.map(c => {
        const preview = getPreviewData(c.score, c.riskFactors);
        return {
          token: {
            address: c.address,
            symbol: c.token
          },
          grade: preview.grade,
          riskLevel: preview.riskLevel,
          score: '??/100'
        };
      });

      // Determine safer choice by grade
      const gradeOrder = { 'A+': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
      const sortedByGrade = [...teaserComparison].sort((a, b) =>
        (gradeOrder[b.grade] || 0) - (gradeOrder[a.grade] || 0)
      );

      return res.json({
        comparison: teaserComparison,
        preview: {
          saferChoice: sortedByGrade[0].token.symbol,
          gradeDifference: `${sortedByGrade[0].grade} vs ${sortedByGrade[sortedByGrade.length - 1].grade}`,
          message: `${sortedByGrade[0].token.symbol} appears ${sortedByGrade[0].grade === sortedByGrade[1]?.grade ? 'equally safe' : 'safer'} based on grade comparison`
        },
        upgrade: {
          message: 'Get exact scores, full comparison with strengths/weaknesses, and detailed recommendation',
          price: '$0.015',
          endpoint: 'POST /compare with X-Payment header',
          protocol: 'x402'
        }
      });
    }

    // PAID FULL RESPONSE (has X-Payment header)
    const recommendation = generateRecommendation(comparison);

    const winnerObj = {
      token: winner.token,
      address: winner.address,
      score: winner.score,
      reason: `Highest trust score (${winner.score}/100)`
    };

    if (winner.strengths.length > 0) {
      winnerObj.reason += `, ${winner.strengths[0].toLowerCase()}`;
    }
    if (sorted.length > 1) {
      const scoreDiff = winner.score - sorted[1].score;
      if (scoreDiff > 0) {
        winnerObj.reason += `, ${scoreDiff} points ahead of ${sorted[1].token}`;
      }
    }

    const response = {
      comparison: comparison.map(c => ({
        token: c.token,
        address: c.address,
        score: c.score,
        grade: c.grade,
        strengths: c.strengths,
        weaknesses: c.weaknesses
      })),
      winner: winnerObj,
      recommendation,
      metadata: {
        comparedAt: new Date().toISOString(),
        tokenCount: comparison.length,
        paid: true
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Compare endpoint error:', error.message);
    res.status(500).json({
      error: 'Comparison Failed',
      message: 'Unable to complete token comparison. Please try again later.'
    });
  }
});

export default router;

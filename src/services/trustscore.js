import { analyzeAuthority } from '../analyzers/authority.js';
import { analyzeHolders } from '../analyzers/holders.js';
import { analyzeLiquidity } from '../analyzers/liquidity.js';
import { analyzeHoneypot } from '../analyzers/honeypot.js';
import { analyzeAge, getTokenMetadata } from '../analyzers/metadata.js';
import { GRADES } from '../utils/constants.js';

function getGrade(score) {
  for (const grade of GRADES) {
    if (score >= grade.min) {
      return { grade: grade.grade, verdict: grade.verdict };
    }
  }
  return { grade: 'F', verdict: 'LIKELY SCAM' };
}

export async function calculateTrustScore(tokenAddress) {
  const [
    tokenMetadata,
    authorityResult,
    holdersResult,
    liquidityResult,
    honeypotResult,
    ageResult
  ] = await Promise.all([
    getTokenMetadata(tokenAddress),
    analyzeAuthority(tokenAddress),
    analyzeHolders(tokenAddress),
    analyzeLiquidity(tokenAddress),
    analyzeHoneypot(tokenAddress),
    analyzeAge(tokenAddress)
  ]);

  const totalWeighted =
    authorityResult.weighted +
    holdersResult.weighted +
    liquidityResult.weighted +
    honeypotResult.weighted +
    ageResult.weighted;

  const { grade, verdict } = getGrade(totalWeighted);

  const allRisks = [
    ...authorityResult.risks,
    ...holdersResult.risks,
    ...liquidityResult.risks,
    ...honeypotResult.risks,
    ...ageResult.risks
  ];

  const positiveFactors = [];
  if (authorityResult.score === 100) {
    positiveFactors.push('All authorities revoked');
  }
  if (liquidityResult.details.tvlUsd >= 50000) {
    positiveFactors.push('Good liquidity');
  }
  if (holdersResult.details.top10Concentration <= 40) {
    positiveFactors.push('Well distributed token holders');
  }
  if (!honeypotResult.details.isHoneypot) {
    positiveFactors.push('Token is tradeable');
  }
  if (ageResult.details.ageHours >= 168) {
    positiveFactors.push('Established token (7+ days)');
  }

  return {
    token: tokenMetadata,
    trustScore: {
      score: totalWeighted,
      grade,
      verdict
    },
    breakdown: {
      authority: authorityResult,
      holders: holdersResult,
      liquidity: liquidityResult,
      honeypot: honeypotResult,
      age: ageResult
    },
    riskFactors: allRisks,
    positiveFactors
  };
}

import { getAsset } from '../services/helius.js';
import { WEIGHTS } from '../utils/constants.js';

export async function analyzeAge(tokenAddress) {
  const asset = await getAsset(tokenAddress);

  let score = 100;
  const risks = [];
  const details = {
    ageHours: 0,
    createdAt: null
  };

  if (asset && asset.content?.metadata) {
    const createdAt = asset.content?.metadata?.createdAt ||
                      asset.ownership?.createdAt ||
                      null;

    if (createdAt) {
      const createdDate = new Date(createdAt);
      const now = new Date();
      const ageHours = (now - createdDate) / (1000 * 60 * 60);

      details.ageHours = Math.round(ageHours);
      details.createdAt = createdDate.toISOString();

      if (ageHours < 1) {
        score -= 50;
        risks.push('Token is less than 1 hour old');
      } else if (ageHours < 24) {
        score -= 30;
        risks.push('Token is less than 24 hours old');
      } else if (ageHours < 168) { // 7 days
        score -= 10;
        risks.push('Token is less than 7 days old');
      }
    } else {
      details.ageHours = 8760; // assume 1 year if unknown
      details.createdAt = null;
    }
  }

  score = Math.max(0, score);

  return {
    score,
    maxScore: 100,
    weight: WEIGHTS.age,
    weighted: Math.round(score * WEIGHTS.age),
    details,
    risks
  };
}

export async function getTokenMetadata(tokenAddress) {
  const asset = await getAsset(tokenAddress);

  if (asset) {
    return {
      address: tokenAddress,
      symbol: asset.content?.metadata?.symbol || 'UNKNOWN',
      name: asset.content?.metadata?.name || 'Unknown Token',
      decimals: asset.token_info?.decimals || 9
    };
  }

  return {
    address: tokenAddress,
    symbol: 'UNKNOWN',
    name: 'Unknown Token',
    decimals: 9
  };
}

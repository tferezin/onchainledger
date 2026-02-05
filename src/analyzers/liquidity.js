import { getTokenOverview } from '../services/birdeye.js';
import { WEIGHTS } from '../utils/constants.js';

export async function analyzeLiquidity(tokenAddress) {
  const overview = await getTokenOverview(tokenAddress);

  let score = 100;
  const risks = [];
  const details = {
    tvlUsd: 0,
    volume24h: 0,
    priceUsd: 0,
    marketCap: 0
  };

  if (overview) {
    details.tvlUsd = overview.liquidity || 0;
    details.volume24h = overview.v24hUSD || 0;
    details.priceUsd = overview.price || 0;
    details.marketCap = overview.mc || 0;

    const tvl = details.tvlUsd;

    if (tvl < 1000) {
      score -= 80;
      risks.push(`Very low liquidity: $${tvl.toLocaleString()} TVL`);
    } else if (tvl < 10000) {
      score -= 50;
      risks.push(`Low liquidity: $${tvl.toLocaleString()} TVL`);
    } else if (tvl < 50000) {
      score -= 20;
      risks.push(`Moderate liquidity: $${tvl.toLocaleString()} TVL`);
    }
  } else {
    score = 20;
    risks.push('Unable to fetch liquidity data');
  }

  score = Math.max(0, score);

  return {
    score,
    maxScore: 100,
    weight: WEIGHTS.liquidity,
    weighted: Math.round(score * WEIGHTS.liquidity),
    details,
    risks
  };
}

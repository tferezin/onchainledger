import { getTokenLargestAccounts, getTokenSupply } from '../services/helius.js';
import { WEIGHTS } from '../utils/constants.js';

export async function analyzeHolders(tokenAddress) {
  const [largestAccounts, supplyData] = await Promise.all([
    getTokenLargestAccounts(tokenAddress),
    getTokenSupply(tokenAddress)
  ]);

  let score = 100;
  const risks = [];
  const details = {
    totalHolders: 0,
    top10Concentration: 0,
    topHolders: []
  };

  if (largestAccounts.length > 0 && supplyData) {
    const totalSupply = parseFloat(supplyData.amount) / Math.pow(10, supplyData.decimals);

    const top10 = largestAccounts.slice(0, 10);
    let top10Total = 0;

    details.topHolders = top10.map(account => {
      const balance = parseFloat(account.amount) / Math.pow(10, supplyData.decimals);
      const percentage = (balance / totalSupply) * 100;
      top10Total += percentage;
      return {
        address: account.address,
        balance,
        percentage: Math.round(percentage * 100) / 100
      };
    });

    details.top10Concentration = Math.round(top10Total * 100) / 100;
    details.totalHolders = largestAccounts.length;

    if (top10Total > 80) {
      score -= 60;
      risks.push(`High concentration: Top 10 hold ${details.top10Concentration}%`);
    } else if (top10Total > 60) {
      score -= 40;
      risks.push(`Elevated concentration: Top 10 hold ${details.top10Concentration}%`);
    } else if (top10Total > 40) {
      score -= 20;
      risks.push(`Moderate concentration: Top 10 hold ${details.top10Concentration}%`);
    }
  }

  score = Math.max(0, score);

  return {
    score,
    maxScore: 100,
    weight: WEIGHTS.holders,
    weighted: Math.round(score * WEIGHTS.holders),
    details,
    risks
  };
}

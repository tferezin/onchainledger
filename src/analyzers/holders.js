import { getTokenLargestAccounts, getTokenSupply, getAsset } from '../services/helius.js';
import { WEIGHTS } from '../utils/constants.js';

/**
 * Calculate Gini coefficient for holder distribution
 * @param {number[]} percentages - Array of holder percentages
 * @returns {number} Gini coefficient (0 = perfect equality, 1 = perfect inequality)
 */
function calculateGiniCoefficient(percentages) {
  if (percentages.length === 0) return 0;

  // Sort percentages in ascending order
  const sorted = [...percentages].sort((a, b) => a - b);
  const n = sorted.length;

  // Calculate cumulative percentages
  let cumulativeSum = 0;
  let totalCumulative = 0;

  for (let i = 0; i < n; i++) {
    cumulativeSum += sorted[i];
    totalCumulative += cumulativeSum;
  }

  // Gini = 1 - 2 * (sum of cumulative / n) / total
  // Normalized version: Gini = 1 - 2 * (sum of cumulative) / (n * total)
  const total = sorted.reduce((sum, val) => sum + val, 0);
  if (total === 0) return 0;

  const gini = 1 - (2 * totalCumulative) / (n * total) + (1 / n);

  return Math.round(Math.max(0, Math.min(1, gini)) * 1000) / 1000;
}

/**
 * Detect suspicious patterns among holders
 * @param {Array} topHolders - Array of top holder objects
 * @returns {string[]} Array of suspicious pattern descriptions
 */
function detectSuspiciousPatterns(topHolders) {
  const patterns = [];

  if (topHolders.length < 2) return patterns;

  // Check for similar balance amounts (potential coordinated buying)
  const balances = topHolders.map(h => h.balance);
  const percentages = topHolders.map(h => h.percentage);

  // Group holders by similar percentages (within 0.5% of each other)
  const similarGroups = [];
  const used = new Set();

  for (let i = 0; i < percentages.length; i++) {
    if (used.has(i)) continue;

    const group = [i];
    for (let j = i + 1; j < percentages.length; j++) {
      if (used.has(j)) continue;

      if (Math.abs(percentages[i] - percentages[j]) < 0.5 && percentages[i] > 1) {
        group.push(j);
        used.add(j);
      }
    }

    if (group.length >= 3) {
      similarGroups.push(group);
    }
    used.add(i);
  }

  if (similarGroups.length > 0) {
    const totalSimilar = similarGroups.reduce((sum, g) => sum + g.length, 0);
    patterns.push(`${totalSimilar} holders with suspiciously similar balances detected`);
  }

  // Check for sequential/similar addresses (potential sybil attack)
  const addresses = topHolders.map(h => h.address);
  let similarPrefixCount = 0;

  for (let i = 0; i < addresses.length; i++) {
    for (let j = i + 1; j < addresses.length; j++) {
      // Check if first 8 characters match (excluding common prefixes)
      const prefix1 = addresses[i].substring(0, 8);
      const prefix2 = addresses[j].substring(0, 8);
      if (prefix1 === prefix2) {
        similarPrefixCount++;
      }
    }
  }

  if (similarPrefixCount >= 2) {
    patterns.push(`${similarPrefixCount} holder pairs with similar address patterns`);
  }

  // Check for round number holdings (potential artificial distribution)
  const roundNumberHolders = topHolders.filter(h => {
    const rounded = Math.round(h.percentage);
    return Math.abs(h.percentage - rounded) < 0.01 && h.percentage >= 1;
  });

  if (roundNumberHolders.length >= 3) {
    patterns.push(`${roundNumberHolders.length} holders with suspiciously round percentages`);
  }

  return patterns;
}

export async function analyzeHolders(tokenAddress) {
  const [largestAccounts, supplyData, assetData] = await Promise.all([
    getTokenLargestAccounts(tokenAddress),
    getTokenSupply(tokenAddress),
    getAsset(tokenAddress)
  ]);

  let score = 100;
  const risks = [];
  const details = {
    totalHolders: 0,
    top10Concentration: 0,
    topHolders: [],
    creatorInTop10: false,
    creatorAddress: null,
    creatorPercentage: 0,
    suspiciousPatterns: [],
    giniCoefficient: 0
  };

  // Extract creator/authority address from asset data
  let creatorAddress = null;
  if (assetData) {
    // Try different possible locations for creator/authority
    creatorAddress = assetData.authorities?.[0]?.address ||
                     assetData.ownership?.owner ||
                     assetData.creators?.[0]?.address ||
                     assetData.mint_authority ||
                     assetData.update_authority ||
                     null;
  }
  details.creatorAddress = creatorAddress;

  if (largestAccounts.length > 0 && supplyData) {
    const totalSupply = parseFloat(supplyData.amount) / Math.pow(10, supplyData.decimals);

    const top10 = largestAccounts.slice(0, 10);
    let top10Total = 0;
    const allPercentages = [];

    details.topHolders = top10.map(account => {
      const balance = parseFloat(account.amount) / Math.pow(10, supplyData.decimals);
      const percentage = (balance / totalSupply) * 100;
      top10Total += percentage;
      allPercentages.push(percentage);
      return {
        address: account.address,
        balance,
        percentage: Math.round(percentage * 100) / 100
      };
    });

    // Also include remaining accounts in Gini calculation for better accuracy
    for (let i = 10; i < largestAccounts.length; i++) {
      const balance = parseFloat(largestAccounts[i].amount) / Math.pow(10, supplyData.decimals);
      const percentage = (balance / totalSupply) * 100;
      allPercentages.push(percentage);
    }

    details.top10Concentration = Math.round(top10Total * 100) / 100;
    details.totalHolders = largestAccounts.length;

    // Calculate Gini coefficient
    details.giniCoefficient = calculateGiniCoefficient(allPercentages);

    // Check if creator is in top 10 holders
    if (creatorAddress) {
      const creatorHolder = details.topHolders.find(
        h => h.address.toLowerCase() === creatorAddress.toLowerCase()
      );

      if (creatorHolder) {
        details.creatorInTop10 = true;
        details.creatorPercentage = creatorHolder.percentage;

        // Apply penalty if creator holds > 10%
        if (creatorHolder.percentage > 10) {
          score -= 15;
          risks.push(`Creator holds ${creatorHolder.percentage}% of supply`);
        }
      }
    }

    // Detect suspicious patterns
    details.suspiciousPatterns = detectSuspiciousPatterns(details.topHolders);

    // Add risks for suspicious patterns
    if (details.suspiciousPatterns.length > 0) {
      details.suspiciousPatterns.forEach(pattern => {
        risks.push(`Suspicious pattern: ${pattern}`);
      });
    }

    // Apply penalty for extremely unequal distribution (Gini > 0.9)
    if (details.giniCoefficient > 0.9) {
      score -= 10;
      risks.push(`Extremely unequal distribution (Gini: ${details.giniCoefficient})`);
    }

    // Existing concentration checks
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

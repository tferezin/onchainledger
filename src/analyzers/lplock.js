import { getTokenLargestAccounts } from '../services/helius.js';
import { WEIGHTS } from '../utils/constants.js';

// Known Solana LP locker contracts
const KNOWN_LOCKERS = {
  // Streamflow
  'strmRqUCoQUgGUan5YhzUZa6KqdzwX5L6FpUxfmKg5m': 'Streamflow',

  // Raydium Vault addresses
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1': 'Raydium Vault',
  'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1': 'Raydium Vault',
  '7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5': 'Raydium Vault',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Raydium Vault',

  // Jupiter Lock addresses
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter Lock',
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB': 'Jupiter Lock',
  'LockvKvC3xvDdTYeDqZKH5AHH8Z8N3MTuSiAJU4wWsL': 'Jupiter Lock',

  // Uncx Network (Solana)
  'UNCXjqPzH1QhCwFiGqN5rSM3KrRzXmhHqVHw1JK4dVF': 'UNCX Network',

  // Team Finance
  'TeamFqhVLcHXv1aJSqgtJYFMPNLnmwKnmXqmJR3sCNk': 'Team Finance',

  // Fluxbeam Lock
  'FLUXBmPhT3Fd1EDVFdg6YnuDpgaGgz9NqN1qZmJmcLQX': 'Fluxbeam Lock'
};

/**
 * Analyzes if LP tokens are locked in known locker contracts
 * @param {string} tokenAddress - The token mint address to analyze
 * @returns {Promise<Object>} Analysis result with score and details
 */
export async function analyzeLpLock(tokenAddress) {
  const result = {
    score: 75,
    maxScore: 100,
    weight: WEIGHTS.lpLock,
    weighted: 0,
    details: {
      locked: false,
      lockerName: null,
      unlockDate: null,
      percentLocked: 0
    },
    risks: []
  };

  try {
    // Get LP token holders using Helius
    const holders = await getTokenLargestAccounts(tokenAddress);

    if (!holders || holders.length === 0) {
      result.risks.push('Unable to fetch LP token holders');
      result.weighted = Math.round(result.score * WEIGHTS.lpLock);
      return result;
    }

    // Calculate total supply from holders
    const totalSupply = holders.reduce((sum, holder) => {
      const amount = parseFloat(holder.amount || holder.balance || 0);
      return sum + amount;
    }, 0);

    // Check if any holders are known locker addresses
    let lockedAmount = 0;
    let foundLocker = null;

    for (const holder of holders) {
      const holderAddress = holder.owner || holder.address;
      const holderAmount = parseFloat(holder.amount || holder.balance || 0);

      if (KNOWN_LOCKERS[holderAddress]) {
        lockedAmount += holderAmount;
        if (!foundLocker) {
          foundLocker = KNOWN_LOCKERS[holderAddress];
        }
      }
    }

    // Calculate percent locked
    const percentLocked = totalSupply > 0 ? (lockedAmount / totalSupply) * 100 : 0;

    if (foundLocker && percentLocked > 0) {
      // LP is locked
      result.score = 100;
      result.details = {
        locked: true,
        lockerName: foundLocker,
        unlockDate: null, // Would require additional on-chain data to determine
        percentLocked: Math.round(percentLocked * 100) / 100
      };
      result.risks = [];
    } else {
      // LP is not locked
      result.score = 75;
      result.details = {
        locked: false,
        lockerName: null,
        unlockDate: null,
        percentLocked: 0
      };
      result.risks.push('LP tokens are not locked');
    }

  } catch (error) {
    console.error('Error analyzing LP lock:', error.message);
    result.risks.push(`Error checking LP lock status: ${error.message}`);
  }

  // Calculate weighted score
  result.weighted = Math.round(result.score * WEIGHTS.lpLock);

  return result;
}

export default analyzeLpLock;

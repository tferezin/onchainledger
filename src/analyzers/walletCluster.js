import {
  getTokenLargestAccounts,
  getTokenSupply,
  getSignaturesForAddress,
  getParsedTransactions
} from '../services/helius.js';

const WEIGHT = 0.08;

/**
 * Get the owner wallet address from a token account address
 * Token accounts are associated with owner wallets
 * @param {Object} transaction - Parsed transaction object
 * @param {string} tokenAccountAddress - The token account address
 * @returns {string|null} Owner wallet address or null
 */
function extractOwnerFromTransaction(transaction, tokenAccountAddress) {
  if (!transaction?.accountData) return null;

  for (const account of transaction.accountData) {
    if (account.account === tokenAccountAddress && account.nativeBalanceChange !== undefined) {
      return account.account;
    }
  }

  // Check token transfers for the owner
  if (transaction?.tokenTransfers) {
    for (const transfer of transaction.tokenTransfers) {
      if (transfer.toUserAccount === tokenAccountAddress) {
        return transfer.toUserAccount;
      }
      if (transfer.fromUserAccount === tokenAccountAddress) {
        return transfer.fromUserAccount;
      }
    }
  }

  return null;
}

/**
 * Find SOL funding sources for a wallet by analyzing its transaction history
 * Looks for incoming SOL transfers (native balance increases)
 * @param {string} walletAddress - The wallet address to analyze
 * @returns {Promise<string[]>} Array of funding source addresses
 */
async function findFundingSources(walletAddress) {
  const fundingSources = new Set();

  try {
    // Get recent transaction signatures for this wallet
    const signatures = await getSignaturesForAddress(walletAddress, { limit: 20 });

    if (signatures.length === 0) {
      return [];
    }

    // Get the earliest transactions (more likely to be funding)
    const signatureList = signatures.slice(-10).map(s => s.signature);

    // Parse these transactions
    const parsedTxs = await getParsedTransactions(signatureList);

    for (const tx of parsedTxs) {
      if (!tx) continue;

      // Check native transfers (SOL transfers)
      if (tx.nativeTransfers) {
        for (const transfer of tx.nativeTransfers) {
          // If this wallet received SOL
          if (transfer.toUserAccount === walletAddress && transfer.amount > 0) {
            fundingSources.add(transfer.fromUserAccount);
          }
        }
      }

      // Also check accountData for balance changes
      if (tx.accountData) {
        for (const account of tx.accountData) {
          // Look for accounts that sent SOL to our target
          if (account.nativeBalanceChange < 0 && account.account !== walletAddress) {
            // This account had a negative balance change (sent SOL)
            // Check if our wallet received it
            const walletData = tx.accountData.find(a => a.account === walletAddress);
            if (walletData && walletData.nativeBalanceChange > 0) {
              fundingSources.add(account.account);
            }
          }
        }
      }

      // Check fee payer as potential funding source
      if (tx.feePayer && tx.feePayer !== walletAddress) {
        // If fee payer paid for transactions involving this wallet, they might be connected
        const walletInvolved = tx.accountData?.some(a => a.account === walletAddress);
        if (walletInvolved) {
          fundingSources.add(tx.feePayer);
        }
      }
    }
  } catch (error) {
    console.error(`Error finding funding sources for ${walletAddress}:`, error.message);
  }

  return Array.from(fundingSources);
}

/**
 * Group wallets into clusters based on common funding sources
 * @param {Map<string, string[]>} walletFundingMap - Map of wallet -> funding sources
 * @returns {string[][]} Array of wallet clusters
 */
function groupWalletsIntoClusters(walletFundingMap) {
  const clusters = [];
  const processed = new Set();
  const wallets = Array.from(walletFundingMap.keys());

  for (const wallet of wallets) {
    if (processed.has(wallet)) continue;

    const cluster = new Set([wallet]);
    const fundingSources = walletFundingMap.get(wallet) || [];

    // Find other wallets that share funding sources
    for (const otherWallet of wallets) {
      if (otherWallet === wallet || processed.has(otherWallet)) continue;

      const otherFundingSources = walletFundingMap.get(otherWallet) || [];

      // Check for common funding sources
      const commonSources = fundingSources.filter(source =>
        otherFundingSources.includes(source)
      );

      if (commonSources.length > 0) {
        cluster.add(otherWallet);
      }
    }

    // Only consider it a cluster if more than 1 wallet
    if (cluster.size > 1) {
      clusters.push(Array.from(cluster));
      cluster.forEach(w => processed.add(w));
    } else {
      processed.add(wallet);
    }
  }

  return clusters;
}

/**
 * Analyze wallet clusters to detect coordinated holding patterns
 * @param {string} tokenAddress - The token mint address
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeWalletCluster(tokenAddress) {
  let score = 100;
  const risks = [];
  const details = {
    clustersDetected: 0,
    largestClusterSize: 0,
    clusterPercentage: 0,
    connectedWallets: []
  };

  try {
    // Get top 10 holders
    const [largestAccounts, supplyData] = await Promise.all([
      getTokenLargestAccounts(tokenAddress),
      getTokenSupply(tokenAddress)
    ]);

    if (largestAccounts.length === 0 || !supplyData) {
      return {
        score,
        maxScore: 100,
        weight: WEIGHT,
        weighted: Math.round(score * WEIGHT),
        details,
        risks: ['Unable to fetch holder data']
      };
    }

    const totalSupply = parseFloat(supplyData.amount) / Math.pow(10, supplyData.decimals);
    const top10 = largestAccounts.slice(0, 10);

    // Build holder info with percentages
    const holderInfo = top10.map(account => {
      const balance = parseFloat(account.amount) / Math.pow(10, supplyData.decimals);
      const percentage = (balance / totalSupply) * 100;
      return {
        address: account.address,
        balance,
        percentage
      };
    });

    // Find funding sources for each holder (in parallel with rate limiting)
    const walletFundingMap = new Map();

    // Process in batches of 3 to avoid rate limiting
    for (let i = 0; i < holderInfo.length; i += 3) {
      const batch = holderInfo.slice(i, i + 3);
      const results = await Promise.all(
        batch.map(async (holder) => {
          const sources = await findFundingSources(holder.address);
          return { address: holder.address, sources };
        })
      );

      for (const result of results) {
        walletFundingMap.set(result.address, result.sources);
      }

      // Small delay between batches to avoid rate limits
      if (i + 3 < holderInfo.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Group wallets into clusters
    const clusters = groupWalletsIntoClusters(walletFundingMap);

    details.clustersDetected = clusters.length;
    details.connectedWallets = clusters;

    if (clusters.length > 0) {
      // Find largest cluster
      details.largestClusterSize = Math.max(...clusters.map(c => c.length));

      // Calculate percentage of supply controlled by clustered wallets
      const clusteredWallets = new Set(clusters.flat());
      let clusteredPercentage = 0;

      for (const holder of holderInfo) {
        if (clusteredWallets.has(holder.address)) {
          clusteredPercentage += holder.percentage;
        }
      }

      details.clusterPercentage = Math.round(clusteredPercentage * 100) / 100;

      // Apply scoring penalties
      if (details.clustersDetected > 2) {
        score -= 20;
        risks.push(`Multiple wallet clusters detected (${details.clustersDetected} clusters)`);
      }

      if (details.largestClusterSize > 3) {
        score -= 15;
        risks.push(`Large coordinated wallet cluster (${details.largestClusterSize} wallets)`);
      }

      if (details.clusterPercentage > 30) {
        score -= 25;
        risks.push(`Clustered wallets control ${details.clusterPercentage}% of supply`);
      }
    }

  } catch (error) {
    console.error('Wallet cluster analysis error:', error.message);
    risks.push('Error analyzing wallet clusters');
  }

  score = Math.max(0, score);

  return {
    score,
    maxScore: 100,
    weight: WEIGHT,
    weighted: Math.round(score * WEIGHT),
    details,
    risks
  };
}

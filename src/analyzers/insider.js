import { getSignaturesForAddress, getParsedTransactions, getAsset } from '../services/helius.js';
import { WEIGHTS } from '../utils/constants.js';

const INSIDER_WEIGHT = WEIGHTS.insider || 0.10;

/**
 * Analyzes insider/bundled transactions at token launch
 * Detects suspicious early buying patterns and creator sniping
 */
export async function analyzeInsider(tokenAddress) {
  const result = {
    score: 100,
    maxScore: 100,
    weight: INSIDER_WEIGHT,
    weighted: 0,
    details: {
      bundleDetected: false,
      creatorSniped: false,
      earlyBuyersCount: 0,
      suspiciousWallets: []
    },
    risks: []
  };

  try {
    // Get token asset info to find creator/authority
    const assetInfo = await getAsset(tokenAddress);
    const creatorWallet = assetInfo?.authorities?.[0]?.address ||
                          assetInfo?.ownership?.owner ||
                          null;

    // Get early transaction signatures for the token
    const signatures = await getSignaturesForAddress(tokenAddress, { limit: 100 });

    if (!signatures || signatures.length === 0) {
      result.risks.push('Unable to fetch transaction history');
      result.weighted = Math.round(result.score * INSIDER_WEIGHT);
      return result;
    }

    // Sort by slot (ascending) to get earliest transactions first
    const sortedSignatures = [...signatures].sort((a, b) => a.slot - b.slot);

    // Get the first block slot (LP creation block)
    const firstBlockSlot = sortedSignatures[0]?.slot;

    // Get transactions in the first block
    const firstBlockTxs = sortedSignatures.filter(sig => sig.slot === firstBlockSlot);
    const firstBlockSignatures = firstBlockTxs.map(tx => tx.signature);

    // Parse the early transactions to analyze them
    const parsedTxs = await getParsedTransactions(firstBlockSignatures.slice(0, 20));

    // Analyze for bundle detection and creator sniping
    const analysis = analyzeEarlyTransactions(parsedTxs, creatorWallet, tokenAddress);

    result.details.bundleDetected = analysis.bundleDetected;
    result.details.creatorSniped = analysis.creatorSniped;
    result.details.earlyBuyersCount = analysis.earlyBuyersCount;
    result.details.suspiciousWallets = analysis.suspiciousWallets;

    // Apply scoring penalties
    if (result.details.bundleDetected) {
      result.score -= 30;
      result.risks.push('Creator bundled LP with own buys');
    }

    if (result.details.creatorSniped) {
      result.score -= 25;
      result.risks.push('Creator sniped their own token');
    }

    if (result.details.earlyBuyersCount > 10) {
      result.score -= 15;
      result.risks.push('Suspicious early buyer activity');
    }

    // Ensure score doesn't go below 0
    result.score = Math.max(0, result.score);

  } catch (error) {
    console.error('Insider analysis error:', error.message);
    result.risks.push('Error analyzing insider activity');
  }

  result.weighted = Math.round(result.score * INSIDER_WEIGHT);
  return result;
}

/**
 * Analyzes early transactions for suspicious patterns
 */
function analyzeEarlyTransactions(transactions, creatorWallet, tokenAddress) {
  const analysis = {
    bundleDetected: false,
    creatorSniped: false,
    earlyBuyersCount: 0,
    suspiciousWallets: []
  };

  if (!transactions || transactions.length === 0) {
    return analysis;
  }

  const buyerWallets = new Set();
  let lpCreationFound = false;
  let lpCreationTxSignature = null;

  for (const tx of transactions) {
    if (!tx) continue;

    const feePayer = tx.feePayer;
    const type = tx.type;
    const description = tx.description?.toLowerCase() || '';

    // Detect LP creation transaction
    const isLpCreation = type === 'CREATE_POOL' ||
                         type === 'ADD_LIQUIDITY' ||
                         description.includes('create pool') ||
                         description.includes('add liquidity') ||
                         description.includes('initialize');

    if (isLpCreation && !lpCreationFound) {
      lpCreationFound = true;
      lpCreationTxSignature = tx.signature;
    }

    // Detect swap/buy transactions
    const isSwap = type === 'SWAP' ||
                   description.includes('swap') ||
                   description.includes('buy');

    if (isSwap) {
      buyerWallets.add(feePayer);

      // Check if creator bought in same transaction as LP creation
      if (creatorWallet && feePayer === creatorWallet) {
        analysis.creatorSniped = true;
        if (!analysis.suspiciousWallets.includes(creatorWallet)) {
          analysis.suspiciousWallets.push(creatorWallet);
        }
      }
    }

    // Check for bundled transactions (multiple operations in same tx)
    const instructions = tx.instructions || [];
    const accountData = tx.accountData || [];

    // If a single transaction has both LP creation and swaps, it's bundled
    if (instructions.length > 0 || accountData.length > 0) {
      const hasLpOp = instructions.some(inst =>
        inst.programId?.includes('675kPX') || // Raydium
        inst.programId?.includes('whirL') ||  // Orca
        inst.programId?.includes('CAMMCzo')   // Raydium CLMM
      );

      const hasSwapOp = instructions.some(inst =>
        inst.programId?.includes('JUP') ||    // Jupiter
        inst.programId?.includes('675kPX')    // Raydium AMM
      );

      // Bundle detection: LP and swap in same transaction from same wallet
      if (hasLpOp && hasSwapOp) {
        analysis.bundleDetected = true;
        if (feePayer && !analysis.suspiciousWallets.includes(feePayer)) {
          analysis.suspiciousWallets.push(feePayer);
        }
      }
    }

    // Check token transfers to detect buying patterns
    const tokenTransfers = tx.tokenTransfers || [];
    for (const transfer of tokenTransfers) {
      if (transfer.mint === tokenAddress && transfer.toUserAccount) {
        const buyer = transfer.toUserAccount;
        buyerWallets.add(buyer);

        // If creator received tokens in early block
        if (creatorWallet && buyer === creatorWallet && isSwap) {
          analysis.creatorSniped = true;
        }
      }
    }
  }

  analysis.earlyBuyersCount = buyerWallets.size;

  // If LP creation and buys happened in same block from same wallet, flag as bundled
  if (lpCreationFound && buyerWallets.size > 0 && creatorWallet) {
    if (buyerWallets.has(creatorWallet)) {
      analysis.bundleDetected = true;
      if (!analysis.suspiciousWallets.includes(creatorWallet)) {
        analysis.suspiciousWallets.push(creatorWallet);
      }
    }
  }

  // Add wallets with suspicious early activity
  if (analysis.earlyBuyersCount > 10) {
    // Add first few unique buyers as suspicious
    const walletArray = Array.from(buyerWallets).slice(0, 5);
    for (const wallet of walletArray) {
      if (!analysis.suspiciousWallets.includes(wallet)) {
        analysis.suspiciousWallets.push(wallet);
      }
    }
  }

  return analysis;
}

export default { analyzeInsider };

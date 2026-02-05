/**
 * Telegram Bot Command Handlers
 */

import { calculateTrustScore } from '../services/trustscore.js';
import { isValidSolanaAddress } from '../middleware/validation.js';

// Common token symbols to addresses mapping
const TOKEN_ALIASES = {
  'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'SOL': 'So11111111111111111111111111111111111111112',
  'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  'POPCAT': '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
  'WIF': 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'
};

// Rate limiting
const userRateLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimits = userRateLimits.get(userId) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };

  if (now > userLimits.resetAt) {
    userLimits.count = 0;
    userLimits.resetAt = now + RATE_LIMIT_WINDOW;
  }

  if (userLimits.count >= MAX_REQUESTS) {
    return false;
  }

  userLimits.count++;
  userRateLimits.set(userId, userLimits);
  return true;
}

// Resolve token address from symbol or address
function resolveTokenAddress(input) {
  const upperInput = input.toUpperCase();
  if (TOKEN_ALIASES[upperInput]) {
    return { address: TOKEN_ALIASES[upperInput], symbol: upperInput };
  }
  if (isValidSolanaAddress(input)) {
    return { address: input, symbol: null };
  }
  return null;
}

// Format score emoji
function getScoreEmoji(score) {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  if (score >= 50) return '🟠';
  return '🔴';
}

// Format grade emoji
function getGradeEmoji(grade) {
  if (grade.startsWith('A')) return '✅';
  if (grade === 'B') return '⚠️';
  return '❌';
}

// /start command
export async function handleStart(bot, msg) {
  const chatId = msg.chat.id;

  const welcomeMessage = `
🔍 *Welcome to OnChainLedger Bot!*

I help you check if Solana tokens are safe to trade.

*Commands:*
/score <address> - Free trust score
/compare <addr1> <addr2> - Compare two tokens
/help - Show all commands

*Example:*
\`/score DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\`

Or use token symbols:
\`/score BONK\`

🌐 *Full API:* onchainledger-production.up.railway.app
📖 *Docs:* onchainledger-production.up.railway.app/docs
`;

  await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
}

// /help command
export async function handleHelp(bot, msg) {
  const chatId = msg.chat.id;

  const helpMessage = `
📚 *OnChainLedger Bot Commands*

*Free Commands:*
/score <token> - Get trust score (0-100)
/compare <token1> <token2> - Compare scores
/help - This help message

*Supported Token Symbols:*
BONK, USDC, SOL, USDT, RAY, JUP, POPCAT, WIF

*Or use full addresses:*
\`/score DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\`

*Grade Scale:*
A+ (90-100) - Very High Confidence
A (80-89) - High Confidence
B (70-79) - Moderate Confidence
C (50-69) - Low Confidence
D (25-49) - Very Low Confidence
F (0-24) - Likely Scam

*Rate Limit:* 5 requests per minute

🌐 *Website:* onchainledger-production.up.railway.app
`;

  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
}

// Get risk level from score (teaser - no exact score shown)
function getRiskLevel(score) {
  if (score >= 80) return 'LOW';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'HIGH';
  return 'CRITICAL';
}

// Get risk emoji
function getRiskEmoji(riskLevel) {
  if (riskLevel === 'LOW') return '🟢';
  if (riskLevel === 'MEDIUM') return '🟡';
  if (riskLevel === 'HIGH') return '🟠';
  return '🔴';
}

// /score command - TEASER MODE (hides exact score)
export async function handleScore(bot, msg, tokenInput) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Check rate limit
  if (!checkRateLimit(userId)) {
    await bot.sendMessage(chatId, '⏳ Rate limit exceeded. Please wait a minute.');
    return;
  }

  if (!tokenInput) {
    await bot.sendMessage(chatId, '❌ Please provide a token address or symbol.\n\nExample: `/score BONK`', { parse_mode: 'Markdown' });
    return;
  }

  const resolved = resolveTokenAddress(tokenInput);
  if (!resolved) {
    await bot.sendMessage(chatId, '❌ Invalid token address or unknown symbol.\n\nUse a valid Solana address (32-44 chars) or symbol like BONK, USDC, SOL');
    return;
  }

  // Send "analyzing" message
  const loadingMsg = await bot.sendMessage(chatId, '🔍 Analyzing token...');

  try {
    const result = await calculateTrustScore(resolved.address);

    const symbol = result.token?.symbol || resolved.symbol || 'Unknown';
    const score = result.trustScore?.score || 0;
    const grade = result.trustScore?.grade || 'F';
    const riskFactors = result.riskFactors || [];

    // TEASER: Show grade and risk level, NOT exact score
    const riskLevel = getRiskLevel(score);
    const riskEmoji = getRiskEmoji(riskLevel);
    const gradeEmoji = getGradeEmoji(grade);
    const flagsCount = riskFactors.length;
    const tradeable = score >= 50;

    const responseMessage = `
🔍 *${symbol} TrustScore Preview*

━━━━━━━━━━━━━━━━━━━━━
🏆 Grade: *${grade}* ${gradeEmoji}
⚠️ Risk Level: *${riskLevel}* ${riskEmoji}
📊 Score: *??/100* (unlock for $0.01)
${tradeable ? '✅ Tradeable: Yes' : '❌ Tradeable: No'}
${flagsCount > 0 ? `🚩 Flags: ${flagsCount} detected` : '✅ No major flags detected'}
━━━━━━━━━━━━━━━━━━━━━

${riskLevel === 'LOW' ? '✅ This token appears relatively safe.' : riskLevel === 'MEDIUM' ? '⚠️ Exercise caution with this token.' : '❌ High risk - proceed carefully.'}

💰 *Unlock full analysis for $0.01:*
• Exact score (XX/100)
• Detailed risk breakdown
• 10 specialized analyzers

🌐 https://onchainledger-production.up.railway.app
`;

    // Delete loading message and send result
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    await bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    await bot.sendMessage(chatId, `❌ Error analyzing token: ${error.message}\n\nPlease try again later.`);
  }
}

// /compare command - TEASER MODE (hides exact scores)
export async function handleCompare(bot, msg, args) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Check rate limit
  if (!checkRateLimit(userId)) {
    await bot.sendMessage(chatId, '⏳ Rate limit exceeded. Please wait a minute.');
    return;
  }

  if (!args || args.length < 2) {
    await bot.sendMessage(chatId, '❌ Please provide two tokens to compare.\n\nExample: `/compare BONK USDC`', { parse_mode: 'Markdown' });
    return;
  }

  const token1 = resolveTokenAddress(args[0]);
  const token2 = resolveTokenAddress(args[1]);

  if (!token1 || !token2) {
    await bot.sendMessage(chatId, '❌ Invalid token address or unknown symbol.');
    return;
  }

  // Send "analyzing" message
  const loadingMsg = await bot.sendMessage(chatId, '🔍 Comparing tokens...');

  try {
    // Analyze both tokens in parallel
    const [result1, result2] = await Promise.all([
      calculateTrustScore(token1.address),
      calculateTrustScore(token2.address)
    ]);

    const symbol1 = result1.token?.symbol || token1.symbol || 'Token 1';
    const symbol2 = result2.token?.symbol || token2.symbol || 'Token 2';
    const score1 = result1.trustScore?.score || 0;
    const score2 = result2.trustScore?.score || 0;
    const grade1 = result1.trustScore?.grade || 'F';
    const grade2 = result2.trustScore?.grade || 'F';

    // TEASER: Show grades and risk levels, NOT exact scores
    const riskLevel1 = getRiskLevel(score1);
    const riskLevel2 = getRiskLevel(score2);

    // Determine safer choice by grade comparison
    const gradeOrder = { 'A+': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
    const winner = (gradeOrder[grade1] || 0) >= (gradeOrder[grade2] || 0) ? symbol1 : symbol2;
    const winnerGrade = (gradeOrder[grade1] || 0) >= (gradeOrder[grade2] || 0) ? grade1 : grade2;

    const responseMessage = `
📊 *Token Comparison Preview*

┌──────────────────────────────┐
│ ${symbol1.padEnd(8)} │ ??/100 │ ${grade1} ${getGradeEmoji(grade1)} │ ${riskLevel1} │
│ ${symbol2.padEnd(8)} │ ??/100 │ ${grade2} ${getGradeEmoji(grade2)} │ ${riskLevel2} │
└──────────────────────────────┘

🏆 *Safer Choice:* ${winner} (Grade ${winnerGrade})
📈 Grade comparison: ${grade1} vs ${grade2}

${grade1 === grade2 ? 'Both tokens have similar safety grades.' : `${winner} appears safer based on grade.`}

💰 *Unlock full comparison for $0.015:*
• Exact scores (XX/100)
• Strengths & weaknesses
• AI recommendation

🌐 https://onchainledger-production.up.railway.app
`;

    await bot.deleteMessage(chatId, loadingMsg.message_id);
    await bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    await bot.sendMessage(chatId, `❌ Error comparing tokens: ${error.message}\n\nPlease try again later.`);
  }
}

// /analyze command (shows info about paid analysis)
export async function handleAnalyze(bot, msg) {
  const chatId = msg.chat.id;

  const message = `
💰 *Full Token Analysis*

The /score command gives you a free basic score.

For *detailed risk breakdown* with:
• 10 specialized analyzers
• Risk factors & positive indicators
• Authority, liquidity, honeypot checks
• Insider detection & wallet clustering

Use our API with x402 micropayments:
https://onchainledger-production.up.railway.app

Cost: *$0.01* per analysis
Payment: SOL via x402 protocol

📖 API Docs: /docs endpoint
`;

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

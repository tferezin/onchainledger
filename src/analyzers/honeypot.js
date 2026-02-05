import { simulateSell } from '../services/jupiter.js';
import { WEIGHTS } from '../utils/constants.js';

export async function analyzeHoneypot(tokenAddress) {
  const sellResult = await simulateSell(tokenAddress);

  let score = 100;
  const risks = [];
  const details = {
    isHoneypot: false,
    sellSimulation: { success: sellResult.success }
  };

  if (!sellResult.success) {
    score = 0;
    details.isHoneypot = true;
    risks.push('HONEYPOT DETECTED: Unable to sell token');
  }

  return {
    score,
    maxScore: 100,
    weight: WEIGHTS.honeypot,
    weighted: Math.round(score * WEIGHTS.honeypot),
    details,
    risks
  };
}

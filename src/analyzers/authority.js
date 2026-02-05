import { getAsset } from '../services/helius.js';
import { WEIGHTS } from '../utils/constants.js';

export async function analyzeAuthority(tokenAddress) {
  const asset = await getAsset(tokenAddress);

  let score = 100;
  const risks = [];
  const details = {
    mintAuthority: { enabled: false, address: null },
    freezeAuthority: { enabled: false, address: null },
    updateAuthority: { enabled: false, address: null }
  };

  if (asset) {
    const mintAuth = asset.authorities?.find(a => a.scopes?.includes('mint'))?.address;
    const freezeAuth = asset.authorities?.find(a => a.scopes?.includes('freeze'))?.address;
    const updateAuth = asset.authorities?.find(a => a.scopes?.includes('update'))?.address ||
                       asset.ownership?.updateAuthority;

    if (mintAuth) {
      details.mintAuthority = { enabled: true, address: mintAuth };
      score -= 40;
      risks.push('Mint authority is enabled - token supply can be increased');
    }

    if (freezeAuth) {
      details.freezeAuthority = { enabled: true, address: freezeAuth };
      score -= 50;
      risks.push('CRITICAL: Freeze authority is enabled - honeypot risk');
    }

    if (updateAuth) {
      details.updateAuthority = { enabled: true, address: updateAuth };
      score -= 10;
      risks.push('Update authority is enabled - metadata can be changed');
    }
  }

  score = Math.max(0, score);

  return {
    score,
    maxScore: 100,
    weight: WEIGHTS.authority,
    weighted: Math.round(score * WEIGHTS.authority),
    details,
    risks
  };
}

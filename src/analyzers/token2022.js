import { getAsset } from '../services/helius.js';

const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

/**
 * Analyzes a token for Token-2022 program usage and dangerous extensions
 * @param {string} tokenAddress - The token mint address to analyze
 * @returns {Promise<Object>} Analysis result with score, details, and risks
 */
export async function analyzeToken2022(tokenAddress) {
  const weight = 0.15;
  const maxScore = 100;

  const result = {
    score: 100,
    maxScore,
    weight,
    weighted: 0,
    details: {
      isToken2022: false,
      programId: null,
      extensions: [],
      transferFeePercent: null
    },
    risks: []
  };

  try {
    const asset = await getAsset(tokenAddress);

    if (!asset) {
      result.score = 50;
      result.risks.push('Unable to fetch token data');
      result.weighted = Math.round(result.score * weight);
      return result;
    }

    // Check if token uses Token-2022 program
    const programId = asset.token_info?.token_program ||
                      asset.ownership?.owner_type === 'token' && asset.ownership.owner ||
                      null;

    result.details.programId = programId;
    result.details.isToken2022 = programId === TOKEN_2022_PROGRAM_ID;

    // If not Token-2022, return with full score (no extension risks)
    if (!result.details.isToken2022) {
      result.weighted = Math.round(result.score * weight);
      return result;
    }

    // Parse extensions from asset data
    const extensions = parseExtensions(asset);
    result.details.extensions = extensions;

    // Analyze each extension and apply scoring
    for (const extension of extensions) {
      switch (extension.type) {
        case 'permanentDelegate':
          result.score -= 50;
          result.risks.push('CRITICAL: Permanent delegate can steal your tokens');
          break;

        case 'transferHook':
          result.score -= 20;
          result.risks.push('Transfer hook detected - arbitrary code execution');
          break;

        case 'pausable':
        case 'mintCloseAuthority':
          result.score -= 30;
          result.risks.push('Token can be paused by authority');
          break;

        case 'transferFee':
          const feePercent = extension.feePercent || 0;
          result.details.transferFeePercent = feePercent;
          if (feePercent > 5) {
            result.score -= 20;
            result.risks.push(`High transfer fee: ${feePercent}%`);
          }
          break;

        case 'nonTransferable':
          result.score -= 10;
          result.risks.push('Token is non-transferable (soulbound)');
          break;
      }
    }

    // Ensure score doesn't go below 0
    result.score = Math.max(0, result.score);
    result.weighted = Math.round(result.score * weight);

    return result;

  } catch (error) {
    console.error('Error analyzing Token-2022:', error.message);
    result.score = 50;
    result.risks.push(`Analysis error: ${error.message}`);
    result.weighted = Math.round(result.score * weight);
    return result;
  }
}

/**
 * Parses extensions from Helius asset data
 * @param {Object} asset - The asset data from Helius
 * @returns {Array} Array of extension objects with type and metadata
 */
function parseExtensions(asset) {
  const extensions = [];

  // Check for extensions in various possible locations in the asset data
  const mintExtensions = asset.mint_extensions ||
                         asset.token_info?.mint_extensions ||
                         asset.content?.metadata?.extensions ||
                         [];

  // If extensions is an object, convert to array
  const extensionList = Array.isArray(mintExtensions)
    ? mintExtensions
    : Object.entries(mintExtensions).map(([key, value]) => ({ type: key, ...value }));

  for (const ext of extensionList) {
    const extType = ext.type || ext.extension || ext.name;

    if (!extType) continue;

    const normalizedType = normalizeExtensionType(extType);

    if (normalizedType) {
      const extension = { type: normalizedType };

      // Extract transfer fee percentage if applicable
      if (normalizedType === 'transferFee') {
        const feeConfig = ext.state || ext.transferFeeConfig || ext;
        const feeBasisPoints = feeConfig.transferFeeBasisPoints ||
                               feeConfig.newerTransferFee?.transferFeeBasisPoints ||
                               feeConfig.olderTransferFee?.transferFeeBasisPoints ||
                               0;
        extension.feePercent = feeBasisPoints / 100; // Convert basis points to percentage
      }

      extensions.push(extension);
    }
  }

  // Also check for specific flags in the asset
  if (asset.mutable === false || asset.burnt) {
    // These are informational but not dangerous extensions
  }

  // Check for permanent delegate in ownership or authorities
  if (asset.ownership?.delegate && asset.ownership?.delegated) {
    const authorities = asset.authorities || [];
    const hasPermanentDelegate = authorities.some(auth =>
      auth.scopes?.includes('permanent_delegate') ||
      auth.scopes?.includes('PermanentDelegate')
    );
    if (hasPermanentDelegate && !extensions.some(e => e.type === 'permanentDelegate')) {
      extensions.push({ type: 'permanentDelegate' });
    }
  }

  return extensions;
}

/**
 * Normalizes extension type strings to standard format
 * @param {string} extType - The extension type string
 * @returns {string|null} Normalized extension type or null if not recognized
 */
function normalizeExtensionType(extType) {
  const typeMap = {
    'permanentdelegate': 'permanentDelegate',
    'permanent_delegate': 'permanentDelegate',
    'PermanentDelegate': 'permanentDelegate',
    'transferhook': 'transferHook',
    'transfer_hook': 'transferHook',
    'TransferHook': 'transferHook',
    'transferhookaccount': 'transferHook',
    'TransferHookAccount': 'transferHook',
    'pausable': 'pausable',
    'Pausable': 'pausable',
    'mintcloseauthority': 'mintCloseAuthority',
    'mint_close_authority': 'mintCloseAuthority',
    'MintCloseAuthority': 'mintCloseAuthority',
    'transferfee': 'transferFee',
    'transfer_fee': 'transferFee',
    'TransferFee': 'transferFee',
    'transferfeeconfig': 'transferFee',
    'TransferFeeConfig': 'transferFee',
    'nontransferable': 'nonTransferable',
    'non_transferable': 'nonTransferable',
    'NonTransferable': 'nonTransferable',
    'nonTransferableAccount': 'nonTransferable',
    'NonTransferableAccount': 'nonTransferable'
  };

  const normalizedKey = extType.toLowerCase().replace(/[-_]/g, '');

  for (const [key, value] of Object.entries(typeMap)) {
    if (key.toLowerCase().replace(/[-_]/g, '') === normalizedKey) {
      return value;
    }
  }

  return null;
}

export default analyzeToken2022;

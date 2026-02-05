import { Router } from 'express';
import { calculateTrustScore } from '../services/trustscore.js';
import { getCache, setCache, getCacheExpiration } from '../utils/cache.js';
import { validateTokenAddress, handleValidationErrors, isValidSolanaAddress } from '../middleware/validation.js';
import { createSafeError, logError } from '../utils/errors.js';

const router = Router();

router.post('/:tokenAddress', validateTokenAddress, handleValidationErrors, async (req, res) => {
  try {
    const { tokenAddress } = req.params;

    // Additional validation (defense in depth)
    if (!isValidSolanaAddress(tokenAddress)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid Solana address format'
      });
    }

    const cached = getCache(tokenAddress);
    if (cached) {
      return res.json(cached);
    }

    const result = await calculateTrustScore(tokenAddress);

    result.metadata = {
      analyzedAt: new Date().toISOString(),
      cacheExpires: getCacheExpiration()
    };

    setCache(tokenAddress, result);
    res.json(result);
  } catch (error) {
    logError(error, {
      path: req.path,
      method: req.method
    });

    // Don't expose internal error details
    const safeError = createSafeError(error, 'EXTERNAL_API');
    res.status(500).json(safeError);
  }
});

export default router;

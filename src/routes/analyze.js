import { Router } from 'express';
import { calculateTrustScore } from '../services/trustscore.js';
import { getCache, setCache, getCacheExpiration } from '../utils/cache.js';
import { SOLANA_ADDRESS_REGEX } from '../utils/constants.js';

const router = Router();

router.post('/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;

    if (!SOLANA_ADDRESS_REGEX.test(tokenAddress)) {
      return res.status(400).json({ error: 'Invalid Solana address format' });
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
    console.error('Analysis error:', error.message);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
});

export default router;

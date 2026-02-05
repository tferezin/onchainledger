import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    config: {
      heliusConfigured: !!process.env.HELIUS_API_KEY,
      birdeyeConfigured: !!process.env.BIRDEYE_API_KEY
    }
  });
});

export default router;

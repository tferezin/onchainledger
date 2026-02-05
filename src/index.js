import 'dotenv/config';
import { createServer } from './server.js';

const PORT = process.env.PORT || 3000;

const app = createServer();

app.listen(PORT, () => {
  console.log(`OnChainLedger API running on port ${PORT}`);
});

export const WEIGHTS = {
  authority: 0.30,
  holders: 0.25,
  liquidity: 0.20,
  honeypot: 0.15,
  age: 0.10
};

export const GRADES = [
  { min: 90, grade: 'A+', verdict: 'VERY HIGH CONFIDENCE' },
  { min: 80, grade: 'A', verdict: 'HIGH CONFIDENCE' },
  { min: 70, grade: 'B', verdict: 'MODERATE CONFIDENCE' },
  { min: 50, grade: 'C', verdict: 'LOW CONFIDENCE' },
  { min: 25, grade: 'D', verdict: 'VERY LOW CONFIDENCE' },
  { min: 0, grade: 'F', verdict: 'LIKELY SCAM' }
];

export const CACHE_TTL = 15 * 60; // 15 minutes in seconds

export const HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com';
export const HELIUS_API_URL = 'https://api.helius.xyz/v0';
export const BIRDEYE_API_URL = 'https://public-api.birdeye.so';
export const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';

export const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

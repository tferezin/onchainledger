// Configuration validation and secure access
// Never log API keys or sensitive data

const REQUIRED_VARS = [
  'HELIUS_API_KEY',
  'BIRDEYE_API_KEY'
];

const OPTIONAL_VARS = [
  'PORT',
  'NODE_ENV',
  'X402_WALLET_ADDRESS',
  'BASE_URL'
];

// Validate all required environment variables exist
export function validateConfig() {
  const missing = [];
  const errors = [];

  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    } else if (process.env[varName].length < 10) {
      errors.push(`${varName} appears to be invalid (too short)`);
    }
  }

  if (missing.length > 0) {
    console.error('FATAL: Missing required environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('\nPlease set these variables and restart the server.');
    process.exit(1);
  }

  if (errors.length > 0) {
    console.error('WARNING: Configuration issues detected:');
    errors.forEach(e => console.error(`  - ${e}`));
  }

  // Log config status (without revealing values)
  console.log('Configuration validated:');
  console.log(`  - Required vars: ${REQUIRED_VARS.length}/${REQUIRED_VARS.length} set`);
  console.log(`  - Optional vars: ${OPTIONAL_VARS.filter(v => process.env[v]).length}/${OPTIONAL_VARS.length} set`);
  console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
}

// Secure config getters - never return raw keys
export const config = {
  get port() {
    return parseInt(process.env.PORT) || 3000;
  },

  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },

  get isDevelopment() {
    return process.env.NODE_ENV !== 'production';
  },

  // Check if API is configured (without exposing key)
  get hasHeliusKey() {
    return !!process.env.HELIUS_API_KEY;
  },

  get hasBirdeyeKey() {
    return !!process.env.BIRDEYE_API_KEY;
  },

  get hasX402Wallet() {
    return !!process.env.X402_WALLET_ADDRESS;
  },

  // Get base URL for callbacks
  get baseUrl() {
    return process.env.BASE_URL || `http://localhost:${this.port}`;
  },

  // Safe way to get API keys (only for internal use)
  getHeliusKey() {
    return process.env.HELIUS_API_KEY;
  },

  getBirdeyeKey() {
    return process.env.BIRDEYE_API_KEY;
  },

  getX402Wallet() {
    return process.env.X402_WALLET_ADDRESS;
  }
};

// Freeze config object to prevent modification
Object.freeze(config);

export default config;

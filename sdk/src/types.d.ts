/**
 * TypeScript definitions for @onchainledger/sdk
 */

export interface OnChainLedgerOptions {
  /** API base URL (defaults to production) */
  baseUrl?: string;
  /** Solana wallet for x402 payments */
  wallet?: SolanaWallet;
  /** Callback when payment is required */
  onPaymentRequired?: (paymentInfo: PaymentInfo) => Promise<void>;
}

export interface SolanaWallet {
  publicKey: { toBase58(): string };
  sendTransaction(transaction: any, connection: any): Promise<string>;
}

export interface ScoreResponse {
  token: string;
  symbol: string;
  name: string;
  score: number;
  grade: string;
  verdict: string;
  message: string;
  cachedAt: string;
  cacheExpiresIn: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  config: {
    heliusConfigured: boolean;
    birdeyeConfigured: boolean;
  };
}

export interface TrustScore {
  score: number;
  grade: string;
  verdict: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals?: number;
}

export interface AnalyzerResult {
  score: number;
  weighted: number;
  details?: Record<string, any>;
}

export interface AnalysisResponse {
  token: TokenInfo;
  trustScore: TrustScore;
  breakdown: Record<string, AnalyzerResult>;
  riskFactors: string[];
  positiveFactors: string[];
  metadata: {
    analyzedAt: string;
    cacheExpires: string;
  };
}

export interface BatchSummary {
  requested: number;
  analyzed: number;
  failed: number;
  safest: { token: string; address: string; score: number } | null;
  riskiest: { token: string; address: string; score: number } | null;
}

export interface BatchPricing {
  perToken: number;
  total: number;
  discount: string;
  lamports: string;
}

export interface BatchResponse {
  results: AnalysisResponse[];
  summary: BatchSummary;
  pricing: BatchPricing;
  errors?: Array<{ token: string; error: string }>;
  metadata: {
    analyzedAt: string;
  };
}

export interface ComparisonItem {
  token: string;
  address: string;
  score: number;
  grade: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CompareWinner {
  token: string;
  address: string;
  score: number;
  reason: string;
}

export interface CompareResponse {
  comparison: ComparisonItem[];
  winner: CompareWinner;
  recommendation: string;
  metadata: {
    comparedAt: string;
    tokenCount: number;
  };
}

export interface PaymentAccept {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  payTo: string;
  description: string;
  mimeType: string;
  paymentMethods: string[];
  extra: Record<string, any>;
}

export interface PaymentInfo {
  error: string;
  x402Version: number;
  accepts: PaymentAccept[];
  message: string;
}

export interface SafetyCheck {
  safe: boolean;
  score: number;
  grade: string;
  reason: string;
}

export class OnChainLedgerError extends Error {
  statusCode: number;
  constructor(message: string, statusCode?: number);
}

export class PaymentRequiredError extends OnChainLedgerError {
  paymentInfo: PaymentInfo;
  constructor(paymentInfo: PaymentInfo);
}

export class OnChainLedger {
  constructor(options?: OnChainLedgerOptions);

  // Free endpoints
  getScore(tokenAddress: string): Promise<ScoreResponse>;
  health(): Promise<HealthResponse>;

  // Paid endpoints
  analyze(tokenAddress: string, paymentSignature?: string): Promise<AnalysisResponse>;
  analyzeBatch(tokenAddresses: string[], paymentSignature?: string): Promise<BatchResponse>;
  compare(tokenAddresses: string[], paymentSignature?: string): Promise<CompareResponse>;

  // Utility methods
  isSafe(tokenAddress: string, minScore?: number): Promise<SafetyCheck>;
  getPaymentInfo(endpoint: 'analyze' | 'batch' | 'compare', params?: Record<string, any>): Promise<PaymentInfo>;
}

export default OnChainLedger;

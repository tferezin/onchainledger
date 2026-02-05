/**
 * OnChainLedger API Client
 * Official SDK for token intelligence API
 */

const DEFAULT_BASE_URL = 'https://onchainledger-production.up.railway.app';

export class OnChainLedger {
  /**
   * Create a new OnChainLedger client
   * @param {Object} options - Configuration options
   * @param {string} [options.baseUrl] - API base URL (defaults to production)
   * @param {Object} [options.wallet] - Solana wallet for x402 payments (optional for free endpoints)
   * @param {Function} [options.onPaymentRequired] - Callback when payment is required
   */
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.wallet = options.wallet || null;
    this.onPaymentRequired = options.onPaymentRequired || null;
  }

  /**
   * Make HTTP request to the API
   * @private
   */
  async _request(method, path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const fetchOptions = {
      method,
      headers
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    // Handle 402 Payment Required
    if (response.status === 402) {
      const paymentInfo = await response.json();

      if (this.onPaymentRequired) {
        await this.onPaymentRequired(paymentInfo);
      }

      throw new PaymentRequiredError(paymentInfo);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new OnChainLedgerError(error.message || error.error, response.status);
    }

    return response.json();
  }

  /**
   * Make paid request with automatic payment handling
   * @private
   */
  async _paidRequest(method, path, options = {}) {
    try {
      // First attempt without payment
      return await this._request(method, path, options);
    } catch (error) {
      if (error instanceof PaymentRequiredError && this.wallet) {
        // Auto-pay if wallet is configured
        const paymentInfo = error.paymentInfo;
        const payTo = paymentInfo.accepts?.[0]?.payTo;
        const amount = parseInt(paymentInfo.accepts?.[0]?.maxAmountRequired || '10000');

        if (payTo && this.wallet.sendTransaction) {
          try {
            // Send payment
            const signature = await this._sendPayment(payTo, amount);

            // Retry with payment signature
            return await this._request(method, path, {
              ...options,
              headers: {
                ...options.headers,
                'X-Payment': signature
              }
            });
          } catch (paymentError) {
            throw new OnChainLedgerError(`Payment failed: ${paymentError.message}`, 402);
          }
        }
      }
      throw error;
    }
  }

  /**
   * Send SOL payment to the specified address
   * @private
   */
  async _sendPayment(toAddress, lamports) {
    if (!this.wallet) {
      throw new OnChainLedgerError('Wallet not configured for payments', 402);
    }

    // This is a simplified implementation
    // In production, you'd use @solana/web3.js properly
    if (this.wallet.sendTransaction) {
      const { Connection, PublicKey, Transaction, SystemProgram } = await import('@solana/web3.js');

      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const toPubkey = new PublicKey(toAddress);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.wallet.publicKey,
          toPubkey,
          lamports
        })
      );

      const signature = await this.wallet.sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature);

      return signature;
    }

    throw new OnChainLedgerError('Wallet does not support sendTransaction', 402);
  }

  // ==================== FREE ENDPOINTS ====================

  /**
   * Get basic trust score (FREE - no payment required)
   * @param {string} tokenAddress - Solana token mint address
   * @returns {Promise<ScoreResponse>}
   */
  async getScore(tokenAddress) {
    return this._request('GET', `/score/${tokenAddress}`);
  }

  /**
   * Check API health status (FREE)
   * @returns {Promise<HealthResponse>}
   */
  async health() {
    return this._request('GET', '/health');
  }

  // ==================== PAID ENDPOINTS ====================

  /**
   * Get full token analysis (PAID - x402 payment required)
   * @param {string} tokenAddress - Solana token mint address
   * @param {string} [paymentSignature] - Pre-paid transaction signature
   * @returns {Promise<AnalysisResponse>}
   */
  async analyze(tokenAddress, paymentSignature = null) {
    const options = {};

    if (paymentSignature) {
      options.headers = { 'X-Payment': paymentSignature };
    }

    if (paymentSignature) {
      return this._request('POST', `/analyze/${tokenAddress}`, options);
    }

    return this._paidRequest('POST', `/analyze/${tokenAddress}`, options);
  }

  /**
   * Analyze multiple tokens (PAID - volume discounts available)
   * @param {string[]} tokenAddresses - Array of token addresses (max 20)
   * @param {string} [paymentSignature] - Pre-paid transaction signature
   * @returns {Promise<BatchResponse>}
   */
  async analyzeBatch(tokenAddresses, paymentSignature = null) {
    const options = {
      body: { tokens: tokenAddresses }
    };

    if (paymentSignature) {
      options.headers = { 'X-Payment': paymentSignature };
      return this._request('POST', '/analyze/batch', options);
    }

    return this._paidRequest('POST', '/analyze/batch', options);
  }

  /**
   * Compare multiple tokens side-by-side (PAID)
   * @param {string[]} tokenAddresses - Array of 2-5 token addresses
   * @param {string} [paymentSignature] - Pre-paid transaction signature
   * @returns {Promise<CompareResponse>}
   */
  async compare(tokenAddresses, paymentSignature = null) {
    const options = {
      body: { tokens: tokenAddresses }
    };

    if (paymentSignature) {
      options.headers = { 'X-Payment': paymentSignature };
      return this._request('POST', '/compare', options);
    }

    return this._paidRequest('POST', '/compare', options);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if a token is safe to trade (convenience method)
   * @param {string} tokenAddress - Token to check
   * @param {number} [minScore=70] - Minimum acceptable score
   * @returns {Promise<{safe: boolean, score: number, grade: string, reason: string}>}
   */
  async isSafe(tokenAddress, minScore = 70) {
    const result = await this.getScore(tokenAddress);

    return {
      safe: result.score >= minScore,
      score: result.score,
      grade: result.grade,
      reason: result.score >= minScore
        ? `Token scored ${result.score}/100 (${result.grade}) - meets minimum threshold of ${minScore}`
        : `Token scored ${result.score}/100 (${result.grade}) - below minimum threshold of ${minScore}`
    };
  }

  /**
   * Get payment info for an endpoint without making payment
   * @param {string} endpoint - 'analyze', 'batch', or 'compare'
   * @param {Object} [params] - Parameters for the endpoint
   * @returns {Promise<PaymentInfo>}
   */
  async getPaymentInfo(endpoint, params = {}) {
    try {
      switch (endpoint) {
        case 'analyze':
          await this._request('POST', `/analyze/${params.token || 'test'}`);
          break;
        case 'batch':
          await this._request('POST', '/analyze/batch', { body: { tokens: params.tokens || ['test'] } });
          break;
        case 'compare':
          await this._request('POST', '/compare', { body: { tokens: params.tokens || ['test1', 'test2'] } });
          break;
        default:
          throw new OnChainLedgerError(`Unknown endpoint: ${endpoint}`);
      }
    } catch (error) {
      if (error instanceof PaymentRequiredError) {
        return error.paymentInfo;
      }
      throw error;
    }
  }
}

// ==================== ERROR CLASSES ====================

export class OnChainLedgerError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'OnChainLedgerError';
    this.statusCode = statusCode;
  }
}

export class PaymentRequiredError extends OnChainLedgerError {
  constructor(paymentInfo) {
    super('Payment required for this endpoint', 402);
    this.name = 'PaymentRequiredError';
    this.paymentInfo = paymentInfo;
  }
}

export default OnChainLedger;

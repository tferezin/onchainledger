/**
 * @onchainledger/sdk
 * Official SDK for OnChainLedger Token Intelligence API
 *
 * @example
 * ```javascript
 * import { OnChainLedger } from '@onchainledger/sdk';
 *
 * const client = new OnChainLedger();
 *
 * // Free score check
 * const score = await client.getScore('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
 * console.log(`Score: ${score.score}/100 (${score.grade})`);
 * ```
 */

export { OnChainLedger, OnChainLedgerError, PaymentRequiredError } from './client.js';

// Default export
export { OnChainLedger as default } from './client.js';

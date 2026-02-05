import axios from 'axios';
import { HELIUS_RPC_URL, HELIUS_API_URL } from '../utils/constants.js';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

export async function getAsset(tokenAddress) {
  try {
    const response = await axios.post(
      `${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`,
      {
        jsonrpc: '2.0',
        id: 'get-asset',
        method: 'getAsset',
        params: { id: tokenAddress }
      },
      { timeout: 10000 }
    );
    return response.data.result;
  } catch (error) {
    console.error('Helius getAsset error:', error.message);
    return null;
  }
}

export async function getTokenLargestAccounts(tokenAddress) {
  try {
    const response = await axios.post(
      `${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`,
      {
        jsonrpc: '2.0',
        id: 'largest-accounts',
        method: 'getTokenLargestAccounts',
        params: [tokenAddress]
      },
      { timeout: 10000 }
    );
    return response.data.result?.value || [];
  } catch (error) {
    console.error('Helius getTokenLargestAccounts error:', error.message);
    return [];
  }
}

export async function getTokenSupply(tokenAddress) {
  try {
    const response = await axios.post(
      `${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`,
      {
        jsonrpc: '2.0',
        id: 'token-supply',
        method: 'getTokenSupply',
        params: [tokenAddress]
      },
      { timeout: 10000 }
    );
    return response.data.result?.value || null;
  } catch (error) {
    console.error('Helius getTokenSupply error:', error.message);
    return null;
  }
}

export async function getSignaturesForAddress(address, options = {}) {
  try {
    const response = await axios.post(
      `${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`,
      {
        jsonrpc: '2.0',
        id: 'get-signatures',
        method: 'getSignaturesForAddress',
        params: [
          address,
          {
            limit: options.limit || 100,
            before: options.before || undefined,
            until: options.until || undefined
          }
        ]
      },
      { timeout: 15000 }
    );
    return response.data.result || [];
  } catch (error) {
    console.error('Helius getSignaturesForAddress error:', error.message);
    return [];
  }
}

export async function getParsedTransactions(signatures) {
  try {
    const response = await axios.post(
      `${HELIUS_API_URL}/transactions/?api-key=${HELIUS_API_KEY}`,
      {
        transactions: signatures
      },
      { timeout: 30000 }
    );
    return response.data || [];
  } catch (error) {
    console.error('Helius getParsedTransactions error:', error.message);
    return [];
  }
}

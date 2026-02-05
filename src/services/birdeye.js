import axios from 'axios';
import { BIRDEYE_API_URL } from '../utils/constants.js';

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

export async function getOHLCV(tokenAddress, type = '1H', timeFrom, timeTo) {
  try {
    const response = await axios.get(
      `${BIRDEYE_API_URL}/defi/ohlcv`,
      {
        params: {
          address: tokenAddress,
          type,
          time_from: timeFrom,
          time_to: timeTo
        },
        headers: {
          'X-API-KEY': BIRDEYE_API_KEY,
          'x-chain': 'solana'
        },
        timeout: 15000
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('Birdeye getOHLCV error:', error.message);
    return null;
  }
}

export async function getTokenOverview(tokenAddress) {
  try {
    const response = await axios.get(
      `${BIRDEYE_API_URL}/defi/token_overview`,
      {
        params: { address: tokenAddress },
        headers: {
          'X-API-KEY': BIRDEYE_API_KEY,
          'x-chain': 'solana'
        },
        timeout: 10000
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('Birdeye getTokenOverview error:', error.message);
    return null;
  }
}

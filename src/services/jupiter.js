import axios from 'axios';
import { JUPITER_API_URL } from '../utils/constants.js';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

export async function simulateSell(tokenAddress, amount = 1000000) {
  try {
    // Use SOL as output if token is USDC, otherwise use USDC
    const outputMint = tokenAddress === USDC_MINT ? SOL_MINT : USDC_MINT;

    const response = await axios.get(
      `${JUPITER_API_URL}/quote`,
      {
        params: {
          inputMint: tokenAddress,
          outputMint: outputMint,
          amount: amount,
          slippageBps: 500
        },
        timeout: 10000
      }
    );
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Jupiter simulateSell error:', error.message);
    return { success: false, error: error.message };
  }
}

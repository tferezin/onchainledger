import { getOHLCV, getTokenOverview } from '../services/birdeye.js';

const WEIGHT = 0.07;

/**
 * Analyze price history to detect pump & dump patterns
 * @param {string} tokenAddress - The token address to analyze
 * @returns {Promise<Object>} Analysis result with score and risk details
 */
export async function analyzePriceHistory(tokenAddress) {
  let score = 100;
  const risks = [];
  const details = {
    majorDrops: 0,
    largestDrop: 0,
    volumeAnomalies: false,
    suspiciousPriceAction: false,
    priceChange24h: 0,
    priceChange7d: 0
  };

  try {
    // Get current time and calculate time ranges
    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60);
    const oneDayAgo = now - (24 * 60 * 60);

    // Fetch OHLCV data for the past 7 days (hourly)
    const ohlcvData = await getOHLCV(tokenAddress, '1H', sevenDaysAgo, now);

    // Also get token overview for additional price change data
    const overview = await getTokenOverview(tokenAddress);

    if (overview) {
      details.priceChange24h = overview.priceChange24hPercent || 0;
      // Calculate approximate 7d change from OHLCV if available
    }

    if (!ohlcvData || !ohlcvData.items || ohlcvData.items.length === 0) {
      // Unable to fetch price history, return neutral score
      return {
        score: 50,
        maxScore: 100,
        weight: WEIGHT,
        weighted: Math.round(50 * WEIGHT),
        details,
        risks: ['Unable to fetch price history data']
      };
    }

    const candles = ohlcvData.items;

    // Calculate price changes and detect major drops
    const priceDrops = [];
    let maxPrice = 0;
    let minPriceAfterMax = Infinity;

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const high = candle.h || candle.high || 0;
      const low = candle.l || candle.low || 0;
      const close = candle.c || candle.close || 0;

      // Track max price and subsequent drops
      if (high > maxPrice) {
        maxPrice = high;
        minPriceAfterMax = low;
      } else if (low < minPriceAfterMax) {
        minPriceAfterMax = low;
      }

      // Check for significant drops within candle (high to low)
      if (high > 0) {
        const candleDrop = ((high - low) / high) * 100;
        if (candleDrop > 50) {
          priceDrops.push(candleDrop);
        }
      }

      // Check for drops between consecutive candles
      if (i > 0) {
        const prevCandle = candles[i - 1];
        const prevHigh = prevCandle.h || prevCandle.high || 0;
        if (prevHigh > 0 && low < prevHigh) {
          const dropPercent = ((prevHigh - low) / prevHigh) * 100;
          if (dropPercent > 50) {
            priceDrops.push(dropPercent);
          }
        }
      }
    }

    // Calculate overall largest drop from peak
    if (maxPrice > 0 && minPriceAfterMax < maxPrice) {
      const overallDrop = ((maxPrice - minPriceAfterMax) / maxPrice) * 100;
      details.largestDrop = Math.round(overallDrop * 100) / 100;
    }

    details.majorDrops = priceDrops.length;

    // Calculate 7-day price change
    if (candles.length > 0) {
      const firstCandle = candles[0];
      const lastCandle = candles[candles.length - 1];
      const firstPrice = firstCandle.o || firstCandle.open || 0;
      const lastPrice = lastCandle.c || lastCandle.close || 0;

      if (firstPrice > 0) {
        details.priceChange7d = Math.round(((lastPrice - firstPrice) / firstPrice) * 10000) / 100;
      }
    }

    // Detect volume anomalies (sudden spikes followed by crashes)
    details.volumeAnomalies = detectVolumeAnomalies(candles);

    // Detect pump & dump patterns
    details.suspiciousPriceAction = detectPumpAndDump(candles);

    // Apply scoring based on findings
    if (details.majorDrops > 2) {
      score -= 15;
      risks.push(`History of major price drops (${details.majorDrops} drops >50%)`);
    }

    if (details.largestDrop > 80) {
      score -= 20;
      risks.push(`Extreme price drop detected (${details.largestDrop}%)`);
    }

    if (details.volumeAnomalies) {
      score -= 10;
      risks.push('Suspicious volume patterns detected');
    }

    if (details.suspiciousPriceAction) {
      score -= 15;
      risks.push('Pump and dump pattern detected');
    }

    // Ensure score stays within bounds
    score = Math.max(0, Math.min(100, score));

  } catch (error) {
    console.error('Price history analysis error:', error.message);
    return {
      score: 50,
      maxScore: 100,
      weight: WEIGHT,
      weighted: Math.round(50 * WEIGHT),
      details,
      risks: ['Error analyzing price history']
    };
  }

  return {
    score,
    maxScore: 100,
    weight: WEIGHT,
    weighted: Math.round(score * WEIGHT),
    details,
    risks
  };
}

/**
 * Detect volume anomalies - sudden spikes followed by crashes
 * @param {Array} candles - OHLCV candle data
 * @returns {boolean} True if volume anomalies detected
 */
function detectVolumeAnomalies(candles) {
  if (!candles || candles.length < 10) return false;

  // Calculate average volume
  const volumes = candles.map(c => c.v || c.volume || 0);
  const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;

  if (avgVolume === 0) return false;

  // Look for volume spikes (>5x average) followed by significant drops
  for (let i = 1; i < candles.length - 1; i++) {
    const currentVolume = volumes[i];
    const nextVolume = volumes[i + 1];

    // Check for volume spike
    if (currentVolume > avgVolume * 5) {
      // Check if followed by volume crash and price drop
      const currentPrice = candles[i].c || candles[i].close || 0;
      const nextPrice = candles[i + 1].c || candles[i + 1].close || 0;

      if (nextVolume < currentVolume * 0.3 && nextPrice < currentPrice * 0.7) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detect pump and dump patterns
 * @param {Array} candles - OHLCV candle data
 * @returns {boolean} True if pump and dump pattern detected
 */
function detectPumpAndDump(candles) {
  if (!candles || candles.length < 5) return false;

  // Look for rapid price increase followed by rapid decrease
  let maxPumpPercent = 0;
  let subsequentDumpPercent = 0;
  let pumpPeakIndex = -1;

  // Find the biggest pump
  for (let i = 1; i < candles.length; i++) {
    const prevLow = candles[i - 1].l || candles[i - 1].low || 0;
    const currentHigh = candles[i].h || candles[i].high || 0;

    if (prevLow > 0) {
      const pumpPercent = ((currentHigh - prevLow) / prevLow) * 100;
      if (pumpPercent > maxPumpPercent) {
        maxPumpPercent = pumpPercent;
        pumpPeakIndex = i;
      }
    }
  }

  // If we found a significant pump (>100%), check for subsequent dump
  if (maxPumpPercent > 100 && pumpPeakIndex > -1 && pumpPeakIndex < candles.length - 1) {
    const peakPrice = candles[pumpPeakIndex].h || candles[pumpPeakIndex].high || 0;

    // Find the lowest price after the peak
    let lowestAfterPeak = peakPrice;
    for (let i = pumpPeakIndex + 1; i < candles.length; i++) {
      const low = candles[i].l || candles[i].low || 0;
      if (low < lowestAfterPeak) {
        lowestAfterPeak = low;
      }
    }

    if (peakPrice > 0) {
      subsequentDumpPercent = ((peakPrice - lowestAfterPeak) / peakPrice) * 100;
    }

    // Pump and dump: >100% pump followed by >50% dump
    if (maxPumpPercent > 100 && subsequentDumpPercent > 50) {
      return true;
    }
  }

  return false;
}

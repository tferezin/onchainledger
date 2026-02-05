// Request timeout middleware

// Default timeouts
const REQUEST_TIMEOUT = 30000; // 30 seconds for entire request
const EXTERNAL_API_TIMEOUT = 10000; // 10 seconds for external APIs

// Request timeout middleware
export function requestTimeout(timeout = REQUEST_TIMEOUT) {
  return (req, res, next) => {
    // Set timeout on the request
    req.setTimeout(timeout);

    // Track if response was sent
    let responded = false;

    // Create timeout handler
    const timeoutHandler = setTimeout(() => {
      if (!responded && !res.headersSent) {
        responded = true;
        res.status(504).json({
          error: 'Gateway Timeout',
          message: 'Request timed out. Please try again.'
        });
      }
    }, timeout);

    // Clear timeout when response finishes
    res.on('finish', () => {
      responded = true;
      clearTimeout(timeoutHandler);
    });

    res.on('close', () => {
      responded = true;
      clearTimeout(timeoutHandler);
    });

    next();
  };
}

// Wrapper for external API calls with timeout
export async function withTimeout(promise, timeout = EXTERNAL_API_TIMEOUT, apiName = 'External API') {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${apiName} request timed out after ${timeout}ms`));
    }, timeout);
  });

  return Promise.race([promise, timeoutPromise]);
}

// Create AbortController with timeout
export function createTimeoutController(timeout = EXTERNAL_API_TIMEOUT) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  return {
    controller,
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  };
}

// Fetch with timeout
export async function fetchWithTimeout(url, options = {}, timeout = EXTERNAL_API_TIMEOUT) {
  const { controller, signal, clear } = createTimeoutController(timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal
    });
    clear();
    return response;
  } catch (error) {
    clear();
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${new URL(url).hostname} timed out`);
    }
    throw error;
  }
}

export { REQUEST_TIMEOUT, EXTERNAL_API_TIMEOUT };

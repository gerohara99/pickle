// Utility functions for network requests and connectivity

// Use node-fetch for server-side requests
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

/**
 * Retry an async function with delay.
 * @param {Function} fn - The async function to retry.
 * @param {number} retries - Number of attempts.
 * @param {number} delay - Delay in ms between attempts.
 * @returns {Promise<any>}
 */
export async function retryAsync(fn, retries = 3, delay = 500) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Only retry for network errors (can be customized)
      if (
        err instanceof TypeError ||
        (err.message && err.message.includes("Network"))
      ) {
        await new Promise((res) => setTimeout(res, delay));
      } else {
        break;
      }
    }
  }
  throw lastErr;
}

export async function isServerReachable(url = "/health") {
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok;
  } catch (err) {
    return false;
  }
}

export async function getRequest(url) {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.json();
}

export async function postRequest(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`POST ${url} failed: ${response.status}`);
  return response.json();
}

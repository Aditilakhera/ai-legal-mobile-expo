/**
 * AI Legal Mobile - Request Retry Strategy
 * Adds resilience to network calls by retrying on transient failures.
 */

import { AxiosInstance, AxiosError } from 'axios';

interface RetryConfig {
  retries?: number;
  retryDelayFactorMs?: number;
  retryableStatuses?: number[];
}

/**
 * Checks if the error is transient and should be retried.
 */
export function isRetryableError(error: AxiosError, retryableStatuses: number[]): boolean {
  // Retry on network/timeout errors (no response)
  if (!error.response) {
    return true;
  }

  // Retry on rate-limits (429) or transient server errors (5xx)
  const status = error.response.status;
  return retryableStatuses.includes(status) || status >= 500;
}

/**
 * Configures an Axios instance with standard retry interceptors.
 */
export function configureAxiosRetry(axiosInstance: AxiosInstance, config: RetryConfig = {}) {
  const {
    retries = 3,
    retryDelayFactorMs = 1000,
    retryableStatuses = [429, 502, 503, 504],
  } = config;

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const axiosConfig = error.config as any;

      if (!axiosConfig) {
        return Promise.reject(error);
      }

      // Initialize retry tracking
      axiosConfig.__retryCount = axiosConfig.__retryCount || 0;

      const shouldRetry =
        axiosConfig.__retryCount < retries && isRetryableError(error, retryableStatuses);

      if (shouldRetry) {
        axiosConfig.__retryCount += 1;

        // Exponential backoff: delay = factor * 2^(retryCount - 1)
        const delay = retryDelayFactorMs * Math.pow(2, axiosConfig.__retryCount - 1);
        
        // Log retry attempt for developer transparency
        console.warn(
          `[API] Request to ${axiosConfig.url} failed. Retrying in ${delay}ms (Attempt ${axiosConfig.__retryCount}/${retries})...`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return axiosInstance(axiosConfig);
      }

      return Promise.reject(error);
    }
  );
}

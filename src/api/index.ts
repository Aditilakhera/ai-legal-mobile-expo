/**
 * AI Legal Mobile - API Layer
 * Consolidated exports for Axios clients, network retry configurations, and parsing errors.
 */

export { apiClient, registerAuthHandlers, uploadFileMultipart, streamAIResponse } from './client';
export { configureAxiosRetry, isRetryableError } from './retry';
export { AppError, NetworkError, AuthError, ValidationError, ApiServerError, parseApiError } from './errors';

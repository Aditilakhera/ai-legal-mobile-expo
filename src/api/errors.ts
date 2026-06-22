/**
 * AI Legal Mobile - Custom API Exceptions & Error Parser
 * Standardizes errors caught from network requests into unified types.
 */

import { ApiErrorResponse } from '../types/api';

export class AppError extends Error {
  public readonly code?: string;
  public readonly statusCode?: number;
  public readonly details?: string;

  constructor(message: string, statusCode?: number, code?: string, details?: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NetworkError extends AppError {
  constructor(message = 'No internet connection. Please check your connectivity.') {
    super(message, 0, 'NETWORK_DISCONNECTED');
  }
}

export class AuthError extends AppError {
  constructor(message = 'Session expired. Please log in again.', statusCode = 401) {
    super(message, statusCode, 'UNAUTHORIZED_ACCESS');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 400, 'VALIDATION_FAILED', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please slow down.', details?: string) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

export class UploadError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 400, 'UPLOAD_FAILED', details);
  }
}

export class AIStreamError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 500, 'AI_STREAM_FAILED', details);
  }
}

export class ApiServerError extends AppError {
  constructor(message = 'An internal server error occurred.', statusCode = 500) {
    super(message, statusCode, 'SERVER_ERROR');
  }
}

/**
 * Standardizes raw exceptions from Axios or Fetch into typed AppErrors.
 */
export function parseApiError(error: any): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // Handle Axios / Network Response errors
  if (error?.response) {
    const status = error.response.status;
    const responseData = error.response.data as ApiErrorResponse | undefined;
    const serverMessage = responseData?.error || responseData?.details || 'API Request Failed';

    if (status === 401 || status === 403) {
      return new AuthError(serverMessage, status);
    }
    if (status === 400) {
      return new ValidationError(serverMessage, responseData?.details);
    }
    if (status === 429) {
      return new RateLimitError(serverMessage, responseData?.details);
    }
    if (status >= 500) {
      return new ApiServerError(serverMessage, status);
    }

    return new AppError(serverMessage, status, 'API_ERROR_CODE', responseData?.details);
  }

  // Handle Axios Request errors (No response received)
  if (error?.request) {
    return new NetworkError('Server unreachable. Please verify network access.');
  }

  // Fallback
  return new AppError(error?.message || 'An unexpected error occurred.', 500, 'UNKNOWN_ERROR');
}

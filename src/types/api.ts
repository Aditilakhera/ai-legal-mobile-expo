/**
 * AI Legal Mobile - Network API Interface Types
 * Declares contracts for standardized API responses and errors.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string;
}

export interface ApiPaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    page: number;
    pages: number;
  };
}

export interface ApiErrorResponse {
  success: boolean;
  error: string;
  code?: string;
  details?: string;
  statusCode?: number;
}

export interface StreamChunkResponse {
  token: string;
  done: boolean;
  sessionId?: string;
  suggestions?: string[];
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type?: string;
}

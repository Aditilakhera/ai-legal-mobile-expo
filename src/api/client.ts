/**
 * AI Legal Mobile - Centralized HTTP Client
 * Configures Axios with interceptors, token injection, error parsing, and retries.
 */

import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { AppConfig } from '@/config';
import { StorageKeys } from '@/constants';
import { configureAxiosRetry } from './retry';
import { parseApiError } from './errors';
import { useUserStore } from '../store/user';
import { useLocalLanguageStore } from '../utils/localization';

export const appendLanguagePromptModifier = (message: string, language: string): string => {
  if (language === 'Hindi') {
    return `${message}\n\n[INSTRUCTION: Please generate the response in Hindi. All analysis, descriptions, and headings must be in Hindi. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers. Keep them in their original form.]`;
  } else if (language === 'Bilingual') {
    return `${message}\n\n[INSTRUCTION: Please generate the response in Bilingual style (English + Hindi). Use English for headings, titles, and structural labels. Use Hindi for descriptions, explanations, and subtitles. Where appropriate, write in English with key sentences explained in Hindi. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers. Keep them in their original form.]`;
  } else if (language === 'Gujarati') {
    return `${message}\n\n[INSTRUCTION: Please generate the response in Gujarati. All analysis, descriptions, and headings must be in Gujarati. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers. Keep them in their original form.]`;
  } else if (language === 'Marathi') {
    return `${message}\n\n[INSTRUCTION: Please generate the response in Marathi. All analysis, descriptions, and headings must be in Marathi. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers. Keep them in their original form.]`;
  } else if (language === 'Tamil') {
    return `${message}\n\n[INSTRUCTION: Please generate the response in Tamil. All analysis, descriptions, and headings must be in Tamil. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers. Keep them in their original form.]`;
  }
  return message;
};

// Standard secure storage abstraction placeholder
let getAuthTokenAsync: () => Promise<string | null> = async () => null;
let refreshAuthTokenAsync: () => Promise<string | null> = async () => null;
let handleSessionExpired: () => void = () => {};

export const apiClient = axios.create({
  baseURL: AppConfig.apiUrl,
  timeout: AppConfig.apiTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Configure client retry policies
configureAxiosRetry(apiClient, {
  retries: 3,
  retryDelayFactorMs: 1000,
});

/**
 * Configure standard event triggers for token recovery.
 */
export function registerAuthHandlers(config: {
  getAccessToken: () => Promise<string | null>;
  refreshAccessToken: () => Promise<string | null>;
  onSessionExpired: () => void;
}) {
  getAuthTokenAsync = config.getAccessToken;
  refreshAuthTokenAsync = config.refreshAccessToken;
  handleSessionExpired = config.onSessionExpired;
}

// Request Interceptor: Inject JWT Token & Telemetry Info Headers
apiClient.interceptors.request.use(
  async (requestConfig: InternalAxiosRequestConfig) => {
    console.log(`[API CLIENT] Sending request to: ${requestConfig.baseURL || ''}${requestConfig.url || ''}`);
    try {
      const token = await getAuthTokenAsync();
      if (token && requestConfig.headers) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }

      // Step 3: Inject Device, App, and Correlation headers
      if (requestConfig.headers) {
        const userLang = useUserStore.getState().profile?.personalizations?.general?.language || useLocalLanguageStore.getState().localLanguage || 'English';
        requestConfig.headers['X-Device-Platform'] = Platform.OS;
        requestConfig.headers['X-App-Version'] = AppConfig.version;
        requestConfig.headers['X-App-Language'] = userLang;

        let timeZone = 'UTC';
        try {
          if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
            timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          }
        } catch (e) {
          console.warn('[API CLIENT] Failed to get device timezone', e);
        }
        requestConfig.headers['X-App-Timezone'] = timeZone;

        requestConfig.headers['X-Correlation-Id'] = `req_${Math.random().toString(36).substring(2, 11)}`;

        // Inject language instruction to prompt if request has data.message or data.content
        if (requestConfig.data && typeof requestConfig.data === 'object') {
          if ('message' in requestConfig.data && typeof requestConfig.data.message === 'string') {
            requestConfig.data.message = appendLanguagePromptModifier(requestConfig.data.message, userLang);
          } else if ('content' in requestConfig.data && typeof requestConfig.data.content === 'string') {
            requestConfig.data.content = appendLanguagePromptModifier(requestConfig.data.content, userLang);
          }
        }
      }
    } catch (err) {
      console.error('[API CLIENT] Failed to inject token/headers', err);
    }
    return requestConfig;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Queue pending requests during Token Refreshing & Authentication Expiries
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the request is for an auth endpoint (e.g. login, signup) since they do not support refresh tokens.
    const isAuthEndpoint = originalRequest?.url && (
      originalRequest.url.includes('/auth/') ||
      originalRequest.url.includes('auth/')
    );

    // Trigger token refreshing on 401 response and check if not already retried
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        refreshAuthTokenAsync()
          .then((newAccessToken) => {
            if (newAccessToken) {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              }
              processQueue(null, newAccessToken);
              resolve(apiClient(originalRequest));
            } else {
              throw new Error('Refresh token returned null');
            }
          })
          .catch((refreshError) => {
            console.warn('[API CLIENT] Token refresh failed, terminating session:', refreshError.message || refreshError);
            processQueue(refreshError, null);
            handleSessionExpired();
            reject(parseApiError(refreshError));
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(parseApiError(error));
  }
);

/**
 * Helper to upload files via multipart/form-data.
 */
export async function uploadFileMultipart<T = any>(
  endpoint: string,
  fileUri: string,
  fileName: string,
  mimeType: string,
  extraData: Record<string, string> = {},
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<T> {
  const formData = new FormData();
  
  // React Native FormData expects an object shape with uri, name, and type
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  Object.keys(extraData).forEach((key) => {
    formData.append(key, extraData[key]);
  });

  const response = await apiClient.post<T>(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data, // Avoid axios parsing FormData
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
    signal,
  });

  return response.data;
}

/**
 * Streaming Response Simulation / SSE Interface for Mobile React Native.
 * Uses native XMLHttpRequest status 3 (LOADING) to enable reliable streaming in Expo/Hermes.
 */
export async function* streamAIResponse(
  endpoint: string,
  payload: Record<string, any>,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const token = await getAuthTokenAsync();
  const url = `${AppConfig.apiUrl}${endpoint}`;

  let resolveNext: ((value: { done: boolean; value?: string }) => void) | null = null;
  const chunkQueue: string[] = [];
  let isDone = false;
  let error: any = null;

  const xhr = new XMLHttpRequest();
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-Type', 'application/json');
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }

  let lastIndex = 0;
  let buffer = '';

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 3 || xhr.readyState === 4) {
      const responseText = xhr.responseText;
      if (responseText.length > lastIndex) {
        const newChunk = responseText.substring(lastIndex);
        lastIndex = responseText.length;
        
        buffer += newChunk;
        const lines = buffer.split('\n');
        
        // Keep the last segment in the buffer as it might be incomplete
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data:')) {
            const dataStr = cleanLine.slice(5).trim();
            if (dataStr === '[DONE]') {
              isDone = true;
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              const textToken = parsed.chunk !== undefined ? parsed.chunk : parsed.token;
              if (textToken !== undefined) {
                chunkQueue.push(textToken);
                if (resolveNext) {
                  const nextToken = chunkQueue.shift();
                  resolveNext({ done: false, value: nextToken });
                  resolveNext = null;
                }
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete lines
            }
          }
        }
      }
    }

    if (xhr.readyState === 4) {
      if (xhr.status >= 400) {
        error = new Error(xhr.responseText || 'Streaming request failed');
      }
      
      // Flush any remaining item in the buffer
      if (buffer.trim()) {
        const cleanLine = buffer.trim();
        if (cleanLine.startsWith('data:')) {
          const dataStr = cleanLine.slice(5).trim();
            try {
              const parsed = JSON.parse(dataStr);
              const textToken = parsed.chunk !== undefined ? parsed.chunk : parsed.token;
              if (textToken !== undefined) {
                chunkQueue.push(textToken);
              }
            } catch (e) {
              // ignore
            }
        }
      }
      
      isDone = true;
      if (resolveNext) {
        resolveNext({ done: true });
        resolveNext = null;
      }
    }
  };

  xhr.onerror = () => {
    error = new Error('Network error during streaming');
    isDone = true;
    if (resolveNext) {
      resolveNext({ done: true });
      resolveNext = null;
    }
  };

  if (signal) {
    signal.addEventListener('abort', () => {
      xhr.abort();
      isDone = true;
      if (resolveNext) {
        resolveNext({ done: true });
        resolveNext = null;
      }
    });
  }

  const userLang = useUserStore.getState().profile?.personalizations?.general?.language || useLocalLanguageStore.getState().localLanguage || 'English';
  let modifiedPayload = { ...payload };
  if (modifiedPayload.message && typeof modifiedPayload.message === 'string') {
    modifiedPayload.message = appendLanguagePromptModifier(modifiedPayload.message, userLang);
  } else if (modifiedPayload.content && typeof modifiedPayload.content === 'string') {
    modifiedPayload.content = appendLanguagePromptModifier(modifiedPayload.content, userLang);
  }

  xhr.send(JSON.stringify(modifiedPayload));
  let lastYieldTime = Date.now();
  let localBuffer = '';

  while (true) {
    if (signal?.aborted) {
      return;
    }
    if (error) {
      throw error;
    }

    // Flush any pending items from chunkQueue into localBuffer
    while (chunkQueue.length > 0) {
      localBuffer += chunkQueue.shift()!;
    }

    if (localBuffer.length > 0) {
      const now = Date.now();
      const elapsed = now - lastYieldTime;
      if (elapsed >= 75 || isDone) {
        const chunkToYield = localBuffer;
        localBuffer = '';
        lastYieldTime = now;
        yield chunkToYield;
      } else {
        // Wait for the remainder of the 75ms window
        await new Promise((resolve) => setTimeout(resolve, 75 - elapsed));
      }
    } else if (isDone) {
      break;
    } else {
      // Wait for the next token to arrive from XHR
      const next = await new Promise<{ done: boolean; value?: string }>((resolve) => {
        resolveNext = resolve;
      });
      if (next.done) {
        isDone = true;
      }
      if (next.value) {
        localBuffer += next.value;
      }
    }
  }

  if (signal?.aborted) {
    return;
  }

  // Final flush of remaining buffer
  while (chunkQueue.length > 0) {
    localBuffer += chunkQueue.shift()!;
  }
  if (localBuffer.length > 0) {
    yield localBuffer;
  }

  // Appends standard legal disclaimer to every AI response except draftMaker, precedents, and caseAssistant
  const activeTool = payload?.activeTool || '';
  const isExceptionTool = 
    activeTool === 'draftMaker' || 
    activeTool === 'legalPrecedent' || 
    activeTool === 'caseAssistant' ||
    activeTool.toLowerCase().includes('precedent') ||
    activeTool.toLowerCase().includes('draft') ||
    activeTool.toLowerCase().includes('case');

  if (payload && !isExceptionTool) {
    let disclaimer = "\n\n**⚖️ Legal Disclaimer:** This analysis is for informational purposes only and is not legal advice. AI may make mistakes. Please consult a qualified lawyer before making legal decisions.";
    if (userLang === 'Hindi') {
      disclaimer = "\n\n**⚖️ कानूनी अस्वीकरण:** यह विश्लेषण केवल सूचनात्मक उद्देश्यों के लिए है और कानूनी सलाह नहीं है। एआई गलतियां कर सकता है। कानूनी निर्णय लेने से पहले कृपया किसी योग्य वकील से परामर्श लें।";
    } else if (userLang === 'Bilingual') {
      disclaimer = "\n\n**⚖️ Legal Disclaimer (कानूनी अस्वीकरण):** This analysis is for informational purposes only and is not legal advice. AI may make mistakes. Please consult a qualified lawyer before making legal decisions. (यह विश्लेषण केवल सूचनात्मक उद्देश्यों के लिए है और कानूनी सलाह नहीं है। एआई गलतियां कर सकता है। कानूनी निर्णय लेने से पहले कृपया किसी योग्य वकील से परामर्श लें।)";
    } else if (userLang === 'Gujarati') {
      disclaimer = "\n\n**⚖️ કાનૂની અસ્વીકરણ:** આ વિશ્લેષણ ફક્ત માહિતીના હેતુઓ માટે છે અને કાનૂनी સલાહ નથી. AI ભૂલો કરી શકે છે. કાનૂની નિર્ણયો લેતા પહેલા કૃપા કરીને લાયક વકીલની સલાહ લો.";
    } else if (userLang === 'Marathi') {
      disclaimer = "\n\n**⚖️ कायदेशीर अस्वीकरण:** हे विश्लेषण केवळ माहितीच्या उद्देशाने आहे आणि कायदेशीर सल्ला नाही. AI चुका करू शकते. कायदेशीर निर्णय घेण्यापूर्वी कृपया पात्र वकीलाचा सल्ला घ्या.";
    } else if (userLang === 'Tamil') {
      disclaimer = "\n\n**⚖️ சட்டப்பூர்வ மறுப்பு:** இந்த பகுப்பாய்வு தகவல் நோக்கங்களுக்காக மட்டுமே மற்றும் சட்ட ஆலோசனையல்ல. AI தவறுகள் செய்யலாம். சட்டப்பூர்வ முடிவுகளை எடுப்பதற்கு முன் தகுதிவாய்ந்த வழக்கறிஞரை அணுகவும்.";
    }
    yield disclaimer;
  }
}

/**
 * Standard HTTP Request Helpers
 */
export const http = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => apiClient.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.post<T>(url, data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.put<T>(url, data, config),
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.patch<T>(url, data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => apiClient.delete<T>(url, config),
  upload: <T = any>(
    endpoint: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    extraData?: Record<string, string>,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ) => uploadFileMultipart<T>(endpoint, fileUri, fileName, mimeType, extraData, onProgress, signal),
  stream: streamAIResponse,
};

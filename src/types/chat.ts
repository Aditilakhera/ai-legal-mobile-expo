/**
 * AI Legal Mobile - Chat & Messages Type Definitions
 * Maps to backend ChatSession models.
 */

export interface ChatAttachment {
  type?: string;
  url: string;
  name: string;
  size?: number;
  base64Data?: string;
}

export interface ChatMessageSource {
  title: string;
  url: string;
  description?: string;
}

export interface ChatMessageConversion {
  file: string; // Base64 or local filepath
  blobUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: string;
  rawSize?: number;
  charCount?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: ChatAttachment[];
  imageUrl?: string;
  videoUrl?: string;
  conversion?: ChatMessageConversion;
  isProcessing?: boolean;
  isStreaming?: boolean;
  isRealTime?: boolean;
  sources?: ChatMessageSource[];
  agentName?: string;
  agentCategory?: string;
  suggestions?: string[];
}

export interface ChatSession {
  _id?: string;
  sessionId: string;
  userId?: string;
  guestId?: string;
  title: string;
  projectId?: string; // Mapped to Case Workspace ID if inside workspace context
  messages: ChatMessage[];
  lastModified: number;
  detectedMode?: string;
  activeTool?: string;
  isShared?: boolean;
  shareId?: string;
  createdAt?: string;
  updatedAt?: string;
}

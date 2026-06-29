/**
 * AI Legal Mobile - Chat Service
 * Interfaces with AI conversation histories, sessions, and sharing setups.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse, ChatSession } from '../types';

export class ChatService {
  static async listSessions(projectId?: string): Promise<ApiResponse<ChatSession[]>> {
    const url = projectId ? `${API_ENDPOINTS.Chat.Sessions}?projectId=${projectId}` : API_ENDPOINTS.Chat.Sessions;
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Fetch dialogue messages within a session log.
   */
  static async getSessionDetails(sessionId: string): Promise<ApiResponse<ChatSession>> {
    const response = await apiClient.get(API_ENDPOINTS.Chat.SessionDetails(sessionId));
    return response.data;
  }

  /**
   * Submit message query to general AI Chat.
   */
  static async sendMessage(payload: {
    message: string;
    sessionId?: string;
    projectId?: string; // Links to case workspace
    attachments?: Array<{ type: string; url: string; name: string }>;
  }): Promise<ApiResponse<{ reply: string; sessionId: string; suggestions?: string[] }>> {
    const response = await apiClient.post(API_ENDPOINTS.Chat.Execute, payload);
    return response.data;
  }

  /**
   * Delete specific chat session history.
   */
  static async deleteSession(sessionId: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete(API_ENDPOINTS.Chat.SessionDetails(sessionId));
    return response.data;
  }

  /**
   * Rename specific chat session title.
   */
  static async renameSession(sessionId: string, title: string): Promise<ApiResponse<ChatSession>> {
    const response = await apiClient.patch(`/chat/${sessionId}/title`, { title });
    return response.data;
  }

  /**
   * Share chat transcripts via email.
   */
  static async shareChatViaEmail(sessionId: string, email: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.post(API_ENDPOINTS.Chat.ShareEmail(sessionId), { email });
    return response.data;
  }
}

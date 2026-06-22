/**
 * AI Legal Mobile - Workspace Service
 * Coordinates the active case workspace context and environment states.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse, CaseWorkspace } from '../types';

export class WorkspaceService {
  private static activeWorkspaceId: string | null = null;

  /**
   * Sets the globally active case workspace context.
   */
  static setActiveWorkspace(workspaceId: string | null): void {
    this.activeWorkspaceId = workspaceId;
  }

  /**
   * Get the globally active case workspace context ID.
   */
  static getActiveWorkspaceId(): string | null {
    return this.activeWorkspaceId;
  }

  /**
   * Triggers background analysis run for active workspace details.
   */
  static async triggerAutoAnalysis(workspaceId: string): Promise<ApiResponse<CaseWorkspace>> {
    const response = await apiClient.post(`${API_ENDPOINTS.Cases.Base}/${workspaceId}/auto-analyze`);
    return response.data;
  }

  /**
   * Syncs custom documents array for workspace.
   */
  static async getWorkspaceDocuments(workspaceId: string): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get(API_ENDPOINTS.Cases.Documents(workspaceId));
    return response.data;
  }
}

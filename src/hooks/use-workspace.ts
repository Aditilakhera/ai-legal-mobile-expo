/**
 * AI Legal Mobile - useWorkspace Custom Hook
 * Handles interaction with active workspace states (briefs, tasks scheduler, files).
 */

import { useState } from 'react';
import { useWorkspaceStore } from '../store/workspace';
import { CaseService } from '../services/case.service';
import { CaseTask, CaseHearing, CaseEvidence, CaseWorkspace } from '../types';

export function useWorkspace() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeCaseId = useWorkspaceStore((s) => s.activeCaseId);
  const setActiveCaseId = useWorkspaceStore((s) => s.setActiveCaseId);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const updateWorkspaceState = useWorkspaceStore((s) => s.updateWorkspace);
  const addTask = useWorkspaceStore((s) => s.addTask);
  const updateTaskState = useWorkspaceStore((s) => s.updateTask);
  const addHearing = useWorkspaceStore((s) => s.addHearing);
  const addEvidence = useWorkspaceStore((s) => s.addEvidence);

  const getActiveWorkspace = () => {
    return activeCaseId ? workspaces[activeCaseId] || null : null;
  };

  const fetchWorkspaceDetails = async (caseId: string) => {
    console.log("[WORKSPACE HOOK] fetchWorkspaceDetails starting for ID:", caseId);
    setLoading(true);
    setError(null);
    try {
      const res = await CaseService.getCaseDetails(caseId);
      console.log("[WORKSPACE HOOK] fetchWorkspaceDetails API response received:", typeof res, res ? Object.keys(res) : null);
      
      // Support both raw case objects and wrapped response payloads
      const caseData = (res && (res as any)._id) ? res : (res?.data || null);
      console.log("[WORKSPACE HOOK] fetchWorkspaceDetails caseData resolved:", caseData ? { id: (caseData as any)._id, name: (caseData as any).name } : null);

      if (caseData) {
        setWorkspace(caseId, caseData as CaseWorkspace);
      } else {
        throw new Error((res as any)?.error || 'Failed to fetch workspace details: empty caseData');
      }
    } catch (err: any) {
      console.error("[WORKSPACE HOOK] fetchWorkspaceDetails catch block:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const addNewTask = async (taskData: Partial<CaseTask>) => {
    if (!activeCaseId) return { success: false, error: 'No active workspace selected' };
    setError(null);
    try {
      const response = await CaseService.addTask(activeCaseId, taskData);
      if (response.success && response.data) {
        addTask(activeCaseId, response.data);
        return { success: true };
      }
      throw new Error(response.error || 'Failed to create task');
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateTaskStatus = async (taskId: string, status: 'Pending' | 'In Progress' | 'Completed') => {
    if (!activeCaseId) return { success: false, error: 'No active workspace selected' };
    setError(null);
    try {
      const response = await CaseService.updateTask(activeCaseId, taskId, { status });
      if (response.success && response.data) {
        updateTaskState(activeCaseId, taskId, { status });
        return { success: true };
      }
      throw new Error(response.error || 'Failed to update task');
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  return {
    activeCaseId,
    workspace: getActiveWorkspace(),
    loading,
    error,
    setActiveCaseId,
    fetchWorkspaceDetails,
    addNewTask,
    updateTaskStatus,
  };
}

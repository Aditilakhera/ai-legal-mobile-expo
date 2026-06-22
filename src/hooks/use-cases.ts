/**
 * AI Legal Mobile - useCases Custom Hook
 * Connects store states for My Cases with the CaseService endpoints.
 */

import { useState } from 'react';
import { useCasesStore } from '../store/cases';
import { CaseService } from '../services/case.service';
import { CaseWorkspace } from '../types';

export function useCases() {
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cases = useCasesStore((s) => s.cases);
  const setCases = useCasesStore((s) => s.setCases);
  const addCase = useCasesStore((s) => s.addCase);
  const removeCase = useCasesStore((s) => s.removeCase);

  const fetchCasesList = async () => {
    setFetching(true);
    setError(null);
    try {
      const response = await CaseService.listCases();
      if (response.success && response.data) {
        setCases(response.data);
      } else {
        throw new Error(response.error || 'Failed to retrieve cases index');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  const createNewCase = async (caseData: Partial<CaseWorkspace>) => {
    setSaving(true);
    setError(null);
    try {
      const response = await CaseService.createCase(caseData);
      if (response.success && response.data) {
        const added = response.data;
        // Construct summary view parameters
        addCase({
          _id: added._id,
          name: added.name,
          clientName: added.clientName,
          opponentName: added.opponentName,
          caseType: added.caseType,
          status: added.status,
          priority: added.priority,
          documentCount: added.documents.length,
          taskCount: added.tasks.length,
          hearingCount: added.hearings.length,
          updatedAt: added.updatedAt,
        });
        return { success: true, caseId: added._id };
      }
      throw new Error(response.error || 'Failed to create case');
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  const deleteCase = async (caseId: string) => {
    setError(null);
    try {
      const response = await CaseService.deleteCase(caseId);
      if (response.success) {
        removeCase(caseId);
        return { success: true };
      }
      throw new Error(response.error || 'Failed to delete case');
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  return {
    cases,
    fetching,
    saving,
    error,
    fetchCasesList,
    createNewCase,
    deleteCase,
  };
}

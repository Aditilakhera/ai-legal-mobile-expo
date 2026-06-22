/**
 * AI Legal Mobile - useUpload Custom Hook
 * Handles binary document uploading and tracks percentage parameters.
 */

import { useState } from 'react';
import { UploadService } from '../services/upload.service';

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadCaseDocument = async (
    caseId: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    documentType: 'Notice' | 'Agreement' | 'Proof' | 'Filing' | 'Other'
  ) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const response = await UploadService.uploadCaseDocument(
        caseId,
        fileUri,
        fileName,
        mimeType,
        documentType,
        (p) => setProgress(p)
      );

      if (response.success && response.data) {
        return { success: true, document: response.data };
      }
      throw new Error(response.error || 'Upload failed');
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  };

  const uploadAvatar = async (fileUri: string, fileName: string, mimeType: string) => {
    setUploading(true);
    setError(null);

    try {
      const response = await UploadService.uploadAvatar(fileUri, fileName, mimeType);
      if (response.success && response.data) {
        return { success: true, avatarUrl: response.data.avatar };
      }
      throw new Error(response.error || 'Avatar upload failed');
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    progress,
    error,
    uploadCaseDocument,
    uploadAvatar,
  };
}

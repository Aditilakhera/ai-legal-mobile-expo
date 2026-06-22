import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useToastContext } from '@/providers';
import { ChatAttachment } from '@/types';
import { uploadFileMultipart } from '../api/client';
import { UploadService } from '../services/upload.service';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function useAttachmentHandler() {
  const { showToast } = useToastContext();
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const showAttachmentOptions = useCallback(() => {
    setIsBottomSheetVisible(true);
  }, []);

  const hideAttachmentOptions = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  const hideCamera = useCallback(() => {
    setIsCameraVisible(false);
  }, []);

  const handleRemoveAttachment = useCallback((name: string) => {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const validateAndAddFile = useCallback((uri: string, name: string, size?: number, mimeType?: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    
    // Validate file type
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      showToast('error', 'Selection Failed', 'Unsupported file type.');
      return false;
    }

    // Validate file size
    if (size && size > MAX_FILE_SIZE) {
      showToast('error', 'Selection Failed', 'Maximum file size exceeded.');
      return false;
    }

    const calculatedMime = EXTENSION_TO_MIME[ext] || mimeType || 'application/octet-stream';

    // Avoid duplicates
    setAttachments((prev) => {
      if (prev.some((a) => a.name === name)) {
        showToast('info', 'File Kept', 'File is already attached.');
        return prev;
      }
      return [
        ...prev,
        {
          name,
          type: calculatedMime,
          url: uri, // Temporary local URI
          size,
        },
      ];
    });

    showToast('success', 'File Attached', `${name} queued.`);
    return true;
  }, [showToast]);

  const handleSelectOption = useCallback(async (option: 'camera' | 'picker') => {
    if (option === 'camera') {
      setIsCameraVisible(true);
    } else if (option === 'picker') {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          validateAndAddFile(asset.uri, asset.name, asset.size, asset.mimeType);
        }
      } catch (err: any) {
        console.error('[useAttachmentHandler] Document picking error:', err);
        showToast('error', 'Picker Error', 'Failed to select document.');
      }
    }
  }, [validateAndAddFile, showToast]);

  const handleCameraConfirm = useCallback((uri: string, mode: 'image' | 'document' | 'paper') => {
    const timestamp = Date.now();
    let fileName = `capture_${timestamp}.jpg`;
    if (mode === 'document') {
      fileName = `scanned_doc_${timestamp}.jpg`;
    } else if (mode === 'paper') {
      fileName = `paper_scan_${timestamp}.jpg`;
    }

    validateAndAddFile(uri, fileName, 2 * 1024 * 1024, 'image/jpeg');
  }, [validateAndAddFile]);

  // Upload pending local attachments to the server
  const uploadPendingAttachments = useCallback(async (caseId?: string): Promise<ChatAttachment[]> => {
    if (attachments.length === 0) return [];
    setIsUploading(true);

    try {
      const uploadedList: ChatAttachment[] = [];

      for (const attachment of attachments) {
        const isLocal = attachment.url.startsWith('file://') || attachment.url.startsWith('content://') || Platform.OS === 'ios' && attachment.url.startsWith('/');
        
        if (isLocal) {
          showToast('info', 'Uploading...', `Uploading ${attachment.name}`);
          
          let uploadedUrl = attachment.url;
          
          if (caseId) {
            // Case Workspace upload context
            const res = await UploadService.uploadCaseDocument(
              caseId,
              attachment.url,
              attachment.name,
              attachment.type || 'application/octet-stream',
              'Proof'
            );
            if (res.success && res.data) {
              uploadedUrl = res.data.url;
            } else {
              throw new Error(res.error || `Failed to upload ${attachment.name}`);
            }
          } else {
            // General Chat / Tool Chat upload context
            const response = await uploadFileMultipart<{
              success: boolean;
              data: { url: string; mimetype: string; filename: string; size: number };
            }>(
              '/chat/upload',
              attachment.url,
              attachment.name,
              attachment.type || 'application/octet-stream'
            );
            if (response.success && response.data) {
              uploadedUrl = response.data.url;
            } else {
              throw new Error(`Failed to upload ${attachment.name}`);
            }
          }

          // Optional: Read base64 data for Vertex AI engine prompt inputs
          let base64 = '';
          try {
            base64 = await FileSystem.readAsStringAsync(attachment.url, {
              encoding: 'base64',
            });
          } catch (readErr) {
            console.warn('[useAttachmentHandler] Base64 conversion warning:', readErr);
          }

          uploadedList.push({
            name: attachment.name,
            type: attachment.type,
            url: uploadedUrl,
            size: attachment.size,
            base64Data: base64,
          });
        } else {
          // Already uploaded or a mock URL
          uploadedList.push(attachment);
        }
      }

      setIsUploading(false);
      return uploadedList;
    } catch (err: any) {
      setIsUploading(false);
      showToast('error', 'Upload Failed', err.message || 'Some files failed to upload.');
      throw err;
    }
  }, [attachments, showToast]);

  return {
    attachments,
    setAttachments,
    isBottomSheetVisible,
    isCameraVisible,
    isUploading,
    showAttachmentOptions,
    hideAttachmentOptions,
    hideCamera,
    handleRemoveAttachment,
    clearAttachments,
    handleSelectOption,
    handleCameraConfirm,
    uploadPendingAttachments,
  };
}

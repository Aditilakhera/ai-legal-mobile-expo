import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  Dimensions,
  Share,
  Alert,
  TouchableWithoutFeedback,
  Clipboard,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthGuard } from '@/navigation/guards';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext } from '@/providers';
import { streamAIResponse } from '@/api/client';
import { Shadows } from '@/theme';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

const { height } = Dimensions.get('window');

// Form metadata definitions for intelligent fields
interface FormField {
  key: string;
  label: string;
  type: 'text' | 'multiline' | 'number' | 'date' | 'select' | 'email' | 'phone';
  required: boolean;
  placeholder?: string;
  options?: string[];
  hint?: string;
}

interface TemplateMetadata {
  id: string;
  title: string;
  description: string;
  icon: string;
  fields: FormField[];
}

const TEMPLATES: TemplateMetadata[] = [
  {
    id: 'rentAgreement',
    title: 'Rent Agreement',
    description: 'Residential or commercial lease deeds between landlord and tenant.',
    icon: 'home-outline',
    fields: [
      { key: 'landlordName', label: 'Landlord Name', type: 'text', required: true, placeholder: 'e.g. Ramesh Kumar' },
      { key: 'landlordAddress', label: 'Landlord Address', type: 'text', required: true, placeholder: 'e.g. Flat 101, Sector 15, Delhi' },
      { key: 'tenantName', label: 'Tenant Name', type: 'text', required: true, placeholder: 'e.g. Vikram Aditya' },
      { key: 'tenantAddress', label: 'Tenant Address', type: 'text', required: true, placeholder: 'e.g. H-12, Sector 2, Delhi' },
      { key: 'propertyAddress', label: 'Property Address to Lease', type: 'text', required: true, placeholder: 'e.g. Flat 302, Pocket B, Delhi' },
      { key: 'monthlyRent', label: 'Monthly Rent Amount (INR)', type: 'number', required: true, placeholder: 'e.g. 15000' },
      { key: 'securityDeposit', label: 'Security Deposit Amount (INR)', type: 'number', required: true, placeholder: 'e.g. 30000' },
      { key: 'startDate', label: 'Agreement Start Date', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
      { key: 'duration', label: 'Agreement Duration', type: 'select', required: true, options: ['11 Months', '1 Year', '2 Years', '3 Years'], placeholder: 'Select duration' },
      { key: 'noticePeriod', label: 'Notice Period required', type: 'select', required: true, options: ['1 Month', '2 Months', '3 Months'], placeholder: 'Select notice period' },
      { key: 'maintenance', label: 'Maintenance Responsibility', type: 'select', required: true, options: ['Landlord', 'Tenant', 'Shared'], placeholder: 'Select responsibility' },
      { key: 'jurisdiction', label: 'Governing Jurisdiction / Court', type: 'text', required: true, placeholder: 'e.g. Delhi Courts' },
    ]
  },
  {
    id: 'fir',
    title: 'First Information Report (FIR)',
    description: 'Draft complaints for criminal offenses to be filed at local police stations.',
    icon: 'alert-circle-outline',
    fields: [
      { key: 'policeStation', label: 'Police Station Name', type: 'text', required: true, placeholder: 'e.g. Saket Police Station' },
      { key: 'complainantName', label: 'Complainant Full Name', type: 'text', required: true, placeholder: 'e.g. Suresh Prasad' },
      { key: 'guardianName', label: "Father's / Husband's Name", type: 'text', required: true, placeholder: 'e.g. Om Prasad' },
      { key: 'complainantAddress', label: 'Contact Address', type: 'text', required: true, placeholder: 'e.g. B-40, Saket, Delhi' },
      { key: 'complainantPhone', label: 'Mobile Number', type: 'phone', required: true, placeholder: '10-digit number' },
      { key: 'incidentDate', label: 'Incident Date', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
      { key: 'incidentTime', label: 'Incident Time', type: 'text', required: true, placeholder: 'e.g. Around 4:30 PM' },
      { key: 'incidentLocation', label: 'Incident Location', type: 'text', required: true, placeholder: 'e.g. Saket Metro Market, Delhi' },
      { key: 'accusedName', label: 'Accused Name (if known)', type: 'text', required: false, placeholder: 'e.g. Unknown' },
      { key: 'incidentDescription', label: 'Description of Incident', type: 'multiline', required: true, placeholder: 'Describe the series of events in detail...' },
      { key: 'evidence', label: 'Evidence Available (if any)', type: 'text', required: false, placeholder: 'e.g. CCTV Footage, Phone Logs' },
      { key: 'reliefRequested', label: 'Relief/Action Requested', type: 'text', required: true, placeholder: 'e.g. Request to register FIR and recover stolen items' },
    ]
  },
  {
    id: 'legalNotice',
    title: 'Legal Notice',
    description: 'Formal notices demanding compliance, payments, or claims.',
    icon: 'mail-open-outline',
    fields: [
      { key: 'senderName', label: 'Sender Name', type: 'text', required: true, placeholder: 'e.g. ABC Tech Solutions' },
      { key: 'senderAddress', label: 'Sender Address', type: 'text', required: true, placeholder: 'e.g. 504, Nehru Place, Delhi' },
      { key: 'receiverName', label: 'Receiver Name (Opponent)', type: 'text', required: true, placeholder: 'e.g. XYZ Enterprises' },
      { key: 'receiverAddress', label: 'Receiver Address', type: 'text', required: true, placeholder: 'e.g. Plot 12, Phase 3, Noida' },
      { key: 'subject', label: 'Subject of Legal Notice', type: 'text', required: true, placeholder: 'e.g. Notice for Recovery of Outstanding Dues' },
      { key: 'facts', label: 'Facts of the Matter', type: 'multiline', required: true, placeholder: 'Explain the background, dates, agreements, and breach...' },
      { key: 'grounds', label: 'Legal Grounds / Violation sections', type: 'multiline', required: true, placeholder: 'e.g. Violation of Section 73 of Indian Contract Act...' },
      { key: 'reliefRequested', label: 'Action/Relief Demanded', type: 'text', required: true, placeholder: 'e.g. Pay outstanding amount of INR 5,00,000' },
      { key: 'compliancePeriod', label: 'Compliance Time Limit', type: 'select', required: true, options: ['15 Days', '30 Days', '45 Days'], placeholder: 'Select limit' },
      { key: 'jurisdiction', label: 'Court Jurisdiction', type: 'text', required: true, placeholder: 'e.g. Courts of Delhi' },
    ]
  },
  {
    id: 'affidavit',
    title: 'Affidavit',
    description: 'Sworn oath declarations to prove facts before authorities.',
    icon: 'document-text-outline',
    fields: [
      { key: 'deponentName', label: 'Deponent Full Name', type: 'text', required: true, placeholder: 'e.g. Priya Sharma' },
      { key: 'guardianName', label: "Father's / Husband's Name", type: 'text', required: true, placeholder: 'e.g. Anil Sharma' },
      { key: 'deponentAddress', label: 'Residential Address', type: 'text', required: true, placeholder: 'e.g. C-15, GK, Delhi' },
      { key: 'deponentOccupation', label: 'Occupation', type: 'text', required: true, placeholder: 'e.g. Business Executive' },
      { key: 'purpose', label: 'Purpose of Affidavit', type: 'text', required: true, placeholder: 'e.g. Application for Name change' },
      { key: 'declarations', label: 'Declaration Statements (One per point)', type: 'multiline', required: true, placeholder: '1. I state that I have changed my name...\n2. I state that...' },
      { key: 'verificationPlace', label: 'Place of Verification', type: 'text', required: true, placeholder: 'e.g. New Delhi' },
    ]
  },
  {
    id: 'consumerComplaint',
    title: 'Consumer Complaint',
    description: 'Draft legal applications for consumer dispute redressal commissions.',
    icon: 'basket-outline',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true, placeholder: 'e.g. Nitin Gupta' },
      { key: 'oppositeParty', label: 'Opposite Party Name (Vendor/Seller)', type: 'text', required: true, placeholder: 'e.g. E-Commerce Retailer Pvt Ltd' },
      { key: 'productService', label: 'Product / Service Name', type: 'text', required: true, placeholder: 'e.g. Premium Smart Phone' },
      { key: 'purchaseDate', label: 'Purchase/Order Date', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
      { key: 'invoiceNumber', label: 'Invoice / Order Number', type: 'text', required: true, placeholder: 'e.g. INV-2026-9081' },
      { key: 'complaintDetails', label: 'Details of Defect / Grievance', type: 'multiline', required: true, placeholder: 'Describe product defect or service deficiency...' },
      { key: 'compensation', label: 'Compensation Requested (INR)', type: 'number', required: true, placeholder: 'e.g. 50000' },
    ]
  },
  {
    id: 'powerOfAttorney',
    title: 'Power of Attorney',
    description: 'Appoint trusted representatives to handle assets and legal matters.',
    icon: 'people-outline',
    fields: [
      { key: 'principalName', label: 'Principal Full Name (Owner)', type: 'text', required: true, placeholder: 'e.g. Devendra Singh' },
      { key: 'attorneyName', label: 'Attorney Full Name (Agent)', type: 'text', required: true, placeholder: 'e.g. Rajendra Singh' },
      { key: 'relationship', label: 'Agent Relationship to Principal', type: 'text', required: true, placeholder: 'e.g. Brother' },
      { key: 'powers', label: 'Powers and Acts Granted', type: 'multiline', required: true, placeholder: 'e.g. To manage bank accounts and sign deeds...' },
      { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
      { key: 'validity', label: 'Validity Period', type: 'text', required: true, placeholder: 'e.g. Revocable at will' },
      { key: 'revocation', label: 'Revocation Conditions', type: 'text', required: true, placeholder: 'e.g. Revocable by principal return' },
    ]
  },
  {
    id: 'customDraft',
    title: 'Custom Legal Document',
    description: 'Define your own terms to draft custom contracts or petitions.',
    icon: 'create-outline',
    fields: [
      { key: 'docTitle', label: 'Document Title', type: 'text', required: true, placeholder: 'e.g. Service Agreement' },
      { key: 'parties', label: 'Parties Involved', type: 'text', required: true, placeholder: 'e.g. Client A and Developer B' },
      { key: 'purpose', label: 'Primary Purpose / Objective', type: 'multiline', required: true, placeholder: 'Define what this agreement is about...' },
      { key: 'terms', label: 'Key Terms & Conditions', type: 'multiline', required: true, placeholder: 'List specific rules, payment milestones...' },
    ]
  }
];

export default function DraftMakerScreen() {
  useAuthGuard();
  const { showToast } = useToastContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  type Step = 'SELECT' | 'FORM' | 'PREVIEW' | 'GENERATING' | 'RESULT';

  interface SavedDraft {
    id: string;
    title: string;
    documentType: string;
    draftName: string;
    content: string;
    lastEditedTime: string;
    createdAt: number;
    updatedAt: number;
    status: 'Draft' | 'Completed';
    formData: Record<string, string>;
    customClauses: string[];
  }

  const [step, setStep] = useState<Step>('SELECT');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [customClauses, setCustomClauses] = useState<string[]>([]);
  const [newClauseText, setNewClauseText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftContent, setDraftContent] = useState('');
  const [generatingStep, setGeneratingStep] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineText, setRefineText] = useState('');
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [savedTemplateName, setSavedTemplateName] = useState('');
  // Custom states for redesign
  const [originalDraft, setOriginalDraft] = useState('');
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null);
  const [savedDocxUri, setSavedDocxUri] = useState<string | null>(null);

  // Draft History states
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyDrafts, setHistoryDrafts] = useState<SavedDraft[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  interface ExportStatus {
    visible: boolean;
    type: 'PDF' | 'DOCX' | null;
    loading: boolean;
    success: boolean;
    filePath: string;
    fileName: string;
    error: string | null;
  }
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    visible: false,
    type: null,
    loading: false,
    success: false,
    filePath: '',
    fileName: '',
    error: null,
  });

  // When draftContent changes (either through refinement, generation, or placeholder edits), reset saved URIs
  useEffect(() => {
    setSavedPdfUri(null);
    setSavedDocxUri(null);
  }, [draftContent]);

  const scrollRef = useRef<ScrollView>(null);

  // Check for auto-saved draft on mount
  useEffect(() => {
    checkSavedDraft();
    loadHistoryDrafts();
  }, []);

  // Save progress dynamically
  useEffect(() => {
    if (step === 'FORM' && activeTemplateId) {
      saveDraftState();
    }
  }, [formData, customClauses, activeTemplateId, step]);

  const loadHistoryDrafts = async () => {
    try {
      const saved = await AsyncStorage.getItem('@DraftMaker:saved_drafts');
      if (saved) {
        const parsed: SavedDraft[] = JSON.parse(saved);
        setHistoryDrafts(parsed);
      } else {
        setHistoryDrafts([]);
      }
    } catch (e) {
      console.warn('Error loading history drafts:', e);
    }
  };

  const getAutoDraftName = (tmplTitle: string, data: Record<string, string>) => {
    const keyPerson = data.tenantName || data.complainantName || data.receiverName || data.deponentName || data.attorneyName || data.docTitle || data.landlordName || 'New Draft';
    return `${tmplTitle} for ${keyPerson}`;
  };

  const saveOrUpdateDraft = async (
    content: string,
    form: Record<string, string>,
    clauses: string[],
    optDraftId?: string
  ) => {
    try {
      const existingStr = await AsyncStorage.getItem('@DraftMaker:saved_drafts');
      const existing: SavedDraft[] = existingStr ? JSON.parse(existingStr) : [];
      
      const tmpl = TEMPLATES.find(t => t.id === activeTemplateId);
      const title = tmpl?.title || 'Legal Draft';
      const draftName = getAutoDraftName(title, form);
      const timestamp = new Date().toISOString();
      const finalId = optDraftId || activeDraftId || `draft_${Date.now()}`;
      
      const idx = existing.findIndex(d => d.id === finalId);
      const now = Date.now();
      
      if (idx > -1) {
        // Update existing draft
        existing[idx] = {
          ...existing[idx],
          content,
          formData: form,
          customClauses: clauses,
          lastEditedTime: timestamp,
          updatedAt: now,
        };
      } else {
        // Create new draft
        const newDraftItem: SavedDraft = {
          id: finalId,
          title,
          documentType: activeTemplateId || 'customDraft',
          draftName,
          content,
          lastEditedTime: timestamp,
          createdAt: now,
          updatedAt: now,
          status: 'Draft',
          formData: form,
          customClauses: clauses,
        };
        existing.push(newDraftItem);
        setActiveDraftId(finalId);
      }
      
      await AsyncStorage.setItem('@DraftMaker:saved_drafts', JSON.stringify(existing));
      await loadHistoryDrafts();
    } catch (err) {
      console.error('[DraftMaker] Auto save error:', err);
    }
  };

  const updateDraftStatus = async (status: 'Draft' | 'Completed') => {
    const targetId = activeDraftId;
    if (!targetId) return;
    try {
      const existingStr = await AsyncStorage.getItem('@DraftMaker:saved_drafts');
      const existing: SavedDraft[] = existingStr ? JSON.parse(existingStr) : [];
      const idx = existing.findIndex(d => d.id === targetId);
      if (idx > -1) {
        existing[idx].status = status;
        existing[idx].lastEditedTime = new Date().toISOString();
        existing[idx].updatedAt = Date.now();
        await AsyncStorage.setItem('@DraftMaker:saved_drafts', JSON.stringify(existing));
        await loadHistoryDrafts();
      }
    } catch (err) {
      console.error('[DraftMaker] Status update error:', err);
    }
  };

  const handleOpenDraft = (draft: SavedDraft) => {
    setActiveDraftId(draft.id);
    setActiveTemplateId(draft.documentType);
    setFormData(draft.formData || {});
    setCustomClauses(draft.customClauses || []);
    setDraftContent(draft.content);
    processGeneratedText(draft.content);
    setStep('RESULT');
    setIsHistoryOpen(false);
  };

  const handleContinueEditing = (draft: SavedDraft) => {
    setActiveDraftId(draft.id);
    setActiveTemplateId(draft.documentType);
    setFormData(draft.formData || {});
    setCustomClauses(draft.customClauses || []);
    setStep('FORM');
    setIsHistoryOpen(false);
  };

  const handleDuplicateDraft = async (draft: SavedDraft) => {
    try {
      const existingStr = await AsyncStorage.getItem('@DraftMaker:saved_drafts');
      const existing: SavedDraft[] = existingStr ? JSON.parse(existingStr) : [];
      const newId = `draft_${Date.now()}`;
      const now = Date.now();
      const newDraftItem: SavedDraft = {
        ...draft,
        id: newId,
        draftName: `Copy of ${draft.draftName}`,
        createdAt: now,
        updatedAt: now,
        lastEditedTime: new Date().toISOString(),
        status: 'Draft',
      };
      existing.push(newDraftItem);
      await AsyncStorage.setItem('@DraftMaker:saved_drafts', JSON.stringify(existing));
      showToast('success', 'Draft Duplicated', 'A copy has been created.');
      await loadHistoryDrafts();
    } catch (err) {
      console.error('[DraftMaker] Duplicate draft error:', err);
      showToast('error', 'Duplicate Failed', 'Could not duplicate draft.');
    }
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      const existingStr = await AsyncStorage.getItem('@DraftMaker:saved_drafts');
      let existing: SavedDraft[] = existingStr ? JSON.parse(existingStr) : [];
      existing = existing.filter(d => d.id !== id);
      await AsyncStorage.setItem('@DraftMaker:saved_drafts', JSON.stringify(existing));
      showToast('success', 'Draft Deleted', 'The draft has been deleted.');
      if (activeDraftId === id) {
        setActiveDraftId(null);
        setStep('SELECT');
      }
      await loadHistoryDrafts();
    } catch (err) {
      console.error('[DraftMaker] Delete draft error:', err);
      showToast('error', 'Delete Failed', 'Could not delete draft.');
    }
  };

  const handleRenameConfirm = async (id: string) => {
    if (!renameVal.trim()) {
      setEditingDraftId(null);
      return;
    }
    try {
      const existingStr = await AsyncStorage.getItem('@DraftMaker:saved_drafts');
      const existing: SavedDraft[] = existingStr ? JSON.parse(existingStr) : [];
      const idx = existing.findIndex(d => d.id === id);
      if (idx > -1) {
        existing[idx].draftName = renameVal.trim();
        existing[idx].lastEditedTime = new Date().toISOString();
        existing[idx].updatedAt = Date.now();
        await AsyncStorage.setItem('@DraftMaker:saved_drafts', JSON.stringify(existing));
        showToast('success', 'Draft Renamed', 'Name updated.');
        await loadHistoryDrafts();
      }
      setEditingDraftId(null);
      setRenameVal('');
    } catch (err) {
      console.error('[DraftMaker] Rename draft error:', err);
      showToast('error', 'Rename Failed', 'Could not rename draft.');
    }
  };

  const sortedHistoryDrafts = React.useMemo(() => {
    const filtered = historyDrafts.filter(d => {
      const query = historySearchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        (d.draftName || '').toLowerCase().includes(query) ||
        (d.title || '').toLowerCase().includes(query)
      );
    });
    return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [historyDrafts, historySearchQuery]);

  const checkSavedDraft = async () => {
    try {
      const saved = await AsyncStorage.getItem('@DraftMaker:draft_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeTemplateId && parsed.formData) {
          const tmpl = TEMPLATES.find((t) => t.id === parsed.activeTemplateId);
          if (tmpl) {
            setSavedTemplateName(tmpl.title);
            setHasSavedDraft(true);
          }
        }
      }
    } catch (e) {
      console.warn('AsyncStorage read error:', e);
    }
  };

  const saveDraftState = async () => {
    try {
      const stateToSave = {
        activeTemplateId,
        formData,
        customClauses,
      };
      await AsyncStorage.setItem('@DraftMaker:draft_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('AsyncStorage write error:', e);
    }
  };

  const clearSavedState = async () => {
    try {
      await AsyncStorage.removeItem('@DraftMaker:draft_state');
      setHasSavedDraft(false);
    } catch (e) {
      console.warn('AsyncStorage remove error:', e);
    }
  };

  const resumeDraft = async () => {
    try {
      const saved = await AsyncStorage.getItem('@DraftMaker:draft_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        setActiveTemplateId(parsed.activeTemplateId);
        setFormData(parsed.formData || {});
        setCustomClauses(parsed.customClauses || []);
        setStep('FORM');
        setHasSavedDraft(false);
        showToast('success', 'Draft Restored', 'Resumed your last session.');
      }
    } catch (e) {
      showToast('error', 'Restore Failed', 'Unable to retrieve saved state.');
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    setActiveTemplateId(templateId);
    setFormData({});
    setCustomClauses([]);
    setErrors({});
    setStep('FORM');
  };

  const activeTemplate = TEMPLATES.find((t) => t.id === activeTemplateId);

  const handleInputChange = (key: string, val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!activeTemplate) return false;
    const newErrors: Record<string, string> = {};

    activeTemplate.fields.forEach((field) => {
      const val = formData[field.key] || '';
      if (field.required && !val.trim()) {
        newErrors[field.key] = `${field.label} is required.`;
      } else if (val) {
        if (field.type === 'phone' && !/^\d{10}$/.test(val)) {
          newErrors[field.key] = 'Must be a 10-digit number.';
        }
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          newErrors[field.key] = 'Invalid email address format.';
        }
        if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
          newErrors[field.key] = 'Use YYYY-MM-DD format.';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddCustomClause = () => {
    if (newClauseText.trim()) {
      setCustomClauses((prev) => [...prev, newClauseText.trim()]);
      setNewClauseText('');
      showToast('success', 'Clause Added', 'Custom clause registered.');
    }
  };

  const handleRemoveCustomClause = (index: number) => {
    setCustomClauses((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleValidateAndPreview = () => {
    if (validateForm()) {
      setStep('PREVIEW');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      showToast('error', 'Validation Failure', 'Please correct the highlighted form errors.');
    }
  };

  const extractPlaceholders = (text: string) => {
    const regex = /\[([^[\]]+)\]/g;
    const found: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const val = match[1].trim();
      const isSectionTag = [
        'TITLE', 'INTRODUCTION', 'PARTIES', 'DEFINITIONS', 'RECITALS', 
        'CLAUSES', 'TERMS', 'TERMINATION', 'DISPUTE_RESOLUTION', 
        'JURISDICTION', 'SIGNATURE_BLOCK', 'WITNESS_BLOCK', 'DATE_PLACE'
      ].includes(val);
      if (!isSectionTag && !found.includes(val)) {
        found.push(val);
      }
    }
    return found;
  };

  const processGeneratedText = (text: string) => {
    setOriginalDraft(text);
    const found = extractPlaceholders(text);
    setPlaceholders(found);
    const initialVals: Record<string, string> = {};
    found.forEach((p) => {
      initialVals[p] = p; // default value is name itself
    });
    setPlaceholderValues(initialVals);
  };

  // Compile prompt and stream legal response
  const triggerDraftGeneration = async () => {
    if (!activeTemplate) return;
    setStep('GENERATING');
    setDraftContent('');

    const simSteps = [
      'Connecting to Legal Template Registry...',
      'Mapping client parameters and variables...',
      'Constructing statutory liability provisions...',
      'Integrating custom clauses and exemptions...',
      'Running formatting compiler...',
    ];

    let stepIdx = 0;
    setGeneratingStep(simSteps[0]);
    const simInterval = setInterval(() => {
      stepIdx++;
      if (stepIdx < simSteps.length) {
        setGeneratingStep(simSteps[stepIdx]);
      } else {
        clearInterval(simInterval);
      }
    }, 1200);

    const payloadText = `I need you to act as a senior legal counsel and generate a complete, professionally formatted legal document for: ${activeTemplate.title}.
    
    Here is the structured client information provided in the form:
    ${activeTemplate.fields
      .map((field) => `- ${field.label}: ${formData[field.key] || 'Not specified'}`)
      .join('\n')}
      
    ${customClauses.length > 0 ? `Custom Clauses to strictly integrate:\n${customClauses.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : ''}
    
    Format the document with standard legal headings, preamble, terms, signature lines, date, and place. Deliver only the final complete text of the legal document.`;

    try {
      const payload = {
        content: payloadText,
        sessionId: `draft_${activeTemplateId}_${Date.now()}`,
        activeTool: 'draftMaker',
        stream: true,
        history: [],
      };

      const stream = streamAIResponse('/chat', payload);
      let text = '';

      for await (const token of stream) {
        text += token;
        setDraftContent(text);
        if (step !== 'RESULT') {
          clearInterval(simInterval);
          setStep('RESULT');
        }
      }

      processGeneratedText(text);
      await clearSavedState();
      await saveOrUpdateDraft(text, formData, customClauses);
    } catch (e) {
      clearInterval(simInterval);
      showToast('error', 'Draft Generation Failed', 'Legal AI compiler offline.');
      setStep('FORM');
    }
  };

  // Stream refine/modification commands on the generated draft
  const handleRefineDraft = async () => {
    if (!refineText.trim() || isRefining) return;
    const requestText = refineText.trim();
    setRefineText('');
    setIsRefining(true);

    const payloadText = `Here is the current legal document draft:
    """
    ${draftContent}
    """
    
    Please apply the following instruction/modification: "${requestText}".
    Keep the professional legal format and output the entire revised draft.`;

    try {
      const payload = {
        content: payloadText,
        sessionId: `refine_${activeTemplateId}_${Date.now()}`,
        activeTool: 'draftMaker',
        stream: true,
        history: [],
      };

      const stream = streamAIResponse('/chat', payload);
      let text = '';
      setDraftContent('');

      for await (const token of stream) {
        text += token;
        setDraftContent(text);
      }
      processGeneratedText(text);
      await saveOrUpdateDraft(text, formData, customClauses);
      showToast('success', 'Draft Refined', 'AI successfully applied modifications.');
    } catch (e) {
      showToast('error', 'Refinement Failed', 'Unable to reach AI refiner.');
    } finally {
      setIsRefining(false);
    }
  };

  // Redesigned Legal Document Parser and HTML generator for PDF/DOCX
  const parseDraftSections = (text: string) => {
    const sectionTags = [
      'TITLE', 'INTRODUCTION', 'PARTIES', 'DEFINITIONS', 'RECITALS', 
      'CLAUSES', 'TERMS', 'TERMINATION', 'DISPUTE_RESOLUTION', 
      'JURISDICTION', 'SIGNATURE_BLOCK', 'WITNESS_BLOCK', 'DATE_PLACE'
    ];
    
    // Find all matches for tags in square brackets
    const matches: { tag: string; index: number }[] = [];
    sectionTags.forEach(tag => {
      const regex = new RegExp(`\\[${tag}\\]`, 'g');
      let m;
      while ((m = regex.exec(text)) !== null) {
        matches.push({ tag, index: m.index });
      }
    });
    
    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);
    
    if (matches.length === 0) {
      return [{ type: 'BODY', content: text }];
    }
    
    const sections: { type: string; content: string }[] = [];
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = i + 1 < matches.length ? matches[i + 1] : null;
      const start = currentMatch.index + currentMatch.tag.length + 2; // after [TAG]
      const end = nextMatch ? nextMatch.index : text.length;
      const content = text.substring(start, end).trim();
      sections.push({ type: currentMatch.tag, content });
    }
    
    return sections;
  };

  const renderFormattedDraft = () => {
    const sections = parseDraftSections(draftContent);
    return sections.map((sec, index) => {
      if (!sec.content) return null;
      
      const formatLabel = (tag: string) => {
        switch (tag) {
          case 'TITLE': return '';
          case 'INTRODUCTION': return 'INTRODUCTION';
          case 'PARTIES': return 'PARTIES';
          case 'DEFINITIONS': return 'DEFINITIONS';
          case 'RECITALS': return 'WHEREAS (RECITALS)';
          case 'CLAUSES': return 'NOW THIS AGREEMENT WITNESSETH AS FOLLOWS';
          case 'TERMS': return 'TERMS & CONDITIONS';
          case 'TERMINATION': return 'TERMINATION & DEFAULTS';
          case 'DISPUTE_RESOLUTION': return 'DISPUTE RESOLUTION';
          case 'JURISDICTION': return 'GOVERNING LAW & JURISDICTION';
          case 'SIGNATURE_BLOCK': return 'IN WITNESS WHEREOF (SIGNATURES)';
          case 'WITNESS_BLOCK': return 'WITNESSES';
          case 'DATE_PLACE': return 'DATE & PLACE';
          default: return '';
        }
      };

      const label = formatLabel(sec.type);
      const isTitle = sec.type === 'TITLE';

      return (
        <View key={`sec-${index}`} style={styles.sectionContainer}>
          {label ? (
            <Text style={styles.sectionLabel}>{label}</Text>
          ) : null}
          {sec.content.split('\n').map((line, lIdx) => {
            const trimmed = line.trim();
            if (!trimmed) {
              return <View key={`l-space-${lIdx}`} style={{ height: 12 }} />;
            }

            if (/^(---|___|\*\*\*)$/.test(trimmed)) {
              return (
                <View
                  key={`l-divider-${lIdx}`}
                  style={{
                    height: 1,
                    backgroundColor: '#E5E7EB',
                    marginVertical: 14,
                  }}
                />
              );
            }

            // Parse inline bolding **text**
            const parts = trimmed.split(/\*\*([^*]+)\*\*/g);
            const inlineElements = parts.map((part, partIdx) => {
              const isBold = partIdx % 2 === 1;
              return (
                <Text
                  key={`part-${partIdx}`}
                  style={isBold ? styles.legalTextBold : styles.legalText}
                >
                  {part}
                </Text>
              );
            });

            return (
              <Text
                key={`l-para-${lIdx}`}
                style={[
                  styles.paragraphLine,
                  isTitle && styles.titleParagraph,
                ]}
              >
                {inlineElements}
              </Text>
            );
          })}
        </View>
      );
    });
  };

  const generateHTMLContent = () => {
    const sections = parseDraftSections(draftContent);
    let html = `
      <html>
        <head>
          <style>
            @page {
              size: A4;
              margin: 1.2in 1in 1.2in 1in;
            }
            body {
              font-family: 'Times New Roman', Times, Georgia, serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000000;
              padding: 0;
              margin: 0;
            }
            .title {
              font-size: 16pt;
              font-weight: bold;
              text-align: center;
              margin-bottom: 24pt;
              text-transform: uppercase;
            }
            .section-header {
              font-size: 11pt;
              font-weight: bold;
              text-align: left;
              margin-top: 18pt;
              margin-bottom: 8pt;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            p {
              margin-top: 0;
              margin-bottom: 12pt;
              text-indent: 0.5in;
              text-align: justify;
            }
            .no-indent {
              text-indent: 0;
            }
            .bold {
              font-weight: bold;
            }
            .divider {
              border-top: 1px solid #000000;
              margin: 20pt 0;
            }
          </style>
        </head>
        <body>
    `;

    sections.forEach((sec) => {
      const label = sec.type === 'TITLE' || sec.type === 'BODY' ? '' : sec.type.replace('_', ' ');
      if (label) {
        html += `<div class="section-header">${label}</div>`;
      }

      const lines = sec.content.split('\n');
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (/^(---|___|\*\*\*)$/.test(trimmed)) {
          html += `<div class="divider"></div>`;
          return;
        }

        const formattedLine = trimmed.replace(/\*\*([^*]+)\*\*/g, '<span class="bold">$1</span>');
        
        if (sec.type === 'TITLE') {
          html += `<div class="title">${formattedLine}</div>`;
        } else {
          const isListOrSignature = trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed) || trimmed.toLowerCase().includes('signature') || trimmed.toLowerCase().includes('witness');
          html += `<p class="${isListOrSignature ? 'no-indent' : ''}">${formattedLine}</p>`;
        }
      });
    });

    html += `
        </body>
      </html>
    `;
    return html;
  };

  // Post generation actions
  const handleCopy = () => {
    // Strip section tags and markdown indicators
    const cleanText = draftContent
      .replace(/\[(TITLE|INTRODUCTION|PARTIES|DEFINITIONS|RECITALS|CLAUSES|TERMS|TERMINATION|DISPUTE_RESOLUTION|JURISDICTION|SIGNATURE_BLOCK|WITNESS_BLOCK|DATE_PLACE)\]/g, '')
      .replace(/\*+/g, '')
      .trim();
    Clipboard.setString(cleanText);
    showToast('success', 'Copied', 'Clean draft content copied to clipboard.');
  };

  const saveDocumentLocally = async (format: 'PDF' | 'DOCX'): Promise<string | null> => {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const sanitizedTitle = (activeTemplate?.title || 'Legal_Draft').replace(/\s+/g, '_');
      const ext = format.toLowerCase();
      const fileName = `${sanitizedTitle}_${dateStr}.${ext}`;
      const fileUri = FileSystem.documentDirectory + fileName;

      setExportStatus({
        visible: true,
        type: format,
        loading: true,
        success: false,
        filePath: '',
        fileName,
        error: null,
      });

      const html = generateHTMLContent();

      if (format === 'PDF') {
        const { uri } = await Print.printToFileAsync({ html });
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }
        await FileSystem.copyAsync({ from: uri, to: fileUri });
      } else {
        // DOCX format - write HTML-encoded .docx directly
        await FileSystem.writeAsStringAsync(fileUri, html, { encoding: 'utf8' });
      }

      setExportStatus({
        visible: true,
        type: format,
        loading: false,
        success: true,
        filePath: fileUri,
        fileName,
        error: null,
      });

      await updateDraftStatus('Completed');
      showToast('success', `${format} Saved`, `${fileName} saved locally.`);
      return fileUri;
    } catch (err: any) {
      console.error(`[DraftMaker] Error saving ${format}:`, err);
      setExportStatus({
        visible: true,
        type: format,
        loading: false,
        success: false,
        filePath: '',
        fileName: '',
        error: err.message || `Failed to generate ${format}.`,
      });
      showToast('error', 'Export Failed', `Failed to save ${format} document.`);
      return null;
    }
  };

  const handleOpenFile = async (fileUri: string) => {
    try {
      const ext = fileUri.split('.').pop()?.toLowerCase() || '';
      let mimeType = 'application/pdf';
      if (ext === 'doc' || ext === 'docx') {
        mimeType = 'application/msword';
      } else if (ext === 'xls' || ext === 'xlsx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (ext === 'png') {
        mimeType = 'image/png';
      } else if (ext === 'jpg' || ext === 'jpeg') {
        mimeType = 'image/jpeg';
      } else if (ext === 'txt') {
        mimeType = 'text/plain';
      }

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(fileUri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
          type: mimeType,
        });
      } else {
        const supported = await Linking.canOpenURL(fileUri);
        if (supported) {
          await Linking.openURL(fileUri);
        } else {
          await Sharing.shareAsync(fileUri);
        }
      }
    } catch (err) {
      console.error('[DraftMaker] Error opening file, falling back to share:', err);
      try {
        await Sharing.shareAsync(fileUri);
      } catch (shareErr) {
        showToast('error', 'Open Failed', 'No compatible app found to open this file.');
      }
    }
  };

  const handleSelectShareFormat = async (format: 'PDF' | 'DOCX' | 'TXT') => {
    setIsShareModalVisible(false);

    if (format === 'TXT') {
      try {
        const cleanText = draftContent
          .replace(/\[(TITLE|INTRODUCTION|PARTIES|DEFINITIONS|RECITALS|CLAUSES|TERMS|TERMINATION|DISPUTE_RESOLUTION|JURISDICTION|SIGNATURE_BLOCK|WITNESS_BLOCK|DATE_PLACE)\]/g, '')
          .replace(/\*+/g, '')
          .trim();
        await Share.share({
          message: cleanText,
          title: activeTemplate?.title || 'Legal Draft',
        });
      } catch (err) {
        showToast('error', 'Share Failed', 'Failed to share plain text.');
      }
      return;
    }

    // PDF or DOCX
    let fileUri = format === 'PDF' ? savedPdfUri : savedDocxUri;
    
    if (fileUri) {
      const check = await FileSystem.getInfoAsync(fileUri);
      if (!check.exists) {
        fileUri = null;
      }
    }

    if (!fileUri) {
      fileUri = await saveDocumentLocally(format);
      if (format === 'PDF') setSavedPdfUri(fileUri);
      else setSavedDocxUri(fileUri);
    }

    if (fileUri) {
      try {
        await Sharing.shareAsync(fileUri, {
          mimeType: format === 'PDF' ? 'application/pdf' : 'application/msword',
          dialogTitle: `Share ${format}`,
          UTI: format === 'PDF' ? 'com.adobe.pdf' : 'com.microsoft.word.doc',
        });
      } catch (err) {
        showToast('error', 'Share Failed', 'Failed to open share sheet.');
      }
    }
  };

  const handlePDFDownload = async () => {
    const fileUri = await saveDocumentLocally('PDF');
    if (fileUri) setSavedPdfUri(fileUri);
  };

  const handleDOCXDownload = async () => {
    const fileUri = await saveDocumentLocally('DOCX');
    if (fileUri) setSavedDocxUri(fileUri);
  };

  const handleShare = () => {
    setIsShareModalVisible(true);
  };

  const handleSaveToCase = async () => {
    try {
      await saveOrUpdateDraft(draftContent, formData, customClauses);
      showToast('success', 'Draft Saved', 'Draft Saved Successfully.');
    } catch (err) {
      console.error('[DraftMaker] Save error:', err);
      showToast('error', 'Save Failed', 'Failed to save draft.');
    }
  };

  const handlePrint = async () => {
    try {
      const html = generateHTMLContent();
      await Print.printAsync({ html });
      showToast('success', 'Spooler Active', 'Sent document to system spooler.');
      await updateDraftStatus('Completed');
    } catch (err) {
      console.error('[DraftMaker] Print error:', err);
      showToast('error', 'Print Error', 'Failed to initialize system printing.');
    }
  };

  const handleUpdatePlaceholder = (key: string, value: string) => {
    setPlaceholderValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSavePlaceholderChanges = async () => {
    let updated = originalDraft;
    Object.keys(placeholderValues).forEach(key => {
      const val = placeholderValues[key] || '';
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp('\\[' + escapedKey + '\\]', 'g');
      updated = updated.replace(regex, val);
    });
    setDraftContent(updated);
    setIsEditModalVisible(false);
    await saveOrUpdateDraft(updated, formData, customClauses);
    showToast('success', 'Draft Updated', 'Placeholders updated in draft.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top compact screen header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (step === 'FORM') setStep('SELECT');
            else if (step === 'PREVIEW') setStep('FORM');
            else if (step === 'RESULT') setStep('PREVIEW');
            else router.back();
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Draft Maker</Text>
        </View>
        <Pressable
          onPress={() => setIsHistoryOpen(true)}
          style={styles.headerBtn}
          accessibilityLabel="Draft History"
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={24} color="#1F2937" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Template selection */}
        {step === 'SELECT' && (
          <View>
            {/* Resume draft notice banner */}
            {hasSavedDraft && (
              <View style={[styles.resumeBanner, Shadows.md]}>
                <Ionicons name="document-text-outline" size={24} color="#6D5DFC" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.resumeTitle}>Unfinished Draft Detected</Text>
                  <Text style={styles.resumeDesc}>Resume editing your draft of {savedTemplateName}?</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity style={styles.resumeBtn} onPress={resumeDraft}>
                      <Text style={styles.resumeBtnText}>Resume</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.discardBtn} onPress={clearSavedState}>
                      <Text style={styles.discardBtnText}>Discard</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.welcomeBanner}>
              <Text style={styles.welcomeText}>AI Smart Legal Form Generator</Text>
              <Text style={styles.welcomeSub}>
                Select a document template to generate an intelligent form. The AI will audit your information and compile a complete legal document draft instantly.
              </Text>
            </View>

            <Text style={styles.sectionHeading}>Choose Draft Template</Text>
            <View style={styles.templatesGrid}>
              {TEMPLATES.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.templateCard}
                  onPress={() => handleSelectTemplate(item.id)}
                >
                  <View style={styles.templateIconBox}>
                    <Ionicons name={item.icon as any} size={22} color="#6D5DFC" />
                  </View>
                  <Text style={styles.templateTitle}>{item.title}</Text>
                  <Text style={styles.templateDesc}>{item.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Intelligent dynamic inputs form */}
        {step === 'FORM' && activeTemplate && (
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Drafting: {activeTemplate.title}</Text>
              <Text style={styles.formDesc}>{activeTemplate.description}</Text>
            </View>

            {/* Render form fields dynamically */}
            {activeTemplate.fields.map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>
                    {field.label} {field.required && <Text style={{ color: '#EF4444' }}>*</Text>}
                  </Text>
                  {errors[field.key] && <Text style={styles.errorText}>{errors[field.key]}</Text>}
                </View>

                {field.type === 'select' ? (
                  <View style={styles.pickerWrapper}>
                    {field.options?.map((opt) => {
                      const isSelected = formData[field.key] === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                          onPress={() => handleInputChange(field.key, opt)}
                        >
                          <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextActive]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <TextInput
                    style={[styles.textInput, field.type === 'multiline' && styles.multilineInput]}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={formData[field.key] || ''}
                    onChangeText={(text) => handleInputChange(field.key, text)}
                    keyboardType={
                      field.type === 'number'
                        ? 'numeric'
                        : field.type === 'phone'
                        ? 'phone-pad'
                        : field.type === 'email'
                        ? 'email-address'
                        : 'default'
                    }
                    multiline={field.type === 'multiline'}
                    numberOfLines={field.type === 'multiline' ? 4 : 1}
                  />
                )}
              </View>
            ))}

            {/* Custom Clauses Section */}
            <View style={styles.clauseSection}>
              <Text style={styles.clauseHeading}>Custom Clauses (Optional)</Text>
              <Text style={styles.clauseDesc}>
                Add specific customized clauses to be intelligently integrated into the draft by the AI.
              </Text>

              {customClauses.map((clause, idx) => (
                <View key={idx} style={styles.clauseChip}>
                  <Text style={styles.clauseChipText} numberOfLines={2}>
                    {idx + 1}. {clause}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveCustomClause(idx)}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.clauseInputRow}>
                <TextInput
                  style={styles.clauseInput}
                  placeholder="e.g. Late fee of 10% after 5th of each month"
                  placeholderTextColor="#9CA3AF"
                  value={newClauseText}
                  onChangeText={setNewClauseText}
                />
                <TouchableOpacity style={styles.addClauseBtn} onPress={handleAddCustomClause}>
                  <Text style={styles.addClauseBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={handleValidateAndPreview}>
              <Text style={styles.actionBtnText}>Validate & Preview</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Structured preview & review */}
        {step === 'PREVIEW' && activeTemplate && (
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Review Form Entries</Text>
              <Text style={styles.formDesc}>Please verify all information before drafting.</Text>
            </View>

            <View style={styles.previewBox}>
              {activeTemplate.fields.map((field) => (
                <View key={field.key} style={styles.previewRow}>
                  <Text style={styles.previewLabel}>{field.label}</Text>
                  <Text style={styles.previewValue}>{formData[field.key] || '-'}</Text>
                </View>
              ))}

              {customClauses.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.previewLabel}>Custom Clauses</Text>
                  {customClauses.map((clause, idx) => (
                    <Text key={idx} style={styles.previewClause}>
                      • {clause}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: '#F3F4F6' }]} onPress={() => setStep('FORM')}>
                <Text style={[styles.actionBtnText, { color: '#4B5563' }]}>Edit Entries</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, { flex: 1.5 }]} onPress={triggerDraftGeneration}>
                <Text style={styles.actionBtnText}>Generate Draft</Text>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 4: Live compiling loader */}
        {step === 'GENERATING' && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#6D5DFC" />
            <Text style={styles.compilingTitle}>AI Legal Draft Compiler Active</Text>
            <Text style={styles.compilingDesc}>{generatingStep}</Text>
          </View>
        )}

        {/* Step 5: Draft output Result and modification actions */}
        {step === 'RESULT' && (
          <View>
            <Text style={styles.workspaceHeading}>Generated Legal Draft Document</Text>

            {/* Virtual Legal Paper view */}
            <View style={[styles.legalPaper, Shadows.md]}>
              <View style={styles.legalStampHeader}>
                <Text style={styles.stampText}>AI LEGAL COMPILER DRAFT</Text>
                <View style={styles.stampDivider} />
              </View>

              {renderFormattedDraft()}
            </View>

            {/* Post generation workspace actions */}
            <View style={styles.workspaceActions}>
              <TouchableOpacity style={styles.workspaceActionBtn} onPress={() => setIsEditModalVisible(true)}>
                <Ionicons name="create-outline" size={18} color="#6D5DFC" />
                <Text style={styles.workspaceActionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.workspaceActionBtn} onPress={handleCopy}>
                <Ionicons name="copy-outline" size={18} color="#6D5DFC" />
                <Text style={styles.workspaceActionText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.workspaceActionBtn} onPress={handlePDFDownload}>
                <Ionicons name="document-outline" size={18} color="#6D5DFC" />
                <Text style={styles.workspaceActionText}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.workspaceActionBtn} onPress={handleDOCXDownload}>
                <Ionicons name="document-text-outline" size={18} color="#6D5DFC" />
                <Text style={styles.workspaceActionText}>DOCX</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.workspaceActionBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={18} color="#6D5DFC" />
                <Text style={styles.workspaceActionText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.workspaceActionBtn} onPress={handleSaveToCase}>
                <Ionicons name="folder-open-outline" size={18} color="#6D5DFC" />
                <Text style={styles.workspaceActionText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.workspaceActionBtn} onPress={handlePrint}>
                <Ionicons name="print-outline" size={18} color="#6D5DFC" />
                <Text style={styles.workspaceActionText}>Print</Text>
              </TouchableOpacity>
            </View>

            {/* Follow-up chat refiner bar */}
            <View style={[styles.refineContainer, Shadows.sm]}>
                <Text style={styles.refineHeading}>💡 Request AI Modifications</Text>
                <View style={styles.refineInputRow}>
                  <TextInput
                    style={styles.refineInput}
                    placeholder="e.g. Change notice period to 2 months..."
                    placeholderTextColor="#9CA3AF"
                    value={refineText}
                    onChangeText={setRefineText}
                    editable={!isRefining}
                  />
                  {isRefining ? (
                    <View style={styles.refineSendBtn}>
                      <ActivityIndicator size="small" color="#6D5DFC" />
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.refineSendBtn} onPress={handleRefineDraft}>
                      <Ionicons name="send" size={16} color="#6D5DFC" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: '#F3F4F6' }]} onPress={() => setStep('FORM')}>
                <Text style={[styles.actionBtnText, { color: '#4B5563' }]}>Edit Original Form</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={() => setStep('SELECT')}>
                <Text style={styles.actionBtnText}>Start New Draft</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Placeholder Editor Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.modalContent, Shadows.modal]}>
                <View style={styles.modalDragHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>✏️ Edit Draft Placeholders</Text>
                  <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                    <Ionicons name="close-circle" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {placeholders.length === 0 ? (
                  <View style={styles.emptyPlaceholders}>
                    <Text style={styles.emptyPlaceholdersText}>No placeholders detected in the document.</Text>
                    <Text style={styles.emptyPlaceholdersHint}>Placeholders are usually formatted like [Date] or [Father Name].</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.modalFieldsList} showsVerticalScrollIndicator={false}>
                    {placeholders.map((key) => (
                      <View key={key} style={styles.modalFieldGroup}>
                        <Text style={styles.modalFieldLabel}>{key}</Text>
                        <TextInput
                          style={styles.modalFieldInput}
                          placeholder={`Enter ${key}...`}
                          placeholderTextColor="#9CA3AF"
                          value={placeholderValues[key] === key ? '' : placeholderValues[key]}
                          onChangeText={(val) => handleUpdatePlaceholder(key, val)}
                        />
                      </View>
                    ))}
                    <View style={{ height: 20 }} />
                  </ScrollView>
                )}

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnCancel]}
                    onPress={() => setIsEditModalVisible(false)}
                  >
                    <Text style={styles.modalBtnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnSave]}
                    onPress={handleSavePlaceholderChanges}
                  >
                    <Text style={styles.modalBtnSaveText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Share Format Selection Modal */}
      <Modal
        visible={isShareModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsShareModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsShareModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.modalContent, Shadows.modal]}>
                <View style={styles.modalDragHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Share Document</Text>
                  <TouchableOpacity onPress={() => setIsShareModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.shareSubtitle}>Choose a format</Text>

                <View style={styles.shareOptionsList}>
                  <TouchableOpacity
                    style={styles.shareOptionRow}
                    onPress={() => handleSelectShareFormat('PDF')}
                  >
                    <View style={styles.shareOptionIconBox}>
                      <Ionicons name="document" size={20} color="#6D5DFC" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shareOptionText}>PDF Document</Text>
                      <Text style={styles.shareOptionDesc}>Perfect for printing and official sharing</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareOptionRow}
                    onPress={() => handleSelectShareFormat('DOCX')}
                  >
                    <View style={styles.shareOptionIconBox}>
                      <Ionicons name="document-text" size={20} color="#6D5DFC" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shareOptionText}>Word Document (DOCX)</Text>
                      <Text style={styles.shareOptionDesc}>Editable format for Microsoft Word</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareOptionRow}
                    onPress={() => handleSelectShareFormat('TXT')}
                  >
                    <View style={styles.shareOptionIconBox}>
                      <Ionicons name="text" size={20} color="#6D5DFC" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shareOptionText}>Plain Text</Text>
                      <Text style={styles.shareOptionDesc}>Share clean text copy immediately</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel, { marginTop: 12 }]}
                  onPress={() => setIsShareModalVisible(false)}
                >
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Export Status Modal (Loading / Success / Error) */}
      <Modal
        visible={exportStatus.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          if (!exportStatus.loading) {
            setExportStatus(prev => ({ ...prev, visible: false }));
          }
        }}
      >
        <View style={styles.exportModalOverlay}>
          <View style={[styles.exportModalContent, Shadows.modal]}>
            {!exportStatus.loading && (
              <TouchableOpacity
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
                onPress={() => setExportStatus(prev => ({ ...prev, visible: false }))}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            )}
            {exportStatus.loading && (
              <View style={styles.exportStateBox}>
                <ActivityIndicator size="large" color="#6D5DFC" />
                <Text style={styles.exportStateTitle}>Generating {exportStatus.type}...</Text>
                <Text style={styles.exportStateDesc}>Compiling document structure and styles. Please wait...</Text>
              </View>
            )}

            {exportStatus.success && (
              <View style={styles.exportStateBox}>
                <View style={styles.exportSuccessIconBg}>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                </View>
                <Text style={styles.exportStateTitle}>✅ {exportStatus.type} downloaded successfully</Text>
                <Text style={styles.exportStateDesc} numberOfLines={2}>
                  Saved to: {Platform.OS === 'ios' ? 'Files / App Documents' : 'App Documents'}
                </Text>
                <Text style={styles.exportFilePathText}>{exportStatus.fileName}</Text>

                <View style={styles.exportActionsRow}>
                  <TouchableOpacity
                    style={[styles.exportActionBtnItem, styles.exportActionBtnOpen]}
                    onPress={() => handleOpenFile(exportStatus.filePath)}
                  >
                    <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.exportActionBtnOpenText}>Open {exportStatus.type}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.exportActionBtnItem, styles.exportActionBtnShare]}
                    onPress={() => {
                      Sharing.shareAsync(exportStatus.filePath, {
                        mimeType: exportStatus.type === 'PDF' ? 'application/pdf' : 'application/msword',
                        dialogTitle: `Share ${exportStatus.type}`,
                        UTI: exportStatus.type === 'PDF' ? 'com.adobe.pdf' : 'com.microsoft.word.doc',
                      }).catch(() => showToast('error', 'Error', 'Failed to share document.'));
                    }}
                  >
                    <Ionicons name="share-social-outline" size={18} color="#6D5DFC" />
                    <Text style={styles.exportActionBtnShareText}>Share {exportStatus.type}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel, { width: '100%', marginTop: 8 }]}
                  onPress={() => setExportStatus(prev => ({ ...prev, visible: false }))}
                >
                  <Text style={styles.modalBtnCancelText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}

            {exportStatus.error && (
              <View style={styles.exportStateBox}>
                <View style={styles.exportErrorIconBg}>
                  <Ionicons name="alert-circle" size={48} color="#EF4444" />
                </View>
                <Text style={styles.exportStateTitle}>Export Failed</Text>
                <Text style={styles.exportStateDesc}>{exportStatus.error}</Text>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel, { width: '100%', marginTop: 16 }]}
                  onPress={() => setExportStatus(prev => ({ ...prev, visible: false }))}
                >
                  <Text style={styles.modalBtnCancelText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Sliding Sidebar History modal drawer */}
      <Modal
        visible={isHistoryOpen}
        animationType="none"
        transparent={true}
        onRequestClose={() => setIsHistoryOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          {/* Semi-transparent backdrop */}
          <Pressable style={{ flex: 1 }} onPress={() => setIsHistoryOpen(false)} />

          {/* Sidebar Drawer container */}
          <View style={styles.drawerContainer}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Draft History</Text>
                <Pressable onPress={() => setIsHistoryOpen(false)}>
                  <Ionicons name="close" size={24} color="#475569" />
                </Pressable>
              </View>

              <View style={styles.drawerSearchContainer}>
                <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput
                  placeholder="Search drafts..."
                  placeholderTextColor="#94A3B8"
                  value={historySearchQuery}
                  onChangeText={setHistorySearchQuery}
                  style={styles.drawerSearchInput}
                />
              </View>

              <ScrollView style={styles.drawerList}>
                {sortedHistoryDrafts.length === 0 ? (
                  <View style={styles.emptyHistoryContainer}>
                    <Ionicons name="document-text-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.drawerEmptyText}>No drafts found</Text>
                  </View>
                ) : (
                  sortedHistoryDrafts.map((item) => {
                    const isEditing = editingDraftId === item.id;
                    const isActive = activeDraftId === item.id;
                    const date = new Date(item.lastEditedTime || item.createdAt);
                    const formattedDate = date.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    }) + ' • ' + date.toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.drawerItem,
                          isActive && styles.drawerItemActive,
                        ]}
                      >
                        <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 10 }}>
                          {isEditing ? (
                            <TextInput
                              style={styles.drawerRenameInput}
                              value={renameVal}
                              onChangeText={setRenameVal}
                              autoFocus={true}
                              onBlur={() => handleRenameConfirm(item.id)}
                              onSubmitEditing={() => handleRenameConfirm(item.id)}
                            />
                          ) : (
                            <TouchableOpacity
                              style={styles.drawerItemTextContainer}
                              onPress={() => handleOpenDraft(item)}
                            >
                              <View style={styles.drawerItemHeaderRow}>
                                <Ionicons
                                  name="document-text"
                                  size={16}
                                  color={isActive ? '#6D5DFC' : '#6B7280'}
                                  style={{ marginRight: 6 }}
                                />
                                <Text
                                  style={[
                                    styles.drawerItemText,
                                    isActive && styles.drawerItemTextActive,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {item.draftName}
                                </Text>
                              </View>
                              
                              <Text style={styles.drawerItemSubtext}>
                                {item.title}
                              </Text>

                              <View style={styles.drawerItemMetaRow}>
                                <Text style={styles.drawerItemDate}>
                                  {formattedDate}
                                </Text>
                                <View
                                  style={[
                                    styles.statusBadge,
                                    item.status === 'Completed' ? styles.statusCompleted : styles.statusDraft,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.statusBadgeText,
                                      item.status === 'Completed' ? styles.statusCompletedText : styles.statusDraftText,
                                    ]}
                                  >
                                    {item.status || 'Draft'}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          )}
                        </View>

                        {!isEditing && (
                          <View style={styles.drawerItemActions}>
                            {item.status !== 'Completed' && (
                              <Pressable
                                onPress={() => handleContinueEditing(item)}
                                style={styles.drawerActionIcon}
                                accessibilityLabel="Continue Editing"
                                accessibilityRole="button"
                              >
                                <Ionicons name="create-outline" size={16} color="#6D5DFC" />
                              </Pressable>
                            )}
                            <Pressable
                              onPress={() => {
                                setEditingDraftId(item.id);
                                setRenameVal(item.draftName);
                              }}
                              style={styles.drawerActionIcon}
                              accessibilityLabel="Rename Draft"
                              accessibilityRole="button"
                            >
                              <Ionicons name="pencil-outline" size={16} color="#4B5563" />
                            </Pressable>
                            <Pressable
                              onPress={() => handleDuplicateDraft(item)}
                              style={styles.drawerActionIcon}
                              accessibilityLabel="Duplicate Draft"
                              accessibilityRole="button"
                            >
                              <Ionicons name="copy-outline" size={16} color="#4B5563" />
                            </Pressable>
                            <Pressable
                              onPress={() => handleDeleteDraft(item.id)}
                              style={styles.drawerActionIcon}
                              accessibilityLabel="Delete Draft"
                              accessibilityRole="button"
                            >
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEECFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  resumeTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#5B4EDB',
  },
  resumeDesc: {
    fontSize: 11.5,
    color: '#6D5DFC',
    marginTop: 2,
  },
  resumeBtn: {
    backgroundColor: '#6D5DFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resumeBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  discardBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  discardBtnText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  welcomeBanner: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  templatesGrid: {
    gap: 12,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 14,
  },
  templateIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEECFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  templateDesc: {
    fontSize: 11.5,
    color: '#6B7280',
    lineHeight: 16,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
  },
  formHeader: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  formDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#374151',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  selectOptionActive: {
    borderColor: '#6D5DFC',
    backgroundColor: '#EEECFF',
  },
  selectOptionText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  selectOptionTextActive: {
    color: '#5B4EDB',
  },
  clauseSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingTop: 16,
    marginBottom: 20,
  },
  clauseHeading: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  clauseDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 10,
  },
  clauseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  clauseChipText: {
    fontSize: 11.5,
    color: '#4B5563',
    flex: 1,
    marginRight: 10,
  },
  clauseInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  clauseInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12.5,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  addClauseBtn: {
    backgroundColor: '#EEECFF',
    borderWidth: 1,
    borderColor: '#6D5DFC',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addClauseBtnText: {
    fontSize: 12,
    color: '#5B4EDB',
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: '#6D5DFC',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  actionBtnText: {
    fontSize: 13.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewBox: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    padding: 14,
    gap: 10,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    paddingBottom: 6,
  },
  previewLabel: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  previewValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  previewClause: {
    fontSize: 11.5,
    color: '#4B5563',
    marginTop: 4,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  compilingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 4,
  },
  compilingDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  workspaceHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  legalPaper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderLeftWidth: 6,
    borderLeftColor: '#6D5DFC',
    borderRadius: 8,
    padding: 18,
    minHeight: 300,
  },
  legalStampHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stampText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '800',
    letterSpacing: 1,
  },
  stampDivider: {
    height: 1,
    backgroundColor: '#ECECEC',
    width: '100%',
    marginTop: 4,
  },
  documentTextMonospace: {
    fontSize: 11.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#1F2937',
    lineHeight: 18,
  },
  workspaceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 16,
    justifyContent: 'space-between',
  },
  workspaceActionBtn: {
    width: '31%',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  workspaceActionText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '700',
  },
  refineContainer: {
    backgroundColor: '#EEECFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 10,
    padding: 12,
  },
  refineHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#5B4EDB',
    marginBottom: 8,
  },
  refineInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  refineInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12.5,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  refineSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  legalText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 16,
    lineHeight: 26,
    color: '#1F2937',
    textAlign: 'justify',
  },
  legalTextBold: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 26,
    color: '#111827',
  },
  paragraphLine: {
    marginBottom: 12,
  },
  titleParagraph: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
    lineHeight: 28,
    color: '#111827',
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  modalFieldsList: {
    flexGrow: 0,
    marginBottom: 16,
  },
  modalFieldGroup: {
    marginBottom: 16,
  },
  modalFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  modalFieldInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalBtnCancelText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '700',
  },
  modalBtnSave: {
    backgroundColor: '#6D5DFC',
  },
  modalBtnSaveText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyPlaceholders: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyPlaceholdersText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyPlaceholdersHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  shareSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  shareOptionsList: {
    gap: 12,
    marginBottom: 20,
  },
  shareOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  shareOptionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEECFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  shareOptionDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  exportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exportModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  exportStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  exportStateDesc: {
    fontSize: 12.5,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  exportFilePathText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#5B4EDB',
    backgroundColor: '#EEECFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 12,
    width: '100%',
    textAlign: 'center',
  },
  exportSuccessIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  exportErrorIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FCE8E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  exportActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 8,
    width: '100%',
  },
  exportActionBtnItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  exportActionBtnOpen: {
    backgroundColor: '#6D5DFC',
    borderColor: '#6D5DFC',
  },
  exportActionBtnOpenText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  exportActionBtnShare: {
    backgroundColor: '#FFFFFF',
    borderColor: '#ECECEC',
  },
  exportActionBtnShareText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '700',
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawerContainer: {
    width: Dimensions.get('window').width * 0.82,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#ECECEC',
    paddingHorizontal: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  drawerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 12,
    marginBottom: 12,
  },
  drawerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    padding: 0,
  },
  drawerList: {
    flex: 1,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  drawerEmptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  drawerItem: {
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  drawerItemActive: {
    borderColor: '#6D5DFC',
    backgroundColor: '#EEECFF',
  },
  drawerItemTextContainer: {
    flexDirection: 'column',
  },
  drawerItemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  drawerItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  drawerItemTextActive: {
    color: '#6D5DFC',
  },
  drawerItemSubtext: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 22,
    marginBottom: 6,
  },
  drawerItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 22,
    marginTop: 2,
  },
  drawerItemDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusDraft: {
    backgroundColor: '#FEF3C7',
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusDraftText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
    textTransform: 'uppercase',
  },
  statusCompletedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
  },
  drawerRenameInput: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: '#6D5DFC',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  drawerItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    backgroundColor: '#F9FAFB',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  drawerActionIcon: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
});

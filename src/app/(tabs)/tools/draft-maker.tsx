import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useThemeContext, useToastContext } from '@/providers';
import { streamAIResponse } from '@/api/client';
import { Shadows } from '@/theme';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

import { useWorkspace } from '@/hooks/use-workspace';
import { ALL_TEMPLATES, CATEGORY_DEFAULT_FIELDS, FormField, TemplateMetadata } from '@/constants/templates-data';
import { useTranslation } from '../../../utils/localization';
import * as DocumentPicker from 'expo-document-picker';

const { height, width } = Dimensions.get('window');

const getTemplateFields = (template: TemplateMetadata | undefined): FormField[] => {
  if (!template) return [];
  return template.fields || CATEGORY_DEFAULT_FIELDS[template.category] || [];
};


export default function DraftMakerScreen() {
  useAuthGuard();
  const { theme, isDark } = useThemeContext();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const { showToast } = useToastContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useTranslation();

  const getTmplTitle = (item: any) => {
    if (!item) return '';
    return t(item.id, item.title);
  };

  const getTmplDesc = (item: any) => {
    if (!item) return '';
    return t(item.id + '_desc', item.description);
  };

  const getDraftDisplayTitle = (item: SavedDraft) => {
    const tmpl = ALL_TEMPLATES.find(t => t.id === item.documentType || t.title === item.title);
    return tmpl ? getTmplTitle(tmpl) : item.title;
  };

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

  // Enterprise Legal Drafting Suite states
  const { workspace } = useWorkspace();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [templateUsageCount, setTemplateUsageCount] = useState<Record<string, number>>({});

  // Custom template / custom draft creation states
  const [personalTemplates, setPersonalTemplates] = useState<TemplateMetadata[]>([]);
  const [customDraftTitle, setCustomDraftTitle] = useState('');
  const [customDraftType, setCustomDraftType] = useState('Agreement');
  const [customDraftDesc, setCustomDraftDesc] = useState('');
  interface CustomOptionalDetails {
    client: string;
    opponent: string;
    court: string;
    jurisdiction: string;
    language: string;
    applicableLaw: string;
    specialInstructions: string;
    [key: string]: string;
  }

  const [customOptionalDetails, setCustomOptionalDetails] = useState<CustomOptionalDetails>({
    client: '',
    opponent: '',
    court: '',
    jurisdiction: '',
    language: 'English',
    applicableLaw: 'Indian Law',
    specialInstructions: '',
  });
  const [customDocs, setCustomDocs] = useState<string[]>([]);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

  // Custom briefing question/answer states
  const [customStep, setCustomStep] = useState<'INPUT' | 'QUESTIONS' | 'GENERATING' | 'RESULT'>('INPUT');
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [aiAnswers, setAiAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

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

  // Check for auto-saved draft and load local settings on mount
  useEffect(() => {
    checkSavedDraft();
    loadHistoryDrafts();

    const loadLocalSettings = async () => {
      try {
        const favs = await AsyncStorage.getItem('@DraftMaker:favorites');
        if (favs) setFavorites(JSON.parse(favs));

        const searches = await AsyncStorage.getItem('@DraftMaker:recent_searches');
        if (searches) setRecentSearches(JSON.parse(searches));

        const counts = await AsyncStorage.getItem('@DraftMaker:usage_counts');
        if (counts) setTemplateUsageCount(JSON.parse(counts));

        const customTemplatesStr = await AsyncStorage.getItem('@DraftMaker:personal_templates');
        if (customTemplatesStr) setPersonalTemplates(JSON.parse(customTemplatesStr));
      } catch (e) {
        console.warn('Error loading local storage workspace configs:', e);
      }
    };
    loadLocalSettings();
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

  // Helper mapping to automatically pre-fill workspace case details into form variables
  const getPreFilledValue = (fieldKey: string, fieldLabel: string, ws: any) => {
    if (!ws) return '';
    const labelLower = fieldLabel.toLowerCase();
    const keyLower = fieldKey.toLowerCase();

    // Client Name
    if (
      labelLower.includes('client') ||
      labelLower.includes('complainant') ||
      labelLower.includes('deponent') ||
      labelLower.includes('principal') ||
      labelLower.includes('sender') ||
      labelLower.includes('landlord') ||
      labelLower.includes('petitioner') ||
      labelLower.includes('party 1') ||
      labelLower.includes('first party') ||
      keyLower.includes('sender') ||
      keyLower.includes('landlord') ||
      keyLower.includes('complainant') ||
      keyLower.includes('petitioner')
    ) {
      return ws.clientName || '';
    }

    // Opposite Party Name
    if (
      labelLower.includes('opponent') ||
      labelLower.includes('opposite party') ||
      labelLower.includes('accused') ||
      labelLower.includes('receiver') ||
      labelLower.includes('agent') ||
      labelLower.includes('attorney') ||
      labelLower.includes('tenant') ||
      labelLower.includes('respondent') ||
      labelLower.includes('party 2') ||
      labelLower.includes('second party') ||
      keyLower.includes('receiver') ||
      keyLower.includes('tenant') ||
      keyLower.includes('accused') ||
      keyLower.includes('respondent')
    ) {
      return ws.opponentName || '';
    }

    // Court or Jurisdiction
    if (
      labelLower.includes('court') ||
      labelLower.includes('jurisdiction') ||
      labelLower.includes('police station') ||
      keyLower.includes('court') ||
      keyLower.includes('jurisdiction') ||
      keyLower.includes('policestation')
    ) {
      return ws.courtName || '';
    }

    // Facts or Incident Description or Case Summary
    if (
      labelLower.includes('facts') ||
      labelLower.includes('incident') ||
      labelLower.includes('description') ||
      labelLower.includes('purpose') ||
      keyLower.includes('facts') ||
      keyLower.includes('description') ||
      keyLower.includes('summary')
    ) {
      return ws.caseSummary || ws.summary || '';
    }

    return '';
  };

  const incrementTemplateUsage = async (templateId: string) => {
    try {
      const updatedCounts = { ...templateUsageCount };
      updatedCounts[templateId] = (updatedCounts[templateId] || 0) + 1;
      setTemplateUsageCount(updatedCounts);
      await AsyncStorage.setItem('@DraftMaker:usage_counts', JSON.stringify(updatedCounts));
    } catch (e) {
      console.warn('Error saving usage counts:', e);
    }
  };

  const toggleFavorite = async (templateId: string) => {
    try {
      let updated: string[];
      if (favorites.includes(templateId)) {
        updated = favorites.filter(id => id !== templateId);
        showToast('success', 'Removed from Favorites', 'Template removed from your bookmarks.');
      } else {
        updated = [...favorites, templateId];
        showToast('success', 'Added to Favorites', 'Template added to your bookmarks.');
      }
      setFavorites(updated);
      await AsyncStorage.setItem('@DraftMaker:favorites', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving favorites list:', e);
    }
  };

  const addRecentSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter(q => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      setRecentSearches(updated);
      await AsyncStorage.setItem('@DraftMaker:recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving recent search list:', e);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem('@DraftMaker:recent_searches');
    } catch (e) {
      console.warn('Error clearing recent searches:', e);
    }
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

      const tmpl = ALL_TEMPLATES.find(t => t.id === activeTemplateId) || personalTemplates.find(t => t.id === activeTemplateId);
      const title = tmpl?.title || customDraftTitle || 'Legal Draft';
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
    
    if (draft.documentType && (draft.documentType.startsWith('custom_') || draft.documentType === 'customDraft')) {
      setCustomDraftTitle(draft.title);
      setCustomDraftType(draft.formData?.['documentType'] || 'Agreement');
      setCustomDraftDesc(draft.formData?.['description'] || '');
      setCustomOptionalDetails({
        client: draft.formData?.['client'] || '',
        opponent: draft.formData?.['opponent'] || '',
        court: draft.formData?.['court'] || '',
        jurisdiction: draft.formData?.['jurisdiction'] || '',
        language: draft.formData?.['language'] || 'English',
        applicableLaw: draft.formData?.['applicableLaw'] || 'Indian Law',
        specialInstructions: draft.formData?.['specialInstructions'] || '',
      });
      setActiveCategory('✨ Custom');
      setCustomStep('INPUT');
      setStep('SELECT');
    } else {
      setStep('FORM');
    }
    setIsHistoryOpen(false);
  };

  // Prefill details from case workspace when workspace loads
  useEffect(() => {
    if (workspace) {
      setCustomOptionalDetails(prev => ({
        ...prev,
        client: workspace.clientName || prev.client,
        opponent: workspace.opponentName || prev.opponent,
        court: workspace.courtName || prev.court,
        jurisdiction: workspace.courtName || prev.jurisdiction,
      }));
    }
  }, [workspace]);

  // Support document uploads using expo-document-picker
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const name = result.assets[0].name;
        setCustomDocs(prev => [...prev, name]);
        showToast('success', 'Document Attached', `${name} attached successfully.`);
      }
    } catch (err) {
      showToast('error', 'Pick Failed', 'Could not open document picker.');
    }
  };
  
  const handleRemoveDocument = (idx: number) => {
    setCustomDocs(prev => prev.filter((_, i) => i !== idx));
  };

  // Compile prompt and evaluate custom draft creation parameters (evaluates for missing facts)
  const handleGenerateCustomDraft = async () => {
    if (!customDraftTitle.trim()) {
      showToast('error', 'Required Field', 'Please enter a draft title.');
      return;
    }
    if (!customDraftDesc.trim()) {
      showToast('error', 'Required Field', 'Please describe the document requirements.');
      return;
    }
    
    setCustomStep('GENERATING');
    setDraftContent('');
    setAiQuestions([]);
    
    let caseContextPrompt = '';
    if (workspace) {
      caseContextPrompt = `
      CASE CONTEXT:
      - Case Name: ${workspace.name || ''}
      - Client Full Name: ${workspace.clientName || ''}
      - Opposing Party Full Name: ${workspace.opponentName || ''}
      - Court Name: ${workspace.courtName || ''}
      - Case Summary/Brief: ${workspace.caseSummary || workspace.summary || ''}
      \n\n`;
    }
    
    const payloadText = `${caseContextPrompt}You are an expert Indian legal counsel drafting a document.
    
    REQUEST DETAIL:
    - Document Title: ${customDraftTitle}
    - Document Type: ${customDraftType}
    - Requirements/Description: ${customDraftDesc}
    - Client Name: ${customOptionalDetails.client || 'Not specified'}
    - Opponent Name: ${customOptionalDetails.opponent || 'Not specified'}
    - Court: ${customOptionalDetails.court || 'Not specified'}
    - Jurisdiction: ${customOptionalDetails.jurisdiction || 'Not specified'}
    - Language: ${customOptionalDetails.language || 'English'}
    - Applicable Law: ${customOptionalDetails.applicableLaw || 'Indian Law'}
    - Special Instructions: ${customOptionalDetails.specialInstructions || 'None'}
    - Attached Support Docs: ${customDocs.join(', ') || 'None'}
    
    EVALUATION INSTRUCTION:
    Evaluate the above information.
    1. If critical variables (e.g. governing law, dates, payment terms, or vital obligations) are missing, you MUST reply EXACTLY with prefix "QUESTIONS:" followed by a list of 2-5 numbered, clear, concise follow-up questions for the lawyer. Example output format:
       QUESTIONS:
       1. Question one?
       2. Question two?
    2. If the details are sufficient, reply EXACTLY with prefix "DRAFT:" followed by the complete professionally formatted legal document draft.
    
    Strictly output either the QUESTIONS: block or the DRAFT: block, nothing else.`;
    
    try {
      const payload = {
        content: payloadText,
        sessionId: `custom_evaluate_${Date.now()}`,
        activeTool: 'draftMaker',
        stream: true,
        history: [],
      };
      
      const stream = streamAIResponse('/chat', payload);
      let accumulated = '';
      let detectedPrefix: 'DRAFT' | 'QUESTIONS' | null = null;
      
      for await (const token of stream) {
        accumulated += token;
        
        if (!detectedPrefix) {
          const upperAcc = accumulated.toUpperCase();
          if (upperAcc.startsWith('DRAFT:')) {
            detectedPrefix = 'DRAFT';
            setStep('RESULT');
            setCustomStep('RESULT');
            setDraftContent(accumulated.slice(6).replace(/^\s+/, ''));
          } else if (upperAcc.startsWith('QUESTIONS:')) {
            detectedPrefix = 'QUESTIONS';
          } else if (accumulated.length >= 25) {
            detectedPrefix = 'DRAFT';
            setStep('RESULT');
            setCustomStep('RESULT');
            setDraftContent(accumulated);
          }
        } else if (detectedPrefix === 'DRAFT') {
          setDraftContent(accumulated.replace(/^DRAFT:/i, '').replace(/^\s+/, ''));
        }
      }
      
      if (detectedPrefix === 'QUESTIONS') {
        const questionsStr = accumulated.replace(/^QUESTIONS:/i, '').trim();
        const parsedQ = questionsStr
          .split(/\n+/)
          .map(q => q.replace(/^\d+[\.\)\-]\s*/, '').trim())
          .filter(q => q.length > 0);
        
        if (parsedQ.length > 0) {
          setAiQuestions(parsedQ);
          setAiAnswers({});
          setCurrentQuestionIdx(0);
          setCustomStep('QUESTIONS');
        } else {
          // fallback if parsing failed
          setStep('RESULT');
          setCustomStep('RESULT');
          const cleanText = accumulated.replace(/^QUESTIONS:/i, '').trim();
          setDraftContent(cleanText);
          processGeneratedText(cleanText);
          await saveOrUpdateCustomDraft(cleanText);
        }
      } else {
        const finalText = accumulated.replace(/^DRAFT:/i, '').replace(/^\s+/, '');
        setDraftContent(finalText);
        processGeneratedText(finalText);
        await saveOrUpdateCustomDraft(finalText);
        showToast('success', 'Custom Draft Compiled', 'Document generated successfully.');
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Compilation Offline', 'Failed to reach legal compiler.');
      setCustomStep('INPUT');
    }
  };

  // Compile answers to follow-up questions and generate the final custom draft
  const handleAnswerQuestionSubmit = async () => {
    setCustomStep('GENERATING');
    setDraftContent('');
    
    let caseContextPrompt = '';
    if (workspace) {
      caseContextPrompt = `
      CASE CONTEXT:
      - Case Name: ${workspace.name || ''}
      - Client Full Name: ${workspace.clientName || ''}
      - Opposing Party Full Name: ${workspace.opponentName || ''}
      - Court Name: ${workspace.courtName || ''}
      - Case Summary/Brief: ${workspace.caseSummary || workspace.summary || ''}
      \n\n`;
    }
    
    const qaContext = aiQuestions.map((q) => {
      const ans = aiAnswers[q] || 'Not provided';
      return `Question: ${q}\nAnswer: ${ans}`;
    }).join('\n\n');
    
    const payloadText = `${caseContextPrompt}I need you to draft the final complete legal document for: ${customDraftTitle}.
    
    Here is the initial document specification:
    - Document Type: ${customDraftType}
    - Initial Requirements: ${customDraftDesc}
    - Client Name: ${customOptionalDetails.client || 'Not specified'}
    - Opponent Name: ${customOptionalDetails.opponent || 'Not specified'}
    - Court: ${customOptionalDetails.court || 'Not specified'}
    - Jurisdiction: ${customOptionalDetails.jurisdiction || 'Not specified'}
    - Language: ${customOptionalDetails.language || 'English'}
    - Applicable Law: ${customOptionalDetails.applicableLaw || 'Indian Law'}
    - Special Instructions: ${customOptionalDetails.specialInstructions || 'None'}
    - Supporting Documents Attached: ${customDocs.join(', ') || 'None'}
    
    Here are the answers to your follow-up clarifying questions:
    ${qaContext}
    
    Please compile this into a complete, professional legal document with standard legal headings, preamble, terms, signature lines, date, and place. Start directly with the document title in brackets (e.g., [TITLE] ... [INTRODUCTION] etc.). Deliver only the final complete text.`;
    
    try {
      const payload = {
        content: payloadText,
        sessionId: `custom_compile_${Date.now()}`,
        activeTool: 'draftMaker',
        stream: true,
        history: [],
      };
      
      const stream = streamAIResponse('/chat', payload);
      let text = '';
      setStep('RESULT');
      setCustomStep('RESULT');
      
      for await (const token of stream) {
        text += token;
        setDraftContent(text);
      }
      
      processGeneratedText(text);
      await saveOrUpdateCustomDraft(text);
      showToast('success', 'Custom Draft Compiled', 'Document generated successfully.');
    } catch (e) {
      showToast('error', 'Draft Generation Failed', 'Legal AI compiler offline.');
      setCustomStep('INPUT');
    }
  };

  // Save generated custom draft as historical item
  const saveOrUpdateCustomDraft = async (content: string) => {
    try {
      const existingStr = await AsyncStorage.getItem('@DraftMaker:saved_drafts');
      const existing: SavedDraft[] = existingStr ? JSON.parse(existingStr) : [];
      
      const title = customDraftTitle || 'Custom Legal Draft';
      const draftName = `${title} (Custom)`;
      const timestamp = new Date().toISOString();
      const finalId = activeDraftId || `draft_custom_${Date.now()}`;
      const idx = existing.findIndex(d => d.id === finalId);
      const now = Date.now();
      
      const mappedFormData: Record<string, string> = {
        title,
        documentType: customDraftType,
        description: customDraftDesc,
        client: customOptionalDetails.client,
        opponent: customOptionalDetails.opponent,
        court: customOptionalDetails.court,
        jurisdiction: customOptionalDetails.jurisdiction,
        language: customOptionalDetails.language,
        applicableLaw: customOptionalDetails.applicableLaw,
        specialInstructions: customOptionalDetails.specialInstructions,
        attachedDocs: customDocs.join(', '),
      };
      
      if (idx > -1) {
        existing[idx] = {
          ...existing[idx],
          content,
          formData: mappedFormData,
          lastEditedTime: timestamp,
          updatedAt: now,
        };
      } else {
        const newDraftItem: SavedDraft = {
          id: finalId,
          title,
          documentType: `custom_${customDraftType}`,
          draftName,
          content,
          lastEditedTime: timestamp,
          createdAt: now,
          updatedAt: now,
          status: 'Draft',
          formData: mappedFormData,
          customClauses: [],
        };
        existing.push(newDraftItem);
        setActiveDraftId(finalId);
      }
      
      await AsyncStorage.setItem('@DraftMaker:saved_drafts', JSON.stringify(existing));
      await loadHistoryDrafts();
    } catch (err) {
      console.error('[DraftMaker] Save custom draft error:', err);
    }
  };

  // Save Custom configuration as Personal Reusable Template
  const handleSaveAsPersonalTemplate = async () => {
    try {
      const templateTitle = customDraftTitle || 'Custom Legal Template';
      const templateDesc = customDraftDesc || 'Custom template created by user.';
      const newTemplate: TemplateMetadata = {
        id: `personal_${Date.now()}`,
        title: templateTitle,
        description: templateDesc.slice(0, 100) + (templateDesc.length > 100 ? '...' : ''),
        icon: 'sparkles-outline',
        category: 'Miscellaneous',
        estimatedTime: '3 Minutes',
        difficulty: 'Medium',
        rating: 5,
        aiReady: true,
        keywords: ['personal', 'custom', templateTitle.toLowerCase()],
        fields: [
          { key: 'description', label: 'Requirements', type: 'multiline', required: true, placeholder: templateDesc },
          { key: 'documentType', label: 'Document Type', type: 'text', required: true, placeholder: customDraftType },
          { key: 'client', label: 'Client', type: 'text', required: false, placeholder: customOptionalDetails.client },
          { key: 'opponent', label: 'Opposing Party', type: 'text', required: false, placeholder: customOptionalDetails.opponent },
          { key: 'court', label: 'Court', type: 'text', required: false, placeholder: customOptionalDetails.court },
          { key: 'jurisdiction', label: 'Jurisdiction', type: 'text', required: false, placeholder: customOptionalDetails.jurisdiction },
          { key: 'language', label: 'Language', type: 'text', required: false, placeholder: customOptionalDetails.language },
          { key: 'applicableLaw', label: 'Applicable Law', type: 'text', required: false, placeholder: customOptionalDetails.applicableLaw },
          { key: 'specialInstructions', label: 'Special Instructions', type: 'multiline', required: false, placeholder: customOptionalDetails.specialInstructions },
        ]
      };
      
      const updated = [...personalTemplates, newTemplate];
      setPersonalTemplates(updated);
      await AsyncStorage.setItem('@DraftMaker:personal_templates', JSON.stringify(updated));
      showToast('success', 'Template Saved', 'Successfully saved as a Personal Template!');
    } catch (e) {
      console.warn('Error saving personal template:', e);
      showToast('error', 'Save Failed', 'Could not save personal template.');
    }
  };

  const handleDeletePersonalTemplate = async (templateId: string) => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this personal template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = personalTemplates.filter(t => t.id !== templateId);
            setPersonalTemplates(updated);
            await AsyncStorage.setItem('@DraftMaker:personal_templates', JSON.stringify(updated));
            showToast('success', 'Template Deleted', 'Personal template removed.');
          }
        }
      ]
    );
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

  const filteredTemplates = useMemo(() => {
    // 1. First filter by activeCategory (All, Civil, Criminal, etc.)
    let list = [...ALL_TEMPLATES, ...personalTemplates];
    
    if (activeCategory === 'Favorites') {
      list = list.filter(t => favorites.includes(t.id));
    } else if (activeCategory === 'Recently Used') {
      const uniqueRecentIds = Array.from(new Set(historyDrafts.map(d => d.documentType)));
      list = list.filter(t => uniqueRecentIds.includes(t.id));
    } else if (activeCategory === 'Appeals') {
      list = list.filter(t => 
        t.title.toLowerCase().includes('appeal') || 
        t.title.toLowerCase().includes('revision') || 
        t.title.toLowerCase().includes('petition') ||
        t.keywords.some(k => k.toLowerCase().includes('appeal') || k.toLowerCase().includes('petition') || k.toLowerCase().includes('revision'))
      );
    } else if (activeCategory === '✨ Custom') {
      list = personalTemplates;
    } else if (activeCategory !== 'All' && activeCategory !== '') {
      list = list.filter(t => t.category === activeCategory);
    }

    // 2. Then filter by searchQuery
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      // Pin favorites to the top if no search query and category is not already Favorites
      if (activeCategory !== 'Favorites') {
        const favList = list.filter(t => favorites.includes(t.id));
        const nonFavList = list.filter(t => !favorites.includes(t.id));
        return [...favList, ...nonFavList];
      }
      return list;
    }

    const searchFiltered = list.filter((item: TemplateMetadata) => {
      const titleLower = item.title.toLowerCase();
      const descLower = item.description.toLowerCase();
      const transTitle = getTmplTitle(item).toLowerCase();
      const transDesc = getTmplDesc(item).toLowerCase();
      
      if (
        titleLower.includes(query) || 
        descLower.includes(query) ||
        transTitle.includes(query) ||
        transDesc.includes(query)
      ) {
        return true;
      }
      
      if (item.keywords.some(kw => kw.toLowerCase().includes(query))) {
        return true;
      }

      // Check cross-language synonyms
      const synonyms: Record<string, string[]> = {
        'notice': ['नोटिस', 'सूचना', 'legalnotice', 'demandnotice', 'evictionnotice', 'recoverynotice'],
        'नोटिस': ['notice', 'legal notice', 'legalnotice', 'demandnotice', 'evictionnotice', 'recoverynotice'],
        'agreement': ['समझौता', 'अनुबंध', 'करार', 'rentagreement', 'leaseagreement', 'saleagreement'],
        'समझौता': ['agreement', 'contract', 'rent agreement', 'lease agreement', 'rentagreement'],
        'contract': ['अनुबंध', 'अनुबंधक', 'contractanalyzer', 'nda', 'mou'],
        'अनुबंध': ['contract', 'agreement', 'nda', 'mou'],
        'evidence': ['साक्ष्य', 'सबूत', 'प्रमाण', 'evidenceanalyst'],
        'साक्ष्य': ['evidence', 'proof', 'evidence analyst'],
        'timeline': ['समयरेखा', 'घटनाक्रम', 'timeline'],
        'समयरेखा': ['timeline'],
      };

      for (const [key, values] of Object.entries(synonyms)) {
        if (query.includes(key) || key.includes(query)) {
          if (values.some(v => item.id.toLowerCase().includes(v) || titleLower.includes(v) || transTitle.includes(v))) {
            return true;
          }
        }
      }

      if (query === 'fir' && item.id === 'fir') return true;
      if (query === '138' && item.id === 'chequeBounceNotice') return true;
      if (query === 'poa' && item.id === 'powerOfAttorney') return true;
      if (query === 'nda' && item.id === 'nda') return true;
      if (query === 'mou' && item.id === 'mou') return true;
      
      return false;
    });

    const favList = searchFiltered.filter(t => favorites.includes(t.id));
    const nonFavList = searchFiltered.filter(t => !favorites.includes(t.id));
    return [...favList, ...nonFavList];
  }, [searchQuery, activeCategory, favorites, historyDrafts, personalTemplates]);

  const checkSavedDraft = async () => {
    try {
      const saved = await AsyncStorage.getItem('@DraftMaker:draft_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeTemplateId && parsed.formData) {
          const tmpl = ALL_TEMPLATES.find((t) => t.id === parsed.activeTemplateId);
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
    if (templateId.startsWith('personal_')) {
      const pt = personalTemplates.find(t => t.id === templateId);
      if (pt && pt.fields) {
        setCustomDraftTitle(pt.title);
        
        const docTypeField = pt.fields.find(f => f.key === 'documentType');
        const descField = pt.fields.find(f => f.key === 'description');
        const clientField = pt.fields.find(f => f.key === 'client');
        const opponentField = pt.fields.find(f => f.key === 'opponent');
        const courtField = pt.fields.find(f => f.key === 'court');
        const jurisField = pt.fields.find(f => f.key === 'jurisdiction');
        const langField = pt.fields.find(f => f.key === 'language');
        const appLawField = pt.fields.find(f => f.key === 'applicableLaw');
        const specField = pt.fields.find(f => f.key === 'specialInstructions');
        
        setCustomDraftType(docTypeField?.placeholder || 'Agreement');
        setCustomDraftDesc(descField?.placeholder || '');
        setCustomOptionalDetails({
          client: clientField?.placeholder || '',
          opponent: opponentField?.placeholder || '',
          court: courtField?.placeholder || '',
          jurisdiction: jurisField?.placeholder || '',
          language: langField?.placeholder || 'English',
          applicableLaw: appLawField?.placeholder || 'Indian Law',
          specialInstructions: specField?.placeholder || '',
        });
        
        setCustomStep('INPUT');
        showToast('success', 'Template Loaded', `Loaded personal template "${pt.title}".`);
      }
      return;
    }

    setActiveTemplateId(templateId);
    
    const targetTemplate = ALL_TEMPLATES.find(t => t.id === templateId);
    const initialFormData: Record<string, string> = {};
    if (targetTemplate) {
      const fields = getTemplateFields(targetTemplate);
      fields.forEach(field => {
        const prefilled = getPreFilledValue(field.key, field.label, workspace);
        if (prefilled) {
          initialFormData[field.key] = prefilled;
        } else {
          initialFormData[field.key] = '';
        }
      });
    }

    setFormData(initialFormData);
    setCustomClauses([]);
    setErrors({});
    setStep('FORM');
    incrementTemplateUsage(templateId);
  };

  const activeTemplate = ALL_TEMPLATES.find((t) => t.id === activeTemplateId);

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

    const fields = getTemplateFields(activeTemplate);
    fields.forEach((field) => {
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

    let caseContextPrompt = '';
    if (workspace) {
      caseContextPrompt = `
      You are drafting this document within the context of an active case workspace. Use these facts and background context to inform the drafting and pre-fill details where appropriate.
      
      CASE CONTEXT:
      - Case Name: ${workspace.name || ''}
      - Client Full Name: ${workspace.clientName || ''}
      - Opposing Party Full Name: ${workspace.opponentName || ''}
      - Court Name: ${workspace.courtName || ''}
      - Case Summary/Brief: ${workspace.caseSummary || workspace.summary || ''}
      - Chronology of Facts: ${workspace.facts?.map(f => `[${f.date}] ${f.title}: ${f.description || ''}`).join('; ') || 'None'}
      - Case Evidence Vault: ${workspace.evidence?.map(e => `${e.name}: ${e.description || ''}`).join('; ') || 'None'}
      - Hearings Scheduled: ${workspace.hearings?.map(h => `${h.date} - Court: ${h.courtName || ''}, Purpose: ${h.purpose || ''}`).join('; ') || 'None'}
      - Case Notes: ${workspace.notes?.map(n => `${n.title}: ${n.content}`).join('; ') || 'None'}
      \n\n`;
    }

    const payloadText = `${caseContextPrompt}I need you to act as a senior legal counsel and generate a complete, professionally formatted legal document for: ${activeTemplate.title}.
    
    Here is the structured client information provided in the form:
    ${getTemplateFields(activeTemplate)
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

  const renderCustomCreatorView = () => {
    if (customStep === 'INPUT') {
      return (
        <View style={styles.customCreatorContainer}>
          <Text style={styles.customCreatorHeading}>Create Custom Legal Draft</Text>
          <Text style={styles.customCreatorSubHeading}>
            Describe any custom legal document requirement in plain English. The AI will audit your prompt, ask clarifying questions if needed, and draft the document.
          </Text>

          {/* Draft Title */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Draft Title <Text style={{ color: '#EF4444' }}>*</Text></Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Software Development Agreement"
              placeholderTextColor="#9CA3AF"
              value={customDraftTitle}
              onChangeText={setCustomDraftTitle}
            />
          </View>

          {/* Document Type chips */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Document Type</Text>
            <View style={styles.pickerWrapper}>
              {['Agreement', 'Contract', 'Petition', 'Notice', 'Deed', 'Affidavit', 'Application', 'Other'].map((type) => {
                const isSelected = customDraftType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                    onPress={() => setCustomDraftType(type)}
                  >
                    <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Document Description & Requirements <Text style={{ color: '#EF4444' }}>*</Text></Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput, { height: 100 }]}
              placeholder="Describe the clauses, payment terms, parties obligations, and other details..."
              placeholderTextColor="#9CA3AF"
              value={customDraftDesc}
              onChangeText={setCustomDraftDesc}
              multiline={true}
              numberOfLines={5}
            />
          </View>

          {/* Collapsible Optional Details */}
          <TouchableOpacity
            onPress={() => setShowOptionalDetails(!showOptionalDetails)}
            style={styles.collapsibleHeader}
          >
            <Text style={styles.collapsibleHeaderText}>
              {showOptionalDetails ? '▼ Hide Optional Details' : '► Show Optional Details'}
            </Text>
            <Ionicons
              name={showOptionalDetails ? "chevron-up" : "chevron-down"}
              size={18}
              color="#5B4EDB"
            />
          </TouchableOpacity>

          {showOptionalDetails && (
            <View style={styles.optionalPanel}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Client Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Client Name"
                  placeholderTextColor="#9CA3AF"
                  value={customOptionalDetails.client}
                  onChangeText={(val) => setCustomOptionalDetails(prev => ({ ...prev, client: val }))}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Opposing Party</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Opposing Party Name"
                  placeholderTextColor="#9CA3AF"
                  value={customOptionalDetails.opponent}
                  onChangeText={(val) => setCustomOptionalDetails(prev => ({ ...prev, opponent: val }))}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Court Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Court Name"
                  placeholderTextColor="#9CA3AF"
                  value={customOptionalDetails.court}
                  onChangeText={(val) => setCustomOptionalDetails(prev => ({ ...prev, court: val }))}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Jurisdiction</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Jurisdiction Court / Limits"
                  placeholderTextColor="#9CA3AF"
                  value={customOptionalDetails.jurisdiction}
                  onChangeText={(val) => setCustomOptionalDetails(prev => ({ ...prev, jurisdiction: val }))}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Document Language</Text>
                <View style={styles.pickerWrapper}>
                  {['English', 'Hindi', 'Marathi', 'Gujarati', 'Bengali', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'].map((lang) => {
                    const isSelected = customOptionalDetails.language === lang;
                    return (
                      <TouchableOpacity
                        key={lang}
                        style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                        onPress={() => setCustomOptionalDetails(prev => ({ ...prev, language: lang }))}
                      >
                        <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextActive]}>
                          {lang}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Applicable Law</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Indian Law, Arbitration Act"
                  placeholderTextColor="#9CA3AF"
                  value={customOptionalDetails.applicableLaw}
                  onChangeText={(val) => setCustomOptionalDetails(prev => ({ ...prev, applicableLaw: val }))}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Special Instructions</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Specific formatting or layout requirements..."
                  placeholderTextColor="#9CA3AF"
                  value={customOptionalDetails.specialInstructions}
                  onChangeText={(val) => setCustomOptionalDetails(prev => ({ ...prev, specialInstructions: val }))}
                  multiline={true}
                />
              </View>
            </View>
          )}

          {/* Supporting Documents */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Supporting Documents & Reference Materials</Text>
            {customDocs.length > 0 && (
              <View style={styles.docsList}>
                {customDocs.map((doc, idx) => (
                  <View key={idx} style={styles.docItem}>
                    <Ionicons name="document-attach" size={14} color="#6B7280" />
                    <Text style={styles.docItemText} numberOfLines={1}>{doc}</Text>
                    <TouchableOpacity onPress={() => handleRemoveDocument(idx)}>
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickDocument}>
              <Ionicons name="cloud-upload-outline" size={16} color="#5B4EDB" />
              <Text style={styles.attachBtnText}>Attach Document</Text>
            </TouchableOpacity>
          </View>

          {/* Action button */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleGenerateCustomDraft}>
            <Text style={styles.actionBtnText}>Generate Custom Draft</Text>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Personal Templates List */}
          <Text style={styles.personalTemplatesHeading}>Personal Templates</Text>
          {personalTemplates.length === 0 ? (
            <View style={styles.emptyFilteredContainer}>
              <Ionicons name="sparkles-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyFilteredText}>No personal templates saved yet.</Text>
            </View>
          ) : (
            <View style={styles.personalGrid}>
              {personalTemplates.map((pt) => (
                <View key={pt.id} style={styles.personalCard}>
                  <TouchableOpacity
                    style={styles.personalCardLeft}
                    onPress={() => handleSelectTemplate(pt.id)}
                  >
                    <Text style={styles.personalCardTitle}>{pt.title}</Text>
                    <Text style={styles.personalCardDesc} numberOfLines={1}>{pt.description}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.personalCardDeleteBtn}
                    onPress={() => handleDeletePersonalTemplate(pt.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      );
    }

    if (customStep === 'QUESTIONS') {
      const currentQ = aiQuestions[currentQuestionIdx];
      return (
        <View style={styles.questionWizardCard}>
          <View style={styles.questionWizardHeader}>
            <Text style={styles.questionWizardTitle}>💡 AI Briefing Clarifications</Text>
            <Text style={styles.questionWizardStep}>
              Question {currentQuestionIdx + 1} of {aiQuestions.length}
            </Text>
          </View>

          <View style={styles.questionWizardBody}>
            <Text style={styles.questionLabel}>{currentQ}</Text>
            <TextInput
              style={styles.questionInput}
              placeholder="Provide details/answer for the AI..."
              placeholderTextColor="#9CA3AF"
              value={aiAnswers[currentQ] || ''}
              onChangeText={(val) => setAiAnswers(prev => ({ ...prev, [currentQ]: val }))}
              multiline={true}
              numberOfLines={3}
            />
          </View>

          <View style={styles.questionFooter}>
            <TouchableOpacity
              style={[styles.questionBtn, styles.questionBtnPrev]}
              onPress={() => {
                if (currentQuestionIdx > 0) {
                  setCurrentQuestionIdx(currentQuestionIdx - 1);
                } else {
                  setCustomStep('INPUT');
                }
              }}
            >
              <Ionicons name="arrow-back" size={16} color="#4B5563" />
              <Text style={styles.questionBtnPrevText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.questionBtn, styles.questionBtnNext]}
              onPress={() => {
                if (currentQuestionIdx < aiQuestions.length - 1) {
                  setCurrentQuestionIdx(currentQuestionIdx + 1);
                } else {
                  handleAnswerQuestionSubmit();
                }
              }}
            >
              <Text style={styles.questionBtnNextText}>
                {currentQuestionIdx === aiQuestions.length - 1 ? 'Generate Final Draft' : 'Next'}
              </Text>
              <Ionicons
                name={currentQuestionIdx === aiQuestions.length - 1 ? "sparkles" : "arrow-forward"}
                size={16}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (customStep === 'GENERATING') {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6D5DFC" />
          <Text style={styles.compilingTitle}>AI Legal Draft Compiler Active</Text>
          <Text style={styles.compilingDesc}>
            Analyzing requirements and formulating legal obligations...
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top compact screen header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (activeCategory === '✨ Custom' && step === 'SELECT') {
              if (customStep === 'QUESTIONS') {
                setCustomStep('INPUT');
              } else if (customStep === 'GENERATING') {
                setCustomStep('INPUT');
              } else {
                router.back();
              }
            } else if (step === 'FORM') {
              setStep('SELECT');
            } else if (step === 'PREVIEW') {
              setStep('FORM');
            } else if (step === 'RESULT') {
              if (activeCategory === '✨ Custom') {
                setStep('SELECT');
                setCustomStep('INPUT');
              } else {
                setStep('PREVIEW');
              }
            } else {
              router.back();
            }
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Draft Maker</Text>
        </View>
        <Pressable
          onPress={() => {
            setIsSearchOpen(true);
            setSearchQuery('');
          }}
          style={styles.headerBtn}
          accessibilityLabel="Search Templates"
          accessibilityRole="button"
        >
          <Ionicons name="search-outline" size={24} color="#1F2937" style={{ marginRight: -4 }} />
        </Pressable>
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

            {/* Quick Filters */}
            <View style={styles.filterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {[
                  'All',
                  'Civil',
                  'Criminal',
                  'Contracts',
                  'Property',
                  'Corporate',
                  'Family',
                  'Consumer',
                  'Employment',
                  'Affidavit',
                  'Appeals',
                  'Recently Used',
                  'Favorites',
                  '✨ Custom'
                ].map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      onPress={() => setActiveCategory(cat)}
                    >
                      {cat === 'Favorites' && (
                        <Ionicons name="star" size={12} color={isActive ? '#FFFFFF' : '#F59E0B'} style={{ marginRight: 4 }} />
                      )}
                      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {activeCategory === '✨ Custom' ? (
              renderCustomCreatorView()
            ) : (
              <>
                <Text style={styles.sectionHeading}>Choose Draft Template</Text>
                
                {filteredTemplates.length === 0 ? (
                  <View style={styles.emptyFilteredContainer}>
                    <Ionicons name="filter-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.emptyFilteredText}>No templates match this filter</Text>
                  </View>
                ) : (
                  <View style={styles.templatesGrid}>
                    {filteredTemplates.map((item) => (
                      <View key={item.id} style={[styles.templateCard, favorites.includes(item.id) && styles.templateCardFav, Shadows.sm]}>
                        <View style={styles.templateCardHeader}>
                          <View style={styles.templateIconBox}>
                            <Ionicons name={item.icon as any} size={22} color="#6D5DFC" />
                          </View>
                          <TouchableOpacity
                            onPress={() => toggleFavorite(item.id)}
                            style={styles.favStarBtn}
                          >
                            <Ionicons
                              name={favorites.includes(item.id) ? "star" : "star-outline"}
                              size={20}
                              color={favorites.includes(item.id) ? "#F59E0B" : "#9CA3AF"}
                            />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          onPress={() => handleSelectTemplate(item.id)}
                          style={{ flex: 1 }}
                        >
                          <Text style={styles.templateTitle}>{getTmplTitle(item)}</Text>
                          <Text style={styles.templateDesc} numberOfLines={2}>{getTmplDesc(item)}</Text>
                          
                          {/* Meta row */}
                          <View style={styles.templateCardMetaRow}>
                            <View style={styles.metaBadge}>
                              <Ionicons name="time-outline" size={12} color="#6B7280" />
                              <Text style={styles.metaBadgeText}>{item.estimatedTime}</Text>
                            </View>
                            
                            <View style={[
                              styles.diffBadge,
                              item.difficulty === 'Easy' ? styles.diffEasy : item.difficulty === 'Medium' ? styles.diffMedium : styles.diffHard
                            ]}>
                              <Text style={styles.diffBadgeText}>{item.difficulty}</Text>
                            </View>

                            {item.aiReady && (
                              <View style={styles.aiReadyBadge}>
                                <Ionicons name="sparkles" size={10} color="#5B4EDB" />
                                <Text style={styles.aiReadyBadgeText}>AI Ready</Text>
                              </View>
                            )}
                          </View>

                          {/* Star Rating Row */}
                          <View style={styles.ratingRow}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Ionicons
                                key={i}
                                name={i < Math.floor(item.rating) ? "star" : "star-outline"}
                                size={12}
                                color="#F59E0B"
                                style={{ marginRight: 2 }}
                              />
                            ))}
                            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
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
            {getTemplateFields(activeTemplate).map((field) => (
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
              {getTemplateFields(activeTemplate).map((field) => (
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
              {activeCategory === '✨ Custom' && (
                <TouchableOpacity style={styles.workspaceActionBtn} onPress={handleSaveAsPersonalTemplate}>
                  <Ionicons name="sparkles-outline" size={18} color="#D97706" />
                  <Text style={styles.workspaceActionText}>Save Template</Text>
                </TouchableOpacity>
              )}
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
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#F3F4F6' }]}
                onPress={() => {
                  if (activeCategory === '✨ Custom') {
                    setStep('SELECT');
                    setCustomStep('INPUT');
                  } else {
                    setStep('FORM');
                  }
                }}
              >
                <Text style={[styles.actionBtnText, { color: '#4B5563' }]}>Edit Original Form</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1 }]}
                onPress={() => {
                  if (activeCategory === '✨ Custom') {
                    setCustomDraftTitle('');
                    setCustomDraftDesc('');
                    setCustomDocs([]);
                    setCustomStep('INPUT');
                  }
                  setStep('SELECT');
                }}
              >
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
                                {getDraftDisplayTitle(item)}
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

      {/* Full-screen searchable Template Browser Modal */}
      <Modal
        visible={isSearchOpen}
        animationType="slide"
        onRequestClose={() => setIsSearchOpen(false)}
      >
        <SafeAreaView style={styles.searchModalContainer} edges={['top', 'bottom']}>
          {/* Search Header */}
          <View style={styles.searchModalHeader}>
            <View style={styles.searchBarWrapper}>
              <Ionicons name="search" size={20} color="#6B7280" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search templates (e.g. 138, FIR, Notice, POA)..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={(text) => setSearchQuery(text)}
                autoFocus={true}
                returnKeyType="search"
                onSubmitEditing={() => addRecentSearch(searchQuery)}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              style={styles.searchCloseBtn}
            >
              <Text style={styles.searchCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Search Content */}
          <ScrollView style={styles.searchScrollContent} keyboardShouldPersistTaps="handled">
            {searchQuery.trim() === '' ? (
              <View>
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <View style={styles.searchSection}>
                    <View style={styles.searchSectionHeader}>
                      <Text style={styles.searchSectionTitle}>Recent Searches</Text>
                      <TouchableOpacity onPress={clearRecentSearches}>
                        <Text style={styles.clearBtnText}>Clear All</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.recentSearchesContainer}>
                      {recentSearches.map((query, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.recentSearchChip}
                          onPress={() => {
                            setSearchQuery(query);
                          }}
                        >
                          <Ionicons name="time-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                          <Text style={styles.recentSearchChipText}>{query}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Frequently Used Drafts */}
                {Object.keys(templateUsageCount).length > 0 && (
                  <View style={styles.searchSection}>
                    <Text style={styles.searchSectionTitle}>Frequently Used Drafts</Text>
                    <View style={styles.freqList}>
                      {ALL_TEMPLATES
                        .filter(t => (templateUsageCount[t.id] || 0) > 0)
                        .sort((a, b) => (templateUsageCount[b.id] || 0) - (templateUsageCount[a.id] || 0))
                        .slice(0, 5)
                        .map(item => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.freqRow}
                            onPress={() => {
                              setIsSearchOpen(false);
                              handleSelectTemplate(item.id);
                            }}
                          >
                            <View style={styles.freqIconBg}>
                              <Ionicons name={item.icon as any} size={16} color="#6D5DFC" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.freqRowTitle}>{getTmplTitle(item)}</Text>
                              <Text style={styles.freqRowDesc} numberOfLines={1}>{getTmplDesc(item)}</Text>
                            </View>
                            <View style={styles.freqUsageBadge}>
                              <Text style={styles.freqUsageText}>{templateUsageCount[item.id]}x used</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                )}

                {/* Recently Generated Drafts */}
                {historyDrafts.length > 0 && (
                  <View style={styles.searchSection}>
                    <Text style={styles.searchSectionTitle}>Recently Generated Drafts</Text>
                    <View style={styles.freqList}>
                      {historyDrafts.slice(0, 3).map(item => {
                        const tmpl = ALL_TEMPLATES.find(t => t.id === item.documentType);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.freqRow}
                            onPress={() => {
                              setIsSearchOpen(false);
                              handleOpenDraft(item);
                            }}
                          >
                            <View style={[styles.freqIconBg, { backgroundColor: '#E6F4EA' }]}>
                              <Ionicons name="checkmark-done" size={16} color="#10B981" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.freqRowTitle}>{item.draftName}</Text>
                              <Text style={styles.freqRowDesc} numberOfLines={1}>{tmpl ? getTmplTitle(tmpl) : 'Legal Document'}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Suggested Templates */}
                <View style={styles.searchSection}>
                  <Text style={styles.searchSectionTitle}>Suggested Templates</Text>
                  <View style={styles.suggestedGrid}>
                    {ALL_TEMPLATES.filter(t => ['rentAgreement', 'legalNotice', 'fir', 'nda', 'bailApplication', 'powerOfAttorney'].includes(t.id)).map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.suggestedCard}
                        onPress={() => {
                          setIsSearchOpen(false);
                          handleSelectTemplate(item.id);
                        }}
                      >
                        <Ionicons name={item.icon as any} size={18} color="#6D5DFC" style={{ marginBottom: 4 }} />
                        <Text style={styles.suggestedCardText} numberOfLines={1}>{getTmplTitle(item)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.searchResultsContainer}>
                <Text style={styles.searchResultsCount}>
                  Found {filteredTemplates.length} templates matching "{searchQuery}"
                </Text>
                
                {filteredTemplates.length === 0 ? (
                  <View style={styles.noResultsBox}>
                    <Ionicons name="search-outline" size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
                    <Text style={styles.noResultsText}>No matching templates found</Text>
                    <Text style={styles.noResultsSub}>Try refining your keywords or searching general terms.</Text>
                  </View>
                ) : (
                  <View style={styles.templatesGrid}>
                    {filteredTemplates.map((item) => (
                      <View key={item.id} style={[styles.templateCard, favorites.includes(item.id) && styles.templateCardFav, Shadows.sm]}>
                        <View style={styles.templateCardHeader}>
                          <View style={styles.templateIconBox}>
                            <Ionicons name={item.icon as any} size={22} color="#6D5DFC" />
                          </View>
                          <TouchableOpacity
                            onPress={() => toggleFavorite(item.id)}
                            style={styles.favStarBtn}
                          >
                            <Ionicons
                              name={favorites.includes(item.id) ? "star" : "star-outline"}
                              size={20}
                              color={favorites.includes(item.id) ? "#F59E0B" : "#9CA3AF"}
                            />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            addRecentSearch(searchQuery);
                            setIsSearchOpen(false);
                            handleSelectTemplate(item.id);
                          }}
                          style={{ flex: 1 }}
                        >
                          <Text style={styles.templateTitle}>{getTmplTitle(item)}</Text>
                          <Text style={styles.templateDesc} numberOfLines={2}>{getTmplDesc(item)}</Text>
                          
                          <View style={styles.templateCardMetaRow}>
                            <View style={styles.metaBadge}>
                              <Ionicons name="time-outline" size={12} color="#6B7280" />
                              <Text style={styles.metaBadgeText}>{item.estimatedTime}</Text>
                            </View>
                            
                            <View style={[
                              styles.diffBadge,
                              item.difficulty === 'Easy' ? styles.diffEasy : item.difficulty === 'Medium' ? styles.diffMedium : styles.diffHard
                            ]}>
                              <Text style={styles.diffBadgeText}>{item.difficulty}</Text>
                            </View>

                            {item.aiReady && (
                              <View style={styles.aiReadyBadge}>
                                <Ionicons name="sparkles" size={10} color="#5B4EDB" />
                                <Text style={styles.aiReadyBadgeText}>AI Ready</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.ratingRow}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Ionicons
                                key={i}
                                name={i < Math.floor(item.rating) ? "star" : "star-outline"}
                                size={12}
                                color="#F59E0B"
                                style={{ marginRight: 2 }}
                              />
                            ))}
                            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
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
    color: theme.textPrimary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 10,
    color: theme.textSecondary,
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
    backgroundColor: theme.primaryLight,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  resumeTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.primaryDark,
  },
  resumeDesc: {
    fontSize: 11.5,
    color: theme.primary,
    marginTop: 2,
  },
  resumeBtn: {
    backgroundColor: theme.primary,
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
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  discardBtnText: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  welcomeBanner: {
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  templatesGrid: {
    gap: 12,
  },
  templateCard: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
  },
  templateIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  templateDesc: {
    fontSize: 11.5,
    color: theme.textSecondary,
    lineHeight: 16,
  },
  formContainer: {
    backgroundColor: theme.background,
  },
  formHeader: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  formDesc: {
    fontSize: 12,
    color: theme.textSecondary,
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
    color: theme.textPrimary,
  },
  errorText: {
    fontSize: 11,
    color: theme.danger,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
    color: theme.textPrimary,
    backgroundColor: theme.surfaceVariant,
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
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.background,
  },
  selectOptionActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  selectOptionText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  selectOptionTextActive: {
    color: theme.primaryDark,
  },
  clauseSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 16,
    marginBottom: 20,
  },
  clauseHeading: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  clauseDesc: {
    fontSize: 11,
    color: theme.textSecondary,
    marginBottom: 10,
  },
  clauseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  clauseChipText: {
    fontSize: 11.5,
    color: theme.textSecondary,
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
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12.5,
    color: theme.textPrimary,
    backgroundColor: theme.background,
  },
  addClauseBtn: {
    backgroundColor: theme.primaryLight,
    borderWidth: 1,
    borderColor: theme.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addClauseBtnText: {
    fontSize: 12,
    color: theme.primaryDark,
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: theme.primary,
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
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.surfaceVariant,
    padding: 14,
    gap: 10,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 6,
  },
  previewLabel: {
    fontSize: 11.5,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  previewValue: {
    fontSize: 12,
    color: theme.textPrimary,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  previewClause: {
    fontSize: 11.5,
    color: theme.textSecondary,
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
    color: theme.textPrimary,
    marginTop: 16,
    marginBottom: 4,
  },
  compilingDesc: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  workspaceHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  legalPaper: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderLeftWidth: 6,
    borderLeftColor: theme.primary,
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
    color: theme.textMuted,
    fontWeight: '800',
    letterSpacing: 1,
  },
  stampDivider: {
    height: 1,
    backgroundColor: theme.border,
    width: '100%',
    marginTop: 4,
  },
  documentTextMonospace: {
    fontSize: 11.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: theme.textPrimary,
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
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  workspaceActionText: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '700',
  },
  refineContainer: {
    backgroundColor: theme.primaryLight,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
  },
  refineHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.primaryDark,
    marginBottom: 8,
  },
  refineInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  refineInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12.5,
    color: theme.textPrimary,
    backgroundColor: theme.background,
  },
  refineSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  legalText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 16,
    lineHeight: 26,
    color: theme.textPrimary,
    textAlign: 'justify',
  },
  legalTextBold: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 26,
    color: theme.textPrimary,
  },
  paragraphLine: {
    marginBottom: 12,
  },
  titleParagraph: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
    lineHeight: 28,
    color: theme.textPrimary,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.card,
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
    backgroundColor: theme.border,
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
    color: theme.textPrimary,
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
    color: theme.textPrimary,
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  modalFieldInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.textPrimary,
    backgroundColor: theme.surfaceVariant,
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
    backgroundColor: theme.surfaceVariant,
  },
  modalBtnCancelText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '700',
  },
  modalBtnSave: {
    backgroundColor: theme.primary,
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
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyPlaceholdersHint: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  shareSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textMuted,
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
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  shareOptionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  shareOptionDesc: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  exportModalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exportModalContent: {
    backgroundColor: theme.card,
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
    color: theme.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  exportStateDesc: {
    fontSize: 12.5,
    color: theme.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  exportFilePathText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: theme.primaryDark,
    backgroundColor: theme.primaryLight,
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
    backgroundColor: theme.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  exportErrorIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.dangerLight,
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
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  exportActionBtnOpenText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  exportActionBtnShare: {
    backgroundColor: theme.background,
    borderColor: theme.border,
  },
  exportActionBtnShareText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '700',
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.overlay,
  },
  drawerContainer: {
    width: Dimensions.get('window').width * 0.82,
    height: '100%',
    backgroundColor: theme.background,
    borderRightWidth: 1,
    borderRightColor: theme.border,
    paddingHorizontal: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  drawerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 12,
    marginBottom: 12,
  },
  drawerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.textPrimary,
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
    color: theme.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  drawerItem: {
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    overflow: 'hidden',
  },
  drawerItemActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
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
    color: theme.textPrimary,
    flex: 1,
  },
  drawerItemTextActive: {
    color: theme.primary,
  },
  drawerItemSubtext: {
    fontSize: 11,
    color: theme.textSecondary,
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
    color: theme.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusDraft: {
    backgroundColor: theme.warningLight,
  },
  statusCompleted: {
    backgroundColor: theme.successLight,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusDraftText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.warning,
    textTransform: 'uppercase',
  },
  statusCompletedText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.success,
    textTransform: 'uppercase',
  },
  drawerRenameInput: {
    fontSize: 13,
    color: theme.textPrimary,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: theme.primary,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  drawerItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  drawerActionIcon: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  // Enterprise Legal Drafting Suite styles
  filterSection: {
    marginVertical: 14,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceVariant,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyFilteredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyFilteredText: {
    fontSize: 13.5,
    color: theme.textMuted,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  templateCardFav: {
    borderColor: theme.warning,
    borderWidth: 1.5,
    backgroundColor: isDark ? '#2C220E' : '#FFFDF5',
  },
  templateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  favStarBtn: {
    padding: 6,
    marginRight: -6,
    marginTop: -6,
  },
  templateCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceVariant,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  metaBadgeText: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '700',
  },
  diffBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  diffEasy: {
    backgroundColor: theme.successLight,
  },
  diffMedium: {
    backgroundColor: theme.warningLight,
  },
  diffHard: {
    backgroundColor: theme.dangerLight,
  },
  diffEasyText: {
    color: theme.success,
  },
  diffMediumText: {
    color: theme.warning,
  },
  diffHardText: {
    color: theme.danger,
  },
  aiReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
    borderWidth: 0.5,
    borderColor: theme.primary,
  },
  aiReadyBadgeText: {
    fontSize: 10,
    color: theme.primaryDark,
    fontWeight: '800',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textSecondary,
    marginLeft: 4,
  },
  // Search Modal layout
  searchModalContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
    gap: 12,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: theme.textPrimary,
    padding: 0,
  },
  searchCloseBtn: {
    paddingVertical: 6,
  },
  searchCloseBtnText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '700',
  },
  searchScrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchSection: {
    marginTop: 20,
  },
  searchSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: theme.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  clearBtnText: {
    fontSize: 11.5,
    color: theme.danger,
    fontWeight: '700',
  },
  recentSearchesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  recentSearchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceVariant,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  recentSearchChipText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  freqList: {
    gap: 10,
    marginTop: 6,
  },
  freqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceVariant,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 10,
    gap: 10,
  },
  freqIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  freqRowDesc: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 1,
  },
  freqUsageBadge: {
    backgroundColor: theme.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  freqUsageText: {
    fontSize: 9,
    color: theme.primaryDark,
    fontWeight: '800',
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  suggestedCard: {
    width: '31%',
    backgroundColor: theme.surfaceVariant,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  suggestedCardText: {
    fontSize: 10.5,
    color: theme.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  searchResultsContainer: {
    marginTop: 14,
  },
  searchResultsCount: {
    fontSize: 12.5,
    color: theme.textSecondary,
    fontWeight: '600',
    marginBottom: 14,
  },
  noResultsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  noResultsSub: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  customCreatorContainer: {
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 20,
  },
  customCreatorHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  customCreatorSubHeading: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 16,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    marginTop: 12,
  },
  collapsibleHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.primaryDark,
  },
  optionalPanel: {
    backgroundColor: theme.surfaceVariant,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginTop: 8,
    gap: 12,
  },
  docsList: {
    marginTop: 8,
    gap: 6,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surfaceVariant,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  docItemText: {
    fontSize: 12,
    color: theme.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
    gap: 6,
  },
  attachBtnText: {
    fontSize: 12.5,
    color: theme.primaryDark,
    fontWeight: '700',
  },
  personalTemplatesHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 12,
  },
  personalGrid: {
    gap: 10,
  },
  personalCard: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  personalCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  personalCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  personalCardDesc: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  personalCardDeleteBtn: {
    padding: 6,
  },
  questionWizardCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
    marginBottom: 20,
  },
  questionWizardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 10,
    marginBottom: 14,
  },
  questionWizardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionWizardStep: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  questionWizardBody: {
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
    lineHeight: 22,
    marginBottom: 12,
  },
  questionInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.textPrimary,
    backgroundColor: theme.surfaceVariant,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  questionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  questionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  questionBtnPrev: {
    backgroundColor: theme.surfaceVariant,
  },
  questionBtnPrevText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '700',
  },
  questionBtnNext: {
    backgroundColor: theme.primary,
  },
  questionBtnNextText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
}

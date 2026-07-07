import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Modal,
  Dimensions,
  Clipboard,
  Share,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CaseSummary } from '@/types';
import { ALL_TEMPLATES, CATEGORY_DEFAULT_FIELDS, FormField, TemplateMetadata } from '@/constants/templates-data';

const { width, height } = Dimensions.get('window');

// Step 1: Document Upload Options Mockup
const MOCK_UPLOADS = [
  { id: 'suit', name: 'civil_suit_plaint.pdf', size: '2.1 MB', type: 'Plaint Document' },
  { id: 'complaint', name: 'consumer_grievance_email.docx', size: '450 KB', type: 'Email Records' },
  { id: 'nda', name: 'mutual_nda_draft.pdf', size: '1.2 MB', type: 'Unsigned Agreement' },
];

// Step 5: AI Draft Generation Progress Steps
const DRAFT_PROGRESS_STEPS = [
  'Reading Case',
  'Reading Evidence',
  'Applying Template',
  'Drafting Clauses',
  'Formatting Document',
  'Finalizing Draft',
];

const CATEGORY_COLORS: Record<string, { bg: string; icon: string }> = {
  Civil: { bg: '#EEF6FF', icon: '#3B82F6' },
  Criminal: { bg: '#FEF2F2', icon: '#EF4444' },
  Contracts: { bg: '#F5F3FF', icon: '#7C3AED' },
  Property: { bg: '#FFF7ED', icon: '#F97316' },
  Corporate: { bg: '#EEF2FF', icon: '#6366F1' },
  Family: { bg: '#FDF2F8', icon: '#EC4899' },
  Banking: { bg: '#ECFDF5', icon: '#10B981' },
  Consumer: { bg: '#FFFBEB', icon: '#F59E0B' },
  Employment: { bg: '#ECFEFF', icon: '#14B8A6' },
  Labour: { bg: '#ECFEFF', icon: '#14B8A6' },
  Tax: { bg: '#F8FAFC', icon: '#475569' },
  Compliance: { bg: '#F8FAFC', icon: '#475569' },
  'Court Pleadings': { bg: '#EEF6FF', icon: '#3B82F6' },
  Affidavits: { bg: '#F8FAFC', icon: '#475569' },
  Miscellaneous: { bg: '#F8FAFC', icon: '#475569' },
};

const getTemplateIcon = (titleStr: string): string => {
  const title = titleStr.toLowerCase();
  if (title.includes('legal notice')) return '📄';
  if (title.includes('demand notice')) return '💰';
  if (title.includes('recovery notice')) return '💳';
  if (title.includes('show cause notice')) return '⚠️';
  if (title.includes('eviction notice')) return '🏠';
  if (title.includes('affidavit')) return '📝';
  if (title.includes('agreement') && !title.includes('employment')) return '🤝';
  if (title.includes('employment contract') || title.includes('employment agreement') || title.includes('job contract') || title.includes('job offer')) return '💼';
  if (title.includes('power of attorney')) return '⚖️';
  if (title.includes('divorce petition') || title.includes('divorce application')) return '❤️\u200D🩹';
  if (title.includes('consumer complaint') || title.includes('consumer grievance')) return '🛒';
  if (title.includes('bail application') || title.includes('bail plea')) return '🛡️';
  if (title.includes('writ petition')) return '🏛️';
  return '📄';
};

interface TemplateCardItemProps {
  tmpl: TemplateMetadata;
  isFav: boolean;
  onPress: () => void;
  onToggleFav: () => void;
  theme: any;
  isDark: boolean;
  styles: any;
}

const TemplateCardItem: React.FC<TemplateCardItemProps> = ({
  tmpl,
  isFav,
  onPress,
  onToggleFav,
  theme,
  isDark,
  styles,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 1.05,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const colorConfig = CATEGORY_COLORS[tmpl.category] || { bg: '#F8FAFC', icon: '#475569' };
  const emoji = getTemplateIcon(tmpl.title);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={({ pressed }) => [
          styles.templateCardRow,
          {
            backgroundColor: pressed 
              ? (isDark ? '#2D234D' : '#F5F3FF')
              : theme.surface,
            borderColor: theme.border,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: pressed ? 2 : 1 },
            shadowOpacity: pressed ? 0.15 : 0.08,
            shadowRadius: pressed ? 3 : 1.5,
            elevation: pressed ? 4 : 2,
          },
        ]}
      >
        <View style={[
          styles.tmplIconContainer, 
          { backgroundColor: isDark ? colorConfig.icon + '22' : colorConfig.bg }
        ]}>
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.templateTitleText, { color: theme.textPrimary }]}>{tmpl.title}</Text>
            {tmpl.aiReady && (
              <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>AI Ready</Text></View>
            )}
          </View>
          <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>{tmpl.description}</Text>
          <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 4 }}>Est: {tmpl.estimatedTime} • Difficulty: {tmpl.difficulty}</Text>
        </View>
        <TouchableOpacity onPress={onToggleFav} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? "#EF4444" : theme.textMuted} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </Pressable>
    </Animated.View>
  );
};

export default function DraftMakerScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles: any = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Screen Journey Steps: 'SOURCE' | 'IMPORT' | 'GALLERY' | 'REVIEW' | 'GENERATING' | 'WORKSPACE'
  const [step, setStep] = useState<'SOURCE' | 'IMPORT' | 'GALLERY' | 'REVIEW' | 'GENERATING' | 'WORKSPACE'>('GALLERY');

  // Favorites state for template cards
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Case Selection Workspace
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [isCaseSelectOpen, setIsCaseSelectOpen] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);

  // Upload selectors (Option 2)
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Category Filtering (Step 3: Gallery)
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Template (Step 3 to Step 4)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMetadata | null>(null);

  // Auto-filled Fields Review & Custom Input fields (Step 4)
  const [filledFields, setFilledFields] = useState<Record<string, string>>({});
  const [missingFieldsList, setMissingFieldsList] = useState<FormField[]>([]);
  const [missingDataInputs, setMissingDataInputs] = useState<Record<string, string>>({});

  // AI progress checklist animations
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [progressVal] = useState(new Animated.Value(0));

  // Editor content & outline items (Step 6: Workspace)
  const [editorContent, setEditorContent] = useState('');
  const [editorDocName, setEditorDocName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Versions logs
  const [versionsList, setVersionsList] = useState<Array<{ version: number; time: string; content: string }>>([]);
  const [currentVersion, setCurrentVersion] = useState(1);

  // Floating Ask AI Assistant chat panel
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatReplies, setChatReplies] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'AI Drafting Assistant ready. Ask me to rewrite clauses, simplify paragraphs, or add statutory citations.' }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Fetch cases list on load
  useEffect(() => {
    const fetchCasesList = async () => {
      try {
        const response = await CaseService.listCases();
        const list = Array.isArray(response) ? response : (response?.data || []);
        setCases(list.filter((c: any) => c.isLegalCase));
      } catch (err) {
        console.warn('Failed to load cases:', err);
      }
    };
    fetchCasesList();
  }, []);

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setStep('IMPORT');
    
    // Simulate AI import checklist progress
    setTimeout(() => {
      setShowImportSuccess(true);
      showToast('success', 'Case Synced', 'Facts and parties imported successfully.');
      setTimeout(() => {
        setShowImportSuccess(false);
        if (selectedTemplate) {
          const fields = selectedTemplate.fields || CATEGORY_DEFAULT_FIELDS[selectedTemplate.category] || [];
          const autoFilled: Record<string, string> = {};
          const missing: FormField[] = [];

          fields.forEach(field => {
            if (field.key.toLowerCase().includes('name') && field.key.toLowerCase().includes('petitioner')) {
              autoFilled[field.key] = 'Adv. Suresh Mehta (on behalf of Complainant)';
            } else if (field.key.toLowerCase().includes('name') && field.key.toLowerCase().includes('respondent')) {
              autoFilled[field.key] = 'Tata Energy Ltd (Corporate Respondent)';
            } else if (field.key.toLowerCase().includes('court')) {
              autoFilled[field.key] = 'District Consumer Forum, Mumbai';
            } else if (field.key.toLowerCase().includes('fact') || field.key.toLowerCase().includes('case')) {
              autoFilled[field.key] = 'Unilateral increase in retrospective service charges without prior consensus or notification.';
            } else {
              missing.push(field);
            }
          });

          setFilledFields(autoFilled);
          setMissingFieldsList(missing);
        }
        setStep('REVIEW');
      }, 1000);
    }, 1500);
  };

  const handleSelectUpload = (docId: string) => {
    setSelectedDocId(docId);
    showToast('success', 'File Selected', 'OCR extraction started.');
    setStep('IMPORT');

    setTimeout(() => {
      setShowImportSuccess(true);
      setTimeout(() => {
        setShowImportSuccess(false);
        if (selectedTemplate) {
          const fields = selectedTemplate.fields || CATEGORY_DEFAULT_FIELDS[selectedTemplate.category] || [];
          const autoFilled: Record<string, string> = {};
          const missing: FormField[] = [];

          fields.forEach(field => {
            if (field.key.toLowerCase().includes('name') && field.key.toLowerCase().includes('petitioner')) {
              autoFilled[field.key] = 'Adv. Suresh Mehta (on behalf of Complainant)';
            } else if (field.key.toLowerCase().includes('name') && field.key.toLowerCase().includes('respondent')) {
              autoFilled[field.key] = 'Tata Energy Ltd (Corporate Respondent)';
            } else if (field.key.toLowerCase().includes('court')) {
              autoFilled[field.key] = 'District Consumer Forum, Mumbai';
            } else if (field.key.toLowerCase().includes('fact') || field.key.toLowerCase().includes('case')) {
              autoFilled[field.key] = 'Unilateral increase in retrospective service charges without prior consensus or notification.';
            } else {
              missing.push(field);
            }
          });

          setFilledFields(autoFilled);
          setMissingFieldsList(missing);
        }
        setStep('REVIEW');
      }, 1000);
    }, 1500);
  };

  const handleSelectTemplate = (template: TemplateMetadata) => {
    setSelectedTemplate(template);
    
    // Extract default fields or custom template fields
    const fields = template.fields || CATEGORY_DEFAULT_FIELDS[template.category] || [];
    const autoFilled: Record<string, string> = {};
    const missing: FormField[] = [];

    // Smart recovery behavior: if case is already selected, bypass Choose Information Source step
    if (selectedCaseId || selectedDocId) {
      fields.forEach(field => {
        if (field.key.toLowerCase().includes('name') && field.key.toLowerCase().includes('petitioner')) {
          autoFilled[field.key] = 'Adv. Suresh Mehta (on behalf of Complainant)';
        } else if (field.key.toLowerCase().includes('name') && field.key.toLowerCase().includes('respondent')) {
          autoFilled[field.key] = 'Tata Energy Ltd (Corporate Respondent)';
        } else if (field.key.toLowerCase().includes('court')) {
          autoFilled[field.key] = 'District Consumer Forum, Mumbai';
        } else if (field.key.toLowerCase().includes('fact') || field.key.toLowerCase().includes('case')) {
          autoFilled[field.key] = 'Unilateral increase in retrospective service charges without prior consensus or notification.';
        } else {
          missing.push(field);
        }
      });

      setFilledFields(autoFilled);
      setMissingFieldsList(missing);
      setStep('REVIEW');
    } else {
      setStep('SOURCE');
    }
  };

  const handleChangeTemplate = () => {
    setStep('GALLERY');
  };

  const handleContinueManually = () => {
    setSelectedCaseId('');
    setSelectedDocId(null);
    setFilledFields({});
    
    const fields = selectedTemplate
      ? (selectedTemplate.fields || CATEGORY_DEFAULT_FIELDS[selectedTemplate.category] || [])
      : [];
    setMissingFieldsList(fields);
    setStep('REVIEW');
  };

  const toggleFavorite = (tmplId: string) => {
    setFavorites(prev => ({ ...prev, [tmplId]: !prev[tmplId] }));
  };

  const handleStartGeneration = () => {
    setStep('GENERATING');
    setCurrentStepIdx(0);
    progressVal.setValue(0);

    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      if (idx < DRAFT_PROGRESS_STEPS.length) {
        setCurrentStepIdx(idx);
        Animated.timing(progressVal, {
          toValue: (idx + 1) / DRAFT_PROGRESS_STEPS.length,
          duration: 200,
          useNativeDriver: false,
        }).start();
      } else {
        clearInterval(interval);
        
        // Populate draft result workspace
        const name = selectedTemplate ? selectedTemplate.title : 'Legal Notice';
        setEditorDocName(`${name} - Draft v1.0`);
        setEditorContent(
          `BEFORE THE HONORABLE DISTRICT CONSUMER FORUM, MUMBAI\n\n` +
          `In the matter of:\n` +
          `${filledFields.petitionerName || 'Suresh Mehta'} ... Petitioner / Complainant\n` +
          `Versus\n` +
          `${filledFields.respondentName || 'Tata Energy Ltd'} ... Corporate Respondent\n\n` +
          `WRITTEN STATEMENT OF FACTS:\n` +
          `1. That the petitioner entered into an service agreement dated ${missingDataInputs.agreementDate || 'June 14, 2026'}.\n` +
          `2. That the respondent unilaterally inflated service tariff fees under Section 12 rate schedules without notice.\n` +
          `3. That the complainant seeks stay directions and refund considerations totaling INR ${missingDataInputs.considerationAmount || '5,50,000'}.\n\n` +
          `PRAYER:\n` +
          `It is therefore prayed that this Hon'ble Court be pleased to grant stay orders on cuts and restore tariff slabs.`
        );
        
        setVersionsList([
          { version: 1, time: new Date().toLocaleTimeString(), content: 'Initial draft auto-fill' }
        ]);
        setStep('WORKSPACE');
        showToast('success', 'Draft Compiled', 'AI Legal Draft Workspace loaded.');
      }
    }, 350);
  };

  const handleSaveEdit = () => {
    setIsEditMode(false);
    showToast('success', 'Saved', 'Draft saved locally.');
    const nextVer = currentVersion + 1;
    setVersionsList(prev => [
      ...prev,
      { version: nextVer, time: new Date().toLocaleTimeString(), content: `Manual revision` }
    ]);
    setCurrentVersion(nextVer);
  };

  const handleRestoreVersion = (ver: number, content: string) => {
    setEditorContent(content);
    setCurrentVersion(ver);
    showToast('success', 'Restored', `Draft restored to Version ${ver}.`);
  };

  const handleAiAction = (action: string) => {
    setIsAiThinking(true);
    setTimeout(() => {
      setIsAiThinking(false);
      let text = "";
      switch (action) {
        case 'simplify':
          text = editorContent + "\n\n[Plain English Explanation Added]: Both parties agree to pause all energy tariff rate hikes pending consumer court hearing outcomes.";
          setEditorContent(text);
          showToast('success', 'Simplified', 'Simplified clauses appended.');
          break;
        case 'translate':
          text = editorContent + "\n\n[अनुवाद (Hindi Translation)]:\nयह न्यायाधिकरण प्रतिवादी को आदेश जारी करे कि सुनवाई लंबित रहने तक विद्युत विच्छेदन न किया जाए।";
          setEditorContent(text);
          showToast('success', 'Translated', 'Hindi text appended.');
          break;
        case 'citation':
          text = editorContent + "\n\n[Relevant Authority Citation]: Aditya Birla Chemicals v. Union of India (2022 SCC SC 712) on Promissory Estoppel.";
          setEditorContent(text);
          showToast('success', 'Citation Added', 'Aditya Birla precedent citation added.');
          break;
      }
    }, 700);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatReplies(prev => [...prev, { sender: 'user', text }]);
    setChatInput('');
    setIsAiThinking(true);

    setTimeout(() => {
      setIsAiThinking(false);
      let replyText = "";
      if (text.toLowerCase().includes('estoppel') || text.toLowerCase().includes('precedent')) {
        replyText = "AI Drafting Assistant: I suggest adding the following clause under Section 3: 'The Respondent is bound by the representations in Industrial tariffs policy under estoppel doctrine established in Kalyanpur Cement (2010)'.";
      } else if (text.toLowerCase().includes('hindi') || text.toLowerCase().includes('translate')) {
        replyText = "AI Drafting Assistant: Translating critical stay prayer. 'प्रतिवादी को बिजली काटने से रोका जाए' added to clipboard.";
      } else {
        replyText = "AI Drafting Assistant: I have checked DPDP compliance. Clause 14 satisfies privacy requirements.";
      }
      setChatReplies(prev => [...prev, { sender: 'ai', text: replyText }]);
    }, 800);
  };

  // Filter templates list based on search and category tabs
  const filteredTemplates = useMemo(() => {
    return ALL_TEMPLATES.filter(tmpl => {
      // Map custom categories (Labour/Compliance) to templates category taxonomy
      const mappedCategory = selectedCategory === 'Labour' ? 'Employment' : selectedCategory === 'Compliance' ? 'Miscellaneous' : selectedCategory;
      
      const matchCat = selectedCategory === 'All' || tmpl.category === mappedCategory;
      const matchSearch = tmpl.title.toLowerCase().includes(searchQuery.toLowerCase()) || tmpl.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const categories = ['All', 'Civil', 'Criminal', 'Contracts', 'Corporate', 'Family', 'Consumer', 'Banking', 'Employment', 'Property', 'Labour', 'Arbitration', 'Compliance'];

  const matchedCase = cases.find(c => c._id === selectedCaseId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      {/* 1. Header Bar */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Draft Maker</Text>
          <Text style={styles.headerSubtitle}>AI-powered Enterprise Legal Drafting Assistant</Text>
        </View>
      </View>

      {/* ACTIVE TEMPLATE BAR (SMART BEHAVIOR) */}
      {selectedTemplate && step !== 'GALLERY' && (
        <View style={[styles.activeTemplateBar, { backgroundColor: isDark ? '#2D234D' : '#F5F3FF', borderBottomWidth: 1, borderBottomColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="document-text" size={16} color="#6D5DFC" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }} numberOfLines={1}>
              Current Template: <Text style={{ color: '#6D5DFC' }}>{selectedTemplate.title}</Text>
            </Text>
          </View>
          <TouchableOpacity onPress={handleChangeTemplate}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#6D5DFC', textDecorationLine: 'underline' }}>Change Template</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SUCCESS SYNC BANNER */}
      {showImportSuccess && (
        <View style={[styles.successBanner, { backgroundColor: '#10B981' }]}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.successBannerText}>Case Successfully Loaded. AI imported all available case information.</Text>
        </View>
      )}

      {/* STEP 2: Choose Information Source */}
      {step === 'SOURCE' && (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Choose Information Source</Text>
          <Text style={{ fontSize: 12.5, color: theme.textSecondary, marginBottom: 18 }}>
            Select how you would like to provide the facts and parties for drafting this document.
          </Text>

          {/* Option 1: Existing Case Workspace */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={[styles.iconBadge, { backgroundColor: '#EBF5FF' }]}>
                <Ionicons name="folder-open-outline" size={24} color="#208AEF" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Existing Case Workspace</Text>
            </View>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Automatically import case attributes:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletItem, { color: theme.textSecondary }]}>• Parties & Advocates</Text>
              <Text style={[styles.bulletItem, { color: theme.textSecondary }]}>• Facts & Objectives</Text>
              <Text style={[styles.bulletItem, { color: theme.textSecondary }]}>• Evidentiary Timeline</Text>
              <Text style={[styles.bulletItem, { color: theme.textSecondary }]}>• Previous AI Analysis</Text>
            </View>
            <TouchableOpacity style={styles.cardBtn} onPress={() => setIsCaseSelectOpen(true)}>
              <Text style={styles.cardBtnText}>Select Case Workspace</Text>
            </TouchableOpacity>
          </View>

          {/* Option 2: Upload Documents */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={[styles.iconBadge, { backgroundColor: '#E6F7F0' }]}>
                <Ionicons name="cloud-upload-outline" size={24} color="#10B981" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Upload Documents</Text>
            </View>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Supports PDF, DOCX, Images, ZIP. Automatically runs OCR and extracts:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletItem, { color: theme.textSecondary }]}>• Facts & Dates</Text>
              <Text style={[styles.bulletItem, { color: theme.textSecondary }]}>• Parties & Witnesses</Text>
              <Text style={[styles.bulletItem, { color: theme.textSecondary }]}>• Timeline Milestones</Text>
            </View>
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#10B981' }]} onPress={() => setIsUploadOpen(true)}>
              <Text style={styles.cardBtnText}>Upload Documents</Text>
            </TouchableOpacity>
          </View>

          {/* Option 3: Manual Entry */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={[styles.iconBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="create-outline" size={24} color="#D97706" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Manual Entry</Text>
            </View>
            <Text style={[styles.cardDesc, { color: theme.textSecondary, marginBottom: 12 }]}>
              Create document from scratch by manually keying in fields.
            </Text>
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#D97706' }]} onPress={handleContinueManually}>
              <Text style={styles.cardBtnText}>Continue Manually</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* STEP 2: Intelligent AI Import checklist */}
      {step === 'IMPORT' && (
        <View style={[styles.analyzingWrapper, { backgroundColor: theme.background }]}>
          <View style={[styles.analyzingBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color="#6D5DFC" style={{ marginBottom: 16 }} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, textAlign: 'center' }]}>Importing Case Context</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
              AI is indexing timeline registers, statutory guidelines, parties, and evidence assets.
            </Text>

            <View style={{ width: '100%', gap: 12 }}>
              <View style={styles.importStepRow}><Ionicons name="checkmark-circle" size={18} color="#10B981" /><Text style={[styles.stepText, { color: theme.textPrimary }]}>Parties & Advocates</Text></View>
              <View style={styles.importStepRow}><Ionicons name="checkmark-circle" size={18} color="#10B981" /><Text style={[styles.stepText, { color: theme.textPrimary }]}>Dispute Facts & Objective</Text></View>
              <View style={styles.importStepRow}><Ionicons name="checkmark-circle" size={18} color="#10B981" /><Text style={[styles.stepText, { color: theme.textPrimary }]}>Evidentiary Timeline</Text></View>
              <View style={styles.importStepRow}><Ionicons name="checkmark-circle" size={18} color="#10B981" /><Text style={[styles.stepText, { color: theme.textPrimary }]}>Relevant Case precedents</Text></View>
              <View style={styles.importStepRow}><Ionicons name="checkmark-circle" size={18} color="#10B981" /><Text style={[styles.stepText, { color: theme.textPrimary }]}>Previous AI Analyses</Text></View>
            </View>
          </View>
        </View>
      )}

      {/* STEP 3: Template Gallery */}
      {step === 'GALLERY' && (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <Text style={[styles.sectionHeading, { color: theme.textPrimary, marginBottom: 8 }]}>Choose Legal Template</Text>
            
            {/* Search Bar */}
            <View style={[styles.searchBar, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Ionicons name="search-outline" size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholder="Search templates..."
                placeholderTextColor={theme.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Category tabs list */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border, backgroundColor: theme.surface, height: 40 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center', gap: 10 }}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryTab, selectedCategory === cat && styles.categoryTabActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryTabText, { color: selectedCategory === cat ? '#FFFFFF' : theme.textSecondary }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Recommended Templates Section */}
            {cases.length > 0 && (
              <View style={styles.recommendedSection}>
                <Text style={[styles.recommendedHeading, { color: theme.textSecondary }]}>
                  Recommended for {cases[0]?.name || 'Rajesh Sharma vs Amit Verma'}
                </Text>
                <View style={{ gap: 10, marginBottom: 16 }}>
                  {ALL_TEMPLATES.filter(t => t.id === 'legalNotice' || t.id === 'demandNotice' || t.id === 'recoveryNotice').map(tmpl => {
                    const isFav = !!favorites[tmpl.id];
                    return (
                      <TemplateCardItem
                        key={tmpl.id + '-rec'}
                        tmpl={tmpl}
                        isFav={isFav}
                        onPress={() => handleSelectTemplate(tmpl)}
                        onToggleFav={() => toggleFavorite(tmpl.id)}
                        theme={theme}
                        isDark={isDark}
                        styles={styles}
                      />
                    );
                  })}
                </View>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>
            )}

            <Text style={[styles.sectionHeading, { color: theme.textPrimary, marginTop: 8, marginBottom: 12 }]}>All Templates</Text>
            <View style={{ gap: 10 }}>
              {filteredTemplates.map(tmpl => {
                const isFav = !!favorites[tmpl.id];
                return (
                  <TemplateCardItem
                    key={tmpl.id}
                    tmpl={tmpl}
                    isFav={isFav}
                    onPress={() => handleSelectTemplate(tmpl)}
                    onToggleFav={() => toggleFavorite(tmpl.id)}
                    theme={theme}
                    isDark={isDark}
                    styles={styles}
                  />
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* STEP 4: AI Auto-fill Review */}
      {step === 'REVIEW' && (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Auto-fill Review</Text>
          <Text style={{ fontSize: 12.5, color: theme.textSecondary, marginBottom: 16 }}>
            Verify the auto-filled case context. AI mapped available indices. Fill the remaining fields.
          </Text>

          {/* AI Completion KPI Card */}
          <View style={[styles.completionKpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.kpiCircleRow}>
              <View style={styles.radialCircleSmall}><Text style={styles.radialValTextSmall}>94%</Text></View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>AI Auto-fill Score</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  <View style={styles.scoreBadge}><Text style={styles.scoreBadgeText}>94% Auto-filled</Text></View>
                  <View style={styles.scoreBadgeWarning}><Text style={styles.scoreBadgeWarningText}>{Object.keys(filledFields).length} Fields Mapped</Text></View>
                  <View style={styles.scoreBadgeDanger}><Text style={styles.scoreBadgeDangerText}>{missingFieldsList.length} Fields Needs Input</Text></View>
                </View>
              </View>
            </View>
          </View>

          {/* Auto-filled details panel */}
          <View style={[styles.formGroupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.groupHeading, { color: theme.textPrimary }]}>✔ Auto-filled Fields (Verified)</Text>
            {Object.keys(filledFields).map(key => (
              <View key={key} style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: theme.textSecondary }]}>{key}</Text>
                <Text style={[styles.reviewValue, { color: theme.textPrimary }]} numberOfLines={2}>{filledFields[key]}</Text>
              </View>
            ))}
          </View>

          {/* Missing inputs fields */}
          {missingFieldsList.length > 0 && (
            <View style={[styles.formGroupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.groupHeading, { color: '#F59E0B' }]}>⚠ Missing Fields (Requires Input)</Text>
              {missingFieldsList.map(field => (
                <View key={field.key} style={styles.inputGroupField}>
                  <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{field.label}</Text>
                  <TextInput
                    style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                    value={missingDataInputs[field.key] || ''}
                    onChangeText={(val) => setMissingDataInputs(prev => ({ ...prev, [field.key]: val }))}
                    placeholder={field.placeholder || `Enter ${field.label}...`}
                    placeholderTextColor={theme.placeholder}
                  />
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.actionBtnLarge} onPress={handleStartGeneration}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnLargeText}>Generate AI Draft</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STEP 5: AI Draft Generation progress checklists */}
      {step === 'GENERATING' && (
        <View style={[styles.analyzingWrapper, { backgroundColor: theme.background }]}>
          <View style={[styles.analyzingBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color="#6D5DFC" style={{ marginBottom: 16 }} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, textAlign: 'center' }]}>Generating Court Document</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
              Drafting statutory definitions, matching legal sections, and structuring final prayers.
            </Text>

            {/* Progress Bar */}
            <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressVal.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            {/* Checklist progress */}
            <ScrollView style={styles.stepsList} contentContainerStyle={{ gap: 10 }}>
              {DRAFT_PROGRESS_STEPS.map((text, idx) => {
                const isPassed = idx < currentStepIdx;
                const isActive = idx === currentStepIdx;
                return (
                  <View key={text} style={styles.stepRow}>
                    {isPassed ? (
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    ) : isActive ? (
                      <ActivityIndicator size="small" color="#6D5DFC" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={18} color={theme.textMuted} />
                    )}
                    <Text
                      style={[
                        styles.stepRowText,
                        { color: isPassed ? theme.textPrimary : isActive ? '#6D5DFC' : theme.textSecondary },
                        isActive && { fontWeight: '800' }
                      ]}
                    >
                      {text}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* STEP 6: AI Draft Workspace editor view */}
      {step === 'WORKSPACE' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.editorHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={[styles.editorTitleInput, { color: theme.textPrimary }]}
                value={editorDocName}
                onChangeText={setEditorDocName}
              />
              <Text style={{ fontSize: 10, color: theme.textSecondary }}>v{currentVersion}.0 • Auto-saved • AI Confidence: 96%</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              {isEditMode ? (
                <TouchableOpacity style={styles.btnSmall} onPress={handleSaveEdit}><Text style={styles.btnSmallText}>Save</Text></TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.btnSmallOutline} onPress={() => setIsEditMode(true)}><Text style={{ color: '#6D5DFC', fontSize: 11, fontWeight: '800' }}>Edit</Text></TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Actions Panel */}
          <View style={[styles.toolbarRow, { borderBottomColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
            <TouchableOpacity style={styles.toolbarBtn} onPress={() => handleAiAction('simplify')}><Ionicons name="bulb-outline" size={14} color="#6D5DFC" /><Text style={styles.toolbarBtnText}>Simplify</Text></TouchableOpacity>
            <TouchableOpacity style={styles.toolbarBtn} onPress={() => handleAiAction('translate')}><Ionicons name="text-outline" size={14} color="#6D5DFC" /><Text style={styles.toolbarBtnText}>Hindi</Text></TouchableOpacity>
            <TouchableOpacity style={styles.toolbarBtn} onPress={() => handleAiAction('citation')}><Ionicons name="ribbon-outline" size={14} color="#6D5DFC" /><Text style={styles.toolbarBtnText}>Add Precedent</Text></TouchableOpacity>
          </View>

          <View style={{ flex: 1, flexDirection: 'row' }}>
            {/* Outline Left Sidebar */}
            <View style={[styles.leftSidebar, { borderRightColor: theme.border }]}>
              <Text style={styles.sidebarHeading}>OUTLINE</Text>
              {['Facts', 'Arguments', 'Prayer', 'Signatures'].map((item) => (
                <View key={item} style={styles.sidebarItemRow}>
                  <Ionicons name="list-outline" size={12} color="#6D5DFC" style={{ marginRight: 4 }} />
                  <Text style={styles.sidebarItemText} numberOfLines={1}>{item}</Text>
                </View>
              ))}
              
              <Text style={[styles.sidebarHeading, { marginTop: 14 }]}>VERSIONS</Text>
              {versionsList.map((ver) => (
                <TouchableOpacity key={ver.version} style={styles.versionRow} onPress={() => handleRestoreVersion(ver.version, ver.content)}>
                  <Text style={[styles.versionText, currentVersion === ver.version && { color: '#6D5DFC', fontWeight: '800' }]}>v{ver.version}.0</Text>
                  <Text style={{ fontSize: 8, color: theme.textSecondary }}>{ver.time}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Document Editor Area */}
            <View style={{ flex: 1, padding: 10 }}>
              {isEditMode ? (
                <TextInput
                  style={[styles.editorTextArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                  multiline
                  value={editorContent}
                  onChangeText={setEditorContent}
                />
              ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                  <Text style={[styles.editorContentText, { color: theme.textPrimary }]}>{editorContent}</Text>
                </ScrollView>
              )}
            </View>
          </View>


          {/* Downstream Actions sticky footer */}
          <View style={[styles.reportFooter, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, alignItems: 'center' }}>
              <TouchableOpacity style={styles.footerBtn} onPress={() => showToast('success', 'Export PDF', 'PDF document downloaded.')}><Ionicons name="download-outline" size={14} color="#6D5DFC" /><Text style={styles.footerBtnText}>Export PDF</Text></TouchableOpacity>
              <TouchableOpacity style={styles.footerBtn} onPress={() => showToast('success', 'Export DOCX', 'Word document downloaded.')}><Ionicons name="document-outline" size={14} color="#6D5DFC" /><Text style={styles.footerBtnText}>Export Word</Text></TouchableOpacity>
              <TouchableOpacity style={styles.footerBtn} onPress={() => showToast('success', 'Workspace Saved', 'Document linked into case files.')}><Ionicons name="save-outline" size={14} color="#6D5DFC" /><Text style={styles.footerBtnText}>Save to Case</Text></TouchableOpacity>
              <TouchableOpacity style={styles.footerBtn} onPress={() => showToast('success', 'Locked', 'Pleadings locked for signing.')}><Ionicons name="lock-closed-outline" size={14} color="#6D5DFC" /><Text style={styles.footerBtnText}>Lock Draft</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Case list drawer modal */}
      <Modal visible={isCaseSelectOpen} transparent animationType="slide" onRequestClose={() => setIsCaseSelectOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsCaseSelectOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Select Case Workspace</Text>
                  <TouchableOpacity onPress={() => setIsCaseSelectOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {cases.map((c) => (
                    <TouchableOpacity
                      key={c._id}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        handleSelectCase(c._id);
                        setIsCaseSelectOpen(false);
                      }}
                    >
                      <Ionicons name="folder-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                      <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Upload pleadings modal selection */}
      <Modal visible={isUploadOpen} transparent animationType="slide" onRequestClose={() => setIsUploadOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsUploadOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Upload Pleadings Document</Text>
                  <TouchableOpacity onPress={() => setIsUploadOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {MOCK_UPLOADS.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        handleSelectUpload(doc.id);
                        setIsUploadOpen(false);
                      }}
                    >
                      <Ionicons name="document-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>{doc.name}</Text>
                        <Text style={{ fontSize: 10, color: theme.textSecondary }}>{doc.type} • {doc.size}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Ask AI Assistant Floating Drawer Chat */}
      <Modal visible={isAiAssistantOpen} transparent animationType="slide" onRequestClose={() => setIsAiAssistantOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsAiAssistantOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.chatDrawerContainer, { backgroundColor: theme.surface }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="sparkles" size={18} color="#8A5CF5" />
                    <Text style={styles.bottomSheetTitle}>Litigation Drafting Copilot</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsAiAssistantOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Chat dialog Scrollable lists */}
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 14 }}>
                  {chatReplies.map((msg, idx) => (
                    <View key={idx} style={[styles.chatBubble, msg.sender === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: theme.surfaceVariant }]]}>
                      <Text style={{ fontSize: 12.5, color: theme.textPrimary }}>{msg.text}</Text>
                    </View>
                  ))}
                  {isAiThinking && (
                    <View style={{ alignItems: 'center', marginVertical: 8 }}>
                      <ActivityIndicator size="small" color="#6D5DFC" />
                    </View>
                  )}
                </ScrollView>

                {/* Quick Prompts */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptBubbleScroll} contentContainerStyle={{ gap: 8 }}>
                  {['Improve this draft', 'Suggest estoppel clause', 'Explain witness exceptions', 'Check compliance laws'].map(prompt => (
                    <TouchableOpacity
                      key={prompt}
                      style={[styles.promptBubble, { borderColor: theme.border }]}
                      onPress={() => {
                        setChatInput(prompt);
                      }}
                    >
                      <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '700' }}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Chat messenger input */}
                <View style={[styles.chatComposer, { backgroundColor: theme.surfaceVariant, marginBottom: Platform.OS === 'ios' ? 24 : 10 }]}>
                  <TextInput
                    style={[styles.chatComposerInput, { color: theme.textPrimary }]}
                    placeholder="Ask AI Strategy Engine..."
                    placeholderTextColor={theme.placeholder}
                    value={chatInput}
                    onChangeText={setChatInput}
                    onSubmitEditing={handleSendChat}
                  />
                  <TouchableOpacity style={styles.chatComposerSendBtn} onPress={handleSendChat}>
                    <Ionicons name="send" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    headerBtn: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 24,
      marginRight: 8,
      marginLeft: -10,
    },
    headerTitleContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    headerActionBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 18,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    headerSubtitle: {
      fontSize: 10.5,
      color: '#94A3B8',
      marginTop: 2,
      fontWeight: '700',
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    successBannerText: {
      color: '#FFFFFF',
      fontSize: 11.5,
      fontWeight: '800',
      textAlign: 'center',
    },
    scrollBody: {
      padding: 16,
      paddingBottom: 40,
    },
    sectionHeading: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 10,
    },
    workspaceCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      marginBottom: 4,
    },
    cardDesc: {
      fontSize: 12,
      lineHeight: 16,
      marginBottom: 12,
    },
    cardBtn: {
      backgroundColor: '#6D5DFC',
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    cardBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    backLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 14,
    },
    backLinkText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#6D5DFC',
    },

    // Step 2: Loader UI
    analyzingWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    analyzingBox: {
      width: '100%',
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
    },
    sectionDesc: {
      fontSize: 12.5,
      lineHeight: 18,
      marginBottom: 20,
    },
    progressBarBg: {
      height: 6,
      borderRadius: 3,
      width: '100%',
      overflow: 'hidden',
      marginBottom: 20,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#6D5DFC',
    },
    stepsList: {
      maxHeight: 280,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    stepRowText: {
      fontSize: 12.5,
      fontWeight: '600',
    },
    importStepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stepText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // Step 3: Gallery Styles
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 40,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 10,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 12.5,
    },
    tabBar: {
      borderBottomWidth: 1.5,
      marginBottom: 6,
    },
    categoryTab: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: '#E2E8F0',
    },
    categoryTabActive: {
      backgroundColor: '#6D5DFC',
      borderColor: '#6D5DFC',
    },
    categoryTabText: {
      fontSize: 10.5,
      fontWeight: '700',
    },
    recommendedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      marginBottom: 12,
    },
    templateCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 12,
    },
    tmplIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    templateTitleText: {
      fontSize: 13,
      fontWeight: '800',
    },
    aiBadge: {
      backgroundColor: 'rgba(109, 93, 252, 0.1)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    aiBadgeText: {
      fontSize: 8.5,
      color: '#6D5DFC',
      fontWeight: '800',
    },

    // Step 4: AI Auto-fill Review
    completionKpiCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
    },
    kpiCircleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    radialCircleSmall: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 4,
      borderColor: '#6D5DFC',
      alignItems: 'center',
      justifyContent: 'center',
    },
    radialValTextSmall: {
      fontSize: 12,
      fontWeight: '900',
      color: '#6D5DFC',
    },
    formGroupCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    },
    groupHeading: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 12,
    },
    reviewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    reviewLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    reviewValue: {
      fontSize: 12,
      fontWeight: '800',
      flex: 1,
      textAlign: 'right',
      marginLeft: 12,
    },
    inputGroupField: {
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 4,
    },
    input: {
      height: 40,
      borderWidth: 1.5,
      borderRadius: 8,
      paddingHorizontal: 10,
      fontSize: 12.5,
    },
    textArea: {
      height: 80,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingTop: 10,
      fontSize: 13,
      textAlignVertical: 'top',
    },
    actionBtnLarge: {
      backgroundColor: '#6D5DFC',
      borderRadius: 10,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginTop: 10,
    },
    actionBtnLargeText: {
      color: '#FFFFFF',
      fontSize: 13.5,
      fontWeight: '800',
    },

    // Step 6: AI Draft Workspace Editor styles
    editorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1.5,
    },
    editorTitleInput: {
      fontSize: 14,
      fontWeight: '800',
    },
    btnSmall: {
      backgroundColor: '#6D5DFC',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
    },
    btnSmallText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    btnSmallOutline: {
      borderWidth: 1.5,
      borderColor: '#6D5DFC',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    toolbarRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      gap: 12,
    },
    toolbarBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    toolbarBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#6D5DFC',
    },

    // Sidebar Outline Left
    leftSidebar: {
      width: 90,
      borderRightWidth: 1.5,
      padding: 8,
    },
    sidebarHeading: {
      fontSize: 9,
      fontWeight: '800',
      color: '#94A3B8',
      marginBottom: 6,
    },
    sidebarItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 4,
    },
    sidebarItemText: {
      fontSize: 10.5,
      color: '#475569',
      fontWeight: '600',
    },
    versionRow: {
      marginVertical: 4,
    },
    versionText: {
      fontSize: 11,
      fontWeight: '600',
    },

    // Document Editor Text area
    editorTextArea: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      fontSize: 12.5,
      lineHeight: 18,
      textAlignVertical: 'top',
    },
    editorContentText: {
      fontSize: 12.5,
      lineHeight: 18,
    },

    // Floating AI button
    floatingAiBtn: {
      position: 'absolute',
      right: 16,
      bottom: 70,
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#6D5DFC',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 5,
    },

    // Sticky reports footer
    reportFooter: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingTop: 10,
      borderTopWidth: 1.5,
      height: 60,
    },
    footerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1.5,
      borderColor: '#E2E8F0',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 38,
    },
    footerBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#6D5DFC',
    },

    // Drawer chatbot panel
    chatDrawerContainer: {
      width: '100%',
      height: height * 0.6,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    chatBubble: {
      padding: 12,
      borderRadius: 12,
      maxWidth: '85%',
      marginVertical: 4,
    },
    userBubble: {
      backgroundColor: 'rgba(109, 93, 252, 0.1)',
      alignSelf: 'flex-end',
    },
    aiBubble: {
      alignSelf: 'flex-start',
    },
    promptBubbleScroll: {
      maxHeight: 34,
      marginBottom: 10,
    },
    promptBubble: {
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
      height: 28,
    },
    chatComposer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 40,
      borderRadius: 20,
      paddingHorizontal: 12,
    },
    chatComposerInput: {
      flex: 1,
      fontSize: 12.5,
    },
    chatComposerSendBtn: {
      backgroundColor: '#6D5DFC',
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Bottom Modal Sheets Case link selection drawer
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
      width: '100%',
      height: height * 0.5,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    bottomSheetDragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#E2E8F0',
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      marginBottom: 12,
    },
    bottomSheetTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
    },
    caseItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    caseItemText: {
      fontSize: 13.5,
      fontWeight: '600',
    },
    clauseBtnRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    clauseActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clauseActionBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#6D5DFC',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    modalHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    reportContentBlock: {
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 16,
    },
    reportHeaderTitle: {
      fontSize: 15,
      fontWeight: '900',
    },
    reportSectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 6,
    },
    reportParaText: {
      fontSize: 12,
      lineHeight: 18,
    },
    activeTemplateBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    recommendedSection: {
      marginBottom: 12,
    },
    recommendedHeading: {
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: '#8B5CF6',
      marginBottom: 10,
    },
    dividerLine: {
      height: 1,
      marginVertical: 12,
    },
    scoreBadge: {
      backgroundColor: 'rgba(109, 93, 252, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    scoreBadgeText: {
      fontSize: 10,
      color: '#6D5DFC',
      fontWeight: '800',
    },
    scoreBadgeWarning: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    scoreBadgeWarningText: {
      fontSize: 10,
      color: '#10B981',
      fontWeight: '800',
    },
    scoreBadgeDanger: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    scoreBadgeDangerText: {
      fontSize: 10,
      color: '#F59E0B',
      fontWeight: '800',
    },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bulletList: {
      marginBottom: 14,
      gap: 4,
    },
    bulletItem: {
      fontSize: 12,
      fontWeight: '600',
      paddingLeft: 8,
    },
  });
}

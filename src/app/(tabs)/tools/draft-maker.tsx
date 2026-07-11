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
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { StorageService } from '@/services/storage.service';
import { CaseSummary } from '@/types';
import { ALL_TEMPLATES, CATEGORY_DEFAULT_FIELDS, FormField, TemplateMetadata } from '@/constants/templates-data';
import { TEMPLATE_STRUCTURES, getFallbackStructure, FIELD_FALLBACKS } from '@/constants/templates-structures';

const { width, height } = Dimensions.get('window');

export interface RichBlock {
  id: string;
  type: 'title' | 'heading1' | 'heading2' | 'paragraph' | 'bullet' | 'number';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export function parseTextToBlocks(rawText: string, template?: TemplateMetadata | null): RichBlock[] {
  if (!rawText) return [];
  const paragraphs = rawText.split('\n\n');
  const blocksList: RichBlock[] = [];

  let customDocTitle = '';
  let customSectionTitles: string[] = [];

  if (template) {
    const structure = TEMPLATE_STRUCTURES[template.id] || getFallbackStructure(template);
    if (structure) {
      customDocTitle = structure.documentTitle.toUpperCase();
      customSectionTitles = structure.sectionOrder.map(s => s.toUpperCase());
      Object.keys(structure.sectionContent).forEach(key => {
        customSectionTitles.push(key.toUpperCase());
      });
    }
  }

  paragraphs.forEach((p, idx) => {
    const trimmed = p.trim();
    if (!trimmed) return;

    let type: 'title' | 'heading1' | 'heading2' | 'paragraph' | 'bullet' | 'number' = 'paragraph';
    let text = trimmed;
    let bold = false;
    let italic = false;
    let underline = false;
    let align: 'left' | 'center' | 'right' | 'justify' = 'left';

    // Strip markdown bold markers **
    if (text.startsWith('**') && text.endsWith('**')) {
      bold = true;
      text = text.substring(2, text.length - 2);
    }
    // Strip markdown italic markers *
    if (text.startsWith('*') && text.endsWith('*')) {
      italic = true;
      text = text.substring(1, text.length - 1);
    }
    // Strip HTML <u>
    if (text.startsWith('<u>') && text.endsWith('</u>')) {
      underline = true;
      text = text.substring(3, text.length - 4);
    }

    // Strip headings
    if (text.startsWith('## ')) {
      type = 'heading2';
      text = text.replace(/^##\s+/, '');
      bold = true;
    } else if (text.startsWith('# ')) {
      type = 'heading1';
      text = text.replace(/^#\s+/, '');
      bold = true;
    } else if (text.startsWith('• ') || text.startsWith('- ')) {
      type = 'bullet';
      text = text.replace(/^[•-]\s+/, '');
    } else if (/^[0-9]+\.\s+/.test(text)) {
      type = 'number';
      text = text.replace(/^[0-9]+\.\s+/, '');
    }

    // Specific legal notice formatting recognitions
    const upperText = text.toUpperCase();
    const isCustomDocTitle = customDocTitle ? upperText === customDocTitle : false;
    const isCustomSectionTitle = customSectionTitles.some(title => 
      upperText === title || 
      upperText === `${title}:` || 
      upperText.startsWith(`${title}\n`)
    );

    if (
      upperText === 'LEGAL NOTICE' ||
      isCustomDocTitle ||
      upperText.startsWith('BEFORE THE HONORABLE') ||
      upperText.startsWith('IN THE COURT OF')
    ) {
      type = 'title';
      align = 'center';
      bold = true;
    } else if (
      upperText === 'FACTS OF THE CASE' ||
      upperText === 'LEGAL GROUNDS' ||
      upperText === 'PRAYER' ||
      upperText === 'SUBJECT:' ||
      upperText === 'TO,' ||
      upperText === 'SUBJECT' ||
      upperText.startsWith('SIR,') ||
      upperText.startsWith('SIGNATURE') ||
      isCustomSectionTitle
    ) {
      type = 'heading1';
      bold = true;
    }

    blocksList.push({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      text,
      bold,
      italic,
      underline,
      align,
    });
  });

  return blocksList;
}

export function serializeBlocksToText(blocks: RichBlock[]): string {
  return blocks.map(b => {
    let text = b.text;
    
    // Add raw styling wrappers ONLY when saving back to text formats
    if (b.bold && b.type !== 'title' && b.type !== 'heading1') {
      text = `**${text}**`;
    }
    if (b.italic) {
      text = `*${text}*`;
    }
    if (b.underline) {
      text = `<u>${text}</u>`;
    }

    if (b.type === 'title') {
      return text.toUpperCase();
    }
    if (b.type === 'heading1') {
      return text.toUpperCase();
    }
    if (b.type === 'heading2') {
      return `## ${text}`;
    }
    if (b.type === 'bullet') {
      return `• ${text}`;
    }
    if (b.type === 'number') {
      return `1. ${text}`;
    }
    return text;
  }).join('\n\n');
}

// Step 1: Document Upload Options Mockup
const MOCK_UPLOADS = [
  { id: 'suit', name: 'civil_suit_plaint.pdf', size: '2.1 MB', type: 'Plaint Document' },
  { id: 'complaint', name: 'consumer_grievance_email.docx', size: '450 KB', type: 'Email Records' },
  { id: 'nda', name: 'mutual_nda_draft.pdf', size: '1.2 MB', type: 'Unsigned Agreement' },
];

const MOCK_PRECEDENTS = [
  {
    title: 'Aditya Birla Chemicals v. Union of India (2022 SCC SC 712)',
    ratio: 'The doctrine of Promissory Estoppel applies when a public body alters industrial tariff schedules retrospectively without prior consultative consensus.',
    citation: 'Aditya Birla Chemicals v. Union of India (2022) 14 SCC 712',
    score: '98% match',
  },
  {
    title: 'Kalyanpur Lime Works v. State of Bihar (1954 AIR SC 137)',
    ratio: 'A contract breach by government bodies unilaterally shifting lease parameters invites standard reliefs under promissory estoppel.',
    citation: 'Kalyanpur Lime Works v. State of Bihar (1954) SCR 958',
    score: '92% match',
  },
  {
    title: 'Motilal Padampat Sugar Mills v. State of Uttar Pradesh (1979 SCR (2) 641)',
    ratio: 'Promissory estoppel is a shield and can form a cause of action against state corporations making specific industrial representations.',
    citation: 'Motilal Padampat Sugar Mills v. State of U.P. (1979) 2 SCC 409',
    score: '89% match',
  },
  {
    title: 'Union of India v. Anglo Afghan Agencies (1968 SCR (2) 366)',
    ratio: 'The executive cannot unilaterally back out of promises made in administrative schemes encouraging industrial investments.',
    citation: 'UOI v. Anglo Afghan Agencies (1968) 2 SCJ 739',
    score: '85% match',
  },
  {
    title: 'Gujarat State Financial Corp. v. Lotus Hotels (1983 SCR (3) 829)',
    ratio: 'A statutory body cannot fail to perform obligations relying on technical discrepancies after prompting investments.',
    citation: 'Gujarat State Financial Corp. v. Lotus Hotels (1983) 3 SCC 379',
    score: '81% match',
  },
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

const mapContextToFields = (
  template: TemplateMetadata, 
  context: any
): { autoFilled: Record<string, string>; confidenceMap: Record<string, number>; missing: FormField[] } => {
  const fields = template.fields || CATEGORY_DEFAULT_FIELDS[template.category] || [];
  const autoFilled: Record<string, string> = {};
  const confidenceMap: Record<string, number> = {};
  const missing: FormField[] = [];

  const getSimulatedConfidence = (key: string): number => {
    const k = key.toLowerCase();
    if (k.includes('court') || k.includes('jurisdiction') || k.includes('witness')) return 62;
    if (k.includes('respondent') || k.includes('accused') || k.includes('date') || k.includes('opponent') || k.includes('lender') || k.includes('employer')) return 84;
    return 95;
  };

  fields.forEach(field => {
    const key = field.key.toLowerCase();
    let value = '';

    if (key.includes('petitioner') || key.includes('complainant') || key.includes('borrower') || key.includes('employee') || key.includes('transferor') || key.includes('client') || key.includes('company')) {
      if (context.clientName) value = context.clientName;
    } else if (key.includes('respondent') || key.includes('accused') || key.includes('opponent') || key.includes('opposite') || key.includes('transferee') || key.includes('lender') || key.includes('employer')) {
      if (context.opponentName) value = context.opponentName;
    } else if (key.includes('court') || key.includes('jurisdiction')) {
      if (context.courtName) value = context.courtName;
    } else if (key.includes('fact') || key.includes('case') || key.includes('description') || key.includes('grievance') || key.includes('property')) {
      if (context.facts) value = context.facts;
    } else if (key.includes('relief') || key.includes('compensation') || key.includes('sought') || key.includes('requested') || key.includes('prayer')) {
      if (context.reliefSought) value = context.reliefSought;
    } else if (key.includes('incidentdate') || key.includes('purchasedate') || key.includes('joiningdate') || key.includes('marriagedate') || key.includes('meetingdate') || key.includes('date')) {
      if (key.includes('agreement') && context.agreementDate) {
        value = context.agreementDate;
      } else if (context.incidentDate) {
        value = context.incidentDate;
      }
    } else if (key.includes('loanamount') || key.includes('amount') || key.includes('consideration') || key.includes('compensation')) {
      if (context.loanAmount) {
        value = context.loanAmount;
      } else if (context.considerationAmount) {
        value = context.considerationAmount;
      }
    } else if (key.includes('interest')) {
      if (context.interestRate) value = context.interestRate;
    } else if (key.includes('witness')) {
      if (context.witnesses) value = context.witnesses;
    } else if (key.includes('station') || key.includes('police')) {
      if (context.policeStation) value = context.policeStation;
    } else if (key.includes('address')) {
      if (key.includes('petitioner') || key.includes('complainant') || key.includes('client') || key.includes('transferor')) {
        value = context.address || 'Sector 12, Dwarka, Delhi';
      } else {
        value = 'Sector 4, Rohini, Delhi';
      }
    }

    if (value) {
      autoFilled[field.key] = value;
      confidenceMap[field.key] = getSimulatedConfidence(field.key);
    } else {
      missing.push(field);
    }
  });

  return { autoFilled, confidenceMap, missing };
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
  const [filledFieldsConfidence, setFilledFieldsConfidence] = useState<Record<string, number>>({});
  const [isAutoFilledExpanded, setIsAutoFilledExpanded] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState<FormField[]>([]);
  const [missingDataInputs, setMissingDataInputs] = useState<Record<string, string>>({});

  // AI progress checklist animations
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [progressVal] = useState(new Animated.Value(0));

  // Editor content & outline items (Step 6: Workspace)
  const [editorContent, setEditorContent] = useState('');
  const [blocks, setBlocks] = useState<RichBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [blockHistory, setBlockHistory] = useState<RichBlock[][]>([]);
  const [blockHistoryIndex, setBlockHistoryIndex] = useState(-1);

  // Real Document Action workflows states
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Simplify Comparison workflow
  const [isSimplifyCompareOpen, setIsSimplifyCompareOpen] = useState(false);
  const [simplifiedContent, setSimplifiedContent] = useState('');

  // Translate workflow
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);
  const [isViewingTranslation, setIsViewingTranslation] = useState(false);
  const [translatedBlocks, setTranslatedBlocks] = useState<RichBlock[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // Precedents database workflow
  const [isPrecedentSearchOpen, setIsPrecedentSearchOpen] = useState(false);
  const [selectedPrecedentIdx, setSelectedPrecedentIdx] = useState<number | null>(null);
  const [isPrecedentOptionsOpen, setIsPrecedentOptionsOpen] = useState(false);

  // Delete workflow
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Bookmarks
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    setEditorContent(serializeBlocksToText(blocks));
  }, [blocks]);

  const [editorDocName, setEditorDocName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Versions logs
  const [versionsList, setVersionsList] = useState<Array<{ version: number; time: string; content: string }>>([]);
  const [currentVersion, setCurrentVersion] = useState(1);

  // Undo/Redo, text selection, find & replace, and custom modal states
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [textSelection, setTextSelection] = useState({ start: 0, end: 0 });
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isContentsOpen, setIsContentsOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

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

    // Check for pending precedent imported from legal research
    const checkImportedPrecedent = async () => {
      try {
        const rawImport = await StorageService.getItem('@aisa_pending_precedent_draft');
        if (rawImport) {
          const parsed = JSON.parse(rawImport);
          if (parsed && parsed.text) {
            Alert.alert(
              'Import Precedent Citation',
              `Would you like to insert the precedent "${parsed.case_name}" as a new clause block in this draft?`,
              [
                {
                  text: 'Cancel',
                  onPress: async () => {
                    await StorageService.removeItem('@aisa_pending_precedent_draft');
                    showToast('info', 'Import Cancelled', 'Precedent import was cancelled.');
                  },
                  style: 'cancel'
                },
                {
                  text: 'Insert Clause',
                  onPress: async () => {
                    // Create a new RichBlock
                    const newBlock: RichBlock = {
                      id: `block_${Date.now()}`,
                      type: 'paragraph',
                      text: parsed.text,
                      bold: false,
                      italic: false,
                      underline: false,
                    };
                    
                    setBlocks(prev => {
                      const updated = [...prev, newBlock];
                      pushBlockHistory(updated);
                      return updated;
                    });
                    
                    await StorageService.removeItem('@aisa_pending_precedent_draft');
                    showToast('success', 'Precedent Imported', 'Precedent citation and argument successfully inserted into your draft.');
                  }
                }
              ]
            );
          }
        }
      } catch (err) {
        console.warn('Failed to check imported precedent:', err);
      }
    };
    
    // Bounded delay to allow screen mounting and state initialization
    setTimeout(checkImportedPrecedent, 1000);
  }, []);

  const handleSelectCase = async (caseId: string) => {
    setSelectedCaseId(caseId);
    setStep('IMPORT');
    
    try {
      const detailsRes = await CaseService.getCaseDetails(caseId);
      const caseObj = detailsRes.data;

      // Construct unified DraftContext
      const contextObj: any = {
        clientName: caseObj?.clientName || 'Rajesh Sharma',
        opponentName: caseObj?.opponentName || 'Amit Verma',
        courtName: caseObj?.courtName || (caseObj?.hearings && caseObj.hearings[0]?.courtName) || 'District Consumer Forum, Mumbai',
        facts: (caseObj?.facts && caseObj.facts.map(f => `${f.date}: ${f.description || f.event || f.title}`).join('\n')) || caseObj?.summary || caseObj?.caseSummary || 'Unilateral increase in retrospective service charges without prior consensus or notification.',
        caseCategory: caseObj?.caseType || 'Civil',
        caseTitle: caseObj?.name,
        reliefSought: caseObj?.reliefGoals || 'Stay directions on service tariff hikes and refund considerations.',
        witnesses: (caseObj?.hearings && caseObj.hearings.map(h => h.checklist?.witnesses?.map(w => w.title).join(', ')).filter(Boolean).join(', ')) || 'Witness A: R.K. Gupta, Witness B: S.K. Roy',
        advocateName: (caseObj?.lawyers && caseObj.lawyers.map(l => l.name).join(', ')) || 'Adv. Suresh Mehta',
        opposingLawyer: caseObj?.opposingLawyer,
        agreementDate: '2026-06-14',
        noticePeriod: '15 days',
        loanAmount: '25,00,000',
        interestRate: '9.5% p.a.',
      };

      setTimeout(() => {
        setShowImportSuccess(true);
        showToast('success', 'Case Synced', 'Facts and parties imported successfully.');
        setTimeout(() => {
          setShowImportSuccess(false);
          if (selectedTemplate) {
            const { autoFilled, confidenceMap, missing } = mapContextToFields(selectedTemplate, contextObj);
            setFilledFields(autoFilled);
            setFilledFieldsConfidence(confidenceMap);
            setMissingFieldsList(missing);
          }
          setStep('REVIEW');
        }, 1000);
      }, 1500);

    } catch (err) {
      console.error('Failed to fetch case details for draft:', err);
      showToast('error', 'Sync Failed', 'Failed to load case details.');
      setStep('GALLERY');
    }
  };

  const handleSelectUpload = (docId: string) => {
    setSelectedDocId(docId);
    showToast('success', 'File Selected', 'OCR extraction started.');
    setStep('IMPORT');

    const ocrContext: any = {
      clientName: docId === 'nda' ? 'AI LEGAL Solutions' : 'Rajesh Sharma',
      opponentName: docId === 'nda' ? 'Alpha Tech Corp' : docId === 'complaint' ? 'Prime Gadgets Retail Ltd' : 'Amit Verma',
      courtName: docId === 'complaint' ? 'State Consumer Disputes Redressal Commission' : 'District Consumer Forum, Mumbai',
      facts: docId === 'complaint' 
        ? 'The smart TV bought on January 12, 2026 has screen flickering issues and speaker distortion.'
        : docId === 'nda'
        ? 'Mutual nondisclosure agreement for outsourcing services and proprietary code share.'
        : 'Unilateral increase in retrospective service charges without prior consensus or notification.',
      incidentDate: '2026-01-12',
      loanAmount: docId === 'complaint' ? '75,000' : '25,00,000',
      interestRate: '9.5% p.a.',
      agreementDate: '2026-06-14',
      noticePeriod: '15 days',
      witnesses: 'Witness A: R.K. Gupta, Witness B: S.K. Roy',
    };

    setTimeout(() => {
      setShowImportSuccess(true);
      setTimeout(() => {
        setShowImportSuccess(false);
        if (selectedTemplate) {
          const { autoFilled, confidenceMap, missing } = mapContextToFields(selectedTemplate, ocrContext);
          setFilledFields(autoFilled);
          setFilledFieldsConfidence(confidenceMap);
          setMissingFieldsList(missing);
        }
        setStep('REVIEW');
      }, 1000);
    }, 1500);
  };

  const handleSelectTemplate = async (template: TemplateMetadata) => {
    setSelectedTemplate(template);
    
    if (selectedCaseId) {
      setStep('IMPORT');
      try {
        const detailsRes = await CaseService.getCaseDetails(selectedCaseId);
        const caseObj = detailsRes.data;
        const contextObj: any = {
          clientName: caseObj?.clientName || 'Rajesh Sharma',
          opponentName: caseObj?.opponentName || 'Amit Verma',
          courtName: caseObj?.courtName || (caseObj?.hearings && caseObj.hearings[0]?.courtName) || 'District Consumer Forum, Mumbai',
          facts: (caseObj?.facts && caseObj.facts.map(f => `${f.date}: ${f.description || f.event || f.title}`).join('\n')) || caseObj?.summary || caseObj?.caseSummary || 'Unilateral increase in retrospective service charges without prior consensus or notification.',
          caseCategory: caseObj?.caseType || 'Civil',
          caseTitle: caseObj?.name,
          reliefSought: caseObj?.reliefGoals || 'Stay directions on service tariff hikes and refund considerations.',
          witnesses: (caseObj?.hearings && caseObj.hearings.map(h => h.checklist?.witnesses?.map(w => w.title).join(', ')).filter(Boolean).join(', ')) || 'Witness A: R.K. Gupta, Witness B: S.K. Roy',
          advocateName: (caseObj?.lawyers && caseObj.lawyers.map(l => l.name).join(', ')) || 'Adv. Suresh Mehta',
          opposingLawyer: caseObj?.opposingLawyer,
          agreementDate: '2026-06-14',
          noticePeriod: '15 days',
          loanAmount: '25,00,000',
          interestRate: '9.5% p.a.',
        };
        const { autoFilled, confidenceMap, missing } = mapContextToFields(template, contextObj);
        setFilledFields(autoFilled);
        setFilledFieldsConfidence(confidenceMap);
        setMissingFieldsList(missing);
        setStep('REVIEW');
      } catch (err) {
        setStep('SOURCE');
      }
    } else if (selectedDocId) {
      setStep('IMPORT');
      const ocrContext: any = {
        clientName: selectedDocId === 'nda' ? 'AI LEGAL Solutions' : 'Rajesh Sharma',
        opponentName: selectedDocId === 'nda' ? 'Alpha Tech Corp' : selectedDocId === 'complaint' ? 'Prime Gadgets Retail Ltd' : 'Amit Verma',
        courtName: selectedDocId === 'complaint' ? 'State Consumer Disputes Redressal Commission' : 'District Consumer Forum, Mumbai',
        facts: selectedDocId === 'complaint' 
          ? 'The smart TV bought on January 12, 2026 has screen flickering issues and speaker distortion.'
          : selectedDocId === 'nda'
          ? 'Mutual nondisclosure agreement for outsourcing services and proprietary code share.'
          : 'Unilateral increase in retrospective service charges without prior consensus or notification.',
        incidentDate: '2026-01-12',
        loanAmount: selectedDocId === 'complaint' ? '75,000' : '25,00,000',
        interestRate: '9.5% p.a.',
        agreementDate: '2026-06-14',
        noticePeriod: '15 days',
        witnesses: 'Witness A: R.K. Gupta, Witness B: S.K. Roy',
      };
      const { autoFilled, confidenceMap, missing } = mapContextToFields(template, ocrContext);
      setFilledFields(autoFilled);
      setFilledFieldsConfidence(confidenceMap);
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

  const generateTemplateSpecificText = (
    template: TemplateMetadata | null,
    getFieldValue: (key: string, fallback: string) => string
  ): string => {
    if (!template) return 'No template selected.';

    const structure = TEMPLATE_STRUCTURES[template.id] || getFallbackStructure(template);
    if (!structure) {
      return 'Failed to load template structure.';
    }

    const {
      documentTitle,
      sectionOrder,
      sectionContent,
      mandatorySections,
      optionalSections = [],
      formattingRules = {},
      numberingStyle = {},
      signatureLayout = 'left',
      header,
      footer,
    } = structure;

    let docParts: string[] = [];

    // 1. Add Header if defined
    if (header) {
      let formattedHeader = header;
      const placeholders = header.match(/\{\{([^}]+)\}\}/g) || [];
      placeholders.forEach(placeholder => {
        const key = placeholder.slice(2, -2).trim();
        const value = getFieldValue(key, FIELD_FALLBACKS[key] || `[${key}]`);
        formattedHeader = formattedHeader.replace(new RegExp(placeholder, 'g'), value);
      });
      docParts.push(formattedHeader);
    }

    // 2. Add Document Title
    let formattedTitle = documentTitle.toUpperCase();
    docParts.push(formattedTitle);

    // 3. Render Sections in order
    sectionOrder.forEach(sectionKey => {
      const isOptional = optionalSections.includes(sectionKey);
      
      let rawContent = sectionContent[sectionKey];
      if (!rawContent) return;

      // Extract all placeholders in this section's content
      const placeholders = rawContent.match(/\{\{([^}]+)\}\}/g) || [];
      
      // Determine if we should skip this optional section if all fields are empty
      if (isOptional && placeholders.length > 0) {
        const allFieldsEmpty = placeholders.every(placeholder => {
          const key = placeholder.slice(2, -2).trim();
          const userVal = getFieldValue(key, '');
          return !userVal;
        });
        
        if (allFieldsEmpty) {
          return;
        }
      }

      // Substitute placeholders with user input or fallbacks
      let formattedContent = rawContent;
      placeholders.forEach(placeholder => {
        const key = placeholder.slice(2, -2).trim();
        const value = getFieldValue(key, FIELD_FALLBACKS[key] || `[${key}]`);
        formattedContent = formattedContent.replace(new RegExp(placeholder, 'g'), value);
      });

      // Check formatting: bold/underline
      const shouldBold = formattingRules.bold?.includes(sectionKey);
      const shouldUnderline = formattingRules.underline?.includes(sectionKey);
      const shouldUppercase = formattingRules.uppercase?.includes(sectionKey);

      if (shouldUppercase) {
        formattedContent = formattedContent.toUpperCase();
      }
      
      let processedSection = formattedContent;

      // Split into paragraphs if there are multiple paragraphs
      const paragraphs = processedSection.split('\n');
      const numStyle = numberingStyle[sectionKey];

      if (numStyle && numStyle !== 'none') {
        let listCount = 1;
        processedSection = paragraphs.map(p => {
          const trimmedP = p.trim();
          if (!trimmedP) return '';
          
          if (/^[0-9]+\.\s+/.test(trimmedP) || /^[A-Z]\.\s+/.test(trimmedP) || /^•\s+/.test(trimmedP)) {
            return trimmedP;
          }

          let prefix = '';
          if (numStyle === 'arabic') {
            prefix = `${listCount}. `;
            listCount++;
          } else if (numStyle === 'alphabet') {
            prefix = `${String.fromCharCode(64 + listCount)}. `;
            listCount++;
          } else if (numStyle === 'bullet') {
            prefix = '• ';
          }
          return `${prefix}${trimmedP}`;
        }).filter(Boolean).join('\n');
      }

      if (shouldBold && !processedSection.startsWith('**')) {
        processedSection = processedSection.split('\n').map(line => line.trim() ? `**${line}**` : '').join('\n');
      }
      if (shouldUnderline && !processedSection.includes('<u>')) {
        processedSection = processedSection.split('\n').map(line => line.trim() ? `<u>${line}</u>` : '').join('\n');
      }

      docParts.push(processedSection);
    });

    // 4. Add Signature Block based on signatureLayout
    let signatureStr = '';
    const principal = getFieldValue('principalName', getFieldValue('petitionerName', getFieldValue('complainantName', getFieldValue('senderName', getFieldValue('landlordName', 'First Party')))));
    const attorney = getFieldValue('attorneyName', getFieldValue('respondentName', getFieldValue('receiverName', getFieldValue('tenantName', 'Second Party'))));
    const advocate = getFieldValue('advocateName', 'Adv. Suresh Mehta');

    if (signatureLayout === 'split') {
      signatureStr = `For First Party: _________________\n(${principal})\n\nFor Second Party: _________________\n(${attorney})`;
    } else if (signatureLayout === 'notary_deponent') {
      signatureStr = `DEPONENT: _________________\n(${principal})\n\nSworn & signed before me:\n\nNOTARY PUBLIC / OATH COMMISSIONER`;
    } else if (signatureLayout === 'right') {
      signatureStr = `\n\n                                                    Signature: _________________\n                                                    (${advocate || principal})`;
    } else if (signatureLayout === 'double_witness') {
      signatureStr = `First Party: _________________               Second Party: _________________\n\nWitnesses:\n1. _________________\n2. _________________`;
    } else {
      signatureStr = `Signature: _________________\n(${principal || advocate})`;
    }
    docParts.push(signatureStr);

    // 5. Add Footer if defined
    if (footer) {
      docParts.push(footer);
    }

    return docParts.join('\n\n');
  };

  const handleStartGeneration = () => {
    setStep('GENERATING');
    setCurrentStepIdx(0);
    progressVal.setValue(0);

    const getFieldValue = (key: string, fallback: string) => {
      return missingDataInputs[key] || filledFields[key] || fallback;
    };

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
        
        const initialText = generateTemplateSpecificText(selectedTemplate, getFieldValue);

        const initialBlocks = parseTextToBlocks(initialText, selectedTemplate);
        setBlocks(initialBlocks);
        setBlockHistory([initialBlocks]);
        setBlockHistoryIndex(0);
        
        setVersionsList([
          { version: 1, time: new Date().toLocaleTimeString(), content: initialText }
        ]);
        setStep('WORKSPACE');
        showToast('success', 'Draft Compiled', 'AI Legal Draft Workspace loaded.');
      }
    }, 350);
  };

  const pushBlockHistory = (newBlocks: RichBlock[]) => {
    const nextHistory = blockHistory.slice(0, blockHistoryIndex + 1);
    nextHistory.push(newBlocks);
    setBlockHistory(nextHistory);
    setBlockHistoryIndex(nextHistory.length - 1);
    setBlocks(newBlocks);
  };

  const runWithLoader = (text: string, durationMs: number, actionCallback: () => void) => {
    setLoadingText(text);
    setIsLoadingAction(true);
    setTimeout(() => {
      setIsLoadingAction(false);
      actionCallback();
    }, durationMs);
  };

  const handleSaveEdit = () => {
    setIsEditMode(false);
    showToast('success', 'Saved', 'Draft saved locally.');
    const nextVer = currentVersion + 1;
    const serializedText = serializeBlocksToText(blocks);
    setVersionsList(prev => [
      ...prev,
      { version: nextVer, time: new Date().toLocaleTimeString(), content: serializedText }
    ]);
    setCurrentVersion(nextVer);
  };

  const handleRestoreVersion = (ver: number, content: string) => {
    const nextBlocks = parseTextToBlocks(content, selectedTemplate);
    setBlocks(nextBlocks);
    pushBlockHistory(nextBlocks);
    setCurrentVersion(ver);
    showToast('success', 'Restored', `Draft restored to Version ${ver}.`);
  };

  const handleBlockTextChange = (id: string, newText: string) => {
    const nextBlocks = blocks.map(b => (b.id === id ? { ...b, text: newText } : b));
    setBlocks(nextBlocks);
    // Push updated blocks state to undo history stack
    const nextHistory = blockHistory.slice(0, blockHistoryIndex + 1);
    nextHistory.push(nextBlocks);
    setBlockHistory(nextHistory);
    setBlockHistoryIndex(nextHistory.length - 1);
  };

  const handleUndo = () => {
    if (blockHistoryIndex > 0) {
      const nextIdx = blockHistoryIndex - 1;
      setBlockHistoryIndex(nextIdx);
      setBlocks(blockHistory[nextIdx]);
      showToast('success', 'Undo', 'Last edit undone.');
    }
  };

  const handleRedo = () => {
    if (blockHistoryIndex < blockHistory.length - 1) {
      const nextIdx = blockHistoryIndex + 1;
      setBlockHistoryIndex(nextIdx);
      setBlocks(blockHistory[nextIdx]);
      showToast('success', 'Redo', 'Edit redone.');
    }
  };

  const handleFormat = (tag: string) => {
    if (!activeBlockId) {
      showToast('error', 'Select Block', 'Tap a paragraph/heading to format first.');
      return;
    }
    const nextBlocks: RichBlock[] = blocks.map(b => {
      if (b.id !== activeBlockId) return b;
      switch (tag) {
        case 'bold':
          return { ...b, bold: !b.bold } as RichBlock;
        case 'italic':
          return { ...b, italic: !b.italic } as RichBlock;
        case 'underline':
          return { ...b, underline: !b.underline } as RichBlock;
        case 'h1':
          return { ...b, type: (b.type === 'heading1' ? 'paragraph' : 'heading1') as any, bold: true } as RichBlock;
        case 'h2':
          return { ...b, type: (b.type === 'heading2' ? 'paragraph' : 'heading2') as any, bold: true } as RichBlock;
        case 'bullet':
          return { ...b, type: (b.type === 'bullet' ? 'paragraph' : 'bullet') as any } as RichBlock;
        case 'number':
          return { ...b, type: (b.type === 'number' ? 'paragraph' : 'number') as any } as RichBlock;
        case 'left':
        case 'center':
        case 'right':
        case 'justify':
          return { ...b, align: tag as any } as RichBlock;
        default:
          return b;
      }
    });
    pushBlockHistory(nextBlocks);
    showToast('success', 'Format Applied', `Applied ${tag} style.`);
  };

  const handleFindReplace = () => {
    if (!findQuery) return;
    const nextBlocks: RichBlock[] = blocks.map(b => {
      if (b.text.includes(findQuery)) {
        return { ...b, text: b.text.split(findQuery).join(replaceQuery) } as RichBlock;
      }
      return b;
    });
    pushBlockHistory(nextBlocks);
    showToast('success', 'Replaced', `Replaced occurrences of "${findQuery}" with "${replaceQuery}".`);
  };

  const scrollToSection = (sectionName: string) => {
    let y = sectionOffsets.current[sectionName];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: y - 10, animated: true });
      showToast('success', 'Navigation', `Scrolled to ${sectionName}.`);
      return;
    }

    const normalized = sectionName.toUpperCase();
    const foundKey = Object.keys(sectionOffsets.current).find(k => k.toUpperCase().includes(normalized) || normalized.includes(k.toUpperCase()));
    if (foundKey) {
      y = sectionOffsets.current[foundKey];
      if (y !== undefined && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: y - 10, animated: true });
        showToast('success', 'Navigation', `Scrolled to ${foundKey}.`);
        return;
      }
    }

    showToast('error', 'Section position not found', `Position coordinates for "${sectionName}" not captured yet.`);
  };

  const handleAiAction = (action: string) => {
    setIsAiThinking(true);
    setTimeout(() => {
      setIsAiThinking(false);
      let text = "";
      switch (action) {
        case 'simplify':
          text = "Plain English Explanation: Both parties agree to pause all energy tariff rate hikes pending consumer court hearing outcomes.";
          break;
        case 'translate':
          text = "अनुवाद (Hindi Translation): यह न्यायाधिकरण प्रतिवादी को आदेश जारी करे कि सुनवाई लंबित रहने तक विद्युत विच्छेदन न किया जाए।";
          break;
        case 'citation':
          text = "Relevant Authority Citation: Aditya Birla Chemicals v. Union of India (2022 SCC SC 712) on Promissory Estoppel.";
          break;
      }
      const newBlock: RichBlock = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'paragraph',
        text,
        italic: true,
      };
      const nextBlocks = [...blocks, newBlock];
      pushBlockHistory(nextBlocks);
      showToast('success', 'AI Action Complete', 'Clause appended.');
    }, 700);
  };

  const handleSimplifyAction = () => {
    runWithLoader('Simplifying legal text...', 1200, () => {
      const docText = serializeBlocksToText(blocks);
      const simplified = docText
        .replace(/FACTS OF THE CASE/g, 'THE SIMPLE FACTS')
        .replace(/LEGAL GROUNDS/g, 'OUR LEGAL REASONS')
        .replace(/PRAYER/g, 'WHAT WE WANT')
        .replace(/unilaterally breached terms/g, 'broke the agreement rules without asking')
        .replace(/seeks stay directions/g, 'asks to freeze pricing')
        .replace(/violates Section 12/g, 'is against Section 12 rules');
      
      setSimplifiedContent(simplified);
      setIsSimplifyCompareOpen(true);
    });
  };

  const handleTranslateAction = (lang: string) => {
    setSelectedLanguage(lang);
    setIsLanguageSelectorOpen(false);
    
    if (lang === 'English') {
      setIsViewingTranslation(false);
      showToast('success', 'Original Version', 'Viewing original English draft.');
      return;
    }

    runWithLoader(`Translating draft to ${lang}...`, 1200, () => {
      const mapped = blocks.map(b => {
        let text = b.text;
        if (lang === 'Hindi') {
          text = text
            .replace(/LEGAL NOTICE/gi, 'कानूनी नोटिस')
            .replace(/FACTS OF THE CASE/gi, 'मामले के तथ्य')
            .replace(/LEGAL GROUNDS/gi, 'कानूनी आधार')
            .replace(/PRAYER/gi, 'प्रार्थना')
            .replace(/The Managing Director/gi, 'प्रबंध निदेशक')
            .replace(/Suresh Mehta/gi, 'सुरेश मेहता')
            .replace(/Tata Energy Ltd/gi, 'टाटा एनर्जी लिमिटेड')
            .replace(/SUBJECT/gi, 'विषय')
            .replace(/Sir,/gi, 'महोदय,')
            .replace(/Counsel for Complainant/gi, 'शिकायतकर्ता के वकील');
        } else {
          text = `[${lang} Translation]: ${text}`;
        }
        return {
          ...b,
          text,
        } as RichBlock;
      });
      setTranslatedBlocks(mapped);
      setIsViewingTranslation(true);
      showToast('success', 'Translated successfully', `Translated document into ${lang}.`);
    });
  };

  const handleInsertPrecedent = (type: 'citation' | 'ratio' | 'ref') => {
    if (selectedPrecedentIdx === null) return;
    const prec = MOCK_PRECEDENTS[selectedPrecedentIdx];
    
    let nextBlocks: RichBlock[] = [...blocks];
    
    if (type === 'citation') {
      if (activeBlockId) {
        nextBlocks = blocks.map(b => {
          if (b.id === activeBlockId) {
            return { ...b, text: `${b.text} [see: ${prec.citation}]` } as RichBlock;
          }
          return b;
        });
        showToast('success', 'Citation Inserted', 'Case law citation appended inline.');
      } else {
        showToast('error', 'Select Block', 'Focus a paragraph block to insert citation.');
        return;
      }
    } else if (type === 'ratio') {
      const activeIdx = blocks.findIndex(b => b.id === activeBlockId);
      const newB: RichBlock = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'paragraph',
        text: `"${prec.ratio}" - held in ${prec.title}`,
        italic: true,
      };
      if (activeIdx !== -1) {
        nextBlocks.splice(activeIdx + 1, 0, newB);
      } else {
        nextBlocks.push(newB);
      }
      showToast('success', 'Ratio Appended', 'Case precedent ratio block inserted.');
    } else if (type === 'ref') {
      const newB: RichBlock = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'bullet',
        text: `${prec.title}: ${prec.ratio}`,
      };
      nextBlocks.push(newB);
      showToast('success', 'Reference Appended', 'Case precedent added to end reference list.');
    }
    
    pushBlockHistory(nextBlocks);
    setIsPrecedentOptionsOpen(false);
    setIsPrecedentSearchOpen(false);
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
      {step !== 'WORKSPACE' ? (
        <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Draft Maker</Text>
            <Text style={styles.headerSubtitle}>AI-powered Enterprise Legal Drafting Assistant</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface, paddingRight: 12 }]}>
          <TouchableOpacity onPress={() => {
            if (isEditMode) {
              setIsEditMode(false);
            } else {
              setStep('REVIEW');
            }
          }} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary, fontSize: 16 }]} numberOfLines={1}>
              {editorDocName || 'Legal Notice Draft'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              style={[
                isEditMode ? styles.btnSmall : styles.btnSmallOutline, 
                { 
                  borderColor: '#6D5DFC', 
                  paddingVertical: 6, 
                  paddingHorizontal: 12, 
                  borderRadius: 6 
                }
              ]} 
              onPress={() => {
                if (isEditMode) {
                  handleSaveEdit();
                } else {
                  setIsEditMode(true);
                }
              }}
            >
              <Text style={{ color: isEditMode ? '#FFFFFF' : '#6D5DFC', fontSize: 11, fontWeight: '800' }}>
                {isEditMode ? 'Save' : 'Edit'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ padding: 4 }} onPress={() => setIsMoreMenuOpen(true)}>
              <Ionicons name="ellipsis-vertical" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ACTIVE TEMPLATE BAR (SMART BEHAVIOR) */}
      {selectedTemplate && step !== 'GALLERY' && step !== 'WORKSPACE' && (
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
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(138, 92, 245, 0.12)' }]}>
                <Ionicons name="folder-open-outline" size={24} color="#8A5CF5" />
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
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#8A5CF5' }]} onPress={() => setIsCaseSelectOpen(true)}>
              <Text style={styles.cardBtnText}>Select Case Workspace</Text>
            </TouchableOpacity>
          </View>

          {/* Option 2: Upload Documents */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(138, 92, 245, 0.12)' }]}>
                <Ionicons name="cloud-upload-outline" size={24} color="#8A5CF5" />
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
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#8A5CF5' }]} onPress={() => setIsUploadOpen(true)}>
              <Text style={styles.cardBtnText}>Upload Documents</Text>
            </TouchableOpacity>
          </View>

          {/* Option 3: Manual Entry */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(138, 92, 245, 0.12)' }]}>
                <Ionicons name="create-outline" size={24} color="#8A5CF5" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Manual Entry</Text>
            </View>
            <Text style={[styles.cardDesc, { color: theme.textSecondary, marginBottom: 12 }]}>
              Create document from scratch by manually keying in fields.
            </Text>
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#8A5CF5' }]} onPress={handleContinueManually}>
              <Text style={styles.cardBtnText}>Continue Manually</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* STEP 2: Intelligent AI Import checklist */}
      {step === 'IMPORT' && (
        <View style={[styles.analyzingWrapper, { backgroundColor: theme.background }]}>
          <View style={[styles.analyzingBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color="#8A5CF5" style={{ marginBottom: 16 }} />
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
      {step === 'REVIEW' && (() => {
        const totalFieldsCount = Object.keys(filledFields).length + missingFieldsList.length;
        const completenessPercentage = totalFieldsCount > 0 ? Math.round((Object.keys(filledFields).length / totalFieldsCount) * 100) : 100;

        return (
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Almost Ready!</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 16 }}>
              We found <Text style={{ color: '#10B981', fontWeight: '800' }}>{completenessPercentage}%</Text> of the required information. Please complete these missing details:
            </Text>

            {/* AI Completion KPI Card */}
            <View style={[styles.completionKpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.kpiCircleRow}>
                <View style={[styles.radialCircleSmall, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}><Text style={[styles.radialValTextSmall, { color: theme.primary }]}>{completenessPercentage}%</Text></View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>AI Auto-fill Completion</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    <View style={[styles.scoreBadge, { backgroundColor: '#E0F2FE' }]}><Text style={[styles.scoreBadgeText, { color: '#0369A1' }]}>{Object.keys(filledFields).length} Mapped</Text></View>
                    {missingFieldsList.length > 0 ? (
                      <View style={[styles.scoreBadgeWarning, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.scoreBadgeWarningText, { color: '#D97706' }]}>{missingFieldsList.length} Missing</Text></View>
                    ) : (
                      <View style={[styles.scoreBadge, { backgroundColor: '#D1FAE5' }]}><Text style={[styles.scoreBadgeText, { color: '#065F46' }]}>Fully Complete</Text></View>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Missing inputs fields */}
            {missingFieldsList.length > 0 ? (
              <View style={[styles.formGroupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.groupHeading, { color: '#D97706' }]}>⚠ Please Complete the Following Details:</Text>
                {missingFieldsList.map(field => (
                  <View key={field.key} style={styles.inputGroupField}>
                    <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{field.label} {field.required && <Text style={{ color: '#EF4444' }}>*</Text>}</Text>
                    <TextInput
                      style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                      value={missingDataInputs[field.key] || ''}
                      onChangeText={(val) => setMissingDataInputs(prev => ({ ...prev, [field.key]: val }))}
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      placeholderTextColor={theme.placeholder}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.formGroupCard, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center', paddingVertical: 20 }]}>
                <Ionicons name="checkmark-circle-outline" size={40} color="#10B981" />
                <Text style={[styles.groupHeading, { color: '#10B981', marginTop: 10 }]}>All Required Information Found</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', marginTop: 4 }}>
                  The AI has mapped 100% of the case workspace facts into the template.
                </Text>
              </View>
            )}

            {/* Expandable Mapped/Auto-filled Fields Panel (Editability) */}
            {Object.keys(filledFields).length > 0 && (
              <View style={[styles.formGroupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
                  onPress={() => setIsAutoFilledExpanded(prev => !prev)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={[styles.groupHeading, { color: theme.textPrimary, marginBottom: 0 }]}>
                      View & Edit Mapped Information ({Object.keys(filledFields).length} fields)
                    </Text>
                  </View>
                  <Ionicons name={isAutoFilledExpanded ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
                </Pressable>

                {isAutoFilledExpanded && (
                  <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 12 }}>
                      Review the details extracted by AI. You can edit any field to customize before generating.
                    </Text>
                    {Object.keys(filledFields).map(key => {
                      const confidence = filledFieldsConfidence[key] || 95;
                      const label = selectedTemplate?.fields?.find(f => f.key === key)?.label || CATEGORY_DEFAULT_FIELDS[selectedTemplate!.category]?.find(f => f.key === key)?.label || key;
                      
                      let borderColor = theme.border;
                      let confidenceText = 'High Confidence';
                      let confidenceColor = '#10B981';
                      
                      if (confidence < 70) {
                        borderColor = '#EF4444';
                        confidenceText = '⚠️ Low Confidence: Please verify this extracted value';
                        confidenceColor = '#EF4444';
                      } else if (confidence <= 90) {
                        borderColor = '#F59E0B';
                        confidenceText = '💡 Medium Confidence: Verify values if needed';
                        confidenceColor = '#F59E0B';
                      }

                      return (
                        <View key={key} style={styles.inputGroupField}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginBottom: 0 }]}>{label}</Text>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: confidenceColor }}>{confidenceText}</Text>
                          </View>
                          <TextInput
                            style={[
                              styles.input, 
                              { 
                                color: theme.textPrimary, 
                                borderColor: borderColor, 
                                borderWidth: confidence < 90 ? 1.5 : 1,
                                backgroundColor: theme.surfaceVariant 
                              }
                            ]}
                            value={filledFields[key]}
                            onChangeText={(val) => setFilledFields(prev => ({ ...prev, [key]: val }))}
                          />
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.actionBtnLarge} onPress={handleStartGeneration}>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnLargeText}>Generate AI Draft</Text>
            </TouchableOpacity>
          </ScrollView>
        );
      })()}

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
        <View style={{ flex: 1, backgroundColor: isDark ? '#1F1A3A' : '#F3F4F6' }}>
          
          {/* Edit Mode toolbar and Find & Replace panel */}
          {isEditMode && (
            <View style={{ backgroundColor: theme.surface }}>
              {/* Rich Document Editor Toolbar */}
              <View style={styles.richToolbar}>
                <TouchableOpacity style={styles.richToolbarBtn} onPress={() => handleFormat('bold')}>
                  <Text style={styles.richToolbarBtnText}>B</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.richToolbarBtn} onPress={() => handleFormat('italic')}>
                  <Text style={[styles.richToolbarBtnText, { fontStyle: 'italic' }]}>I</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.richToolbarBtn} onPress={() => handleFormat('underline')}>
                  <Text style={[styles.richToolbarBtnText, { textDecorationLine: 'underline' }]}>U</Text>
                </TouchableOpacity>
                
                {/* Alignment */}
                <TouchableOpacity style={styles.richToolbarBtn} onPress={() => handleFormat('left')}>
                  <Text style={styles.richToolbarBtnText}>L</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.richToolbarBtn} onPress={() => handleFormat('center')}>
                  <Text style={styles.richToolbarBtnText}>C</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.richToolbarBtn} onPress={() => handleFormat('right')}>
                  <Text style={styles.richToolbarBtnText}>R</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.richToolbarBtn} onPress={() => handleFormat('justify')}>
                  <Text style={styles.richToolbarBtnText}>J</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.richToolbarBtn} onPress={() => handleFormat('bullet')}>
                  <Ionicons name="list" size={14} color="#374151" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.richToolbarBtn} onPress={() => handleFormat('number')}>
                  <Text style={styles.richToolbarBtnText}>1.</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.richToolbarBtn} onPress={() => handleFormat('h1')}>
                  <Text style={styles.richToolbarBtnText}>H1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.richToolbarBtn} onPress={() => handleFormat('h2')}>
                  <Text style={styles.richToolbarBtnText}>H2</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.richToolbarBtn} onPress={handleUndo}>
                  <Ionicons name="undo" size={14} color="#374151" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.richToolbarBtn} onPress={handleRedo}>
                  <Ionicons name="redo" size={14} color="#374151" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.richToolbarBtn, showFindReplace && styles.richToolbarBtnActive]} 
                  onPress={() => setShowFindReplace(prev => !prev)}
                >
                  <Ionicons name="search" size={14} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* Find and Replace Panel */}
              {showFindReplace && (
                <View style={styles.findReplaceContainer}>
                  <View style={styles.findReplaceRow}>
                    <TextInput
                      style={styles.findReplaceInput}
                      placeholder="Find text..."
                      value={findQuery}
                      onChangeText={setFindQuery}
                      placeholderTextColor={theme.placeholder}
                    />
                    <TextInput
                      style={styles.findReplaceInput}
                      placeholder="Replace with..."
                      value={replaceQuery}
                      onChangeText={setReplaceQuery}
                      placeholderTextColor={theme.placeholder}
                    />
                    <TouchableOpacity style={styles.findReplaceBtn} onPress={handleFindReplace}>
                      <Text style={styles.findReplaceBtnText}>Replace All</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Translation View Toggle Banner */}
          {isViewingTranslation && (
            <View style={{ backgroundColor: isDark ? '#2D234D' : '#F5F3FF', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6D5DFC' }}>Viewing {selectedLanguage} Translation</Text>
              <TouchableOpacity onPress={() => setIsViewingTranslation(false)}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#3B82F6', textDecorationLine: 'underline' }}>Switch to Original</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Document Content View */}
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.paperCard, { backgroundColor: '#FFFFFF' }]}>
              {(isViewingTranslation ? translatedBlocks : blocks).map((b, idx) => {
                const blockStyle: any = {
                  textAlign: b.align || 'left',
                  fontWeight: b.bold ? 'bold' : 'normal',
                  fontStyle: b.italic ? 'italic' : 'normal',
                  textDecorationLine: b.underline ? 'underline' : 'none',
                  color: '#334155',
                };

                if (b.type === 'title') {
                  blockStyle.fontSize = 22;
                  blockStyle.fontWeight = 'bold';
                  blockStyle.textAlign = b.align || 'center';
                  blockStyle.textTransform = 'uppercase';
                  blockStyle.letterSpacing = 1;
                  blockStyle.lineHeight = 28;
                  blockStyle.marginBottom = 24;
                  blockStyle.color = '#0F172A';
                } else if (b.type === 'heading1') {
                  blockStyle.fontSize = 17;
                  blockStyle.fontWeight = 'bold';
                  blockStyle.textTransform = 'uppercase';
                  blockStyle.marginTop = 24;
                  blockStyle.marginBottom = 12;
                  blockStyle.letterSpacing = 0.5;
                  blockStyle.color = '#1E1B4B';
                  blockStyle.borderBottomWidth = 1;
                  blockStyle.borderBottomColor = '#E2E8F0';
                  blockStyle.paddingBottom = 4;
                } else if (b.type === 'heading2') {
                  blockStyle.fontSize = 15;
                  blockStyle.fontWeight = 'bold';
                  blockStyle.marginTop = 18;
                  blockStyle.marginBottom = 8;
                  blockStyle.color = '#1E1B4B';
                } else {
                  blockStyle.fontSize = 15.5;
                  blockStyle.lineHeight = 26;
                  blockStyle.marginBottom = 16;
                }

                const key = b.id;

                const handleLayout = (e: any) => {
                  const searchKey = b.text;
                  sectionOffsets.current[searchKey] = e.nativeEvent.layout.y;
                };

                if (isEditMode) {
                  const isFocused = activeBlockId === b.id;
                  return (
                    <View key={key} style={{ position: 'relative', width: '100%' }} onLayout={handleLayout}>
                      <TextInput
                        style={[
                          blockStyle,
                          {
                            paddingVertical: 4,
                            paddingHorizontal: 8,
                            borderRadius: 4,
                            borderWidth: isFocused ? 1.5 : 1,
                            borderColor: isFocused ? '#6D5DFC' : 'transparent',
                            backgroundColor: isFocused ? 'rgba(109, 93, 252, 0.04)' : 'transparent',
                            minHeight: b.type === 'title' || b.type.startsWith('heading') ? 40 : 50,
                            textAlignVertical: 'top',
                          }
                        ]}
                        multiline
                        value={b.text}
                        onChangeText={(txt) => handleBlockTextChange(b.id, txt)}
                        onFocus={() => setActiveBlockId(b.id)}
                      />
                    </View>
                  );
                }

                // Preview Mode
                if (b.type === 'bullet') {
                  return (
                    <View key={key} style={styles.docIndentedRow} onLayout={handleLayout}>
                      <Text selectable={true} style={[blockStyle, { marginRight: 8 }]}>•</Text>
                      <Text selectable={true} style={[blockStyle, { flex: 1 }]}>{b.text}</Text>
                    </View>
                  );
                }
                if (b.type === 'number') {
                  const numIndex = blocks.slice(0, idx).filter(x => x.type === 'number').length + 1;
                  return (
                    <View key={key} style={styles.docIndentedRow} onLayout={handleLayout}>
                      <Text selectable={true} style={[blockStyle, { marginRight: 8 }]}>{numIndex}.</Text>
                      <Text selectable={true} style={[blockStyle, { flex: 1 }]}>{b.text}</Text>
                    </View>
                  );
                }

                return (
                  <Text key={key} selectable={true} style={blockStyle} onLayout={handleLayout}>
                    {b.text}
                  </Text>
                );
              })}
            </View>
          </ScrollView>
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

      {/* Redesigned Contents Navigation Modal Bottom Sheet */}
      <Modal visible={isContentsOpen} transparent animationType="slide" onRequestClose={() => setIsContentsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsContentsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Table of Contents</Text>
                  <TouchableOpacity onPress={() => setIsContentsOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
                  {blocks.filter(b => b.type === 'heading1' || b.type === 'title').map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        scrollToSection(item.text);
                        setIsContentsOpen(false);
                      }}
                    >
                      <Ionicons name="document-text-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                      <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>{item.text}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Redesigned More Menu Modal Bottom Sheet */}
      <Modal visible={isMoreMenuOpen} transparent animationType="slide" onRequestClose={() => setIsMoreMenuOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsMoreMenuOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface, height: height * 0.75 }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Document Actions</Text>
                  <TouchableOpacity onPress={() => setIsMoreMenuOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
                  {/* 1. Edit */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      setIsEditMode(true);
                    }}
                  >
                    <Ionicons name="create-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>✏️ Edit Draft</Text>
                  </TouchableOpacity>

                  {/* 2. Simplify */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      handleSimplifyAction();
                    }}
                  >
                    <Ionicons name="sparkles" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>✨ Simplify Draft</Text>
                  </TouchableOpacity>

                  {/* 3. Translate */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      setIsLanguageSelectorOpen(true);
                    }}
                  >
                    <Ionicons name="language-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>🌐 Translate Draft</Text>
                  </TouchableOpacity>

                  {/* 4. Add Precedent */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      setIsPrecedentSearchOpen(true);
                    }}
                  >
                    <Ionicons name="ribbon-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>⚖️ Add Precedent</Text>
                  </TouchableOpacity>

                  {/* 5. Table of Contents */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      setTimeout(() => {
                        setIsContentsOpen(true);
                      }, 300);
                    }}
                  >
                    <Ionicons name="list-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>📑 Table of Contents</Text>
                  </TouchableOpacity>

                  {/* 6. Export PDF */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      runWithLoader('Generating PDF with margins & headers...', 1500, () => {
                        Share.share({
                          message: `[AI LEGAL DRAFT EXPORT]\n\n${serializeBlocksToText(blocks)}`,
                          title: editorDocName,
                        }).then(() => {
                          showToast('success', 'PDF Exported', 'Native Share sheet opened successfully.');
                        });
                      });
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>📄 Export as PDF</Text>
                  </TouchableOpacity>

                  {/* 7. Export Word */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      runWithLoader('Exporting Microsoft Word compatible .docx...', 1500, () => {
                        Share.share({
                          message: `[AI LEGAL WORD EXPORT]\n\n${serializeBlocksToText(blocks)}`,
                          title: editorDocName,
                        }).then(() => {
                          showToast('success', 'Word Exported', 'Word Document generated.');
                        });
                      });
                    }}
                  >
                    <Ionicons name="document-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>📝 Export as Word</Text>
                  </TouchableOpacity>

                  {/* 8. Share */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      Share.share({
                        message: serializeBlocksToText(blocks),
                        title: editorDocName,
                      })
                        .then(() => showToast('success', 'Shared', 'Draft shared successfully.'))
                        .catch(() => showToast('error', 'Error', 'Failed to share draft.'));
                    }}
                  >
                    <Ionicons name="share-social-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>📤 Share Draft</Text>
                  </TouchableOpacity>

                  {/* 9. Save to Case */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      runWithLoader('Saving version history to Case details...', 1200, () => {
                        showToast('success', 'Saved to Case', 'Revision v' + currentVersion + '.0 logged under Case details.');
                      });
                    }}
                  >
                    <Ionicons name="save-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>💾 Save to Case</Text>
                  </TouchableOpacity>

                  {/* 10. Print */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      runWithLoader('Preparing document for local print spooler...', 1200, () => {
                        showToast('success', 'Sent to Print', 'Local document print request sent.');
                      });
                    }}
                  >
                    <Ionicons name="print-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>🖨 Print Draft</Text>
                  </TouchableOpacity>

                  {/* 11. Copy */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      Clipboard.setString(serializeBlocksToText(blocks));
                      showToast('success', 'Copied', 'Draft copied to clipboard.');
                    }}
                  >
                    <Ionicons name="copy-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>📋 Copy Draft</Text>
                  </TouchableOpacity>

                  {/* 12. Bookmark */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      setIsBookmarked(prev => {
                        const next = !prev;
                        showToast('success', next ? 'Bookmarked' : 'Unbookmarked', next ? 'Draft pinned to favorites.' : 'Draft removed from favorites.');
                        return next;
                      });
                    }}
                  >
                    <Ionicons name={isBookmarked ? "star" : "star-outline"} size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>⭐ {isBookmarked ? 'Remove Bookmark' : 'Bookmark Draft'}</Text>
                  </TouchableOpacity>

                  {/* 13. Delete */}
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsMoreMenuOpen(false);
                      setIsDeleteConfirmOpen(true);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: '#EF4444' }]}>🗑 Delete Draft</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Simplify Comparison Modal */}
      <Modal visible={isSimplifyCompareOpen} transparent animationType="slide" onRequestClose={() => setIsSimplifyCompareOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsSimplifyCompareOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface, height: height * 0.8 }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Simplify Clauses Comparison</Text>
                  <TouchableOpacity onPress={() => setIsSimplifyCompareOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                
                <View style={{ flex: 1, flexDirection: 'row', gap: 10, paddingVertical: 10 }}>
                  {/* Original Column */}
                  <View style={{ flex: 1, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textSecondary, marginBottom: 6 }}>ORIGINAL DRAFT</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <Text style={{ fontSize: 12, lineHeight: 18, color: theme.textPrimary }}>
                        {serializeBlocksToText(blocks)}
                      </Text>
                    </ScrollView>
                  </View>

                  {/* Simplified Column */}
                  <View style={{ flex: 1, backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#8B5CF6' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#8B5CF6', marginBottom: 6 }}>SIMPLIFIED AI SUGGESTION</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <Text style={{ fontSize: 12, lineHeight: 18, color: theme.textPrimary }}>
                        {simplifiedContent}
                      </Text>
                    </ScrollView>
                  </View>
                </View>

                {/* Comparison Control Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
                  <TouchableOpacity 
                    style={{ flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }} 
                    onPress={() => setIsSimplifyCompareOpen(false)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textSecondary }}>Discard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flex: 1, height: 44, borderRadius: 8, borderWidth: 1.5, borderColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' }} 
                    onPress={() => {
                      runWithLoader('Regenerating simple language variations...', 1000, () => {
                        setSimplifiedContent(prev => prev + '\n\n[Alternative Clause]: Both parties agree to waive default fee interests pending trial resolutions.');
                        showToast('success', 'Regenerated', 'New alternative phrasing created.');
                      });
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#8B5CF6' }}>Regenerate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flex: 1, height: 44, borderRadius: 8, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' }} 
                    onPress={() => {
                      const simplifiedBlocks = parseTextToBlocks(simplifiedContent, selectedTemplate);
                      setBlocks(simplifiedBlocks);
                      pushBlockHistory(simplifiedBlocks);
                      setIsSimplifyCompareOpen(false);
                      showToast('success', 'Simplified Applied', 'Simplified language successfully applied to draft.');
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Accept</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Language Selector Modal */}
      <Modal visible={isLanguageSelectorOpen} transparent animationType="slide" onRequestClose={() => setIsLanguageSelectorOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsLanguageSelectorOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Select Translation Language</Text>
                  <TouchableOpacity onPress={() => setIsLanguageSelectorOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
                  {['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Gujarati', 'Punjabi', 'Bengali'].map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => handleTranslateAction(lang)}
                    >
                      <Ionicons name="language-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                      <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>{lang}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Precedents Database Bottom Sheet */}
      <Modal visible={isPrecedentSearchOpen} transparent animationType="slide" onRequestClose={() => setIsPrecedentSearchOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsPrecedentSearchOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface, height: height * 0.75 }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>AI Precedents Search Database</Text>
                  <TouchableOpacity onPress={() => setIsPrecedentSearchOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24, gap: 12 }}>
                  {MOCK_PRECEDENTS.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={{
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onPress={() => {
                        setSelectedPrecedentIdx(idx);
                        setIsPrecedentOptionsOpen(true);
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#6D5DFC' }}>PRECEDENT LAW</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>{item.score}</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 }}>
                        {item.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                        {item.ratio}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Insert Options Modal Sheet */}
      <Modal visible={isPrecedentOptionsOpen} transparent animationType="fade" onRequestClose={() => setIsPrecedentOptionsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsPrecedentOptionsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Choose Insert Action</Text>
                  <TouchableOpacity onPress={() => setIsPrecedentOptionsOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <View style={{ paddingBottom: 24, gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => handleInsertPrecedent('citation')}
                  >
                    <Ionicons name="link-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>Insert Inline Citation (Active Block)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => handleInsertPrecedent('ratio')}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>Insert Quoted Ratio Paragraph</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => handleInsertPrecedent('ref')}
                  >
                    <Ionicons name="list-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>Append Bibliography Reference</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={isDeleteConfirmOpen} transparent animationType="fade" onRequestClose={() => setIsDeleteConfirmOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsDeleteConfirmOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableWithoutFeedback>
              <View style={{ width: width * 0.8, backgroundColor: theme.surface, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: theme.border }}>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Ionicons name="trash-outline" size={48} color="#EF4444" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', marginBottom: 8 }}>Delete Draft?</Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                  This action cannot be undone. All local and cloud draft records will be permanently removed.
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }} 
                    onPress={() => setIsDeleteConfirmOpen(false)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textSecondary }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flex: 1, height: 44, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }} 
                    onPress={() => {
                      setIsDeleteConfirmOpen(false);
                      setEditorContent('');
                      setBlocks([]);
                      setBlockHistory([]);
                      setBlockHistoryIndex(-1);
                      setStep('GALLERY');
                      showToast('success', 'Draft Deleted Successfully', 'Document has been removed.');
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Full-screen Loading Action Overlay */}
      <Modal visible={isLoadingAction} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.surface, padding: 24, borderRadius: 16, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 10 }}>
            <ActivityIndicator size="large" color="#6D5DFC" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, textAlign: 'center' }}>{loadingText || 'Processing...'}</Text>
          </View>
        </View>
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
    paperCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      paddingHorizontal: 24,
      paddingVertical: 32,
      marginHorizontal: 12,
      marginVertical: 16,
      alignSelf: 'center',
      width: '94%',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 6,
    },
    docTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 24,
      textTransform: 'uppercase',
      letterSpacing: 1,
      lineHeight: 28,
    },
    docSectionHeading: {
      fontSize: 17,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      marginTop: 24,
      marginBottom: 12,
      letterSpacing: 0.5,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      paddingBottom: 4,
    },
    docBodyText: {
      fontSize: 15.5,
      lineHeight: 26,
      marginBottom: 16,
      textAlign: 'justify',
    },
    docIndentedRow: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    floatingContentsBtn: {
      position: 'absolute',
      right: 16,
      bottom: 96,
      backgroundColor: '#6D5DFC',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 8,
      zIndex: 999,
    },
    floatingContentsBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    floatingBottomBar: {
      position: 'absolute',
      bottom: 20,
      left: 16,
      right: 16,
      height: 58,
      borderRadius: 30,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderWidth: 1,
      borderColor: 'rgba(226, 232, 240, 0.8)',
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 8,
      zIndex: 999,
    },
    floatingBottomBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 50,
      height: 50,
    },
    floatingBottomBtnText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#6D5DFC',
      marginTop: 2,
    },
    actionChipRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 16,
      gap: 8,
      alignItems: 'center',
      maxHeight: 52,
    },
    actionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#F3F4F6',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    actionChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#374151',
    },
    richToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: '#F3F4F6',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      gap: 8,
    },
    richToolbarBtn: {
      width: 32,
      height: 32,
      backgroundColor: '#FFFFFF',
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#D1D5DB',
    },
    richToolbarBtnActive: {
      backgroundColor: '#EBF5FF',
      borderColor: '#3B82F6',
    },
    richToolbarBtnText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#374151',
    },
    findReplaceContainer: {
      padding: 12,
      backgroundColor: '#F9FAFB',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      gap: 8,
    },
    findReplaceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    findReplaceInput: {
      flex: 1,
      height: 34,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: 6,
      paddingHorizontal: 8,
      fontSize: 12,
    },
    findReplaceBtn: {
      backgroundColor: '#3B82F6',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    findReplaceBtnText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: 'bold',
    },
  });
}

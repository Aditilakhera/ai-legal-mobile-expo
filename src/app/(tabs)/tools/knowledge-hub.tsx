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
  Share,
  Animated,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { useChat } from '@/hooks/use-chat';
import { useChatStore } from '@/store/chat';
import { useSpeechRecognition, SpeechLanguage } from '@/hooks/use-speech-recognition';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { MarkdownRenderer } from '@/components/ui/documents';

const { width, height } = Dimensions.get('window');

// ─── COMPREHENSIVE DATA ARCHITECTURE & SECTIONS ──────────────────────────

interface SectionNode {
  id: string;
  actTitle: string;
  partTitle: string;
  chapterTitle: string;
  num: string;
  title: string;
  difficulty: string;
  readTime: string;
  progress: string;
  
  // Immersive continuous document layers
  originalBareAct: string;
  plainEnglish: string;
  hindiExplanation: string;
  realExample: string;
  lawyerInterpretation: string;
  importantNotes: string;
  landmarkJudgments: string;
  timelineEvolution: string;
  relatedSections: string;
  faqs: string;
  mcqs: Array<{ question: string; options: string[]; answer: string }>;
  flashcards: string[];

  // Compare & research references
  ipcEquivalent: string;
  bnsEquivalent: string;
  recentAmendments: string;
  suggestedReading: string;
}

interface ChapterNode {
  title: string;
  sections: SectionNode[];
}

interface PartNode {
  title: string;
  chapters: ChapterNode[];
}

interface BookNode {
  id: string;
  title: string;
  coverColor: string;
  accentColor: string; // embossed gold highlights
  textColor: string;
  icon: string;
  edition: string;
  chaptersCount: number;
  sectionsCount: number;
  lastUpdated: string;
  parts: PartNode[];
}

// ─── EXHAUSTIVE DATA STRUCTURE FOR ALL BARE ACTS ─────────────────────────

const LEGAL_BOOKS_DATABASE: BookNode[] = [
  {
    id: 'consti',
    title: 'Constitution of India',
    coverColor: '#1E3A8A', // Deep Navy Blue
    accentColor: '#D4AF37', // Gold
    textColor: '#FFFFFF',
    icon: '🏛',
    edition: '2024 Gold Edition',
    chaptersCount: 22,
    sectionsCount: 395,
    lastUpdated: 'Updated 2 hrs ago',
    parts: [
      {
        title: 'Part I: The Union and its Territory',
        chapters: [
          {
            title: 'Chapter 1: Territory of the Union',
            sections: [
              {
                id: 'consti-1',
                actTitle: 'Constitution of India',
                partTitle: 'Part I: The Union and its Territory',
                chapterTitle: 'Chapter 1: Territory of the Union',
                num: 'Article 1',
                title: 'Name and territory of the Union',
                difficulty: 'Easy',
                readTime: '3 min',
                progress: '100%',
                originalBareAct: '(1) India, that is Bharat, shall be a Union of States. (2) The States and the territories thereof shall be as specified in the First Schedule.',
                plainEnglish: 'India is formally declared as a union consisting of cooperative states and union territories.',
                hindiExplanation: 'इंडिया, अर्थात् भारत, राज्यों का एक संघ होगा। राज्य और उनके राज्य क्षेत्र वे होंगे जो पहली अनुसूची में निर्दिष्ट हैं।',
                realExample: 'No state (e.g. Punjab, Kerala) has the right to secede or break away from the Indian Union.',
                lawyerInterpretation: 'Underlines the indestructible nature of the Indian polity. Reorganization is subject to parliament\'s authority under Article 3.',
                importantNotes: 'Constituent assembly integrated both historical titles "India" and "Bharat".',
                landmarkJudgments: '• State of West Bengal v. Union of India (1962): India is federal with unitary bias.\n• In Re: Berubari Union Case (1960): Boundary adjustments require amendment.',
                timelineEvolution: '1947: Drafting ──► 1948: Reorganization committee ──► 1950: Commencement.',
                relatedSections: 'Article 2, Article 3, Article 4',
                faqs: 'Q: Can a state leave the Union? A: No, secession is constitutionally impossible.',
                mcqs: [{ question: 'What does Article 1 declare India as?', options: ['Federation', 'Union of States', 'Unitary State', 'Confederation'], answer: 'Union of States' }],
                flashcards: ['India = Bharat', 'Indestructible Union', 'Schedules outline UT limits'],
                ipcEquivalent: 'N/A',
                bnsEquivalent: 'N/A',
                recentAmendments: 'Border adjustment for J&K and Ladakh Union Territories (2019).',
                suggestedReading: 'Bare act commentary by Durga Das Basu (DD Basu) on Indian Constitution.',
              },
              {
                id: 'consti-2',
                actTitle: 'Constitution of India',
                partTitle: 'Part I: The Union and its Territory',
                chapterTitle: 'Chapter 1: Territory of the Union',
                num: 'Article 2',
                title: 'Admission or establishment of new States',
                difficulty: 'Medium',
                readTime: '4 min',
                progress: '0%',
                originalBareAct: 'Parliament may by law admit into the Union, or establish, new States on such terms and conditions as it thinks fit.',
                plainEnglish: 'Parliament is given absolute power to add new territories or states into the Indian union.',
                hindiExplanation: 'संसद कानून द्वारा नए राज्यों को संघ में शामिल कर सकती है या उनकी स्थापना कर सकती है जैसा वह उचित समझे।',
                realExample: 'Sikkim was admitted as a state of the Union of India via the 36th Constitutional Amendment.',
                lawyerInterpretation: 'Article 2 deals with admission of states that were not previously part of India, whereas Article 3 deals with reorganization of existing states.',
                importantNotes: 'Allows legislative flexibility to expand the sovereign boundaries of the country.',
                landmarkJudgments: '• RC Poudyal v. Union of India (1993): Upheld terms of Sikkim admission.',
                timelineEvolution: '1975: Sikkim admitted.',
                relatedSections: 'Article 1, Article 3, Article 4',
                faqs: 'Q: Can parliament admit foreign lands? A: Yes, under Article 2.',
                mcqs: [{ question: 'Which amendment admitted Sikkim?', options: ['35th', '36th', '38th', '42nd'], answer: '36th Amendment' }],
                flashcards: ['Article 2 = New States', 'Parliament decides terms', 'Example: Sikkim 1975'],
                ipcEquivalent: 'N/A',
                bnsEquivalent: 'N/A',
                recentAmendments: 'LBA (Land Boundary Agreement) with Bangladesh swapped enclave borders.',
                suggestedReading: 'M.P. Jain on Constitutional Law of India.',
              }
            ]
          }
        ]
      },
      {
        title: 'Part II: Citizenship',
        chapters: [
          {
            title: 'Chapter 1: Rules of Citizenship',
            sections: [
              {
                id: 'consti-5',
                actTitle: 'Constitution of India',
                partTitle: 'Part II: Citizenship',
                chapterTitle: 'Chapter 1: Rules of Citizenship',
                num: 'Article 5',
                title: 'Citizenship at the commencement of the Constitution',
                difficulty: 'Medium',
                readTime: '5 min',
                progress: '0%',
                originalBareAct: 'At the commencement of this Constitution, every person who has his domicile in the territory of India and was born in India shall be a citizen.',
                plainEnglish: 'Citizenship was granted to everyone domiciled in India at the time of constitution adoption, provided they or their parents were born in India.',
                hindiExplanation: 'इस संविधान के प्रारंभ में, प्रत्येक व्यक्ति जिसका भारत के राज्यक्षेत्र में अधिवास है और जो भारत में पैदा हुआ था, वह नागरिक होगा।',
                realExample: 'A person living in Delhi in 1950 whose family had resided there for generations became an automatic citizen.',
                lawyerInterpretation: 'Domicile is essential. Domicile requires both residence and intention to reside permanently.',
                importantNotes: 'Part II is subject to Parliamentary legislation (Citizenship Act 1955).',
                landmarkJudgments: '• Pradeep Jain v. Union of India (1984): India recognizes single domicile.',
                timelineEvolution: '1950: Commencement of citizenship rules.',
                relatedSections: 'Article 6, Article 11',
                faqs: 'Q: Is dual citizenship allowed? A: No, India does not support dual passport holds.',
                mcqs: [{ question: 'Which article deals with citizenship at commencement?', options: ['Article 5', 'Article 9', 'Article 11', 'Article 14'], answer: 'Article 5' }],
                flashcards: ['Domicile is mandatory', 'Commenced 26 Jan 1950', 'Single citizenship only'],
                ipcEquivalent: 'N/A',
                bnsEquivalent: 'N/A',
                recentAmendments: 'Subject to Citizenship Amendment Act (CAA) guidelines.',
                suggestedReading: 'Shukla\'s Constitutional Law of India.',
              }
            ]
          }
        ]
      },
      {
        title: 'Part III: Fundamental Rights',
        chapters: [
          {
            title: 'Chapter 2: Right to Life and Personal Liberty',
            sections: [
              {
                id: 'consti-21',
                actTitle: 'Constitution of India',
                partTitle: 'Part III: Fundamental Rights',
                chapterTitle: 'Chapter 2: Right to Life and Personal Liberty',
                num: 'Article 21',
                title: 'Protection of Life & Personal Liberty',
                difficulty: 'Hard',
                readTime: '6 min',
                progress: '35%',
                originalBareAct: 'No person shall be deprived of his life or personal liberty except according to procedure established by law.',
                plainEnglish: 'No individual can have their life or freedom taken away by the state, unless it strictly follows a fair, just, and reasonable legal procedure.',
                hindiExplanation: 'किसी भी व्यक्ति को उसके जीवन या व्यक्तिगत स्वतंत्रता से कानून द्वारा स्थापित प्रक्रिया के अनुसार ही वंचित किया जाएगा, अन्यथा नहीं।',
                realExample: 'The police cannot arbitrarily lock someone in a cell without a valid statutory arrest process.',
                lawyerInterpretation: 'Now reads as "Due Process". The procedure must be fair, just, and reasonable (Maneka Gandhi test). Scope includes privacy, clean air, livelihood, and speedy trial.',
                importantNotes: 'Applies to both citizens and foreigners; non-suspendsable during Emergency (Article 359).',
                landmarkJudgments: '• Maneka Gandhi v. Union of India (1978): "Fair, just and reasonable" test.\n• K.S. Puttaswamy v. Union of India (2017): Privacy is a fundamental right.',
                timelineEvolution: '1950: Gopalan Case (Narrow) ──► 1978: Maneka Gandhi Case (Wide) ──► 2017: Puttaswamy Case (Privacy)',
                relatedSections: 'Article 14, Article 19, Article 22, Article 32',
                faqs: 'Q: Is privacy protected? A: Yes, under Article 21 since the Puttaswamy ruling.',
                mcqs: [{ question: 'Which case introduced the "fair, just and reasonable" test?', options: ['A.K. Gopalan', 'Maneka Gandhi', 'Kesavananda', 'Minerva Mills'], answer: 'Maneka Gandhi' }],
                flashcards: ['Article 21 applies to non-citizens', 'Non-suspendable during Emergency', 'Includes right to clean air'],
                ipcEquivalent: 'N/A',
                bnsEquivalent: 'N/A',
                recentAmendments: 'Article 21A (Education) added via 86th Amendment Act 2002.',
                suggestedReading: 'Constitutional Law of India by H.M. Seervai.',
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'bns',
    title: 'Bharatiya Nyaya Sanhita (BNS)',
    coverColor: '#800020', // Burgundy
    accentColor: '#D4AF37', // Gold
    textColor: '#FFFFFF',
    icon: '⚖️',
    edition: '2024 Flagship Edition',
    chaptersCount: 20,
    sectionsCount: 358,
    lastUpdated: 'Updated 1 day ago',
    parts: [
      {
        title: 'Chapter VI: Offences Affecting the Human Body',
        chapters: [
          {
            title: 'Offences Affecting Life',
            sections: [
              {
                id: 'bns-101',
                actTitle: 'Bharatiya Nyaya Sanhita (BNS)',
                partTitle: 'Chapter VI: Offences Affecting the Human Body',
                chapterTitle: 'Offences Affecting Life',
                num: 'Section 101',
                title: 'Punishment for Murder',
                difficulty: 'Hard',
                readTime: '8 min',
                progress: '70%',
                originalBareAct: 'Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.',
                plainEnglish: 'Any person who causes the death of another with the intention of causing death or bodily injury likely to cause death will be prosecuted under murder rules.',
                hindiExplanation: 'जो कोई भी हत्या करेगा उसे मृत्युदंड या आजीवन कारावास की सजा दी जाएगी, और वह जुर्माने के लिए भी उत्तरदायी होगा।',
                realExample: 'A shoots B with intent to kill him. B dies in consequence. A commits murder.',
                lawyerInterpretation: 'Transfers criminal definitions from Section 300/302 IPC. Retains the "rarest of rare" doctrine for capital punishment.',
                importantNotes: 'Attempt to murder is covered under Section 109 BNS. Sentence fine is mandatory.',
                landmarkJudgments: '• Bachan Singh v. State of Punjab (1980): Capital execution restricted to rarest of rare.\n• Machhi Singh v. State of Punjab (1983): Five-step test for death penalty.',
                timelineEvolution: '1860: IPC 302 ──► 1980: Bachan Singh ──► 2023: BNS 101 transition.',
                relatedSections: 'Section 100 BNS (Culpable Homicide), Section 103 BNS (Exceptions)',
                faqs: 'Q: What is the new section for murder? A: Section 101 BNS (previously Section 302 IPC).',
                mcqs: [{ question: 'Which section of BNS provides punishment for murder?', options: ['Section 302', 'Section 101', 'Section 100', 'Section 99'], answer: 'Section 101' }],
                flashcards: ['S.101 BNS = Murder', 'Replaces S.302 IPC', 'Fine is mandatory along with sentence'],
                ipcEquivalent: 'Section 302 IPC',
                bnsEquivalent: 'Section 101 BNS',
                recentAmendments: 'Enacted in 2023, operational July 2024.',
                suggestedReading: 'Criminal Law Bare Act commentary by Ratanlal & Dhirajlal.',
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'bnss',
    title: 'Bharatiya Nagarik Suraksha Sanhita',
    coverColor: '#0F5132', // Emerald Green
    accentColor: '#D4AF37', // Gold
    textColor: '#FFFFFF',
    icon: '📗',
    edition: '2024 Edition',
    chaptersCount: 38,
    sectionsCount: 531,
    lastUpdated: 'Updated 2 days ago',
    parts: []
  },
  {
    id: 'bsa',
    title: 'Bharatiya Sakshya Adhiniyam',
    coverColor: '#5C4033', // Brown Leather
    accentColor: '#D4AF37', // Gold
    textColor: '#FFFFFF',
    icon: '📙',
    edition: '2024 Edition',
    chaptersCount: 11,
    sectionsCount: 170,
    lastUpdated: 'Updated 4 days ago',
    parts: []
  },
  {
    id: 'contract',
    title: 'Indian Contract Act',
    coverColor: '#0B3C5D', // Dark Blue
    accentColor: '#D4AF37', // Gold
    textColor: '#FFFFFF',
    icon: '📒',
    edition: '2024 Edition',
    chaptersCount: 11,
    sectionsCount: 238,
    lastUpdated: 'Updated 5 days ago',
    parts: []
  },
  {
    id: 'cpc',
    title: 'Code of Civil Procedure',
    coverColor: '#0D5C75', // Dark Teal
    accentColor: '#D4AF37', // Gold
    textColor: '#FFFFFF',
    icon: '📓',
    edition: '2024 Edition',
    chaptersCount: 11,
    sectionsCount: 158,
    lastUpdated: 'Updated 1 week ago',
    parts: []
  }
];

const PRECEDENT_JUDGMENTS_DATABASE = [
  {
    id: 'puttaswamy',
    category: 'Constitution Bench',
    title: 'K.S. Puttaswamy v. Union of India (2017)',
    court: 'Supreme Court of India',
    bench: '9-Judge Bench',
    citation: '(2017) 10 SCC 1',
    facts: 'Challenge to the Aadhaar biometric identification system claiming violation of bodily and informational privacy.',
    issues: 'Whether Right to Privacy is a fundamental right under Part III of the Constitution of India.',
    arguments: 'Petitioners argued privacy is essential to dignity. Government argued privacy is only a common law right.',
    reasoning: 'Privacy is an essential ingredient of liberty, dignity, and autonomy guaranteed under Article 21, 14, and 19.',
    ratio: 'Right to privacy is a fundamental right under Article 21 of the Constitution.',
    obiter: 'Privacy includes informational privacy and bodily autonomy.',
    decision: 'Unanimous ruling declaring Aadhaar scheme must pass proportionality standards.',
    importance: 'Established constitutional protection for privacy, informational data protection, and individual choices.',
    timeline: '2012: Petition Filed ──► 2015: Referred to 9-judges ──► 2017: Final Verdict',
    relatedSections: 'Article 21, Article 19, Article 14',
  }
];

const KNOWLEDGE_SUGGESTIONS_SHEET = {
  'Research & Simplification': [
    'Explain this section in plain English',
    'Translate to Hindi (हिंदी अनुवाद)',
    'Give practical real life examples',
    'What are the essential elements/ingredients?',
  ],
  'BNS vs IPC Comparison': [
    'Compare BNS Section 101 with IPC Section 302',
    'List all new BNS code changes',
    'What did BNS simplify in criminal procedures?',
  ],
  'Litigation Prep': [
    'Generate courtroom defense arguments',
    'Prepare cross examination questions',
    'Suggest landmark precedents for this',
    'Draft a legal notice draft',
  ],
  'Learning & Revision': [
    'Generate 5 study MCQs',
    'Create one-minute revision flashcards',
    'Suggest interview questions for law students',
  ],
};

// Helper functions outside component
const parseFollowUpSuggestions = (text: string) => {
  let mainText = text;
  let suggestions: string[] = [];
  let disclaimer = '';

  const discIdx = text.indexOf('--- DISCLAIMER ---');
  if (discIdx !== -1) {
    mainText = text.substring(0, discIdx).trim();
    disclaimer = text.substring(discIdx + 18).trim();
  }

  const sugIdx = mainText.indexOf('--- SUGGESTIONS ---');
  if (sugIdx !== -1) {
    const sugPart = mainText.substring(sugIdx + 19).trim();
    mainText = mainText.substring(0, sugIdx).trim();
    suggestions = sugPart
      .split('\n')
      .map((s) => s.replace(/^[•\-*\s✓\d.]+\s*/, '').trim())
      .filter((s) => s.length > 0);
  }

  if (suggestions.length === 0) {
    const match = mainText.match(/(?:suggested next actions|next actions|suggestions):([\s\S]+)$/i);
    if (match) {
      const listText = match[1].trim();
      mainText = mainText.replace(match[0], '').trim();
      suggestions = listText
        .split('\n')
        .map((s) => s.replace(/^[•\-*\s✓\d.]+\s*/, '').trim())
        .filter((s) => s.length > 0);
    }
  }

  return { cleanedText: mainText, suggestions, disclaimer };
};

const shortenSuggestion = (text: string) => {
  if (text.length > 25) return text.substring(0, 22) + '...';
  return text;
};

// ─── COMPONENT ────────────────────────────────────────────────────────────

export default function KnowledgeHubScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles: any = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

  // Screen workflow state:
  // - 'BOOKSHELF' (Landing page listing book covers)
  // - 'TOC' (Table of Contents index of the selected book)
  // - 'READER' (Dedicated Kindle reader workspace)
  const [viewState, setViewState] = useState<'BOOKSHELF' | 'TOC' | 'READER'>('BOOKSHELF');

  // Unified Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Book Selection states
  const [selectedBook, setSelectedBook] = useState<BookNode>(LEGAL_BOOKS_DATABASE[0]);
  const [activeSection, setActiveSection] = useState<SectionNode>(LEGAL_BOOKS_DATABASE[0].parts[1].chapters[0].sections[0]);

  // Kindle reader styles
  const [readingTheme, setReadingTheme] = useState<'light' | 'dark' | 'sepia'>('sepia');
  const [fontSize, setFontSize] = useState<number>(15);
  const [lineHeight, setLineHeight] = useState<number>(24);
  const [fontFamily, setFontFamily] = useState<'System' | 'serif' | 'monospace'>('serif');
  const [bookmarks, setBookmarks] = useState<string[]>(['consti-21']);
  const [notes, setNotes] = useState<Record<string, string>>({ 'consti-21': 'Crucial for constitutional remedies.' });
  const [activeNoteText, setActiveNoteText] = useState('');
  const [isNoteInputOpen, setIsNoteInputOpen] = useState(false);

  // TOC Navigation Expandable Parts
  const [expandedTocs, setExpandedTocs] = useState<Record<string, boolean>>({
    'Part III: Fundamental Rights': true,
  });

  const toggleTocChapter = (key: string) => {
    setExpandedTocs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── AI Copilot State ───────────────────────────────────────────────────
  const {
    sessions,
    activeSessionId,
    activeSession,
    sending: isAiThinking,
    setActiveSessionId,
    startNewSession,
    deleteChatSession,
    renameChatSession,
    dispatchMessageStream,
    cancelMessageStream,
  } = useChat('legal_knowledge_hub');

  const [selectedLanguage, setSelectedLanguage] = useState<SpeechLanguage>('en');
  const {
    isRecording,
    isTranscribing,
    partialText,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useSpeechRecognition((transcribedText) => {
    if (transcribedText) {
      setChatInput((prev) => (prev ? prev + ' ' + transcribedText : transcribedText));
    }
  });

  const {
    attachments,
    isBottomSheetVisible,
    isCameraVisible,
    showAttachmentOptions,
    hideAttachmentOptions,
    hideCamera,
    handleRemoveAttachment,
    clearAttachments,
    handleSelectOption,
    handleCameraConfirm,
  } = useAttachmentHandler();

  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const copilotScrollRef = useRef<ScrollView>(null);
  const [chatInput, setChatInput] = useState('');
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (contentSize.height > layoutMeasurement.height && distanceFromBottom > 150) {
      setShowScrollToLatest(true);
    } else {
      setShowScrollToLatest(false);
    }
  };

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchChatQuery, setSearchChatQuery] = useState('');
  const [isSuggestionsSheetOpen, setIsSuggestionsSheetOpen] = useState(false);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Record<string, boolean>>({});

  const toggleExpandSuggestions = (msgId: string) => {
    setExpandedSuggestions((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const [thinkingDotCount, setThinkingDotCount] = useState(1);
  useEffect(() => {
    let interval: any;
    if (isAiThinking) {
      interval = setInterval(() => {
        setThinkingDotCount((prev) => (prev % 3) + 1);
      }, 400);
    } else {
      setThinkingDotCount(1);
    }
    return () => clearInterval(interval);
  }, [isAiThinking]);

  const getThinkingDotsText = () => '.'.repeat(thinkingDotCount);

  useEffect(() => {
    if (isRecording && partialText) {
      setChatInput(partialText);
    }
  }, [partialText, isRecording]);

  useEffect(() => {
    setTimeout(() => {
      copilotScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, [activeSession?.messages, isAiAssistantOpen]);

  const filteredChatSessions = useMemo(() => {
    if (!searchChatQuery.trim()) return sessions;
    return sessions.filter((s) =>
      s.title.toLowerCase().includes(searchChatQuery.toLowerCase())
    );
  }, [sessions, searchChatQuery]);

  const handleOpenRename = (id: string, currentTitle: string) => {
    setRenameSessionId(id);
    setRenameValue(currentTitle);
    setIsRenameDialogOpen(true);
  };

  const handleConfirmRename = async () => {
    if (renameSessionId && renameValue.trim()) {
      await renameChatSession(renameSessionId, renameValue.trim());
      setIsRenameDialogOpen(false);
      setRenameSessionId(null);
      setRenameValue('');
      showToast('success', 'Session Renamed', 'Conversation title updated successfully.');
    }
  };

  const handleDeletePress = (id: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteChatSession(id);
            showToast('success', 'Conversation Deleted', 'Session removed.');
          },
        },
      ]
    );
  };

  const handleClearConversation = () => {
    if (activeSessionId) {
      useChatStore.getState().updateSession(activeSessionId, { messages: [] });
      showToast('success', 'Conversation Cleared', 'Active chat log cleared.');
    }
  };

  const handleClearPress = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => { handleClearConversation(); } },
      ]
    );
  };

  const handleNewChat = () => {
    startNewSession('New Knowledge Hub Session', 'legal_knowledge_hub');
    showToast('success', 'New Session Created', 'Copilot ready.');
  };

  const handleExportChat = () => {
    if (!activeSession || !activeSession.messages || activeSession.messages.length === 0) {
      showToast('error', 'No Messages', 'There is no conversation to export.');
      return;
    }
    const formatted = activeSession.messages
      .map((m) => `[${m.role === 'user' ? 'Advocate' : 'Knowledge Hub Copilot'}]:\n${m.content}\n`)
      .join('\n────────────────────────\n\n');
    Share.share({ title: 'Export Legal Hub Research', message: formatted })
      .then((res) => {
        if (res.action === Share.sharedAction) {
          showToast('success', 'Research Exported', 'Case notes saved.');
        }
      })
      .catch((err) => console.warn(err));
  };

  const handleSendChat = async (textOverride?: string) => {
    const textToSend = textOverride || chatInput;
    if (!textToSend.trim() && attachments.length === 0) return;

    let finalPrompt = textToSend.trim();
    if (activeSection) {
      finalPrompt = `[Context Open: ${activeSection.num} - ${activeSection.title}]\n\n${finalPrompt}`;
    }

    setChatInput('');
    Keyboard.dismiss();

    try {
      await dispatchMessageStream(
        finalPrompt,
        'legal_knowledge_hub',
        attachments,
        undefined,
        activeSection ? activeSection.id : undefined
      );
      clearAttachments();
    } catch (err) {
      console.warn('[KNOWLEDGE HUB COPILOT SEND ERROR]', err);
    }
  };

  // ─── ACTION HANDLERS ─────────────────────────────────────────────────────

  // Dynamic generator for leaf nodes to support comprehensive TOC selection without crashes
  const getOrGenerateSection = (book: BookNode, partTitle: string, chapterTitle: string, id: string, name: string): SectionNode => {
    // Check if it already exists in database
    for (const p of book.parts) {
      for (const c of p.chapters) {
        for (const s of c.sections) {
          if (s.id === id || s.num.toLowerCase() === name.toLowerCase()) {
            return s;
          }
        }
      }
    }

    // Otherwise, generate a rich mock content following the 12-layer continuous document flow
    return {
      id,
      actTitle: book.title,
      partTitle,
      chapterTitle,
      num: name,
      title: `General Statutory Provision of ${name}`,
      difficulty: 'Medium',
      readTime: '5 min',
      progress: '0%',
      originalBareAct: `This represents the official bare act text of ${name} under the ${book.title}. All statutory clauses and explanations compile within the RAG databases.`,
      plainEnglish: `Under the ${book.title}, this section lays down the basic procedural framework and enforcement rules matching legal compliance guidelines.`,
      hindiExplanation: `यह ${book.title} के तहत ${name} के मूल कानूनी प्रावधानों का आधिकारिक हिंदी अनुवाद और व्याख्या है।`,
      realExample: `A legal professional referencing ${name} during litigation to establish procedural compliance.`,
      lawyerInterpretation: `Advocates should ensure strict alignment with the statutory exceptions outlined under this section to prevent summary dismissal.`,
      importantNotes: `Always read this section in combination with related procedural rules of CPC/CrPC.`,
      landmarkJudgments: `• Landmark Case Law v. State (2022): Upheld the general application of this statutory section.`,
      timelineEvolution: `Enacted as part of the primary schedule code.`,
      relatedSections: `Section 4, Section 9, Section 12`,
      faqs: `Q: How is this provision enforced? A: Through direct application in jurisdictional civil or criminal courts.`,
      mcqs: [{ question: `Which act governs ${name}?`, options: ['CPC', 'BNS', 'Constitution', 'General Statutes'], answer: 'General Statutes' }],
      flashcards: [`Key compliance node for ${name}`, 'Mandatory filing checklist attachment'],
      ipcEquivalent: 'Section 420 IPC (cheating equivalents)',
      bnsEquivalent: 'Section 318 BNS (cheating equivalents)',
      recentAmendments: 'Consolidated in recent statutory code revisions.',
      suggestedReading: 'Standard bare act commentaries.',
    };
  };

  const handleBookTap = (book: BookNode) => {
    setSelectedBook(book);
    
    // Ensure all books have at least some parts and Chapters to prevent empty TOC screens
    if (!book.parts || book.parts.length === 0) {
      // Inject comprehensive mock parts/chapters to represent the COMPLETE hierarchy
      book.parts = [
        {
          title: 'Part I: Preliminary Codes',
          chapters: [
            {
              title: 'Chapter 1: Definitions & Extent',
              sections: [
                getOrGenerateSection(book, 'Part I: Preliminary Codes', 'Chapter 1: Definitions & Extent', `${book.id}-s1`, 'Section 1'),
                getOrGenerateSection(book, 'Part I: Preliminary Codes', 'Chapter 1: Definitions & Extent', `${book.id}-s2`, 'Section 2'),
              ]
            }
          ]
        },
        {
          title: 'Part II: General Exceptions & Powers',
          chapters: [
            {
              title: 'Chapter 2: Special Provisions',
              sections: [
                getOrGenerateSection(book, 'Part II: General Exceptions & Powers', 'Chapter 2: Special Provisions', `${book.id}-s10`, 'Section 10'),
                getOrGenerateSection(book, 'Part II: General Exceptions & Powers', 'Chapter 2: Special Provisions', `${book.id}-s11`, 'Section 11'),
              ]
            }
          ]
        }
      ];
    }

    setViewState('TOC');
  };

  const handleSectionSelect = (section: SectionNode) => {
    setActiveSection(section);
    setViewState('READER');
  };

  const toggleBookmark = (id: string) => {
    if (bookmarks.includes(id)) {
      setBookmarks(bookmarks.filter((b) => b !== id));
      showToast('info', 'Bookmark Removed', 'Section removed from bookmarks.');
    } else {
      setBookmarks([...bookmarks, id]);
      showToast('success', 'Bookmark Saved', 'Section added to bookmarks.');
    }
  };

  const handleSaveNote = () => {
    if (activeSection) {
      setNotes({ ...notes, [activeSection.id]: activeNoteText });
      setIsNoteInputOpen(false);
      showToast('success', 'Margin Note Saved', 'Sticky note pinned to Kindle paper.');
    }
  };

  // Direct Search Routing Handler
  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase().trim();

    // Check direct matching for "article 21" or "section 101 bns"
    let foundSection: SectionNode | null = null;
    let matchedBook: BookNode | null = null;

    for (const book of LEGAL_BOOKS_DATABASE) {
      // Auto-populate tree first to ensure search target can be generated if missing
      handleBookTap(book);
      for (const part of book.parts) {
        for (const chap of part.chapters) {
          for (const sec of chap.sections) {
            if (
              sec.num.toLowerCase() === query ||
              `${sec.num.toLowerCase()} ${book.id}`.includes(query) ||
              query.includes(sec.num.toLowerCase())
            ) {
              foundSection = sec;
              matchedBook = book;
              break;
            }
          }
          if (foundSection) break;
        }
        if (foundSection) break;
      }
      if (foundSection) break;
    }

    if (foundSection && matchedBook) {
      setSelectedBook(matchedBook);
      setActiveSection(foundSection);
      setViewState('READER');
      showToast('success', 'Direct Match Found', `Routed directly to ${foundSection.num}.`);
    } else {
      showToast('info', 'No direct route', 'No exact Article/Section matched. Please check spelling or select from Bookshelf.');
    }
  };

  const handleQuickAiBoxChip = (action: string) => {
    let promptText = '';
    switch (action) {
      case 'Explain Simply':
        promptText = 'Explain this section in extremely simple terms for a common citizen.';
        break;
      case 'Explain Like Judge':
        promptText = 'Explain this section with judicial reasoning and obiter frameworks.';
        break;
      case 'Explain Like Student':
        promptText = 'Explain this section with clean study syllabus summaries.';
        break;
      case 'Explain Like Teacher':
        promptText = 'Explain this section like a law school teacher with simple analogies.';
        break;
      case 'Explain in Hindi':
        promptText = 'Explain this section in clear Hindi translation (हिंदी स्पष्टीकरण).';
        break;
      case 'Explain in English':
        promptText = 'Explain this section in formal English statutory definitions.';
        break;
      case 'Generate Notes':
        promptText = 'Generate brief bullet revision chapter notes for my law exam study.';
        break;
      case 'Generate Flashcards':
        promptText = 'Generate 3 mnemonic-based flashcards based on this provision.';
        break;
      case 'Generate MCQs':
        promptText = 'Generate 3 multiple choice questions based on this legal provision.';
        break;
      case 'Generate Viva Questions':
        promptText = 'Create 5 interview viva questions based on this bare act.';
        break;
      case 'Generate Judiciary Questions':
        promptText = 'Suggest descriptive essay questions for state judiciary exams.';
        break;
      case 'Generate UPSC Questions':
        promptText = 'Suggest civil service mains analysis questions for this law.';
        break;
      case 'Generate CLAT Questions':
        promptText = 'Generate passage-based legal reasoning questions for CLAT preparation.';
        break;
      case 'Generate Case Analysis':
        promptText = 'Summarize key cases and ratios associated with this specific law.';
        break;
      case 'Compare Sections':
        promptText = 'Compare this section side by side with the previous historical IPC version.';
        break;
      case 'Explain Landmark Cases':
        promptText = 'Show landmark case details, arguments, and outcomes for this Article.';
        break;
      case 'Create Flowchart':
        promptText = 'Draft a structured flowchart representing procedural steps.';
        break;
      case 'Create Mind Map':
        promptText = 'List structured nodes and relationships to build a mind map.';
        break;
      case 'Summarize':
        promptText = 'Provide a brief one-minute summary of this bare act.';
        break;
      case 'Generate Revision Notes':
        promptText = 'Generate revision flashcards and summaries for quick recall.';
        break;
      default:
        return;
    }
    setIsAiAssistantOpen(true);
    setTimeout(() => {
      handleSendChat(promptText);
    }, 400);
  };

  const getReaderThemeColors = () => {
    switch (readingTheme) {
      case 'dark':
        return { bg: '#121212', text: '#E5E5E5', surface: '#222222', border: '#333333' };
      case 'sepia':
        return { bg: '#F4ECD8', text: '#5B4031', surface: '#EADFC9', border: '#DFD4BE' };
      default:
        return { bg: '#FAFAFA', text: '#1E293B', surface: '#F1F5F9', border: '#E2E8F0' };
    }
  };

  const readerThemeColors = getReaderThemeColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      {/* ─── BAR HEADER ─── */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity
          onPress={() => {
            if (viewState === 'READER') setViewState('TOC');
            else if (viewState === 'TOC') setViewState('BOOKSHELF');
            else router.back();
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>📚 AI Legal Research OS</Text>
          <Text style={styles.headerSubtitle}>Read. Understand. Research. Master the Law.</Text>
        </View>

        <TouchableOpacity
          style={[styles.startCopilotBtn, { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.08)' : 'rgba(2, 132, 199, 0.15)', marginRight: 16 }]}
          onPress={() => setIsAiAssistantOpen(true)}
        >
          <Ionicons name="sparkles" size={13} color="#0284C7" style={{ marginRight: 4 }} />
          <Text style={styles.startCopilotText}>AI COPILOT</Text>
        </TouchableOpacity>
      </View>

      {/* Global Google-like Search Bar */}
      <View style={[styles.searchBarContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={{ marginLeft: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Search Article 21, Section 101 BNS, etc. (Press enter to route)"
          placeholderTextColor={theme.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
          </TouchableOpacity>
        )}
      </View>

      {/* ─── TAB 1: THE PREMIUM HARDCOVER BOOKSHELF LIBRARY ─── */}
      {viewState === 'BOOKSHELF' && (
        <ScrollView contentContainerStyle={styles.shelfScrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={{ marginBottom: 18 }}>
            <Text style={[styles.shelfSectionHeading, { color: theme.textPrimary }]}>Immersive Legal Bookshelf</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>Double-spine gold hardcover library. Tap to open full index.</Text>
          </View>

          <View style={styles.bookshelfGrid}>
            {LEGAL_BOOKS_DATABASE.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={[styles.bookCoverCard, { backgroundColor: book.coverColor }]}
                onPress={() => handleBookTap(book)}
              >
                {/* Embedded Bookmark flag if active */}
                {bookmarks.some(b => b.includes(book.id)) && (
                  <View style={styles.coverBookmarkFlag}>
                    <Ionicons name="bookmark" size={15} color={book.accentColor} />
                  </View>
                )}

                <View>
                  <Text style={styles.bookCoverIcon}>{book.icon}</Text>
                  <Text style={[styles.bookCoverTitle, { color: book.textColor }]}>{book.title}</Text>
                  <Text style={[styles.bookCoverEdition, { color: book.textColor }]}>{book.edition}</Text>
                </View>

                <View>
                  <Text style={[styles.bookCoverMetadata, { color: book.textColor }]}>• {book.chaptersCount} Chapters</Text>
                  <Text style={[styles.bookCoverMetadata, { color: book.textColor }]}>• {book.sectionsCount} Sections</Text>
                  <Text style={[styles.bookCoverMetadata, { color: book.textColor }]}>• {book.lastUpdated}</Text>
                </View>

                {/* Hardcover Spines Effects */}
                <View style={styles.bookCoverLeftSpine} />
                <View style={[styles.bookCoverGoldAccent, { backgroundColor: book.accentColor }]} />
                <Text style={styles.bookPublisherBadge}>AI RESEARCH OS</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ─── TAB 2: TABLE OF CONTENTS (TOC) INDEX ─── */}
      {viewState === 'TOC' && (
        <ScrollView contentContainerStyle={styles.tocScrollContent} showsVerticalScrollIndicator={false}>
          
          <TouchableOpacity style={styles.backToShelfBtn} onPress={() => setViewState('BOOKSHELF')}>
            <Ionicons name="library-outline" size={15} color="#0284C7" />
            <Text style={styles.backToShelfText}>Back to Bookshelf</Text>
          </TouchableOpacity>

          <Text style={[styles.tocMainTitle, { color: theme.textPrimary }]}>{selectedBook.title}</Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 20 }}>Table of Contents index</Text>

          <View style={[styles.tocMainTree, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {selectedBook.parts.map((part, pIdx) => {
              const isPartOpen = !!expandedTocs[part.title];
              return (
                <View key={pIdx} style={{ marginBottom: 16 }}>
                  <TouchableOpacity
                    style={styles.tocChapterHeader}
                    onPress={() => toggleTocChapter(part.title)}
                  >
                    <Ionicons name={isPartOpen ? 'chevron-down' : 'chevron-forward'} size={16} color="#0284C7" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0284C7', flex: 1 }}>{part.title}</Text>
                  </TouchableOpacity>

                  {isPartOpen && part.chapters.map((chap, cIdx) => (
                    <View key={cIdx} style={{ marginLeft: 16, marginTop: 8 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }}>{chap.title}</Text>
                      {chap.sections.map((sec) => (
                        <TouchableOpacity
                          key={sec.id}
                          style={styles.tocLeafItem}
                          onPress={() => handleSectionSelect(sec)}
                        >
                          <Ionicons name="document-text-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 12.5, color: theme.textSecondary, flex: 1 }}>
                            {sec.num} - {sec.title}
                          </Text>
                          <Ionicons name="arrow-forward" size={12} color="#0284C7" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ─── TAB 3: DEDICATED KINDLE READER WORKSPACE ─── */}
      {viewState === 'READER' && (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1, backgroundColor: readerThemeColors.bg }}
            contentContainerStyle={styles.readerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Breadcrumb row */}
            <View style={[styles.breadcrumbRow, { borderBottomColor: readerThemeColors.border }]}>
              <Text style={styles.breadcrumbText}>
                {activeSection.actTitle}  &gt;  {activeSection.partTitle}  &gt;  <Text style={{ fontWeight: '800', color: '#0284C7' }}>{activeSection.num}</Text>
              </Text>
            </View>

            {/* Reading Options Config Box */}
            <View style={[styles.readerConfigBox, { backgroundColor: readerThemeColors.surface, borderColor: readerThemeColors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 9, color: theme.textSecondary }}>DIFFICULTY</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444' }}>{activeSection.difficulty}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 9, color: theme.textSecondary }}>READ TIME</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: readerThemeColors.text }}>{activeSection.readTime}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => setIsNoteInputOpen(true)}>
                    <Ionicons name="create-outline" size={18} color={readerThemeColors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleBookmark(activeSection.id)}>
                    <Ionicons
                      name={bookmarks.includes(activeSection.id) ? 'bookmark' : 'bookmark-outline'}
                      size={18}
                      color="#0284C7"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Theme selectors */}
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                {[
                  { id: 'light', bg: '#FFFFFF', tc: '#1E293B', label: 'LIGHT' },
                  { id: 'dark', bg: '#121212', tc: '#E5E5E5', label: 'DARK' },
                  { id: 'sepia', bg: '#F4ECD8', tc: '#5B4031', label: 'SEPIA' },
                ].map((th) => (
                  <TouchableOpacity
                    key={th.id}
                    style={[
                      styles.configThemeBtn,
                      {
                        backgroundColor: th.bg,
                        borderWidth: readingTheme === th.id ? 2 : 1,
                        borderColor: readingTheme === th.id ? '#0284C7' : theme.border,
                      },
                    ]}
                    onPress={() => setReadingTheme(th.id as any)}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: th.tc }}>{th.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Font controls */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {(['System', 'serif', 'monospace'] as const).map((font) => (
                    <TouchableOpacity
                      key={font}
                      style={[styles.fontBtn, fontFamily === font && { borderColor: '#0284C7' }]}
                      onPress={() => setFontFamily(font)}
                    >
                      <Text style={{ fontSize: 10, color: readerThemeColors.text }}>{font}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity style={styles.fontAdjustBtn} onPress={() => setFontSize(Math.max(10, fontSize - 2))}>
                    <Text style={{ color: readerThemeColors.text }}>A-</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: readerThemeColors.text }}>{fontSize}px</Text>
                  <TouchableOpacity style={styles.fontAdjustBtn} onPress={() => setFontSize(Math.min(24, fontSize + 2))}>
                    <Text style={{ color: readerThemeColors.text }}>A+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Immersive Continuous Book page */}
            <View style={{ paddingHorizontal: 4, marginTop: 10 }}>
              
              <Text style={[styles.bookHeaderTitle, { color: readerThemeColors.text, fontFamily: fontFamily === 'serif' ? 'Georgia' : fontFamily === 'monospace' ? 'Courier' : undefined }]}>
                {activeSection.num} — {activeSection.title}
              </Text>

              {/* 1 Original Bare Act */}
              <View style={styles.seamlessTextSection}>
                <Text style={styles.seamlessSectionLabel}>1. ORIGINAL BARE ACT TEXT</Text>
                <Text style={[styles.seamlessBodyText, { fontSize, lineHeight, color: readerThemeColors.text, fontFamily: fontFamily === 'serif' ? 'Georgia' : fontFamily === 'monospace' ? 'Courier' : undefined }]}>
                  {activeSection.originalBareAct}
                </Text>
              </View>

              {/* 2 Plain English */}
              <View style={styles.seamlessTextSection}>
                <Text style={[styles.seamlessSectionLabel, { color: '#10B981' }]}>2. PLAIN ENGLISH EXPLANATION</Text>
                <Text style={[styles.seamlessBodyText, { fontSize, lineHeight, color: readerThemeColors.text, fontFamily: fontFamily === 'serif' ? 'Georgia' : fontFamily === 'monospace' ? 'Courier' : undefined }]}>
                  {activeSection.plainEnglish}
                </Text>
              </View>

              {/* 3 Hindi Explanation */}
              <View style={styles.seamlessTextSection}>
                <Text style={[styles.seamlessSectionLabel, { color: '#8A5CF5' }]}>3. हिंदी व्याख्या (HINDI)</Text>
                <Text style={[styles.seamlessBodyText, { fontSize, lineHeight, color: readerThemeColors.text, fontFamily: fontFamily === 'serif' ? 'Georgia' : fontFamily === 'monospace' ? 'Courier' : undefined }]}>
                  {activeSection.hindiExplanation}
                </Text>
              </View>

              {/* 4 Real Example */}
              <View style={styles.seamlessTextSection}>
                <Text style={[styles.seamlessSectionLabel, { color: '#D97706' }]}>4. REAL-LIFE ILLUSTRATION</Text>
                <Text style={[styles.seamlessBodyText, { fontSize, lineHeight, color: readerThemeColors.text, fontFamily: fontFamily === 'serif' ? 'Georgia' : fontFamily === 'monospace' ? 'Courier' : undefined }]}>
                  {activeSection.realExample}
                </Text>
              </View>

              {/* 5 Lawyer Interpretation */}
              <View style={styles.seamlessTextSection}>
                <Text style={[styles.seamlessSectionLabel, { color: '#6366F1' }]}>5. PRACTICAL ADVOCACY INTERPRETATION</Text>
                <Text style={[styles.seamlessBodyText, { fontSize, lineHeight, color: readerThemeColors.text, fontFamily: fontFamily === 'serif' ? 'Georgia' : fontFamily === 'monospace' ? 'Courier' : undefined }]}>
                  {activeSection.lawyerInterpretation}
                </Text>
              </View>

              {/* 6 Important Notes */}
              <View style={styles.seamlessTextSection}>
                <Text style={[styles.seamlessSectionLabel, { color: '#4B5563' }]}>6. CRITICAL CASE NOTES</Text>
                <Text style={[styles.seamlessBodyText, { fontSize, lineHeight, color: readerThemeColors.text, fontFamily: fontFamily === 'serif' ? 'Georgia' : fontFamily === 'monospace' ? 'Courier' : undefined }]}>
                  {activeSection.importantNotes}
                </Text>
              </View>

              {/* 7 Landmark Judgments */}
              <View style={styles.seamlessTextSection}>
                <Text style={[styles.seamlessSectionLabel, { color: '#06B6D4' }]}>7. LANDMARK PRECEDENTS</Text>
                <Text style={[styles.seamlessBodyText, { fontSize, lineHeight, color: readerThemeColors.text, fontFamily: fontFamily === 'serif' ? 'Georgia' : fontFamily === 'monospace' ? 'Courier' : undefined }]}>
                  {activeSection.landmarkJudgments}
                </Text>
              </View>

              {/* 8 Timeline */}
              <View style={styles.seamlessTextSection}>
                <Text style={[styles.seamlessSectionLabel, { color: '#0D9488' }]}>8. HISTORICAL TIMELINE</Text>
                <Text style={[styles.seamlessBodyText, { fontSize, lineHeight, color: readerThemeColors.text, fontFamily: fontFamily === 'serif' ? 'Georgia' : fontFamily === 'monospace' ? 'Courier' : undefined }]}>
                  {activeSection.timelineEvolution}
                </Text>
              </View>

              {/* 9 Related Sections */}
              <View style={styles.seamlessTextSection}>
                <Text style={[styles.seamlessSectionLabel, { color: '#B91C1C' }]}>9. RELATED PROVISIONS</Text>
                <Text style={[styles.seamlessBodyText, { fontSize, lineHeight, color: readerThemeColors.text, fontFamily: fontFamily === 'serif' ? 'Georgia' : fontFamily === 'monospace' ? 'Courier' : undefined }]}>
                  {activeSection.relatedSections}
                </Text>
              </View>

              {/* 10 FAQs */}
              <View style={styles.seamlessTextSection}>
                <Text style={[styles.seamlessSectionLabel, { color: '#1E3A8A' }]}>10. FREQUENTLY ASKED QUESTIONS</Text>
                <Text style={[styles.seamlessBodyText, { fontSize, lineHeight, color: readerThemeColors.text, fontFamily: fontFamily === 'serif' ? 'Georgia' : fontFamily === 'monospace' ? 'Courier' : undefined }]}>
                  {activeSection.faqs}
                </Text>
              </View>

              {/* 11 MCQs */}
              <View style={styles.seamlessTextSection}>
                <Text style={[styles.seamlessSectionLabel, { color: '#075985' }]}>11. STUDY QUIZ & MCQs</Text>
                {activeSection.mcqs.map((q, idx) => (
                  <View key={idx} style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 13, color: readerThemeColors.text, fontWeight: '700' }}>• {q.question}</Text>
                    <Text style={{ fontSize: 12, color: readerThemeColors.text, fontStyle: 'italic', marginTop: 2 }}>Correct Answer: {q.answer}</Text>
                  </View>
                ))}
              </View>

              {/* 12 Flashcards */}
              <View style={styles.seamlessTextSection}>
                <Text style={[styles.seamlessSectionLabel, { color: '#065F46' }]}>12. REVISION FLASHCARDS</Text>
                {activeSection.flashcards.map((fc, idx) => (
                  <Text key={idx} style={[styles.seamlessBodyText, { fontSize, lineHeight, color: readerThemeColors.text, fontWeight: '700' }]}>
                    • {fc}
                  </Text>
                ))}
              </View>

              {/* Margin Sticky Note */}
              {notes[activeSection.id] && (
                <View style={{ backgroundColor: '#FFF9DB', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#FAB005', marginTop: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#F08C00', marginBottom: 2 }}>📌 Margin Sticky Note</Text>
                  <Text style={{ fontSize: 12, color: '#E67700' }}>{notes[activeSection.id]}</Text>
                </View>
              )}

              {/* ─── BOTTOM RESEARCH AREA ─── */}
              <View style={[styles.continueResearchContainer, { borderTopColor: readerThemeColors.border }]}>
                <Text style={[styles.researchHeading, { color: readerThemeColors.text }]}>Continue Your Research</Text>
                
                <View style={{ gap: 8, marginTop: 10 }}>
                  <Text style={{ fontSize: 12, color: readerThemeColors.text }}><Text style={{ fontWeight: '800' }}>IPC Equivalent: </Text>{activeSection.ipcEquivalent}</Text>
                  <Text style={{ fontSize: 12, color: readerThemeColors.text }}><Text style={{ fontWeight: '800' }}>BNS Equivalent: </Text>{activeSection.bnsEquivalent}</Text>
                  <Text style={{ fontSize: 12, color: readerThemeColors.text }}><Text style={{ fontWeight: '800' }}>Recent Amendments: </Text>{activeSection.recentAmendments}</Text>
                  <Text style={{ fontSize: 12, color: readerThemeColors.text }}><Text style={{ fontWeight: '800' }}>Suggested Reading: </Text>{activeSection.suggestedReading}</Text>
                </View>
              </View>

            </View>
          </ScrollView>

          {/* Floating AI Tutor Badge */}
          <TouchableOpacity
            style={styles.floatingAiTutorBadge}
            onPress={() => setIsAiAssistantOpen(true)}
          >
            <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.floatingAiTutorText}>AI Tutor</Text>
          </TouchableOpacity>

        </View>
      )}

      {/* Note edit Modal popup */}
      <Modal visible={isNoteInputOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.bottomSheetDragHandle} />
            <View style={styles.bottomSheetHeader}>
              <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Pin Margin Sticky Note</Text>
              <TouchableOpacity onPress={() => setIsNoteInputOpen(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.noteTextInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              placeholder="Write your study notes reference here..."
              placeholderTextColor={theme.placeholder}
              multiline
              value={activeNoteText}
              onChangeText={setActiveNoteText}
            />
            <TouchableOpacity style={styles.noteSaveBtn} onPress={handleSaveNote}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13.5 }}>Save Sticky Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== AI Copilot Full-Screen Modal ===== */}
      <Modal
        visible={isAiAssistantOpen}
        animationType="slide"
        onRequestClose={() => setIsAiAssistantOpen(false)}
        statusBarTranslucent
      >
        <SafeAreaView style={[styles.copilotFullScreen, { backgroundColor: theme.background }]} edges={['top']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

            {/* Copilot Header */}
            <View style={[styles.copilotHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
              <TouchableOpacity onPress={() => setIsAiAssistantOpen(false)} style={styles.headerBtn}>
                <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={[styles.copilotHeaderTitle, { color: theme.textPrimary }]}>Knowledge Hub Copilot</Text>
              </View>
              {/* New Chat */}
              <TouchableOpacity style={styles.headerIconBtn} onPress={handleNewChat}>
                <Ionicons name="add" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
              {/* Overflow Menu */}
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setIsMenuVisible(true)}>
                <Ionicons name="ellipsis-vertical" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Overflow Dropdown Menu */}
            {isMenuVisible && (
              <Modal visible={isMenuVisible} transparent animationType="fade" onRequestClose={() => setIsMenuVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.dropdownMenu, { backgroundColor: theme.surface, borderColor: theme.border, top: insets.top + 56 }]}>
                      <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); setIsHistoryOpen(true); }}>
                        <Ionicons name="time-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>History</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); handleExportChat(); }} disabled={!activeSession}>
                        <Ionicons name="share-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={[styles.menuItemText, { color: theme.textPrimary, opacity: activeSession ? 1 : 0.5 }]}>Export Chat</Text>
                      </TouchableOpacity>
                      <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
                      <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); handleClearPress(); }} disabled={!activeSession}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                        <Text style={[styles.menuItemText, { color: '#EF4444', opacity: activeSession ? 1 : 0.5, fontWeight: '700' }]}>Clear Conversation</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>
            )}

            {/* Chat Messages ScrollView */}
            <ScrollView
              ref={copilotScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {activeSession && activeSession.messages && activeSession.messages.length > 0 ? (
                activeSession.messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  if (!isUser && !msg.content.trim()) return null;

                  if (isUser) {
                    return (
                      <View key={msg.id || idx} style={[styles.chatBubbleContainer, { alignItems: 'flex-end' }]}>
                        <View style={[styles.chatBubble, styles.userBubble, { maxWidth: '75%' }]}>
                          <Text style={styles.userBubbleText}>{msg.content}</Text>
                        </View>
                      </View>
                    );
                  }

                  const { cleanedText, suggestions, disclaimer } = parseFollowUpSuggestions(msg.content);

                  return (
                    <View key={msg.id || idx} style={[styles.chatBubbleContainer, styles.aiBubbleAlign, { flexDirection: 'column' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
                        <View style={styles.aiAvatar}>
                          <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                        </View>
                        <View style={[styles.chatBubble, styles.aiBubble, { backgroundColor: theme.surfaceVariant }]}>
                          <MarkdownRenderer text={cleanedText} />
                          {disclaimer ? (
                            <View style={styles.disclaimerContainer}>
                              <View style={[styles.disclaimerDivider, { backgroundColor: theme.border }]} />
                              <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>⚖️ {disclaimer}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      {/* 2-per-row suggestion chips below the bubble */}
                      {suggestions.length > 0 && (
                        <View style={{ marginLeft: 26, marginRight: 16, marginTop: 12, alignSelf: 'stretch' }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Suggested Next Actions
                          </Text>
                          <View style={styles.bubbleSuggestionsContainer}>
                            {suggestions
                              .slice(0, expandedSuggestions[msg.id] ? undefined : 4)
                              .map((suggestion: string, sIdx: number) => {
                                const shortened = shortenSuggestion(suggestion);
                                return (
                                  <TouchableOpacity
                                    key={sIdx}
                                    style={[styles.bubbleSuggestionChip, { borderColor: '#0284C7', backgroundColor: theme.surface }]}
                                    onPress={() => handleSendChat(suggestion)}
                                    disabled={isAiThinking}
                                  >
                                    <Text style={[styles.bubbleSuggestionText, { color: '#0284C7' }]} numberOfLines={1} ellipsizeMode="tail">✓ {shortened}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            {suggestions.length > 4 && !expandedSuggestions[msg.id] && (
                              <TouchableOpacity
                                style={[styles.bubbleSuggestionChip, { borderColor: '#0284C7', backgroundColor: theme.surface, borderStyle: 'dashed' }]}
                                onPress={() => toggleExpandSuggestions(msg.id)}
                              >
                                <Text style={[styles.bubbleSuggestionText, { color: '#0284C7' }]} numberOfLines={1} ellipsizeMode="tail">+ More Suggestions</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                /* Minimal empty state greeting */
                <View style={styles.emptyChatContainer}>
                  <View style={styles.lightweightGreetingContainer}>
                    <Text style={[styles.lightweightGreetingTitle, { color: theme.textPrimary }]}>
                      Hi, I'm your Knowledge Hub Copilot.
                    </Text>
                    <View style={{ marginTop: 16, alignSelf: 'flex-start', paddingHorizontal: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>
                        I can help you with:
                      </Text>
                      {[
                        'Constitutional & Penal Law Research',
                        'BNS Comparison & New Act Changes',
                        'Landmark Precedent Summarization',
                        'Latin Maxim Translations',
                        'Procedural Checklists & Timelines',
                        'Legal Dictionary Pronunciations',
                        'Study Quiz generation & MCQs',
                      ].map((bullet) => (
                        <Text key={bullet} style={{ fontSize: 12.5, lineHeight: 22, color: theme.textSecondary, fontWeight: '500' }}>
                          • {bullet}
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>
              )}
              {/* Thinking state */}
              {isAiThinking && (
                <View style={styles.thinkingBubbleContainer}>
                  <View style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                  </View>
                  <View style={[styles.chatBubble, { backgroundColor: theme.surfaceVariant, paddingVertical: 8, paddingHorizontal: 12, borderTopLeftRadius: 4, alignSelf: 'flex-start' }]}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>
                      ⚖️ Thinking  {getThinkingDotsText()}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Attachments preview bar */}
            {attachments.length > 0 && (
              <View style={[styles.copilotAttachmentBar, { borderTopColor: theme.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                  {attachments.map((a: any, i: number) => (
                    <View key={i} style={[styles.copilotAttachChip, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                      <Ionicons name="document-attach" size={14} color="#0284C7" />
                      <Text style={[styles.copilotAttachLabel, { color: theme.textPrimary }]} numberOfLines={1}>{a.name}</Text>
                      <TouchableOpacity onPress={() => handleRemoveAttachment(a.name)}>
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Floating scroll to latest button */}
            {showScrollToLatest && (
              <TouchableOpacity
                style={[styles.floatingScrollBtn, { backgroundColor: theme.surface, borderColor: theme.border, bottom: 90 }]}
                onPress={() => { copilotScrollRef.current?.scrollToEnd({ animated: true }); }}
              >
                <Ionicons name="arrow-down" size={18} color="#0284C7" />
              </TouchableOpacity>
            )}

            {/* Input Composer */}
            <View style={[styles.copilotComposerContainer, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12, paddingTop: 8 }]}>
              {isRecording || isTranscribing ? (
                <View style={styles.recordingWrapper}>
                  <TouchableOpacity onPress={cancelRecording} style={styles.voiceControlBtn}>
                    <Ionicons name="close" size={24} color="#EF4444" />
                  </TouchableOpacity>
                  <View style={styles.waveformContainer}>
                    {isTranscribing ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ActivityIndicator size="small" color="#0284C7" />
                        <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Transcribing...</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>
                          {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Listening...</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={stopRecording} style={styles.voiceControlBtn}>
                    <Ionicons name="stop-circle" size={28} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.composerInner}>
                  {/* Attach */}
                  <TouchableOpacity onPress={showAttachmentOptions} style={styles.composerActionBtn}>
                    <Ionicons name="add" size={22} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {/* Suggestions */}
                  <TouchableOpacity onPress={() => setIsSuggestionsSheetOpen(true)} style={styles.composerActionBtn}>
                    <Ionicons name="sparkles" size={18} color="#0284C7" />
                  </TouchableOpacity>
                  {/* Text Input */}
                  <TextInput
                    style={[styles.composerInput, { color: theme.textPrimary, backgroundColor: theme.surfaceVariant }]}
                    placeholder="Ask AI Tutor anything..."
                    placeholderTextColor={theme.placeholder}
                    value={chatInput}
                    onChangeText={setChatInput}
                    multiline
                    maxLength={2000}
                    editable={!isAiThinking}
                  />
                  {/* Voice */}
                  <TouchableOpacity onPress={() => startRecording(selectedLanguage)} style={styles.composerActionBtn} disabled={isAiThinking}>
                    <Ionicons name="mic" size={20} color={isAiThinking ? theme.textMuted : theme.textSecondary} />
                  </TouchableOpacity>
                  {/* Send / Stop */}
                  {isAiThinking ? (
                    <TouchableOpacity
                      onPress={cancelMessageStream}
                      style={[styles.composerSendBtn, { backgroundColor: '#EF4444' }]}
                    >
                      <Ionicons name="stop" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleSendChat()}
                      style={[styles.composerSendBtn, { backgroundColor: '#0284C7' }, (!chatInput.trim() && attachments.length === 0) && { opacity: 0.45 }]}
                      disabled={!chatInput.trim() && attachments.length === 0}
                    >
                      <Ionicons name="send" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* History Modal */}
      <Modal visible={isHistoryOpen} transparent animationType="slide" onRequestClose={() => setIsHistoryOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsHistoryOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Research Session History</Text>
                  <TouchableOpacity onPress={() => setIsHistoryOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                {/* Search */}
                <View style={[styles.historySearchBar, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
                  <TextInput
                    style={[{ flex: 1, fontSize: 13, color: theme.textPrimary, paddingVertical: 0 }]}
                    placeholder="Search research logs..."
                    placeholderTextColor={theme.placeholder}
                    value={searchChatQuery}
                    onChangeText={setSearchChatQuery}
                  />
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {filteredChatSessions.map((s) => (
                    <TouchableOpacity
                      key={s.sessionId}
                      style={[styles.historySessionRow, { borderBottomColor: theme.border, backgroundColor: s.sessionId === activeSessionId ? (isDark ? 'rgba(2,132,199,0.12)' : 'rgba(2,132,199,0.06)') : 'transparent' }]}
                      onPress={() => { setActiveSessionId(s.sessionId); setIsHistoryOpen(false); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }} numberOfLines={1}>{s.title || 'Untitled Session'}</Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                          {s.messages?.length || 0} messages
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeletePress(s.sessionId)} style={{ padding: 6 }}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                  {filteredChatSessions.length === 0 && (
                    <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 32, fontSize: 13 }}>No research logs found.</Text>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Suggestions Sheet */}
      <Modal visible={isSuggestionsSheetOpen} transparent animationType="slide" onRequestClose={() => setIsSuggestionsSheetOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsSuggestionsSheetOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface, height: height * 0.65 }]}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>✨ Research Suggestions</Text>
                  <TouchableOpacity onPress={() => setIsSuggestionsSheetOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {(Object.entries(KNOWLEDGE_SUGGESTIONS_SHEET) as Array<[string, string[]]>).map(([category, items]) => (
                    <View key={category} style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.6 }}>{category}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {items.map((item: string) => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.suggestionChip, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                            onPress={() => { setChatInput(item); setIsSuggestionsSheetOpen(false); }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>{item}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Attachment bottom sheet */}
      <AttachmentBottomSheet
        visible={isBottomSheetVisible}
        onClose={hideAttachmentOptions}
        onSelectOption={handleSelectOption}
      />

      {/* Camera Modal */}
      {isCameraVisible && (
        <CustomCameraModal
          visible={isCameraVisible}
          onClose={hideCamera}
          onConfirm={handleCameraConfirm}
        />
      )}

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
    headerTitle: {
      fontSize: 14.5,
      fontWeight: '900',
    },
    headerSubtitle: {
      fontSize: 10,
      color: '#94A3B8',
      marginTop: 2,
    },
    startCopilotBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    startCopilotText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#0284C7',
    },
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: 13.5,
      paddingHorizontal: 10,
      paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    },

    // ─── BOOKSHELF LANDING STYLES ───
    shelfScrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    shelfSectionHeading: {
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    bookshelfGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'space-between',
      marginTop: 10,
    },
    bookCoverCard: {
      width: '47%',
      height: 250,
      borderRadius: 14,
      padding: 18,
      justifyContent: 'space-between',
      position: 'relative',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 10,
      elevation: 6,
      overflow: 'hidden',
    },
    coverBookmarkFlag: {
      position: 'absolute',
      top: 0,
      right: 14,
      width: 24,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bookCoverIcon: {
      fontSize: 26,
      marginBottom: 6,
    },
    bookCoverTitle: {
      fontSize: 14,
      fontWeight: '900',
      lineHeight: 18,
    },
    bookCoverEdition: {
      fontSize: 9.5,
      fontWeight: '800',
      opacity: 0.8,
      marginTop: 2,
    },
    bookCoverMetadata: {
      fontSize: 9.5,
      fontWeight: '700',
      marginTop: 2,
      opacity: 0.85,
    },
    bookCoverLeftSpine: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 14,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    bookCoverGoldAccent: {
      position: 'absolute',
      left: 14,
      top: 0,
      bottom: 0,
      width: 2.5,
    },
    bookPublisherBadge: {
      fontSize: 8,
      fontWeight: '900',
      color: 'rgba(255,255,255,0.75)',
      letterSpacing: 0.8,
    },

    // ─── TABLE OF CONTENTS (TOC) STYLES ───
    tocScrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    backToShelfBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      marginBottom: 16,
    },
    backToShelfText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#0284C7',
    },
    tocMainTitle: {
      fontSize: 20,
      fontWeight: '900',
    },
    tocMainTree: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
    },
    tocChapterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    tocLeafItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingLeft: 6,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.04)',
    },

    // ─── IMMERSIVE WRITING READER STYLES ───
    readerScrollContent: {
      padding: 20,
      paddingBottom: 100,
    },
    breadcrumbRow: {
      paddingBottom: 10,
      borderBottomWidth: 1,
      marginBottom: 12,
    },
    breadcrumbText: {
      fontSize: 11,
      color: '#94A3B8',
    },
    readerConfigBox: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
    },
    configThemeBtn: {
      flex: 1,
      height: 34,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fontBtn: {
      borderWidth: 1,
      borderColor: '#E2E8F0',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginRight: 4,
    },
    fontAdjustBtn: {
      width: 28,
      height: 28,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(2,132,199,0.06)',
    },
    bookHeaderTitle: {
      fontSize: 22,
      fontWeight: '900',
      marginBottom: 24,
    },
    seamlessTextSection: {
      marginBottom: 24,
    },
    seamlessSectionLabel: {
      fontSize: 10.5,
      fontWeight: '900',
      color: '#0284C7',
      letterSpacing: 0.8,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    seamlessBodyText: {
      fontSize: 15,
      lineHeight: 24,
    },
    continueResearchContainer: {
      borderTopWidth: 1,
      marginTop: 24,
      paddingTop: 16,
    },
    researchHeading: {
      fontSize: 15,
      fontWeight: '900',
    },
    floatingAiTutorBadge: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0284C7',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    floatingAiTutorText: {
      color: '#FFFFFF',
      fontSize: 13.5,
      fontWeight: '800',
    },

    // ─── Copilot Workspace Styles ───────────────────────────────────────────
    copilotFullScreen: {
      flex: 1,
    },
    copilotHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    copilotHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
    },
    dropdownMenu: {
      position: 'absolute',
      right: 12,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 4,
      minWidth: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 9999,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    menuItemText: {
      fontSize: 13.5,
      fontWeight: '600',
    },
    menuDivider: {
      height: 1,
      marginVertical: 4,
    },
    chatBubbleContainer: {
      marginBottom: 12,
    },
    aiBubbleAlign: {
      alignItems: 'flex-start',
    },
    aiAvatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#0284C7',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      marginTop: 2,
      flexShrink: 0,
    },
    chatBubble: {
      padding: 12,
      borderRadius: 12,
      maxWidth: '85%',
      marginVertical: 4,
    },
    userBubble: {
      backgroundColor: '#0284C7',
      alignSelf: 'flex-end',
    },
    userBubbleText: {
      fontSize: 12.5,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    aiBubble: {
      flex: 1,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 16,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      padding: 12,
    },
    thinkingBubbleContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    emptyChatContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingTop: 32,
    },
    lightweightGreetingContainer: {
      alignItems: 'center',
    },
    lightweightGreetingTitle: {
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
      paddingHorizontal: 24,
    },
    disclaimerContainer: {
      marginTop: 10,
    },
    disclaimerDivider: {
      height: 1,
      marginBottom: 6,
    },
    disclaimerText: {
      fontSize: 11,
      fontStyle: 'italic',
      lineHeight: 16,
    },
    bubbleSuggestionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
    },
    bubbleSuggestionChip: {
      width: '48%',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bubbleSuggestionText: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    copilotAttachmentBar: {
      height: 52,
      borderTopWidth: 1,
      justifyContent: 'center',
    },
    copilotAttachChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      maxWidth: 160,
    },
    copilotAttachLabel: {
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    floatingScrollBtn: {
      position: 'absolute',
      right: 16,
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    copilotComposerContainer: {
      borderTopWidth: 1,
      paddingHorizontal: 12,
    },
    recordingWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
    },
    voiceControlBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    waveformContainer: {
      flex: 1,
      alignItems: 'center',
    },
    composerInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
    },
    composerActionBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    composerInput: {
      flex: 1,
      fontSize: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      maxHeight: 100,
    },
    composerSendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historySearchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 12,
    },
    historySessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
    },
    suggestionChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },

    // ─── Modal/Sheets Overlays ──────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
      width: '100%',
      height: height * 0.5,
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
    },
    noteTextInput: {
      height: 120,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      fontSize: 13.5,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    noteSaveBtn: {
      backgroundColor: '#0284C7',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
  });
}

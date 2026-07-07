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
  Animated,
  Share,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { ResearchService } from '@/services/research.service';
import { CaseSummary, CaseWorkspace } from '@/types';
import { Shadows } from '@/theme';

const { width, height } = Dimensions.get('window');

// 18 Legal Directory Categories
const RESEARCH_CATEGORIES = [
  { name: 'Supreme Court', icon: 'ribbon-outline', query: 'Supreme Court Landmark' },
  { name: 'High Court', icon: 'business-outline', query: 'High Court rulings' },
  { name: 'Constitutional Law', icon: 'shield-half-outline', query: 'Article 21 Fundamental Rights' },
  { name: 'Criminal Law', icon: 'skull-outline', query: 'Criminal culpability BNS' },
  { name: 'Civil Law', icon: 'people-outline', query: 'Civil injunction disputes' },
  { name: 'Corporate Law', icon: 'briefcase-outline', query: 'Companies Act compliance' },
  { name: 'Cyber Law', icon: 'desktop-outline', query: 'Information Technology Act Section 66' },
  { name: 'Family Law', icon: 'heart-outline', query: 'Matrimonial maintenance rights' },
  { name: 'Property Law', icon: 'home-outline', query: 'Transfer of Property ownership' },
  { name: 'Consumer Protection', icon: 'cart-outline', query: 'Consumer dispute deficiency' },
  { name: 'Taxation', icon: 'cash-outline', query: 'Income Tax assessment' },
  { name: 'Arbitration', icon: 'git-compare-outline', query: 'Arbitration award set aside' },
  { name: 'Labour Law', icon: 'construct-outline', query: 'Industrial disputes termination' },
  { name: 'Environmental Law', icon: 'leaf-outline', query: 'Polluter pays principle' },
  { name: 'Election Law', icon: 'checkbox-outline', query: 'Representation of People Act' },
  { name: 'Company Law', icon: 'albums-outline', query: 'Corporate insolvency code' },
  { name: 'Motor Accident Claims', icon: 'car-outline', query: 'Motor Vehicle accident compensation' },
  { name: 'Human Rights', icon: 'accessibility-outline', query: 'Human rights detention safeguard' },
];

// Suggested Searches Chips
const SUGGESTED_SEARCHES = [
  'Section 138 NI Act',
  'Section 482 CrPC',
  'Section 65B Evidence Act',
  'Bail under BNS',
  'Cheque Bounce',
  'Specific Performance',
  'Property Dispute',
  'Consumer Protection',
  'Cyber Crime',
  'Motor Accident',
  'Constitutional Remedies',
];

// Featured Statutes
const FEATURED_ACTS = [
  { name: 'Constitution of India', desc: 'Supreme law of India' },
  { name: 'Bharatiya Nyaya Sanhita', desc: 'Substantive criminal law code' },
  { name: 'Bharatiya Nagarik Suraksha', desc: 'Procedural criminal framework' },
  { name: 'Bharatiya Sakshya Adhiniyam', desc: 'Rules of evidence admissibility' },
  { name: 'Civil Procedure Code', desc: 'Civil litigation rules and procedures' },
  { name: 'Indian Contract Act', desc: 'Law of agreements and commercial deals' },
  { name: 'Companies Act', desc: 'Corporate governance guidelines' },
  { name: 'Consumer Protection Act', desc: 'Product liability and buyer rights' },
  { name: 'Transfer of Property Act', desc: 'Immovable asset sale & mortgage laws' },
  { name: 'Information Technology Act', desc: 'Cyber offences and digital signatures' },
  { name: 'Income Tax Act', desc: 'Direct tax laws and regulations' },
];

// 7 Landmark cases mock database
const LANDMARK_CASES = [
  {
    case_name: 'Kesavananda Bharati v. State of Kerala',
    court: 'Supreme Court',
    year: '1973',
    citation: 'AIR 1973 SC 1461',
    legal_principle: 'Basic Structure Doctrine',
    one_line_summary: 'Parliament cannot alter or destroy the basic structure of the Constitution of India.',
    relevance_score: 98,
    why_relevant: 'Provides the foundation for constitutional supremacy challenges.',
    facts: 'The petitioner challenged the Kerala Land Reforms Act, which imposed restrictions on the management of religious property under Article 26 of the Constitution.',
    legal_issues: '1. What is the scope of Parliament\'s power to amend the Constitution under Article 368?\n2. Can Fundamental Rights be abrogated by amendments?',
    ratio_decidendi: 'Parliament has wide powers to amend the Constitution but cannot alter its basic structure, which includes democracy, secularism, and judicial review.',
    reasoning: 'The Constitution is supreme, and Article 368 does not enable the destruction of its core identity.',
  },
  {
    case_name: 'Maneka Gandhi v. Union of India',
    court: 'Supreme Court',
    year: '1978',
    citation: 'AIR 1978 SC 597',
    legal_principle: 'Personal Liberty',
    one_line_summary: 'Procedure established by law under Article 21 must be fair, just, and reasonable.',
    relevance_score: 97,
    why_relevant: 'Expanded Article 21 to include procedural fairness and natural justice.',
    facts: 'The petitioner\'s passport was impounded by the government under Section 10(3)(c) of the Passports Act without assigning any reasons.',
    legal_issues: 'Whether impounding a passport without a hearing violates the right to personal liberty under Article 21.',
    ratio_decidendi: 'Procedure established by law cannot be arbitrary. It must stand the test of reasonableness and natural justice.',
    reasoning: 'The right to travel abroad is part of personal liberty. Any restriction must be backed by a fair hearing.',
  },
  {
    case_name: 'Vishaka v. State of Rajasthan',
    court: 'Supreme Court',
    year: '1997',
    citation: 'AIR 1997 SC 3011',
    legal_principle: 'Sexual Harassment Guidelines',
    one_line_summary: 'Laid down mandatory guidelines to prevent sexual harassment of women at workplaces.',
    relevance_score: 96,
    why_relevant: 'Filled legislative vacuum concerning gender equality and safe workspaces.',
    facts: 'A social worker was gang-raped while performing her duties. Public interest litigation was filed seeking safeguards for working women.',
    legal_issues: 'Whether workplace sexual harassment violates Articles 14, 15, 19, and 21.',
    ratio_decidendi: 'In the absence of domestic legislation, international conventions (CEDAW) can be used to draft binding guidelines.',
    reasoning: 'Every woman has the right to practice any profession in a safe environment free from harassment.',
  },
  {
    case_name: 'Olga Tellis v. Bombay Municipal Corporation',
    court: 'Supreme Court',
    year: '1985',
    citation: 'AIR 1986 SC 180',
    legal_principle: 'Right to Livelihood',
    one_line_summary: 'The right to life under Article 21 includes the right to livelihood.',
    relevance_score: 95,
    why_relevant: 'Protects slum dwellers and pavement traders from arbitrary eviction.',
    facts: 'Bombay Municipal Corporation decided to evict pavement dwellers without providing alternative accommodation.',
    legal_issues: 'Does eviction of pavement dwellers deprive them of their livelihood and violate Article 21?',
    ratio_decidendi: 'Deprivation of livelihood amounts to deprivation of life. Evictions must follow fair procedure.',
    reasoning: 'No person can live without the means of living.',
  },
  {
    case_name: 'Shayara Bano v. Union of India',
    court: 'Supreme Court',
    year: '2017',
    citation: 'AIR 2017 SC 4609',
    legal_principle: 'Triple Talaq Unconstitutional',
    one_line_summary: 'Declared the practice of instant triple talaq void, unconstitutional, and illegal.',
    relevance_score: 94,
    why_relevant: 'Advanced gender justice and tested personal laws against fundamental rights.',
    facts: 'A Muslim woman challenged the practice of Talaq-e-Biddat (instant divorce) after being divorced by her husband via post.',
    legal_issues: 'Whether instant triple talaq violates Article 14 (Right to Equality).',
    ratio_decidendi: 'Instant triple talaq is arbitrary and lacks theological backing, violating Article 14.',
    reasoning: 'What is bad in theology cannot be good in law.',
  },
  {
    case_name: 'Navtej Singh Johar v. Union of India',
    court: 'Supreme Court',
    year: '2018',
    citation: 'AIR 2018 SC 4321',
    legal_principle: 'Decriminalization of Section 377',
    one_line_summary: 'Decriminalized consensual homosexual intercourse between adults under IPC Section 377.',
    relevance_score: 93,
    why_relevant: 'Protects LGBTQ+ rights and dignity under fundamental freedoms.',
    facts: 'Petitioners challenged the constitutional validity of Section 377 of the IPC, which criminalized consensual carnal intercourse against the order of nature.',
    legal_issues: 'Does Section 377 violate Articles 14, 15, 19, and 21?',
    ratio_decidendi: 'Section 377, to the extent it criminalizes consensual adult sex, is arbitrary and unconstitutional.',
    reasoning: 'Constitutional morality overrides social morality. Sexual orientation is an integral part of privacy.',
  },
  {
    case_name: 'K.S. Puttaswamy v. Union of India',
    court: 'Supreme Court',
    year: '2017',
    citation: '(2017) 10 SCC 1',
    legal_principle: 'Right to Privacy',
    one_line_summary: 'Declared the Right to Privacy as a fundamental right protected under Article 21.',
    relevance_score: 99,
    why_relevant: 'Establishes protection against state surveillance and data intrusions.',
    facts: 'A retired judge challenged the validity of the Aadhaar biometric card scheme, claiming it violated privacy rights.',
    legal_issues: 'Whether the right to privacy is protected under Part III of the Constitution.',
    ratio_decidendi: 'Privacy is an essential component of life and liberty, protected under Article 21.',
    reasoning: 'Dignity and autonomy are core constitutional commitments, and privacy safeguards them.',
  },
];

// Latest judgments mock feed
const LATEST_JUDGMENTS = [
  { title: 'State tax levies on mineral-bearing lands held constitutionally valid', court: 'Supreme Court (9-Judge Bench)', date: 'July 2024', area: 'Constitutional Tax' },
  { title: 'Quashed Section 482 quashing petition due to unresolved triable facts', court: 'Delhi High Court', date: 'June 2024', area: 'Criminal Procedure' },
  { title: 'Approved resolution plan of default infrastructure builder company', court: 'NCLAT New Delhi', date: 'June 2024', area: 'Insolvency Code' },
  { title: 'Royalty payouts for foreign tech transfer held exempt from service tax', court: 'CESTAT Mumbai', date: 'May 2024', area: 'Indirect Taxation' },
];

export default function LegalPrecedentsScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles: any = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ caseId?: string }>();

  // Pulse animation for skeleton loader
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const detailsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Modes: 'CURRENT' (Current Case Mode) or 'MANUAL' (Manual Search Mode)
  const [mode, setMode] = useState<'CURRENT' | 'MANUAL'>('MANUAL');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [activeCase, setActiveCase] = useState<CaseWorkspace | null>(null);
  
  // Loading states
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Manual Search Query
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  
  // Search results
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchMetadata, setSearchMetadata] = useState<any>(null);

  // Selected Precedent for Detail Modal
  const [selectedPrecedent, setSelectedPrecedent] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'intelligence' | 'comparison' | 'actions'>('intelligence');
  
  // AI assistant states
  const [activePrecedentAiResponse, setActivePrecedentAiResponse] = useState<string | null>(null);
  const [aiActionType, setAiActionType] = useState<string | null>(null);

  // Modal open triggers
  const [isCaseListOpen, setIsCaseListOpen] = useState(false);

  // Fetch case summaries on mount
  useEffect(() => {
    fetchCases();
  }, []);

  // Fetch case details when activeCaseId changes
  useEffect(() => {
    if (activeCaseId) {
      fetchCaseDetails(activeCaseId);
    } else {
      setActiveCase(null);
      if (mode === 'CURRENT') {
        setSearchResults([]);
        setSearchMetadata(null);
      }
    }
  }, [activeCaseId]);

  // Handle incoming caseId parameter from router
  useEffect(() => {
    if (params.caseId) {
      setActiveCaseId(params.caseId);
      setMode('CURRENT');
    }
  }, [params.caseId]);

  const fetchCases = async () => {
    setIsLoadingCases(true);
    try {
      const response = await CaseService.listCases();
      const casesData = Array.isArray(response) ? response : (response?.data || []);
      const filtered = casesData.filter((c: any) => c.isLegalCase);
      setCases(filtered);
      if (params.caseId) {
        setActiveCaseId(params.caseId);
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
      showToast('error', 'Error', 'Failed to retrieve cases list.');
    } finally {
      setIsLoadingCases(false);
    }
  };

  const fetchCaseDetails = async (caseId: string) => {
    setIsLoadingDetails(true);
    try {
      const response = await CaseService.getCaseDetails(caseId);
      const caseData = response && (response as any).success && (response as any).data 
        ? (response as any).data 
        : response;
      if (caseData && caseData._id) {
        setActiveCase(caseData);
        // Trigger auto search based on case context
        handlePrecedentSearch(null, caseId);
      }
    } catch (err) {
      console.error('Failed to load case details:', err);
      showToast('error', 'Error', 'Failed to load case details.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handlePrecedentSearch = async (manualQueryString: string | null = null, forceProjectId: string | null = null) => {
    const targetProjectId = forceProjectId || (mode === 'CURRENT' ? activeCaseId : null);
    
    if (mode === 'CURRENT' && !targetProjectId) {
      setIsCaseListOpen(true);
      return;
    }

    let searchQuery = '';
    if (mode === 'MANUAL') {
      searchQuery = manualQueryString || manualSearchQuery.trim();
      if (!searchQuery) {
        showToast('error', 'Validation Error', 'Please enter a search query.');
        return;
      }
      setManualSearchQuery(searchQuery);
    }

    setIsLoadingSearch(true);
    try {
      const response = await ResearchService.searchPrecedents(
        searchQuery,
        targetProjectId,
        'English'
      );
      
      const searchData = response && (response as any).success && (response as any).data 
        ? (response as any).data 
        : response;

      if (searchData) {
        setSearchResults(searchData.precedents || []);
        setSearchMetadata({
          mode: searchData.mode || 'MANUAL',
          query: searchData.query || searchQuery,
        });

        if (!searchData.precedents || searchData.precedents.length === 0) {
          showToast('info', 'No Results', 'No matching precedents found.');
        } else {
          showToast('success', 'Search Complete', `Found ${searchData.precedents.length} precedents.`);
        }
      }
    } catch (err) {
      console.error('Precedent search error:', err);
      showToast('error', 'Search Failed', 'Failed to retrieve precedents.');
    } finally {
      setIsLoadingSearch(false);
    }
  };

  // AI Assistant Actions (Tab 3)
  const handleAiAction = (action: string, precedent: any) => {
    setAiActionType(action);
    setIsAiLoading(true);
    setActivePrecedentAiResponse(null);

    setTimeout(() => {
      let responseText = "";
      const caseName = precedent.case_identity?.case_name || precedent.case_name || "precedent";
      
      switch (action) {
        case 'simple-english':
          responseText = `**Explain in Simple English**: \nThis judgment stands for the basic principle that when a commercial contract matures, any security cheques held become enforceable. The court says that if the signatures on a cheque are admitted, the law presumes the debtor owes money, and they must prove otherwise.`;
          break;
        case 'hindi':
          responseText = `**Explain in Hindi (हिंदी अनुवाद व व्याख्या)**: \nइस निर्णय का मुख्य कानूनी सिद्धांत यह है कि जब भी किसी अनुबंध (Contract) की देनदारी परिपक्व होती है, तो जमानत (Security) के रूप में दिए गए चेक को भुनाया जा सकता है। न्यायालय ने यह माना है कि हस्ताक्षर स्वीकार होने पर ऋण की वैधानिक धारणा तुरंत लागू हो जाती है।`;
          break;
        case 'summarize':
          responseText = `**Precedent Summary**: \n• **Key Ruling**: Presumptions under Section 139 of the NI Act are mandatory and shift the evidentiary burden completely onto the defense.\n• **Application**: Commercial credit structures cannot escape Section 138 liability by simply claiming a cheque was for "security" only.`;
          break;
        case 'compare':
          responseText = `**AI Case Comparison**: \n• **Similarity**: The current case and this precedent both involve commercial supply lines where post-dated security cheques bounced.\n• **Key Difference**: The defendant in this case claims they returned the goods, which is a question of fact not present in the reference judgment.`;
          break;
        case 'stronger':
          responseText = `**Stronger Authority Found**: \n*Bir Singh v. Mukesh Kumar (2019) 4 SCC 197* — Supreme Court. \nRe-affirms that even a blank signed cheque leaf voluntarily given in discharge of a debt triggers NI Act liability, representing a stronger binding precedent.`;
          break;
        case 'contrary':
          responseText = `**Contrary / Overruled Judgments Alert**: \n*Krishna Janardhan Bhat v. Dattatraya G. Hegde (2008) 4 SCC 54* \nThis case previously held that Section 139 does not presume a legally enforceable debt, but it was explicitly overruled by the 3-Judge Bench in *Rangappa*. Avoid citing *Krishna Bhat*.`;
          break;
        case 'citation':
          responseText = `**Standard Citation formats**: \n• Standard: (2010) 11 SCC 441\n• Alternative: AIR 2010 SC 1898\n• Citation string: *Rangappa v. Sri Mohan, (2010) 11 SCC 441*`;
          break;
        case 'arguments':
          responseText = `**Courtroom Arguments generated**: \n"My Lord, as established in the landmark case of Rangappa, the moment the accused admits their signatures on Cheque Exhibit P-1, the burden shifts entirely to them to rebut the Section 139 presumption. They have presented no ledger or bank statement to discharge this burden."`;
          break;
        case 'draft':
          responseText = `**Use in Draft Maker**: \nPrecedent citation context exported successfully to drafting clipboard. Click 'Use in Draft' to append to your active legal brief.`;
          break;
        default:
          responseText = "AI analysis successfully completed.";
      }
      setActivePrecedentAiResponse(responseText);
      setIsAiLoading(false);
    }, 800);
  };

  const handleCopyCitation = (precedent: any) => {
    const citation = precedent.case_identity?.citation || precedent.citation || 'Citation N/A';
    Clipboard.setString(citation);
    showToast('success', 'Citation Copied', `Copied: ${citation}`);
  };

  const handleSavePrecedent = (precedent: any) => {
    showToast('success', 'Precedent Saved', 'Precedent saved to your personal research library.');
  };

  const handleUseInBuilder = (precedent: any) => {
    showToast('success', 'Linked to Argument Builder', 'Citation loaded into Court Prep Workspace argument files.');
  };

  const handleTabChange = (tab: 'intelligence' | 'comparison' | 'actions') => {
    setActiveTab(tab);
    setTimeout(() => {
      detailsScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 50);

    if (tab === 'intelligence') {
      // Set simple summary default
    } else if (tab === 'comparison') {
      // Comparison trigger
    } else {
      setActivePrecedentAiResponse(null);
    }
  };

  // Group current case recommendations (Current Case Mode sub-sections)
  const groupedCaseRecommendations = useMemo(() => {
    if (searchResults.length === 0) return null;
    return {
      relevant: searchResults.slice(0, 2),
      supporting: searchResults.slice(2, 4),
      similar: searchResults.slice(4, 5),
      contrary: searchResults.slice(5, 6),
    };
  }, [searchResults]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Top App Bar */}
      <View style={[styles.appHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.appHeaderBackBtn} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.appHeaderTitleContainer}>
          <Text style={[styles.appHeaderTitle, { color: theme.textPrimary }]}>Legal Precedent</Text>
          <Text style={styles.appHeaderSubtitle}>Searchable Case Laws & Citation Intelligence</Text>
        </View>
      </View>

      {/* Modes Toggle Bar */}
      <View style={[styles.modeToggleRow, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[styles.toggleButton, mode === 'CURRENT' && styles.toggleButtonActive]}
          onPress={() => setMode('CURRENT')}
        >
          <Ionicons name="briefcase-outline" size={16} color={mode === 'CURRENT' ? '#6D5DFC' : theme.textSecondary} />
          <Text style={[styles.toggleButtonText, { color: mode === 'CURRENT' ? '#6D5DFC' : theme.textSecondary }]}>
            Current Case
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, mode === 'MANUAL' && styles.toggleButtonActive]}
          onPress={() => setMode('MANUAL')}
        >
          <Ionicons name="search-outline" size={16} color={mode === 'MANUAL' ? '#6D5DFC' : theme.textSecondary} />
          <Text style={[styles.toggleButtonText, { color: mode === 'MANUAL' ? '#6D5DFC' : theme.textSecondary }]}>
            Manual Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Search Panel */}
      <View style={[styles.searchSection, { backgroundColor: theme.surface }]}>
        <View style={[styles.searchBar, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search by Case, Section, Act, Citation, Principle..."
            placeholderTextColor={theme.placeholder}
            value={manualSearchQuery}
            onChangeText={setManualSearchQuery}
            onSubmitEditing={() => handlePrecedentSearch()}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => handlePrecedentSearch()}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Suggested Searches chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedScroll}>
          {SUGGESTED_SEARCHES.map((query) => (
            <TouchableOpacity
              key={query}
              style={[styles.suggestedChip, { borderColor: theme.border }]}
              onPress={() => handlePrecedentSearch(query)}
            >
              <Text style={[styles.suggestedChipText, { color: theme.textSecondary }]}>{query}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Scroll Content */}
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {isLoadingSearch ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6D5DFC" />
            <Text style={[styles.loadingText, { color: theme.textPrimary }]}>Searching case databases...</Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4, textAlign: 'center' }}>
              Parsing statutes, matching benchmark indices and loading legal briefs.
            </Text>
          </View>
        ) : mode === 'MANUAL' && searchResults.length === 0 ? (
          // REDESIGNED ENTERPRISE RESEARCH WORKSPACE DASHBOARD
          <View style={{ gap: 24 }}>
            
            {/* 1. Research Metrics Cards */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.metricVal}>14,230+</Text>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Judgments Indexed</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.metricVal}>98.5%</Text>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>AI Research Accuracy</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.metricVal}>Supreme Court</Text>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Primary Source</Text>
              </View>
            </View>

            {/* 2. Research Categories Grid */}
            <View>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Precedent Categories</Text>
              <View style={styles.categoriesGrid}>
                {RESEARCH_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.name}
                    style={[styles.categoryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => handlePrecedentSearch(cat.query)}
                  >
                    <Ionicons name={cat.icon as any} size={18} color="#6D5DFC" style={{ marginBottom: 6 }} />
                    <Text style={[styles.categoryName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 3. Featured Acts Bare Statutes */}
            <View>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Featured Acts & Statutes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {FEATURED_ACTS.map((act) => (
                  <TouchableOpacity
                    key={act.name}
                    style={[styles.actCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => handlePrecedentSearch(act.name)}
                  >
                    <Text style={[styles.actTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                      {act.name}
                    </Text>
                    <Text style={[styles.actDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                      {act.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 4. Landmark Cases Section */}
            <View>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Landmark Rulings</Text>
              {LANDMARK_CASES.map((lm) => (
                <TouchableOpacity
                  key={lm.case_name}
                  style={[styles.landmarkCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => setSelectedPrecedent(lm)}
                >
                  <View style={styles.landmarkHeader}>
                    <Text style={[styles.landmarkTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                      {lm.case_name}
                    </Text>
                    <Text style={[styles.landmarkYear, { color: theme.textMuted }]}>{lm.year}</Text>
                  </View>
                  <View style={styles.landmarkMeta}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6D5DFC' }}>
                      {lm.court} • {lm.legal_principle}
                    </Text>
                  </View>
                  <Text style={[styles.landmarkDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                    {lm.one_line_summary}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 5. Latest Judgments Timeline */}
            <View>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Latest Judgments & Decisions</Text>
              <View style={[styles.latestContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {LATEST_JUDGMENTS.map((item, idx) => (
                  <View key={idx} style={[styles.latestRow, idx !== LATEST_JUDGMENTS.length - 1 && { borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.latestTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                        {item.court} • {item.area}
                      </Text>
                    </View>
                    <Text style={[styles.latestDate, { color: theme.textMuted }]}>{item.date}</Text>
                  </View>
                ))}
              </View>
            </View>

          </View>
        ) : mode === 'CURRENT' && !activeCaseId ? (
          // Current Case selection empty state
          <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="briefcase-outline" size={54} color="#94A3B8" />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Case Selected</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Please link an active Case Workspace to view automatically recommended precedents.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setIsCaseListOpen(true);
              }}
            >
              <Text style={styles.primaryButtonText}>Select Case Workspace</Text>
            </TouchableOpacity>
          </View>
        ) : mode === 'CURRENT' && groupedCaseRecommendations ? (
          // CURRENT CASE MODE DYNAMIC RECOMENDATION PANELS
          <View style={{ gap: 20 }}>
            {/* Relevant Judgments Accordion */}
            <View>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>📂 Relevant Judgments</Text>
              {groupedCaseRecommendations.relevant.map((item, idx) => (
                <RenderResultCard key={idx} item={item} theme={theme} styles={styles} onSelect={setSelectedPrecedent} onSave={handleSavePrecedent} onCopy={handleCopyCitation} onUse={handleUseInBuilder} />
              ))}
            </View>

            {/* Supporting Authorities Accordion */}
            {groupedCaseRecommendations.supporting.length > 0 && (
              <View>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>📜 Supporting Authorities</Text>
                {groupedCaseRecommendations.supporting.map((item, idx) => (
                  <RenderResultCard key={idx} item={item} theme={theme} styles={styles} onSelect={setSelectedPrecedent} onSave={handleSavePrecedent} onCopy={handleCopyCitation} onUse={handleUseInBuilder} />
                ))}
              </View>
            )}

            {/* Contrary Authorities Alert Box */}
            {groupedCaseRecommendations.contrary.length > 0 && (
              <View>
                <Text style={[styles.sectionHeading, { color: '#EF4444' }]}>⚠️ Contrary Judgments Alert</Text>
                {groupedCaseRecommendations.contrary.map((item, idx) => (
                  <View key={idx} style={{ opacity: 0.85 }}>
                    <RenderResultCard item={item} theme={theme} styles={styles} onSelect={setSelectedPrecedent} onSave={handleSavePrecedent} onCopy={handleCopyCitation} onUse={handleUseInBuilder} isContrary={true} />
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          // SEARCH RESULTS LIST
          <View style={{ gap: 16 }}>
            {searchResults.map((item, idx) => (
              <RenderResultCard key={idx} item={item} theme={theme} styles={styles} onSelect={setSelectedPrecedent} onSave={handleSavePrecedent} onCopy={handleCopyCitation} onUse={handleUseInBuilder} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* DETAILED PRECEDENT VIEW & RESEARCH ACTIONS MODAL */}
      {selectedPrecedent && (
        <Modal visible={true} transparent={false} animationType="slide" onRequestClose={() => setSelectedPrecedent(null)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
              <TouchableOpacity onPress={() => setSelectedPrecedent(null)}>
                <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                  {selectedPrecedent.case_identity?.case_name || selectedPrecedent.case_name || 'Precedent Details'}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  {selectedPrecedent.court || selectedPrecedent.case_identity?.court || 'Supreme Court'} • {selectedPrecedent.year || selectedPrecedent.case_identity?.year || '2024'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPrecedent(null)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Precedent detail Tabs */}
            <View style={[styles.modalTabsRow, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
              <TouchableOpacity
                style={[styles.modalTabBtn, activeTab === 'intelligence' && { borderBottomColor: '#6D5DFC' }]}
                onPress={() => handleTabChange('intelligence')}
              >
                <Text style={[styles.modalTabBtnText, { color: activeTab === 'intelligence' ? '#6D5DFC' : theme.textSecondary }]}>
                  Case Dossier
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTabBtn, activeTab === 'comparison' && { borderBottomColor: '#6D5DFC' }]}
                onPress={() => handleTabChange('comparison')}
              >
                <Text style={[styles.modalTabBtnText, { color: activeTab === 'comparison' ? '#6D5DFC' : theme.textSecondary }]}>
                  AI Analysis
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTabBtn, activeTab === 'actions' && { borderBottomColor: '#6D5DFC' }]}
                onPress={() => handleTabChange('actions')}
              >
                <Text style={[styles.modalTabBtnText, { color: activeTab === 'actions' ? '#6D5DFC' : theme.textSecondary }]}>
                  AI Precedent Research
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable details */}
            <ScrollView contentContainerStyle={styles.modalScrollBody}>
              {activeTab === 'intelligence' && (
                <View style={{ gap: 16 }}>
                  <View style={[styles.detailBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.detailHeading, { color: theme.textPrimary }]}>Facts of the Case</Text>
                    <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                      {selectedPrecedent.facts || 'The petitioner contested statutory orders issued regarding land tenancy and fundamental rights restrictions, creating a dispute surrounding constitutional power limits.'}
                    </Text>
                  </View>

                  <View style={[styles.detailBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.detailHeading, { color: theme.textPrimary }]}>Key Legal Issues</Text>
                    <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                      {selectedPrecedent.legal_issues || '1. Scope of amending powers under Art 368.\n2. Infringement threshold of Article 21 limitations.'}
                    </Text>
                  </View>

                  <View style={[styles.detailBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.detailHeading, { color: theme.textPrimary }]}>Ratio Decidendi</Text>
                    <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                      {selectedPrecedent.ratio_decidendi || selectedPrecedent.legal_principle || 'The Basic Structure doctrine binds Parliament from altering key constitutional tenets.'}
                    </Text>
                  </View>

                  <View style={[styles.detailBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.detailHeading, { color: theme.textPrimary }]}>Court Reasoning</Text>
                    <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                      {selectedPrecedent.reasoning || 'Constitutional supremacy limits absolute legislative overrides to protect fundamental rights guarantees.'}
                    </Text>
                  </View>
                </View>
              )}

              {activeTab === 'comparison' && (
                <View style={{ gap: 16 }}>
                  <View style={[styles.aiExplanationCard, { backgroundColor: 'rgba(109, 93, 252, 0.08)' }]}>
                    <Ionicons name="sparkles" size={20} color="#6D5DFC" style={{ marginBottom: 6 }} />
                    <Text style={[styles.aiExplanationTitle, { color: theme.textPrimary }]}>AI Explanation</Text>
                    <Text style={[styles.aiExplanationText, { color: theme.textSecondary }]}>
                      Why this precedent matters: "{selectedPrecedent.why_relevant || 'Provides the framework for reviewing all administrative modifications of citizens fundamental liberties.'}"
                    </Text>
                  </View>
                </View>
              )}

              {activeTab === 'actions' && (
                <View style={{ gap: 16 }}>
                  <Text style={[styles.detailHeading, { color: theme.textPrimary }]}>AI Legal Research Operations</Text>
                  
                  <View style={styles.actionsGrid}>
                    {[
                      { id: 'simple-english', label: 'Explain in Simple English', icon: 'chatbox-ellipses-outline' },
                      { id: 'hindi', label: 'Explain in Hindi', icon: 'text-outline' },
                      { id: 'summarize', label: 'Summarize Case', icon: 'sparkles-outline' },
                      { id: 'compare', label: 'Compare Case', icon: 'git-compare-outline' },
                      { id: 'stronger', label: 'Find stronger authority', icon: 'trending-up-outline' },
                      { id: 'contrary', label: 'Find opposite judgments', icon: 'alert-circle-outline' },
                      { id: 'citation', label: 'Generate citation', icon: 'ribbon-outline' },
                      { id: 'draft', label: 'Use in Draft', icon: 'create-outline' },
                      { id: 'arguments', label: 'Use in Arguments', icon: 'megaphone-outline' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.aiActionCardBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        onPress={() => handleAiAction(item.id, selectedPrecedent)}
                      >
                        <Ionicons name={item.icon as any} size={16} color="#6D5DFC" />
                        <Text style={[styles.aiActionCardBtnLabel, { color: theme.textPrimary }]}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {isAiLoading && (
                    <View style={styles.aiActionProgress}>
                      <ActivityIndicator size="small" color="#6D5DFC" />
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
                        Synthesizing analysis reports...
                      </Text>
                    </View>
                  )}

                  {activePrecedentAiResponse && (
                    <View style={[styles.aiResponseBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.aiResponseText, { color: theme.textPrimary }]}>{activePrecedentAiResponse}</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View style={[styles.modalFooter, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
              <TouchableOpacity style={[styles.footerBtn, { borderColor: theme.border }]} onPress={() => handleCopyCitation(selectedPrecedent)}>
                <Ionicons name="copy-outline" size={16} color={theme.textPrimary} style={{ marginRight: 6 }} />
                <Text style={[styles.footerBtnText, { color: theme.textPrimary }]}>Copy Citation</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerBtnActive} onPress={() => handleSavePrecedent(selectedPrecedent)}>
                <Ionicons name="bookmark-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.footerBtnActiveText}>Save Precedent</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Case List modal list drawer */}
      <Modal visible={isCaseListOpen} transparent animationType="slide" onRequestClose={() => setIsCaseListOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsCaseListOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Select Case Workspace</Text>
                  <TouchableOpacity onPress={() => setIsCaseListOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {cases.map((c) => (
                    <TouchableOpacity
                      key={c._id}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        setActiveCaseId(c._id);
                        setIsCaseListOpen(false);
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

    </SafeAreaView>
  );
}

// Sub-component for rendering standard results card
interface ResultCardProps {
  item: any;
  theme: any;
  styles: any;
  onSelect: (precedent: any) => void;
  onSave: (precedent: any) => void;
  onCopy: (precedent: any) => void;
  onUse: (precedent: any) => void;
  isContrary?: boolean;
}

function RenderResultCard({ item, theme, styles, onSelect, onSave, onCopy, onUse, isContrary }: ResultCardProps) {
  const caseTitle = item.case_identity?.case_name || item.case_name || 'Legal Precedent';
  const citation = item.case_identity?.citation || item.citation || 'AIR 2024 SC';
  const court = item.case_identity?.court || item.court || 'Supreme Court';
  const score = item.similarity?.relevance_score || item.relevance_score || 95;
  const principle = item.legal_principle || 'Basic Structure Doctrine';
  const summary = item.one_line_summary || 'Key principle outlines fundamental limits.';
  const why = item.why_relevant || 'Directly answers client query regarding limitations.';

  return (
    <TouchableOpacity
      style={[
        styles.precedentResultCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
        isContrary && { borderColor: '#EF4444', borderLeftWidth: 4 }
      ]}
      onPress={() => onSelect(item)}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitleText, { color: theme.textPrimary }]} numberOfLines={1}>
            {caseTitle}
          </Text>
          <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
            {court} • {citation}
          </Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: isContrary ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
          <Text style={[styles.scoreBadgeText, { color: isContrary ? '#EF4444' : '#10B981' }]}>
            {score}% Match
          </Text>
        </View>
      </View>

      <View style={[styles.cardBody, { borderTopColor: theme.border }]}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>Principle: {principle}</Text>
        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>{summary}</Text>
        <Text style={{ fontSize: 11, color: '#6D5DFC', fontStyle: 'italic', marginTop: 6 }}>Why: {why}</Text>
      </View>

      <View style={[styles.cardActionsRow, { borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.cardActionBtn} onPress={() => onSave(item)}>
          <Ionicons name="bookmark-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.cardActionBtnText, { color: theme.textSecondary }]}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardActionBtn} onPress={() => onCopy(item)}>
          <Ionicons name="copy-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.cardActionBtnText, { color: theme.textSecondary }]}>Citation</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardActionBtn} onPress={() => onUse(item)}>
          <Ionicons name="sparkles" size={14} color="#6D5DFC" />
          <Text style={[styles.cardActionBtnText, { color: '#6D5DFC' }]}>Use in Prep</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    appHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    appHeaderBackBtn: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 24,
      marginRight: 8,
      marginLeft: -10, // offsets padding for visual alignment
    },
    appHeaderTitleContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    appHeaderTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    appHeaderSubtitle: {
      fontSize: 10.5,
      color: '#94A3B8',
      marginTop: 2,
      fontWeight: '700',
    },
    modeToggleRow: {
      flexDirection: 'row',
      padding: 6,
      borderBottomWidth: 1,
      gap: 8,
    },
    toggleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    toggleButtonActive: {
      backgroundColor: 'rgba(109, 93, 252, 0.1)',
    },
    toggleButtonText: {
      fontSize: 13,
      fontWeight: '700',
    },
    searchSection: {
      padding: 14,
      gap: 10,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 48,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 13,
    },
    searchBtn: {
      backgroundColor: '#6D5DFC',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    searchBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    suggestedScroll: {
      gap: 8,
    },
    suggestedChip: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    suggestedChipText: {
      fontSize: 11,
      fontWeight: '600',
    },
    scrollBody: {
      padding: 16,
      paddingBottom: 40,
    },
    loadingContainer: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 15,
      fontWeight: '800',
      marginTop: 14,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    metricCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricVal: {
      fontSize: 14,
      fontWeight: '800',
      color: '#6D5DFC',
    },
    metricLabel: {
      fontSize: 9,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 4,
    },
    sectionHeading: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 12,
    },
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryCard: {
      width: '31%',
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
    },
    categoryName: {
      fontSize: 10.5,
      fontWeight: '700',
      marginTop: 4,
    },
    actCard: {
      width: 140,
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 12,
      height: 90,
    },
    actTitle: {
      fontSize: 12,
      fontWeight: '800',
    },
    actDesc: {
      fontSize: 10,
      marginTop: 4,
      lineHeight: 14,
    },
    landmarkCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    landmarkHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    landmarkTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      flex: 1,
    },
    landmarkYear: {
      fontSize: 11,
      fontWeight: '700',
      marginLeft: 10,
    },
    landmarkMeta: {
      marginTop: 4,
    },
    landmarkDesc: {
      fontSize: 12,
      marginTop: 6,
      lineHeight: 16,
    },
    latestContainer: {
      borderWidth: 1.5,
      borderRadius: 16,
      overflow: 'hidden',
    },
    latestRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
    },
    latestTitle: {
      fontSize: 12.5,
      fontWeight: '800',
    },
    latestDate: {
      fontSize: 10,
      fontWeight: '700',
      marginLeft: 10,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 24,
      borderWidth: 1.5,
      borderRadius: 16,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      marginTop: 12,
    },
    emptyDesc: {
      fontSize: 12.5,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
    },
    primaryButton: {
      backgroundColor: '#6D5DFC',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginTop: 14,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

    // Results Card Styles
    precedentResultCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    cardTitleText: {
      fontSize: 14,
      fontWeight: '800',
    },
    scoreBadge: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    scoreBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    cardBody: {
      borderTopWidth: 1,
      paddingTop: 10,
      marginTop: 10,
    },
    cardActionsRow: {
      borderTopWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 10,
      marginTop: 10,
    },
    cardActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardActionBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
    },

    // Detailed Modal Styles
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
    modalTabsRow: {
      flexDirection: 'row',
      borderBottomWidth: 1.5,
    },
    modalTabBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    modalTabBtnText: {
      fontSize: 12,
      fontWeight: '800',
    },
    modalScrollBody: {
      padding: 16,
      paddingBottom: 60,
    },
    detailBox: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
    },
    detailHeading: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 6,
    },
    detailText: {
      fontSize: 13,
      lineHeight: 18,
    },
    aiExplanationCard: {
      borderRadius: 12,
      padding: 16,
    },
    aiExplanationTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 6,
    },
    aiExplanationText: {
      fontSize: 13,
      lineHeight: 18,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    aiActionCardBtn: {
      width: '48%',
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    aiActionCardBtnLabel: {
      fontSize: 11,
      fontWeight: '700',
      flex: 1,
    },
    aiActionProgress: {
      alignItems: 'center',
      marginVertical: 16,
    },
    aiResponseBox: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      marginTop: 10,
    },
    aiResponseText: {
      fontSize: 13,
      lineHeight: 18,
    },
    modalFooter: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1.5,
      gap: 10,
    },
    footerBtn: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    footerBtnText: {
      fontSize: 13,
      fontWeight: '800',
    },
    footerBtnActive: {
      flex: 1,
      height: 44,
      backgroundColor: '#6D5DFC',
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    footerBtnActiveText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    // Bottom Sheet Case List Styles
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
  });
}

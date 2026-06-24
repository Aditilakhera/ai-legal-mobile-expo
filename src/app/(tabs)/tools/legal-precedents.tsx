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
  Clipboard,
  Animated,
  Linking,
  Alert,
  Share,
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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

const { width, height } = Dimensions.get('window');

// Case types options for filters
const CASE_TYPES = [
  'Civil',
  'Criminal',
  'Corporate',
  'Family',
  'Consumer',
  'Labour',
  'Tax',
  'Constitutional',
  'Commercial',
];

export default function LegalPrecedentsScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles = React.useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ caseId?: string }>();

  // Pulse animation for skeleton loader
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const detailsScrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Main modes: 'CURRENT' (Current Case Mode) or 'MANUAL' (Manual Search Mode)
  const [mode, setMode] = useState<'CURRENT' | 'MANUAL'>('CURRENT');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [activeCase, setActiveCase] = useState<CaseWorkspace | null>(null);
  
  // Loading states
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Current Case Mode states
  const [currentCaseResults, setCurrentCaseResults] = useState<any[]>([]);
  const [currentCaseMetadata, setCurrentCaseMetadata] = useState<any>(null);
  const [currentCaseFilters, setCurrentCaseFilters] = useState<any>({
    court: '',
    judge: '',
    year: '',
    state: '',
    act: '',
    section: '',
    caseType: '',
  });

  // Manual Search Mode states
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);
  const [manualSearchMetadata, setManualSearchMetadata] = useState<any>(null);
  const [manualFilters, setManualFilters] = useState<any>({
    court: '',
    judge: '',
    year: '',
    state: '',
    act: '',
    section: '',
    caseType: '',
  });

  // Dynamic state getters based on active tab Mode
  const searchResults = mode === 'CURRENT' ? currentCaseResults : manualSearchResults;
  const searchMetadata = mode === 'CURRENT' ? currentCaseMetadata : manualSearchMetadata;
  const filters = mode === 'CURRENT' ? currentCaseFilters : manualFilters;

  // State setter functions mapped to active tab Mode
  const setSearchResults = (val: any) => {
    if (mode === 'CURRENT') {
      setCurrentCaseResults(val);
    } else {
      setManualSearchResults(val);
    }
  };

  const setSearchMetadata = (val: any) => {
    if (mode === 'CURRENT') {
      setCurrentCaseMetadata(val);
    } else {
      setManualSearchMetadata(val);
    }
  };

  const setFilters = (val: any) => {
    if (mode === 'CURRENT') {
      setCurrentCaseFilters(val);
    } else {
      setManualFilters(val);
    }
  };

  // Switch Mode Handler and state cleanup
  const handleSwitchMode = (newMode: 'CURRENT' | 'MANUAL') => {
    setMode(newMode);
    if (newMode === 'MANUAL') {
      // Clear manual search parameters & filters to start fresh
      setManualSearchResults([]);
      setManualSearchMetadata(null);
      setManualSearchQuery('');
      setManualFilters({
        court: '',
        judge: '',
        year: '',
        state: '',
        act: '',
        section: '',
        caseType: '',
      });
    }
  };

  // Manual search form fields
  const [manualForm, setManualForm] = useState({
    caseName: '',
    judgeName: '',
    court: '',
    section: '',
    act: '',
    legalTopic: '',
    keywords: '',
    citation: '',
    year: '',
    state: '',
    country: 'India',
  });

  const [manualSearchQuery, setManualSearchQuery] = useState('');

  // Modal open triggers
  const [isCaseListOpen, setIsCaseListOpen] = useState(false);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedPrecedent, setSelectedPrecedent] = useState<any | null>(null);
  
  // AI interactions state
  const [activePrecedentAiResponse, setActivePrecedentAiResponse] = useState<string | null>(null);
  const [aiActionType, setAiActionType] = useState<string | null>(null);

  // AI Intelligence & Comparison Reports State
  const [intelligenceReports, setIntelligenceReports] = useState<{[key: string]: string}>({});
  const [comparisonReports, setComparisonReports] = useState<{[key: string]: string}>({});
  const [activeTab, setActiveTab] = useState<'intelligence' | 'comparison' | 'actions'>('intelligence');

  const handleTabChange = (tab: 'intelligence' | 'comparison' | 'actions') => {
    setActiveTab(tab);
    // Smooth reset scroll position to top
    setTimeout(() => {
      detailsScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 50);

    if (tab === 'intelligence') {
      triggerIntelligenceReport(selectedPrecedent);
    } else if (tab === 'comparison') {
      triggerComparisonReport(selectedPrecedent);
    } else {
      setActivePrecedentAiResponse(null);
    }
  };

  const getLightweightPrecedent = (precedent: any) => {
    if (!precedent) return null;
    return {
      _id: precedent._id || null,
      case_name: precedent.case_identity?.case_name || precedent.case_name || '',
      citation: precedent.case_identity?.citation || precedent.citation || '',
      court: precedent.case_identity?.court || precedent.court || '',
      year: precedent.case_identity?.year || precedent.year || ''
    };
  };

  const triggerIntelligenceReport = async (precedent: any) => {
    const precedentId = precedent._id || precedent.case_identity?.case_name || precedent.case_name;
    if (intelligenceReports[precedentId]) {
      setActivePrecedentAiResponse(intelligenceReports[precedentId]);
      return;
    }
    
    setIsAiLoading(true);
    setActivePrecedentAiResponse(null);
    try {
      const response = await ResearchService.analyzePrecedent(
        'intelligence_report',
        getLightweightPrecedent(precedent),
        activeCaseId,
        'English'
      );
      const analysisData = response && (response as any).success && (response as any).data
        ? (response as any).data
        : response;
      if (analysisData && analysisData.analysis) {
        setIntelligenceReports(prev => ({ ...prev, [precedentId]: analysisData.analysis }));
        setActivePrecedentAiResponse(analysisData.analysis);
      } else {
        showToast('error', 'AI Analysis Failed', 'Unable to retrieve Intelligence Report.');
      }
    } catch (err) {
      console.error('Intelligence Report generation failed:', err);
      showToast('error', 'Error', 'Failed to reach AI analysis engine.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const triggerComparisonReport = async (precedent: any) => {
    const precedentId = precedent._id || precedent.case_identity?.case_name || precedent.case_name;
    if (comparisonReports[precedentId]) {
      setActivePrecedentAiResponse(comparisonReports[precedentId]);
      return;
    }
    
    setIsAiLoading(true);
    setActivePrecedentAiResponse(null);
    try {
      const response = await ResearchService.analyzePrecedent(
        'compare',
        getLightweightPrecedent(precedent),
        activeCaseId,
        'English'
      );
      const analysisData = response && (response as any).success && (response as any).data
        ? (response as any).data
        : response;
      if (analysisData && analysisData.analysis) {
        setComparisonReports(prev => ({ ...prev, [precedentId]: analysisData.analysis }));
        setActivePrecedentAiResponse(analysisData.analysis);
      } else {
        showToast('error', 'AI Comparison Failed', 'Unable to retrieve Comparison Report.');
      }
    } catch (err) {
      console.error('AI Comparison failed:', err);
      showToast('error', 'Error', 'Failed to reach AI comparison engine.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const cleanMarkdownText = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Strip bold **
      .replace(/\*(.*?)\*/g, '$1')     // Strip italic *
      .replace(/__(.*?)__/g, '$1')     // Strip bold __
      .replace(/_(.*?)_/g, '$1')       // Strip italic _
      .replace(/`(.*?)`/g, '$1')       // Strip code backticks
      .replace(/---/g, '')             // Strip horizontal rules
      .replace(/#/g, '')               // Strip hashes
      .trim();
  };

  const cleanAiNoise = (text: string): string => {
    return text
      .replace(/As an AI\s*(?:assistant|legal assistant)?(?:\s*,)?\s*(?:I can only|I must|I am limit|I cannot|I assume|I need|I will)\s*[^.\n]*[.\n]/gi, '')
      .replace(/Based on the available (?:data|information|documents|context)(:\s*)?(?:\s*,)?\s*/gi, '')
      .replace(/I assume that\s*/gi, '')
      .replace(/I cannot\s*[^.\n]*[.\n]/gi, '')
      .replace(/Here is the\s*(?:Intelligence Report|AI Comparison|Smart Actions|analysis)[^.\n]*[.\n]/gi, '')
      .replace(/Sure, here is\s*[^.\n]*[.\n]/gi, '')
      .replace(/Please find the\s*[^.\n]*[.\n]/gi, '')
      .replace(/According to the available documents,?\s*/gi, '')
      .trim();
  };

  const splitLongParagraph = (text: string): string[] => {
    if (text.length < 250) return [text];
    const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text];
    const paragraphs: string[] = [];
    let current = '';
    
    sentences.forEach((sentence) => {
      if ((current + sentence).length > 250) {
        if (current.trim()) {
          paragraphs.push(current.trim());
        }
        current = sentence;
      } else {
        current += sentence;
      }
    });
    if (current.trim()) {
      paragraphs.push(current.trim());
    }
    return paragraphs;
  };

  const matchCallout = (line: string) => {
    const clean = cleanMarkdownText(line);
    const lower = clean.toLowerCase();
    
    if (lower.startsWith('legal principle:') || lower.startsWith('ratio decidendi:')) {
      return {
        type: 'blue',
        label: 'Legal Principle',
        icon: 'library-outline',
        content: clean.substring(clean.indexOf(':') + 1).trim()
      };
    }
    if (lower.startsWith('court held:') || lower.startsWith('held:') || lower.startsWith('verdict:')) {
      return {
        type: 'green',
        label: 'Court Held',
        icon: 'checkmark-circle-outline',
        content: clean.substring(clean.indexOf(':') + 1).trim()
      };
    }
    if (lower.startsWith('warning:') || lower.startsWith('caution:')) {
      return {
        type: 'orange',
        label: 'Warning',
        icon: 'warning-outline',
        content: clean.substring(clean.indexOf(':') + 1).trim()
      };
    }
    if (lower.startsWith('observation:') || lower.startsWith('important observation:') || lower.startsWith('note:') || lower.startsWith('important note:')) {
      return {
        type: 'purple',
        label: 'Important Observation',
        icon: 'eye-outline',
        content: clean.substring(clean.indexOf(':') + 1).trim()
      };
    }
    if (lower.startsWith('limitation:') || lower.startsWith('weakness:') || lower.startsWith('critical limitation:')) {
      return {
        type: 'red',
        label: 'Critical Limitation',
        icon: 'alert-circle-outline',
        content: clean.substring(clean.indexOf(':') + 1).trim()
      };
    }
    return null;
  };

  const getSectionIconAndTitle = (rawTitle: string) => {
    const title = rawTitle.replace(/^\d+[\.\s\-]+/, '').replace(/:$/, '').trim();
    const lower = title.toLowerCase();
    
    let icon = '⚖️';
    let cleanTitle = title;

    if (lower.includes('fact')) {
      icon = '📋';
      cleanTitle = 'Case Facts';
    } else if (lower.includes('issue')) {
      icon = '❓';
      cleanTitle = 'Legal Issues';
    } else if (lower.includes('reasoning') || lower.includes('held') || lower.includes('holding')) {
      icon = '🧠';
      cleanTitle = 'Court Reasoning';
    } else if (lower.includes('ratio decidendi') || lower.includes('ratio')) {
      icon = '⚖️';
      cleanTitle = 'Ratio Decidendi';
    } else if (lower.includes('takeaway') || lower.includes('key point')) {
      icon = '💡';
      cleanTitle = 'Strategic Takeaways';
    } else if (lower.includes('principle')) {
      icon = '📜';
      cleanTitle = 'Important Principles';
    } else if (lower.includes('section') || lower.includes('law') || lower.includes('act')) {
      icon = '🔗';
      cleanTitle = 'Applicable Sections';
    } else if (lower.includes('similarity') || lower.includes('comparison') || lower.includes('compare')) {
      icon = '🔍';
      cleanTitle = 'Similarity Analysis';
    } else if (lower.includes('note')) {
      icon = '📝';
      cleanTitle = 'Lawyer Notes';
    } else if (lower.includes('verdict') || lower.includes('judgment') || lower.includes('outcome')) {
      icon = '🏆';
      cleanTitle = 'Final Verdict';
    } else if (lower.includes('common')) {
      icon = '🤝';
      cleanTitle = 'Common Facts';
    } else if (lower.includes('different') || lower.includes('difference')) {
      icon = '⚠️';
      cleanTitle = 'Different Facts';
    } else if (lower.includes('strength') || lower.includes('match') || lower.includes('confidence')) {
      icon = '📊';
      cleanTitle = 'Match Strength';
    } else if (lower.includes('plaintiff')) {
      icon = '👤';
      cleanTitle = 'Supports Plaintiff';
    } else if (lower.includes('defendant')) {
      icon = '🛡️';
      cleanTitle = 'Supports Defendant';
    } else if (lower.includes('strategy')) {
      icon = '🎯';
      cleanTitle = 'Legal Strategy';
    } else if (lower.includes('summary')) {
      icon = '📝';
      cleanTitle = 'Summary';
    } else if (lower.includes('explanation')) {
      icon = '📖';
      cleanTitle = 'Simple Explanation';
    } else if (lower.includes('risk')) {
      icon = '🚨';
      cleanTitle = 'Risk Factors';
    } else if (lower.includes('advice') || lower.includes('practical')) {
      icon = '💡';
      cleanTitle = 'Practical Advice';
    } else if (lower.includes('reference') || lower.includes('citations')) {
      icon = '📚';
      cleanTitle = 'Case References';
    }

    return { icon, title: cleanTitle };
  };

  const isReportMetaTitle = (title: string): boolean => {
    const lower = title.toLowerCase();
    return lower.includes('intelligence report') ||
           lower.includes('ai comparison') ||
           lower.includes('smart actions') ||
           lower.includes('master summary') ||
           lower.includes('precedent analysis') ||
           lower.includes('courtroom briefing');
  };

  const parseReportToSections = (text: string) => {
    if (!text) return [];
    
    let cleanedText = cleanAiNoise(text);
    const lines = cleanedText.split('\n');
    const sections: { title: string; icon: string; content: string[] }[] = [];
    
    let currentSection: { title: string; icon: string; content: string[] } | null = null;
    
    const addLineToSection = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (!currentSection) {
        currentSection = { title: 'Overview', icon: '📋', content: [] };
        sections.push(currentSection);
      }
      currentSection.content.push(trimmed);
    };

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      const cleanLine = cleanMarkdownText(trimmedLine);
      if (isReportMetaTitle(cleanLine)) {
        return;
      }

      const isHashHeader = trimmedLine.startsWith('#');
      const lowerClean = cleanLine.toLowerCase();
      
      const isKnownHeader = 
        lowerClean.startsWith('case facts') ||
        lowerClean.startsWith('legal issues') ||
        lowerClean.startsWith('court reasoning') ||
        lowerClean.startsWith('ratio decidendi') ||
        lowerClean.startsWith('strategic takeaways') ||
        lowerClean.startsWith('important principles') ||
        lowerClean.startsWith('applicable sections') ||
        lowerClean.startsWith('similarity analysis') ||
        lowerClean.startsWith('lawyer notes') ||
        lowerClean.startsWith('final verdict') ||
        lowerClean.startsWith('common facts') ||
        lowerClean.startsWith('different facts') ||
        lowerClean.startsWith('applicable principles') ||
        lowerClean.startsWith('strength of match') ||
        lowerClean.startsWith('supports plaintiff') ||
        lowerClean.startsWith('supports defendant') ||
        lowerClean.startsWith('legal strategy') ||
        lowerClean.startsWith('summary') ||
        lowerClean.startsWith('explanation') ||
        lowerClean.startsWith('key takeaways') ||
        lowerClean.startsWith('suggested legal strategy') ||
        lowerClean.startsWith('risk factors') ||
        lowerClean.startsWith('practical advice') ||
        lowerClean.startsWith('important case references') ||
        /^\d+[\.\s\-]+\s*(?:case facts|legal issues|court reasoning|ratio decidendi|strategic takeaways|important principles|applicable sections|similarity analysis|lawyer notes|final verdict|common facts|different facts|applicable principles|strength of match|supports plaintiff|supports defendant|legal strategy|summary|explanation|key takeaways|suggested legal strategy|risk factors|practical advice|important case references)/i.test(lowerClean);

      const isBoldHeader = (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && cleanLine.length < 50);
      const isSectionHeader = isHashHeader || isKnownHeader || isBoldHeader;

      if (isSectionHeader) {
        const titleAndIcon = getSectionIconAndTitle(cleanLine);
        currentSection = {
          title: titleAndIcon.title,
          icon: titleAndIcon.icon,
          content: []
        };
        sections.push(currentSection);
      } else {
        addLineToSection(trimmedLine);
      }
    });

    return sections.filter(sec => sec.content.length > 0);
  };

  const calloutStyles = {
    calloutBlue: {
      backgroundColor: '#EFF6FF',
      borderColor: '#3B82F6',
      iconColor: '#2563EB',
      labelColor: '#1E40AF',
      textColor: '#1E3A8A'
    },
    calloutGreen: {
      backgroundColor: '#ECFDF5',
      borderColor: '#10B981',
      iconColor: '#059669',
      labelColor: '#065F46',
      textColor: '#064E3B'
    },
    calloutOrange: {
      backgroundColor: '#FFFBEB',
      borderColor: '#F59E0B',
      iconColor: '#D97706',
      labelColor: '#92400E',
      textColor: '#78350F'
    },
    calloutPurple: {
      backgroundColor: '#F5F3FF',
      borderColor: '#8B5CF6',
      iconColor: '#7C3AED',
      labelColor: '#5B21B6',
      textColor: '#4C1D95'
    },
    calloutRed: {
      backgroundColor: '#FEF2F2',
      borderColor: '#EF4444',
      iconColor: '#DC2626',
      labelColor: '#991B1B',
      textColor: '#7F1D1D'
    }
  };

  const renderParagraphs = (lines: string[], theme: any) => {
    const items: React.ReactNode[] = [];
    let currentParagraph = '';

    const flushParagraph = (key: string) => {
      if (currentParagraph.trim()) {
        const paragraphs = splitLongParagraph(currentParagraph.trim());
        paragraphs.forEach((pText, pIdx) => {
          items.push(
            <Text key={`${key}_${pIdx}`} style={[styles.richBodyText, { color: theme.textSecondary }]}>
              {cleanMarkdownText(pText)}
            </Text>
          );
        });
        currentParagraph = '';
      }
    };

    lines.forEach((line, lineIdx) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine === '-') {
        flushParagraph(`p_${lineIdx}`);
        return;
      }

      const isBullet = trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.startsWith('•');
      const isNumbered = /^\d+[\.\s\-]+/.test(trimmedLine);

      if (isBullet || isNumbered) {
        flushParagraph(`p_pre_${lineIdx}`);
        
        if (isBullet) {
          const text = cleanMarkdownText(trimmedLine.replace(/^[-*•]\s*/, ''));
          items.push(
            <View key={`b_${lineIdx}`} style={styles.richBulletRow}>
              <Text style={[styles.richBulletPoint, { color: '#6D5DFC' }]}>•</Text>
              <Text style={[styles.richBodyText, { color: theme.textSecondary, flex: 1, marginVertical: 0 }]}>
                {text}
              </Text>
            </View>
          );
        } else {
          const numPrefixMatch = trimmedLine.match(/^(\d+)[\.\s\-]+/);
          const numPrefix = numPrefixMatch ? numPrefixMatch[1] : '1';
          const text = cleanMarkdownText(trimmedLine.replace(/^\d+[\.\s\-]+/, ''));
          items.push(
            <View key={`n_${lineIdx}`} style={styles.richNumberedRow}>
              <Text style={[styles.richNumberedPrefix, { color: '#6D5DFC' }]}>{numPrefix}.</Text>
              <Text style={[styles.richBodyText, { color: theme.textSecondary, flex: 1, marginVertical: 0 }]}>
                {text}
              </Text>
            </View>
          );
        }
      } else {
        const matchedBox = matchCallout(trimmedLine);
        if (matchedBox) {
          flushParagraph(`p_pre_box_${lineIdx}`);
          const boxStyle = calloutStyles[matchedBox.type === 'blue' ? 'calloutBlue' :
                                          matchedBox.type === 'green' ? 'calloutGreen' :
                                          matchedBox.type === 'orange' ? 'calloutOrange' :
                                          matchedBox.type === 'purple' ? 'calloutPurple' : 'calloutRed'];
          items.push(
            <View key={`box_${lineIdx}`} style={[styles.calloutBox, { backgroundColor: boxStyle.backgroundColor, borderColor: boxStyle.borderColor }]}>
              <View style={styles.calloutHeader}>
                <Ionicons name={matchedBox.icon as any} size={15} color={boxStyle.iconColor} style={{ marginRight: 6 }} />
                <Text style={[styles.calloutLabel, { color: boxStyle.labelColor }]}>{matchedBox.label}</Text>
              </View>
              <Text style={[styles.calloutText, { color: boxStyle.textColor }]}>
                {matchedBox.content}
              </Text>
            </View>
          );
        } else {
          currentParagraph += (currentParagraph ? ' ' : '') + trimmedLine;
        }
      }
    });

    flushParagraph(`p_final`);
    return items;
  };

  const generatePrecedentHTML = (precedent: any, intelReport: string, compReport: string, activeResponse: string) => {
    const ci = precedent.case_identity || {};
    const caseName = ci.case_name || precedent.case_name || 'Legal Precedent';
    const court = ci.court || precedent.court || '';
    const year = ci.year || precedent.year || '';
    const citation = ci.citation || precedent.citation || '';
    const bench = ci.bench || precedent.bench || '';
    const relevance = precedent.similarity?.relevance_score || precedent.relevance_score || 0;
    
    const formatSectionHTML = (title: string, text: string) => {
      if (!text) return '';
      const sections = parseReportToSections(text);
      if (sections.length === 0) return `<p>${text}</p>`;
      
      return sections.map(sec => {
        const bodyHTML = sec.content.map(line => {
          const trimmed = line.trim();
          if (!trimmed) return '';
          
          if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
            return `<li>${cleanMarkdownText(trimmed.replace(/^[-*•]\s*/, ''))}</li>`;
          }
          if (/^\d+[\.\s\-]+/.test(trimmed)) {
            return `<li>${cleanMarkdownText(trimmed.replace(/^\d+[\.\s\-]+/, ''))}</li>`;
          }
          
          const matched = matchCallout(trimmed);
          if (matched) {
            let color = '#3B82F6';
            let bg = '#EFF6FF';
            if (matched.type === 'green') { color = '#10B981'; bg = '#ECFDF5'; }
            else if (matched.type === 'orange') { color = '#F59E0B'; bg = '#FFFBEB'; }
            else if (matched.type === 'purple') { color = '#8B5CF6'; bg = '#F5F3FF'; }
            else if (matched.type === 'red') { color = '#EF4444'; bg = '#FEF2F2'; }
            
            return `
              <div style="background-color: ${bg}; border-left: 4px solid ${color}; padding: 12px; margin: 12px 0; border-radius: 4px; font-size: 14px;">
                <strong>${matched.label}</strong>: ${matched.content}
              </div>
            `;
          }
          
          return `<p>${cleanMarkdownText(trimmed)}</p>`;
        }).join('\n');
        
        return `
          <div style="margin-bottom: 24px; page-break-inside: avoid;">
            <h3 style="color: #1E3A8A; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; font-size: 18px; font-weight: bold; margin-top: 20px;">
              ${sec.title}
            </h3>
            ${bodyHTML.includes('<li>') ? `<ul style="line-height: 1.6; font-size: 15px; margin-left: 20px;">${bodyHTML}</ul>` : bodyHTML}
          </div>
        `;
      }).join('\n');
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${caseName}</title>
        <style>
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            color: #1A202C;
            line-height: 1.6;
            margin: 40px;
            font-size: 15px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1E3A8A;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .case-title {
            font-size: 24px;
            font-weight: bold;
            color: #1E3A8A;
            margin-bottom: 10px;
          }
          .metadata-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .metadata-table td {
            padding: 8px 12px;
            border: 1px solid #E2E8F0;
          }
          .metadata-label {
            font-weight: bold;
            background-color: #F7FAFC;
            width: 25%;
          }
          .section-header {
            font-size: 20px;
            font-weight: bold;
            color: #FFFFFF;
            background-color: #1E3A8A;
            padding: 8px 12px;
            margin-top: 40px;
            margin-bottom: 20px;
            border-radius: 4px;
            page-break-after: avoid;
          }
          .page-break {
            page-break-before: always;
          }
          h1, h2, h3, h4 {
            page-break-after: avoid;
          }
          ul, ol {
            margin-bottom: 16px;
          }
          li {
            margin-bottom: 8px;
          }
          p {
            margin-bottom: 12px;
            text-align: justify;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="case-title">${caseName}</div>
          <div style="font-size: 14px; color: #718096; font-style: italic;">
            ${court} ${year ? `• ${year}` : ''} ${citation ? `• ${citation}` : ''}
          </div>
        </div>

        <table class="metadata-table">
          <tr>
            <td class="metadata-label">Court</td>
            <td>${court}</td>
            <td class="metadata-label">Year</td>
            <td>${year}</td>
          </tr>
          <tr>
            <td class="metadata-label">Citation</td>
            <td>${citation || 'N/A'}</td>
            <td class="metadata-label">Bench</td>
            <td>${bench || 'N/A'}</td>
          </tr>
          <tr>
            <td class="metadata-label">Relevance</td>
            <td>${relevance}% Relevant</td>
            <td class="metadata-label">Landmark Status</td>
            <td>${relevance > 80 ? 'Landmark Judgment' : 'Standard Judgment'}</td>
          </tr>
        </table>

        ${intelReport ? `
          <div class="section-header">Intelligence Report</div>
          ${formatSectionHTML('Intelligence Report', intelReport)}
        ` : ''}

        ${compReport ? `
          <div class="page-break"></div>
          <div class="section-header">AI Comparison Analysis</div>
          <div style="background-color: #ECFDF5; border: 1px solid #10B981; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 15px;">
            <strong>Match Confidence</strong>: ${relevance}% Match with current case.
          </div>
          ${formatSectionHTML('AI Comparison Analysis', compReport)}
        ` : ''}

        ${activeResponse && activeResponse !== intelReport && activeResponse !== compReport ? `
          <div class="page-break"></div>
          <div class="section-header">Smart Action Analysis</div>
          ${formatSectionHTML('Smart Action Analysis', activeResponse)}
        ` : ''}

        <div style="margin-top: 50px; border-top: 1px solid #E2E8F0; padding-top: 20px; font-size: 12px; color: #A0AEC0; text-align: center;">
          Generated by Premium AI Legal Research Platform • ${new Date().toLocaleDateString()}
        </div>
      </body>
      </html>
    `;
  };

  const renderFormattedReport = (text: string) => {
    if (!text) return (
      <Text style={{ color: theme.textSecondary, textAlign: 'center', marginVertical: 20 }}>
        No analysis available yet.
      </Text>
    );

    const sections = parseReportToSections(text);
    if (sections.length === 0) {
      return (
        <Text style={{ color: theme.textSecondary, textAlign: 'center', marginVertical: 20 }}>
          No analysis available yet.
        </Text>
      );
    }

    return sections.map((sec, idx) => (
      <View key={idx} style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.sectionCardHeader, { borderBottomColor: theme.border }]}>
          <View style={styles.sectionHeaderIconWrapper}>
            <Text style={styles.sectionCardIcon}>{sec.icon || '⚖️'}</Text>
          </View>
          <Text style={[styles.sectionCardTitle, { color: theme.textPrimary }]}>{sec.title}</Text>
        </View>
        <View style={styles.sectionCardContent}>
          {renderParagraphs(sec.content, theme)}
        </View>
      </View>
    ));
  };

  // New case form state
  const [newCaseForm, setNewCaseForm] = useState({
    name: '',
    clientName: '',
    opponentName: '',
    caseType: 'Civil',
    summary: '',
  });

  // Fetch all case summaries on mount
  useEffect(() => {
    fetchCases();
  }, []);

  // Fetch full active case details when activeCaseId changes
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
      // If there's an active case matching params, set it
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
      } else {
        console.warn('Invalid case details structure:', response);
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
    
    // Validate we have what we need to search
    if (mode === 'CURRENT' && !targetProjectId) {
      setIsCaseListOpen(true);
      return;
    }

    let searchQuery = '';
    if (mode === 'MANUAL') {
      if (manualQueryString) {
        searchQuery = manualQueryString;
      } else {
        searchQuery = manualSearchQuery.trim();
        
        if (!searchQuery) {
          showToast('error', 'Validation Error', 'Please enter a search query.');
          return;
        }
      }
    }

    setIsLoadingSearch(true);
    try {
      const response = await ResearchService.searchPrecedents(
        searchQuery,
        targetProjectId,
        'English' // default language
      );
      
      const searchData = response && (response as any).success && (response as any).data 
        ? (response as any).data 
        : response;

      if (searchData) {
        setSearchResults(searchData.precedents || []);
        setSearchMetadata({
          mode: searchData.mode,
          query: searchData.query,
        });

        if (!searchData.precedents || searchData.precedents.length === 0) {
          showToast('info', 'No Results', 'No matching court precedents found.');
        } else {
          showToast('success', 'Search Complete', `Found ${searchData.precedents.length} relevant precedents.`);
        }
      }
    } catch (err) {
      console.error('Precedent search error:', err);
      showToast('error', 'Search Failed', 'Failed to retrieve precedents from search engine.');
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleCreateNewCase = async () => {
    if (!newCaseForm.name.trim()) {
      showToast('error', 'Validation Error', 'Case Name is required.');
      return;
    }

    setIsLoadingDetails(true);
    setIsNewCaseModalOpen(false);
    try {
      const newCaseData = {
        name: newCaseForm.name.trim(),
        clientName: newCaseForm.clientName.trim() || undefined,
        opponentName: newCaseForm.opponentName.trim() || undefined,
        caseType: newCaseForm.caseType,
        summary: newCaseForm.summary.trim() || undefined,
        stage: 'Pre-litigation' as const,
        priority: 'Medium' as const,
        status: 'Active' as const,
      };

      const response = await CaseService.createCase(newCaseData);
      const caseData = response && (response as any).success && (response as any).data 
        ? (response as any).data 
        : response;
      if (caseData && caseData._id) {
        showToast('success', 'Case Created', `Workspace initialized for: ${newCaseForm.name}`);
        // Reset form
        setNewCaseForm({
          name: '',
          clientName: '',
          opponentName: '',
          caseType: 'Civil',
          summary: '',
        });
        // Reload list and set as active
        await fetchCases();
        setActiveCaseId(caseData._id);
      }
    } catch (err) {
      console.error('Create case failed:', err);
      showToast('error', 'Error', 'Failed to initialize new case workspace.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSavePrecedentToWorkspace = async (precedent: any) => {
    const targetCaseId = activeCaseId;
    if (!targetCaseId) {
      showToast('info', 'Select Case', 'Select a case workspace to save this precedent.');
      setIsCaseListOpen(true);
      return;
    }

    let activeCaseDetails = activeCase;
    if (!activeCaseDetails || activeCaseDetails._id !== targetCaseId) {
      try {
        const detailsRes = await CaseService.getCaseDetails(targetCaseId);
        const detailsData = detailsRes && (detailsRes as any).success && (detailsRes as any).data
          ? (detailsRes as any).data
          : detailsRes;
        if (detailsData && detailsData._id) {
          activeCaseDetails = detailsData;
        }
      } catch (err) {
        showToast('error', 'Error', 'Failed to retrieve case details.');
        return;
      }
    }

    if (!activeCaseDetails) return;

    const precedentId = precedent._id || precedent.case_identity?.case_name || precedent.case_name;
    const isAlreadySaved = activeCaseDetails.savedPrecedents?.some(
      (p: any) => (p._id || p.case_identity?.case_name || p.case_name) === precedentId
    );

    if (isAlreadySaved) {
      showToast('info', 'Already Saved', 'Already saved.');
      return;
    }

    try {
      const enrichedPrecedent = {
        ...precedent,
        case_name: precedent.case_identity?.case_name || precedent.case_name || '',
        citation: precedent.case_identity?.citation || precedent.citation || '',
        court: precedent.case_identity?.court || precedent.court || '',
        intelligenceReport: intelligenceReports[precedentId] || '',
        comparisonReport: comparisonReports[precedentId] || '',
        aiSummary: precedent.one_line_summary || precedent.ai_analysis?.one_line_summary || '',
        savedAt: new Date().toISOString(),
      };

      const updatedSaved = [...(activeCaseDetails.savedPrecedents || []), enrichedPrecedent];
      const result = await CaseService.updateCase(targetCaseId, { savedPrecedents: updatedSaved });
      const resultData = result && (result as any).success && (result as any).data
        ? (result as any).data
        : result;
      if (resultData && resultData._id) {
        showToast('success', 'Saved', 'Case saved successfully.');
        if (activeCaseId === targetCaseId) {
          setActiveCase(resultData);
        }
        fetchCases(); // reload list metrics
      }
    } catch (err) {
      console.error('Save precedent error:', err);
      showToast('error', 'Save Failed', 'Failed to save precedent.');
    }
  };

  const handleAiAction = async (actionType: string, precedentData: any) => {
    setAiActionType(actionType);
    setIsAiLoading(true);
    setActivePrecedentAiResponse(null);

    try {
      const response = await ResearchService.analyzePrecedent(
        actionType,
        getLightweightPrecedent(precedentData),
        activeCaseId,
        'English'
      );
      const analysisData = response && (response as any).success && (response as any).data
        ? (response as any).data
        : response;
      if (analysisData && analysisData.analysis) {
        setActivePrecedentAiResponse(analysisData.analysis);
      } else {
        showToast('error', 'AI Analysis Failed', 'Unable to retrieve AI analysis.');
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      showToast('error', 'Error', 'Failed to reach AI analysis engine.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopyCitation = (precedent: any) => {
    const { case_identity = {} } = precedent;
    const name = case_identity.case_name || precedent.case_name || 'Unknown Case';
    const court = case_identity.court || precedent.court || '';
    const year = case_identity.year || precedent.year || '';
    const citation = case_identity.citation || precedent.citation || 'Citation unavailable';

    let textToCopy = `${name}`;
    if (court) textToCopy += `, ${court}`;
    if (year) textToCopy += ` (${year})`;
    if (citation && citation !== 'Citation unavailable') textToCopy += `, ${citation}`;

    Clipboard.setString(textToCopy);
    showToast('success', 'Copied', 'Citation copied successfully.');
  };

  const handleOpenFile = async (fileUri: string) => {
    try {
      const mimeType = 'application/pdf';
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
      console.error('Error opening file, falling back to share:', err);
      try {
        await Sharing.shareAsync(fileUri);
      } catch (shareErr) {
        showToast('error', 'Open Failed', 'No compatible app found to open this file.');
      }
    }
  };

  const handleDownloadPDF = async (precedent: any) => {
    const precedentId = precedent._id || precedent.case_identity?.case_name || precedent.case_name;
    const intelReport = intelligenceReports[precedentId] || '';
    const compReport = comparisonReports[precedentId] || '';
    const activeResponse = activePrecedentAiResponse || '';

    showToast('info', 'Generating PDF', 'Compiling judgment report to PDF...');
    
    try {
      const rawName = precedent.case_identity?.case_name || precedent.case_name || 'Legal Precedent';
      const safeName = rawName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Report_${safeName}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;

      const html = generatePrecedentHTML(precedent, intelReport, compReport, activeResponse);
      const { uri } = await Print.printToFileAsync({ html });
      
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }
      await FileSystem.copyAsync({ from: uri, to: fileUri });

      showToast('success', 'PDF Saved', 'PDF downloaded successfully.');

      Alert.alert(
        "PDF Export Complete",
        "Professional judgment report saved locally.",
        [
          { text: "Share PDF", onPress: () => Sharing.shareAsync(fileUri) },
          { text: "Open PDF", onPress: () => handleOpenFile(fileUri) },
          { text: "Close", style: "cancel" }
        ]
      );
    } catch (err: any) {
      console.error('PDF generation error:', err);
      showToast('error', 'Export Failed', 'Failed to generate PDF document.');
    }
  };

  // Local filter logic
  const filteredResults = searchResults.filter((item) => {
    const ci = item.case_identity || {};
    const jb = item.judgment_basis || {};
    
    if (filters.court && !ci.court?.toLowerCase().includes(filters.court.toLowerCase())) return false;
    if (filters.judge && !ci.bench?.toLowerCase().includes(filters.judge.toLowerCase())) return false;
    if (filters.year && ci.year?.toString() !== filters.year.trim()) return false;
    if (filters.state && !ci.district?.toLowerCase().includes(filters.state.toLowerCase()) && !ci.area?.toLowerCase().includes(filters.state.toLowerCase())) return false;
    if (filters.act && !jb.relevant_laws?.some((law: string) => law.toLowerCase().includes(filters.act.toLowerCase()))) return false;
    if (filters.section && !jb.relevant_laws?.some((law: string) => law.toLowerCase().includes(filters.section.toLowerCase()))) return false;
    if (filters.caseType && !item.tags?.some((tag: string) => tag.toLowerCase() === filters.caseType.toLowerCase()) && !item.case_identity?.area?.toLowerCase().includes(filters.caseType.toLowerCase())) return false;
    
    return true;
  });

  const clearFilters = () => {
    setFilters({
      court: '',
      judge: '',
      year: '',
      state: '',
      act: '',
      section: '',
      caseType: '',
    });
    setIsFilterModalOpen(false);
  };

  const renderCaseHeaderTitle = (name: string, theme: any) => {
    const parts = name.split(/\s+(?:vs|v|versus)\.?\s+/i);
    if (parts.length === 2) {
      return (
        <View style={styles.compactNameContainer}>
          <Text style={[styles.compactNameText, { color: theme.textPrimary }]}>{parts[0].trim()}</Text>
          <Text style={[styles.compactVsText, { color: theme.textSecondary }]}>vs</Text>
          <Text style={[styles.compactNameText, { color: theme.textPrimary }]}>{parts[1].trim()}</Text>
        </View>
      );
    }
    return <Text style={[styles.compactSingleNameText, { color: theme.textPrimary }]}>{name}</Text>;
  };

  const renderCaseInfoCard = (theme: any) => {
    if (!selectedPrecedent) return null;
    
    const court = selectedPrecedent.case_identity?.court || selectedPrecedent.court || 'Court';
    const year = selectedPrecedent.case_identity?.year || selectedPrecedent.year || '';
    const citation = selectedPrecedent.case_identity?.citation || selectedPrecedent.citation || '';
    const bench = selectedPrecedent.case_identity?.bench || selectedPrecedent.bench || '';
    const relevance = selectedPrecedent.similarity?.relevance_score || selectedPrecedent.relevance_score || 0;
    const isLandmark = relevance > 80 || (citation && citation !== 'Citation unavailable' && citation !== 'Unpublished');

    return (
      <View style={[styles.compactInfoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {renderCaseHeaderTitle(selectedPrecedent.case_identity?.case_name || selectedPrecedent.case_name || 'Legal Precedent', theme)}
        
        <View style={styles.compactChipsRow}>
          <View style={[styles.compactChip, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="library-outline" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.compactChipText, { color: theme.textPrimary }]}>{court}</Text>
          </View>
          
          {year && (
            <View style={[styles.compactChip, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="calendar-outline" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.compactChipText, { color: theme.textPrimary }]}>{year}</Text>
            </View>
          )}

          {citation && citation !== 'Citation unavailable' && (
            <View style={[styles.compactChip, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="book-outline" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.compactChipText, { color: theme.textPrimary }]} numberOfLines={1}>{citation}</Text>
            </View>
          )}

          {bench && (
            <View style={[styles.compactChip, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="people-outline" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.compactChipText, { color: theme.textPrimary }]} numberOfLines={1}>{bench}</Text>
            </View>
          )}

          {selectedPrecedent.tags?.[0] && (
            <View style={[styles.compactChip, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="pricetag-outline" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.compactChipText, { color: theme.textPrimary }]}>{selectedPrecedent.tags[0]}</Text>
            </View>
          )}

          {isLandmark && (
            <View style={[styles.compactChip, { backgroundColor: 'rgba(217, 119, 6, 0.08)' }]}>
              <Ionicons name="star" size={12} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={[styles.compactChipText, { color: '#D97706', fontWeight: '800' }]}>Landmark</Text>
            </View>
          )}

          <View style={[styles.compactChip, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
            <Ionicons name="sparkles" size={12} color="#10B981" style={{ marginRight: 4 }} />
            <Text style={[styles.compactChipText, { color: '#10B981', fontWeight: '800' }]}>{relevance}% Relevant</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSkeletonReport = () => {
    return (
      <Animated.View style={{ opacity: pulseAnim }}>
        <View style={{ gap: 16 }}>
          {[1, 2, 3].map((key) => (
            <View key={key} style={[styles.skeletonCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.skeletonCardHeader}>
                <View style={[styles.skeletonBlock, { width: 28, height: 28, borderRadius: 14 }]} />
                <View style={[styles.skeletonBlock, { width: '45%', height: 16 }]} />
              </View>
              <View style={{ gap: 8, marginTop: 12 }}>
                <View style={[styles.skeletonBlock, { width: '90%', height: 12 }]} />
                <View style={[styles.skeletonBlock, { width: '95%', height: 12 }]} />
                <View style={[styles.skeletonBlock, { width: '70%', height: 12 }]} />
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>⚖️ Legal Precedents</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Advanced Judgment Discovery Engine</Text>
          </View>
        </View>
      </View>

      {/* Mode Toggle & Project Bar */}
      <View style={styles.modeBar}>
        <View style={[styles.toggleContainer, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'CURRENT' && { backgroundColor: theme.surface }]}
            onPress={() => handleSwitchMode('CURRENT')}
          >
            {mode === 'CURRENT' && <Ionicons name="checkmark-circle" size={14} color="#6D5DFC" style={{ marginRight: 4 }} />}
            <Text style={[styles.toggleText, { color: mode === 'CURRENT' ? '#6D5DFC' : theme.textSecondary }]}>Current Case</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'MANUAL' && { backgroundColor: theme.surface }]}
            onPress={() => handleSwitchMode('MANUAL')}
          >
            {mode === 'MANUAL' && <Ionicons name="checkmark-circle" size={14} color="#6D5DFC" style={{ marginRight: 4 }} />}
            <Text style={[styles.toggleText, { color: mode === 'MANUAL' ? '#6D5DFC' : theme.textSecondary }]}>Manual Search</Text>
          </TouchableOpacity>
        </View>

        {mode === 'CURRENT' && activeCase && (
          <View style={[styles.caseBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.caseBadgeIndicator} />
            <Text style={[styles.caseBadgeText, { color: theme.textPrimary }]} numberOfLines={1}>
              {activeCase.name}
            </Text>
            <TouchableOpacity onPress={() => setActiveCaseId(null)} style={styles.changeCaseBtn}>
              <Text style={styles.changeCaseBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {mode === 'MANUAL' && (
          <View style={[styles.searchBarContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchBarIcon} />
            <TextInput
              style={[styles.searchBarInput, { color: theme.textPrimary }]}
              placeholder="Search case law by topic, issue, or keyword..."
              placeholderTextColor={theme.placeholder}
              value={manualSearchQuery}
              onChangeText={setManualSearchQuery}
              onSubmitEditing={() => handlePrecedentSearch()}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBarButton} onPress={() => handlePrecedentSearch()}>
              <Text style={styles.searchBarButtonText}>SEARCH</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoadingDetails ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6D5DFC" />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Extracting case facts & context...</Text>
          </View>
        ) : mode === 'CURRENT' && !activeCaseId ? (
          /* Case Selection Screen - Web Parity Layout */
          isLoadingCases ? (
            /* Pulsing skeleton loaders */
            <Animated.View style={{ opacity: pulseAnim }}>
              <View style={{ gap: 16 }}>
                {[1, 2, 3].map((key) => (
                  <View key={key} style={[styles.caseCardSkeleton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.skeletonRow}>
                      <View style={[styles.skeletonBlock, { width: '50%', height: 16 }]} />
                      <View style={[styles.skeletonBlock, { width: '20%', height: 16, borderRadius: 8 }]} />
                    </View>
                    <View style={[styles.skeletonBlock, { width: '80%', height: 12, marginTop: 12 }]} />
                    <View style={[styles.skeletonBlock, { width: '90%', height: 12, marginTop: 8 }]} />
                    <View style={styles.skeletonRow}>
                      <View style={[styles.skeletonBlock, { width: '30%', height: 12, marginTop: 16 }]} />
                      <View style={[styles.skeletonBlock, { width: '40%', height: 24, marginTop: 16, borderRadius: 12 }]} />
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : cases.length === 0 ? (
            /* Empty State */
            <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="briefcase-outline" size={54} color="#94A3B8" />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Cases Found</Text>
              <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                Create your first case to begin AI-powered legal precedent research.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setIsNewCaseModalOpen(true)}>
                <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryButtonText}>Create New Case</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Case List matching web version in single column vertical layout */
            <View style={{ gap: 16 }}>
              <View style={styles.casesListHeader}>
                <View style={[styles.casesListHeaderIconContainer, { backgroundColor: 'rgba(109, 93, 252, 0.05)' }]}>
                  <Ionicons name="folder-open" size={18} color="#6D5DFC" />
                </View>
                <Text style={[styles.casesListHeaderTitle, { color: theme.textPrimary }]}>
                  Select a Case
                </Text>
                <Text style={[styles.casesListHeaderDesc, { color: theme.textSecondary }]}>
                  Choose a case workspace to analyze details and precedents.
                </Text>
              </View>

              {cases.map((c) => {
                const updatedDate = new Date(c.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });

                // Status colors
                const statusColor = c.status === 'Active' ? '#10B981' : c.status === 'Closed' ? '#6B7280' : '#F59E0B';
                const statusBg = c.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : c.status === 'Closed' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(245, 158, 11, 0.1)';

                // Priority colors
                const priorityColor = c.priority === 'Urgent' ? '#EF4444' : c.priority === 'High' ? '#F59E0B' : c.priority === 'Medium' ? '#3B82F6' : '#10B981';

                return (
                  <Pressable
                    key={c._id}
                    style={({ pressed }) => [
                      styles.webCaseCard,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      pressed && { opacity: 0.95 },
                    ]}
                    onPress={() => setActiveCaseId(c._id)}
                  >
                    <View style={styles.webCaseCardHeader}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.webCaseCardName, { color: theme.textPrimary }]} numberOfLines={1}>
                          {c.name}
                        </Text>
                        
                        <View style={styles.webCaseCardMetaRow}>
                          {c.clientName && (
                            <>
                              <Text style={[styles.webCaseCardMetaText, { color: theme.textSecondary }]}>
                                Client: {c.clientName}
                              </Text>
                              <Text style={{ color: theme.textMuted }}>•</Text>
                            </>
                          )}
                          <Text style={[styles.webCaseCardMetaText, { color: theme.textSecondary }]} numberOfLines={1}>
                            Court: {(c as any).courtName || (c as any).jurisdiction || 'District Court'}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{c.status}</Text>
                      </View>
                    </View>

                    {/* Short Description */}
                    <Text style={[styles.webCaseCardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                      {(c as any).summary || (c as any).caseSummary || 'No case summary provided.'}
                    </Text>

                    {/* Divider */}
                    <View style={[styles.webCaseCardDivider, { backgroundColor: theme.border }]} />

                    <View style={styles.webCaseCardFooter}>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        {/* Type Badge */}
                        <View style={[styles.webCaseCardBadge, { backgroundColor: theme.surfaceVariant }]}>
                          <Text style={[styles.webCaseCardBadgeText, { color: theme.textSecondary }]}>
                            {c.caseType || 'General'}
                          </Text>
                        </View>

                        {/* Priority Pill */}
                        <View style={[styles.priorityPillMini, { borderColor: priorityColor }]}>
                          <Text style={[styles.priorityPillMiniText, { color: priorityColor }]}>{c.priority}</Text>
                        </View>
                      </View>

                      <View style={styles.webCaseCardFooterRow}>
                        <Text style={[styles.webCaseCardDate, { color: theme.textMuted }]}>
                          {updatedDate}
                        </Text>
                        <TouchableOpacity 
                          style={styles.analyzeTextButton} 
                          onPress={() => setActiveCaseId(c._id)}
                        >
                          <Text style={styles.analyzeTextButtonText}>ANALYZE PRECEDENTS</Text>
                          <Ionicons name="arrow-forward" size={12} color="#6D5DFC" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Pressable>
                );
              })}

              {/* Dotted / Dashed New Case Card at the very end */}
              <Pressable
                style={({ pressed }) => [
                  styles.webNewCaseCardDashed,
                  { borderColor: theme.border },
                  pressed && { backgroundColor: theme.surfaceVariant, opacity: 0.95 },
                ]}
                onPress={() => setIsNewCaseModalOpen(true)}
              >
                <View style={[styles.webNewCaseCardIconCircle, { backgroundColor: theme.surface }]}>
                  <Ionicons name="add" size={24} color={theme.textSecondary} />
                </View>
                <Text style={[styles.webNewCaseCardLabel, { color: theme.textSecondary }]}>NEW CASE</Text>
              </Pressable>
            </View>
          )
        ) : isLoadingSearch ? (
          /* Search Loader view */
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6D5DFC" />
            <Text style={[styles.loadingText, { color: theme.textPrimary, fontWeight: '700' }]}>Analyzing facts & matching precedents...</Text>
            <Text style={[styles.loadingSubtext, { color: theme.textSecondary }]}>Cross-referencing legal databases for relevant judgments...</Text>
          </View>
        ) : mode === 'MANUAL' && searchResults.length === 0 ? (
          /* Empty Search State for Manual Mode */
          <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 16 }]}>
            <Ionicons name="book-outline" size={54} color="#94A3B8" />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary, fontSize: 16 }]}>No Precedents Found</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary, maxWidth: 260 }]}>
              Enter a search query to discover relevant case laws and legal principles.
            </Text>
          </View>
        ) : (
          /* Search results listing */
          <View style={{ gap: 16, marginTop: mode === 'MANUAL' ? 16 : 0 }}>
            {searchMetadata && searchMetadata.query ? (
              <View style={[styles.searchQueryBanner, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Ionicons name="sparkles" size={14} color="#6D5DFC" style={{ marginRight: 6 }} />
                <Text style={[styles.searchQueryBannerText, { color: theme.textSecondary }]}>
                  {mode === 'MANUAL' ? 'Search Results for: ' : 'Searching precedents for: '}
                  <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>"{searchMetadata.query}"</Text>
                </Text>
              </View>
            ) : null}
            {/* Filter Toggle and Actions bar */}
            <View style={styles.resultsActionsRow}>
              <Text style={[styles.resultsHeaderTitle, { color: theme.textPrimary }]}>
                Search Results ({filteredResults.length})
              </Text>
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.actionIconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => setIsFilterModalOpen(true)}
                >
                  <Ionicons name="filter-outline" size={16} color={theme.textPrimary} />
                  <Text style={[styles.actionIconLabel, { color: theme.textPrimary }]}>Filters</Text>
                </TouchableOpacity>

                {mode === 'MANUAL' && (
                  <TouchableOpacity
                    style={[styles.actionIconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => {
                      setSearchResults([]);
                      setSearchMetadata(null);
                      setManualSearchQuery('');
                    }}
                  >
                    <Ionicons name="refresh-outline" size={16} color={theme.textPrimary} />
                    <Text style={[styles.actionIconLabel, { color: theme.textPrimary }]}>Reset</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {filteredResults.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Precedents Found</Text>
                <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>Try adjusting your filters or search keywords.</Text>
                <TouchableOpacity style={styles.outlineButton} onPress={clearFilters}>
                  <Text style={{ color: '#6D5DFC' }}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredResults.map((item, index) => {
                const ci = item.case_identity || {};
                const similarity = item.similarity || {};
                const jb = item.judgment_basis || {};
                const context = item.case_context || {};
                const outcome = item.judgment_outcome || {};

                const cardCitation = ci.citation || item.citation || 'Citation unavailable';
                const cardSummary = item.one_line_summary || item.ai_analysis?.one_line_summary || context.facts || item.facts || item.summary || 'Summary unavailable.';
                const cardPrinciple = item.legal_principle || item.ai_analysis?.legal_principle || jb.principles_applied?.[0] || 'Refer to full report.';
                const cardSections = item.applicable_sections || item.ai_analysis?.applicable_sections || jb.relevant_laws || [];

                return (
                  <Pressable
                    key={index}
                    style={({ pressed }) => [
                      styles.resultCard,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      pressed && { opacity: 0.95 },
                    ]}
                    onPress={() => {
                      setSelectedPrecedent(item);
                      setActiveTab('intelligence');
                      triggerIntelligenceReport(item);
                    }}
                  >
                    <View style={styles.resultCardHeader}>
                      <Text style={[styles.resultCardTitle, { color: theme.textPrimary, flex: 1, paddingRight: 8 }]} numberOfLines={2}>
                        {ci.case_name || item.case_name}
                      </Text>
                      <View style={[styles.relevanceTag, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Text style={styles.relevanceTagText}>
                          {similarity.relevance_score || item.relevance_score || 0}% Match
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.resultCardMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                      {ci.court || item.court}  •  {ci.year || item.year}  •  {cardCitation !== 'Citation unavailable' ? cardCitation : 'Unpublished'}
                    </Text>

                    <Text style={[styles.resultFactsPreview, { color: theme.textSecondary }]} numberOfLines={2}>
                      "{cardSummary}"
                    </Text>

                    <View style={[styles.compactLegalBox, { backgroundColor: theme.surfaceVariant }]}>
                      <Text style={[styles.legalPrincipleValue, { color: theme.textPrimary }]} numberOfLines={2}>
                        <Text style={{ fontWeight: '800', color: theme.textSecondary, fontSize: 11 }}>PRINCIPLE: </Text>
                        {cardPrinciple}
                      </Text>
                    </View>

                    <View style={styles.tagsContainer}>
                      {item.tags?.slice(0, 3).map((tag: string, i: number) => (
                        <View key={i} style={[styles.tag, { backgroundColor: theme.surfaceVariant }]}>
                          <Text style={[styles.tagText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {tag}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.resultActionsRow}>
                      <TouchableOpacity 
                        style={[styles.primaryButton, { flex: 1, paddingVertical: 8, height: 38 }]}
                        onPress={() => {
                          setSelectedPrecedent(item);
                          setActiveTab('intelligence');
                          triggerIntelligenceReport(item);
                        }}
                      >
                        <Text style={styles.primaryButtonText}>Analyze Intelligence →</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleCopyCitation(item)}
                        style={[styles.compactIconButton, { height: 38, width: 38 }]}
                      >
                        <Ionicons name="copy-outline" size={16} color="#6D5DFC" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleSavePrecedentToWorkspace(item)}
                        style={[styles.compactIconButton, { height: 38, width: 38 }]}
                      >
                        <Ionicons
                          name={activeCase?.savedPrecedents?.some((p: any) => (p._id || p.case_identity?.case_name) === (item._id || item.case_identity?.case_name)) ? "bookmark" : "bookmark-outline"}
                          size={16}
                          color={activeCase?.savedPrecedents?.some((p: any) => (p._id || p.case_identity?.case_name) === (item._id || item.case_identity?.case_name)) ? "#D97706" : "#6D5DFC"}
                        />
                      </TouchableOpacity>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Case Selection Modal */}
      <Modal visible={isCaseListOpen} transparent animationType="slide" onRequestClose={() => setIsCaseListOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsCaseListOpen(false)} />
          <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Choose Case Workspace</Text>
              <TouchableOpacity onPress={() => setIsCaseListOpen(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {cases.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>No cases created yet.</Text>
                </View>
              ) : (
                cases.map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={[
                      styles.caseListItem,
                      { borderColor: theme.border },
                      activeCaseId === c._id && { backgroundColor: 'rgba(109, 93, 252, 0.1)', borderColor: '#6D5DFC' },
                    ]}
                    onPress={() => {
                      setActiveCaseId(c._id);
                      setIsCaseListOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.caseListTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={[styles.caseListSubtitle, { color: theme.textSecondary }]}>{c.caseType || 'General'}</Text>
                    </View>
                    {activeCaseId === c._id && <Ionicons name="checkmark-circle" size={20} color="#6D5DFC" />}
                  </TouchableOpacity>
                ))
              )}
              
              <TouchableOpacity
                style={[styles.outlineButton, { marginTop: 12, marginBottom: 24, borderColor: theme.border }]}
                onPress={() => {
                  setIsCaseListOpen(false);
                  setIsNewCaseModalOpen(true);
                }}
              >
                <Ionicons name="add" size={18} color="#6D5DFC" style={{ marginRight: 6 }} />
                <Text style={{ color: '#6D5DFC', fontWeight: '700' }}>Create New Case Workspace</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* New Case Creation Modal */}
      <Modal visible={isNewCaseModalOpen} transparent animationType="fade" onRequestClose={() => setIsNewCaseModalOpen(false)}>
        <View style={styles.modalOverlayCentered}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsNewCaseModalOpen(false)} />
          <View style={[styles.centerModal, { backgroundColor: theme.surface }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>+ New Case Workspace</Text>
              <TouchableOpacity onPress={() => setIsNewCaseModalOpen(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Case Name *</Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="e.g. Rajesh Sharma vs Amit Verma"
                  placeholderTextColor={theme.placeholder}
                  value={newCaseForm.name}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Client Name</Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="e.g. Rajesh Sharma"
                  placeholderTextColor={theme.placeholder}
                  value={newCaseForm.clientName}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, clientName: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Opponent Name</Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="e.g. Amit Verma"
                  placeholderTextColor={theme.placeholder}
                  value={newCaseForm.opponentName}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, opponentName: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Case Type</Text>
                <View style={styles.pickerWrapper}>
                  {CASE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.selectOption,
                        newCaseForm.caseType === type && { backgroundColor: '#6D5DFC', borderColor: '#6D5DFC' },
                      ]}
                      onPress={() => setNewCaseForm({ ...newCaseForm, caseType: type })}
                    >
                      <Text style={[styles.selectOptionText, newCaseForm.caseType === type && { color: '#FFFFFF' }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Case Facts/Summary Brief</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput, { borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Provide a short description of the controversy or case facts..."
                  placeholderTextColor={theme.placeholder}
                  multiline
                  numberOfLines={3}
                  value={newCaseForm.summary}
                  onChangeText={(text) => setNewCaseForm({ ...newCaseForm, summary: text })}
                />
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleCreateNewCase}>
                <Text style={styles.primaryButtonText}>Initialize Case Workspace</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Local Filter Modal */}
      <Modal visible={isFilterModalOpen} transparent animationType="slide" onRequestClose={() => setIsFilterModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsFilterModalOpen(false)} />
          <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Filter Precedents</Text>
              <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetScroll} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Filter by Court</Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="e.g. Supreme Court"
                  placeholderTextColor={theme.placeholder}
                  value={filters.court}
                  onChangeText={(text) => setFilters({ ...filters, court: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Filter by Bench / Judge</Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="e.g. DY Chandrachud"
                  placeholderTextColor={theme.placeholder}
                  value={filters.judge}
                  onChangeText={(text) => setFilters({ ...filters, judge: text })}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Filter by Year</Text>
                  <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="e.g. 2018"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="numeric"
                    value={filters.year}
                    onChangeText={(text) => setFilters({ ...filters, year: text })}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1.5 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Filter by State/District</Text>
                  <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="e.g. Delhi"
                    placeholderTextColor={theme.placeholder}
                    value={filters.state}
                    onChangeText={(text) => setFilters({ ...filters, state: text })}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.inputGroup, { flex: 1.5 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Filter by Act</Text>
                  <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="e.g. NI Act"
                    placeholderTextColor={theme.placeholder}
                    value={filters.act}
                    onChangeText={(text) => setFilters({ ...filters, act: text })}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Filter by Section</Text>
                  <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="e.g. 138"
                    placeholderTextColor={theme.placeholder}
                    value={filters.section}
                    onChangeText={(text) => setFilters({ ...filters, section: text })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Filter by Case Type</Text>
                <View style={styles.pickerWrapper}>
                  {CASE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.selectOption,
                        filters.caseType === type && { backgroundColor: '#6D5DFC', borderColor: '#6D5DFC' },
                      ]}
                      onPress={() => setFilters({ ...filters, caseType: filters.caseType === type ? '' : type })}
                    >
                      <Text style={[styles.selectOptionText, filters.caseType === type && { color: '#FFFFFF' }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity style={[styles.outlineButton, { flex: 1, borderColor: theme.border }]} onPress={clearFilters}>
                  <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Reset Filters</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { flex: 1.5 }]} onPress={() => setIsFilterModalOpen(false)}>
                  <Text style={styles.primaryButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Precedent Details & AI Actions Modal */}
      {selectedPrecedent && (() => {
        const precedentId = selectedPrecedent._id || selectedPrecedent.case_identity?.case_name || selectedPrecedent.case_name;
        const isAlreadySaved = activeCase?.savedPrecedents?.some(
          (p: any) => (p._id || p.case_identity?.case_name || p.case_name) === precedentId
        ) || false;

        return (
          <Modal visible={true} transparent animationType="slide" onRequestClose={() => setSelectedPrecedent(null)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.detailsModal, { backgroundColor: theme.surface }]}>
                {/* Modal Header */}
                <View style={[styles.detailsHeaderBlock, { borderBottomColor: theme.border }]}>
                  <TouchableOpacity onPress={() => setSelectedPrecedent(null)} style={styles.headerLeftBtn}>
                    <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
                  </TouchableOpacity>
                  
                  <View style={styles.headerTitleBlock}>
                    <Text style={[styles.headerCaseNameText, { color: theme.textPrimary }]} numberOfLines={2} ellipsizeMode="tail">
                      {selectedPrecedent.case_identity?.case_name || selectedPrecedent.case_name || 'Legal Precedent'}
                    </Text>
                    <Text style={[styles.headerCaseSubText, { color: theme.textSecondary }]} numberOfLines={1}>
                      {`${selectedPrecedent.case_identity?.court || selectedPrecedent.court || 'Court'} • ${selectedPrecedent.case_identity?.year || selectedPrecedent.year || 'Year'}${selectedPrecedent.case_identity?.citation || selectedPrecedent.citation ? ` • ${selectedPrecedent.case_identity?.citation || selectedPrecedent.citation}` : ''}`}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => setSelectedPrecedent(null)} style={styles.headerRightBtn}>
                    <Ionicons name="close" size={24} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Compact Tabs Selector */}
                <View style={[styles.premiumCompactTabBar, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <TouchableOpacity
                    style={[styles.premiumCompactTabButton, activeTab === 'intelligence' && styles.activePremiumCompactTabButton]}
                    onPress={() => handleTabChange('intelligence')}
                  >
                    <Ionicons name="document-text-outline" size={13} color={activeTab === 'intelligence' ? '#6D5DFC' : theme.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.premiumCompactTabButtonText, { color: activeTab === 'intelligence' ? '#6D5DFC' : theme.textSecondary }]}>
                      Intelligence
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.premiumCompactTabButton, activeTab === 'comparison' && styles.activePremiumCompactTabButton]}
                    onPress={() => handleTabChange('comparison')}
                  >
                    <Ionicons name="git-compare-outline" size={13} color={activeTab === 'comparison' ? '#6D5DFC' : theme.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.premiumCompactTabButtonText, { color: activeTab === 'comparison' ? '#6D5DFC' : theme.textSecondary }]}>
                      AI Comparison
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.premiumCompactTabButton, activeTab === 'actions' && styles.activePremiumCompactTabButton]}
                    onPress={() => handleTabChange('actions')}
                  >
                    <Ionicons name="flash-outline" size={13} color={activeTab === 'actions' ? '#6D5DFC' : theme.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.premiumCompactTabButtonText, { color: activeTab === 'actions' ? '#6D5DFC' : theme.textSecondary }]}>
                      Smart Actions
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Modal Content ScrollView */}
                <ScrollView 
                  ref={detailsScrollRef}
                  style={styles.detailsScroll} 
                  contentContainerStyle={{ paddingBottom: 24 }}
                  showsVerticalScrollIndicator={true}
                >
                  {activeTab === 'intelligence' && (
                    <View style={{ paddingBottom: 24 }}>
                      {isAiLoading ? (
                        renderSkeletonReport()
                      ) : activePrecedentAiResponse ? (
                        <View style={{ gap: 16 }}>
                          {renderFormattedReport(activePrecedentAiResponse)}
                        </View>
                      ) : (
                        <Text style={{ color: theme.textSecondary, textAlign: 'center', marginVertical: 20 }}>
                          Select a precedent to generate intelligence.
                        </Text>
                      )}
                    </View>
                  )}

                  {activeTab === 'comparison' && (
                    <View style={{ paddingBottom: 24 }}>
                      {isAiLoading ? (
                        renderSkeletonReport()
                      ) : activePrecedentAiResponse ? (
                        <View style={{ gap: 16 }}>
                          <View style={[styles.comparisonScoreCard, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}>
                            <Ionicons name="sparkles" size={16} color="#10B981" style={{ marginRight: 6 }} />
                            <Text style={[styles.comparisonScoreCardLabel, { color: '#065F46' }]}>Match Confidence</Text>
                            <Text style={[styles.comparisonScoreCardValue, { color: '#047857' }]}>
                              {selectedPrecedent.similarity?.relevance_score || selectedPrecedent.relevance_score || 0}% Match
                            </Text>
                          </View>
                          {renderFormattedReport(activePrecedentAiResponse)}
                        </View>
                      ) : (
                        <View style={styles.aiResponseBoxLoader}>
                          <Ionicons name="git-compare" size={36} color={theme.textSecondary} />
                          <Text style={[styles.aiResponseLoaderText, { color: theme.textSecondary, marginVertical: 12 }]}>
                            No comparison computed. Tap below to run comparison.
                          </Text>
                          <TouchableOpacity style={[styles.primaryButton, { width: '100%' }]} onPress={() => triggerComparisonReport(selectedPrecedent)}>
                            <Text style={styles.primaryButtonText}>Compare with Current Case</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {activeTab === 'actions' && (
                    <View style={{ paddingBottom: 24 }}>
                      <Text style={[styles.aiSectionHeading, { color: theme.textPrimary }]}>Smart Assistant Actions</Text>
                      
                      <View style={styles.aiButtonsRow}>
                        <TouchableOpacity
                          style={[styles.aiActionButton, aiActionType === 'explain' && { backgroundColor: 'rgba(109, 93, 252, 0.1)' }]}
                          onPress={() => handleAiAction('explain', selectedPrecedent)}
                        >
                          <Ionicons name="bulb-outline" size={14} color="#6D5DFC" />
                          <Text style={styles.aiActionButtonLabel}>Explain Judgment</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.aiActionButton, aiActionType === 'summarize' && { backgroundColor: 'rgba(109, 93, 252, 0.1)' }]}
                          onPress={() => handleAiAction('summarize', selectedPrecedent)}
                        >
                          <Ionicons name="sparkles-outline" size={14} color="#6D5DFC" />
                          <Text style={styles.aiActionButtonLabel}>Summarize</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.aiActionButton, aiActionType === 'arguments' && { backgroundColor: 'rgba(109, 93, 252, 0.1)' }]}
                          onPress={() => handleAiAction('arguments', selectedPrecedent)}
                        >
                          <Ionicons name="megaphone-outline" size={14} color="#6D5DFC" />
                          <Text style={styles.aiActionButtonLabel}>Generate Arguments</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.aiActionButton, aiActionType === 'extract_sections' && { backgroundColor: 'rgba(109, 93, 252, 0.1)' }]}
                          onPress={() => handleAiAction('extract_sections', selectedPrecedent)}
                        >
                          <Ionicons name="library-outline" size={14} color="#6D5DFC" />
                          <Text style={styles.aiActionButtonLabel}>Extract Sections</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.aiActionButton, aiActionType === 'court_notes' && { backgroundColor: 'rgba(109, 93, 252, 0.1)' }]}
                          onPress={() => handleAiAction('court_notes', selectedPrecedent)}
                        >
                          <Ionicons name="create-outline" size={14} color="#6D5DFC" />
                          <Text style={styles.aiActionButtonLabel}>Court Notes</Text>
                        </TouchableOpacity>
                      </View>

                      {/* AI Output Container */}
                      {isAiLoading && (
                        <View style={styles.aiResponseBoxLoader}>
                          <ActivityIndicator size="small" color="#6D5DFC" />
                          <Text style={[styles.aiResponseLoaderText, { color: theme.textSecondary }]}>Legal AI Brain analyzing precedent...</Text>
                        </View>
                      )}

                      {activePrecedentAiResponse && (
                        <View style={{ marginTop: 8 }}>
                          {renderFormattedReport(activePrecedentAiResponse)}
                        </View>
                      )}
                    </View>
                  )}

                  <View style={{ height: 40 }} />
                </ScrollView>

                {/* Sticky Bottom Actions Bar */}
                <View style={[styles.premiumDetailsFooter, { borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
                  <TouchableOpacity
                    style={[styles.footerButtonCopyEqual, { borderColor: theme.border }]}
                    onPress={() => handleCopyCitation(selectedPrecedent)}
                  >
                    <Ionicons name="copy-outline" size={16} color={theme.textPrimary} style={{ marginRight: 6 }} />
                    <Text style={[styles.footerButtonTextCopyEqual, { color: theme.textPrimary }]}>Copy Citation</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.footerButtonPDFEqual}
                    onPress={() => handleDownloadPDF(selectedPrecedent)}
                  >
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.footerButtonTextPDFEqual}>Download PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.footerButtonSaveEqual,
                      isAlreadySaved ? { backgroundColor: 'rgba(217, 119, 6, 0.08)', borderWidth: 1, borderColor: '#D97706' } : { backgroundColor: theme.surfaceVariant }
                    ]}
                    onPress={() => handleSavePrecedentToWorkspace(selectedPrecedent)}
                  >
                    <Ionicons 
                      name={isAlreadySaved ? "star" : "star-outline"} 
                      size={16} 
                      color={isAlreadySaved ? "#D97706" : "#6D5DFC"} 
                      style={{ marginRight: 6 }} 
                    />
                    <Text 
                      style={[
                        styles.footerButtonTextSaveEqual, 
                        isAlreadySaved ? { color: '#D97706' } : { color: '#6D5DFC' }
                      ]}
                    >
                      {isAlreadySaved ? "Saved" : "Save Case"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: theme.textSecondary,
  },
  modeBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
    backgroundColor: theme.background,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  caseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.surfaceVariant,
  },
  caseBadgeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.primary,
    marginRight: 8,
  },
  caseBadgeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  changeCaseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  changeCaseBtnText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    color: theme.textPrimary,
  },
  loadingSubtext: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    color: theme.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    color: theme.textSecondary,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 160,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 160,
  },
  outlineButtonText: {
    fontWeight: '700',
    fontSize: 13,
    color: theme.textSecondary,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 18,
    gap: 16,
  },
  formHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  formHeaderDesc: {
    fontSize: 12,
    marginTop: -12,
    color: theme.textSecondary,
  },
  inputGroup: {
    gap: 6,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: theme.textPrimary,
  },
  multilineInput: {
    height: 80,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  pickerWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  selectOption: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectOptionText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  resultsActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultsHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  actionIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  actionIconLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.primary,
  },
  resultCard: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  resultCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  resultCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    color: theme.textPrimary,
  },
  resultCardMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  relevanceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  relevanceTagText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  resultFactsPreview: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
    color: theme.textSecondary,
  },
  compactLegalBox: {
    padding: 8,
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: theme.surfaceVariant,
  },
  legalPrincipleBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(109, 93, 252, 0.12)' : '#F5F3FF',
  },
  legalPrincipleLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.primary,
  },
  legalPrincipleValue: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    color: isDark ? theme.textPrimary : '#4C1D95',
  },
  resultCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.surfaceVariant,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  resultActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  compactIconButton: {
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceVariant,
    borderColor: theme.border,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
  },
  resultActionButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: theme.surfaceVariant,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
    paddingTop: 16,
    backgroundColor: theme.card,
  },
  centerModal: {
    borderRadius: 20,
    width: '100%',
    maxHeight: height * 0.8,
    paddingTop: 16,
    backgroundColor: theme.card,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  caseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    marginBottom: 8,
  },
  caseListTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  caseListSubtitle: {
    fontSize: 11,
    marginTop: 2,
    color: theme.textSecondary,
  },
  detailsModal: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    backgroundColor: theme.background,
  },
  closeButton: {
    padding: 4,
  },
  detailsScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  
  caseInfoCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  caseHeaderTitleContainer: {
    alignItems: 'stretch',
    gap: 2,
    marginBottom: 14,
  },
  caseHeaderTitleText: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    textAlign: 'center',
    letterSpacing: -0.3,
    color: theme.textPrimary,
  },
  caseHeaderVersusText: {
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 2,
    color: theme.textSecondary,
  },
  caseHeaderSingleTitleText: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 14,
    color: theme.textPrimary,
  },
  metadataChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: width * 0.8,
    backgroundColor: theme.surfaceVariant,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landmarkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
  },
  landmarkBadgeText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  relevanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  relevanceChipText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  premiumTabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  premiumTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  activePremiumTabButton: {
    backgroundColor: theme.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  premiumTabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
  },

  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 12,
    marginBottom: 14,
  },
  sectionHeaderIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(123, 97, 255, 0.15)' : 'rgba(109, 93, 252, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCardIcon: {
    fontSize: 16,
  },
  sectionCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.1,
    color: theme.textPrimary,
  },
  sectionCardContent: {
    gap: 8,
  },

  comparisonScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    padding: 14,
    borderRadius: 14,
    marginBottom: 4,
  },
  comparisonScoreCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    color: theme.textSecondary,
  },
  comparisonScoreCardValue: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.textPrimary,
  },

  aiSectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 4,
    color: theme.textPrimary,
  },
  aiButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  aiActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  aiActionButtonLabel: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '700',
  },
  aiResponseBoxLoader: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 18,
    borderStyle: 'dashed',
    marginVertical: 16,
  },
  aiResponseLoaderText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: theme.textSecondary,
  },

  richBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
    paddingLeft: 4,
    gap: 8,
  },
  richBulletPoint: {
    fontSize: 16,
    lineHeight: 22,
  },
  richNumberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
    paddingLeft: 4,
    gap: 6,
  },
  richNumberedPrefix: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  richBodyText: {
    fontSize: 15,
    lineHeight: 25,
    letterSpacing: 0.1,
    marginVertical: 5,
    color: theme.textSecondary,
  },

  calloutBox: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    padding: 14,
    marginVertical: 8,
    gap: 4,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  calloutLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calloutText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  detailsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.background,
  },
  footerButtonCopy: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonPDF: {
    flex: 1.2,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
  },
  footerButtonSave: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceVariant,
  },
  footerButtonTextCopy: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  footerButtonTextPDF: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footerButtonTextSave: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  skeletonCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 18,
    marginBottom: 16,
  },
  skeletonCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skeletonBlock: {
    backgroundColor: theme.surfaceVariant,
    borderRadius: 6,
  },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBarIcon: {
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: theme.textPrimary,
  },
  searchBarButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.surfaceVariant,
  },
  searchBarButtonText: {
    color: theme.primary,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  caseCardSkeleton: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  casesListHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: -8,
    paddingVertical: 4,
  },
  casesListHeaderIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  casesListHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  casesListHeaderDesc: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 15,
  },
  webCaseCard: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  webCaseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  webCaseCardName: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    color: theme.textPrimary,
  },
  webCaseCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  webCaseCardMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  webCaseCardDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.textSecondary,
  },
  webCaseCardDivider: {
    height: 1,
    width: '100%',
    backgroundColor: theme.border,
  },
  webCaseCardFooter: {
    flexDirection: 'column',
    gap: 12,
  },
  webCaseCardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  webCaseCardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  webCaseCardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priorityPillMini: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityPillMiniText: {
    fontSize: 9,
    fontWeight: '800',
  },
  webCaseCardDate: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textMuted,
  },
  analyzeTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceVariant,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  analyzeTextButtonText: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  webNewCaseCardDashed: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.primary,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 120,
    marginBottom: 24,
  },
  webNewCaseCardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  webNewCaseCardLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: theme.primary,
  },
  searchQueryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    marginBottom: 8,
  },
  searchQueryBannerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: theme.primary,
  },

  detailsHeaderBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
  },
  headerLeftBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerTitleBlock: {
    flex: 1,
    paddingHorizontal: 4,
  },
  headerCaseNameText: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.1,
    color: theme.textPrimary,
  },
  headerCaseSubText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    color: theme.textSecondary,
  },
  headerRightBtn: {
    padding: 6,
    marginLeft: 6,
  },

  premiumCompactTabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceVariant,
    padding: 3,
    marginHorizontal: 16,
    marginVertical: 10,
    height: 38,
  },
  premiumCompactTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    paddingVertical: 4,
  },
  activePremiumCompactTabButton: {
    backgroundColor: theme.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1.5,
  },
  premiumCompactTabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
    color: theme.textSecondary,
  },

  compactInfoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
    marginBottom: 12,
  },
  compactNameContainer: {
    alignItems: 'stretch',
    gap: 1,
    marginBottom: 10,
  },
  compactNameText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  compactVsText: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 1,
  },
  compactSingleNameText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 10,
  },
  compactChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  compactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compactChipText: {
    fontSize: 11,
    fontWeight: '600',
  },

  premiumDetailsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.background,
  },
  footerButtonCopyEqual: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  footerButtonPDFEqual: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
  },
  footerButtonSaveEqual: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceVariant,
  },
  footerButtonTextCopyEqual: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  footerButtonTextPDFEqual: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  footerButtonTextSaveEqual: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.primary,
  },
  });
}

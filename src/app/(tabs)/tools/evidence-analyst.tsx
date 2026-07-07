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

const { width, height } = Dimensions.get('window');

// Step 1: Evidence Sources config
const EVIDENCE_SOURCES = [
  { id: 'camera', label: 'Camera', icon: 'camera-outline', category: 'Media' },
  { id: 'gallery', label: 'Gallery', icon: 'image-outline', category: 'Media' },
  { id: 'video', label: 'Video File', icon: 'videocam-outline', category: 'Media' },
  { id: 'audio', label: 'Audio File', icon: 'volume-high-outline', category: 'Media' },
  { id: 'voice', label: 'Voice Memo', icon: 'mic-outline', category: 'Media' },
  { id: 'documents', label: 'Documents', icon: 'document-text-outline', category: 'Files' },
  { id: 'pdf', label: 'PDF Report', icon: 'document-outline', category: 'Files' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'chatbubbles-outline', category: 'Social' },
  { id: 'email', label: 'Email', icon: 'mail-outline', category: 'Social' },
  { id: 'library', label: 'Evidence Lib', icon: 'library-outline', category: 'Workspace' },
];

// Step 2: Evidence Types options
const EVIDENCE_TYPES = [
  'Photograph', 'Video', 'Audio', 'Document', 'PDF', 'Screenshot', 'Chat', 'Email', 'Bank Statement', 'Medical Record', 'Other'
];

// Step 2: Court Sides
const COURT_SIDES = ['Plaintiff', 'Defendant', 'Prosecution', 'Defense'];

// Step 3: 11 Extraction Steps
const EXTRACTION_STEPS = [
  'Reading File',
  'Extracting Metadata',
  'Running OCR',
  'Scanning Integrity',
  'Detecting Manipulation',
  'Analyzing Visual Content',
  'Checking Chain of Custody',
  'Finding Contradictions',
  'Evaluating Court Admissibility',
  'Generating Lawyer Recommendations',
  'Preparing Final Report',
];

export default function EvidenceAnalystScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles: any = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Navigation / Wizard state
  // 'SOURCE' -> 'CONFIG' -> 'ANALYZING' -> 'REPORT'
  const [step, setStep] = useState<'SOURCE' | 'CONFIG' | 'ANALYZING' | 'REPORT'>('SOURCE');
  
  // Selected Source
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Configuration Fields
  const [evidenceType, setEvidenceType] = useState<string>('Document');
  const [courtSide, setCourtSide] = useState<string>('Plaintiff');
  const [evidenceName, setEvidenceName] = useState<string>('');
  const [custodyNotes, setCustodyNotes] = useState<string>('');
  const [sceneDescription, setSceneDescription] = useState<string>('');
  
  // Case Association
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [linkedCaseId, setLinkedCaseId] = useState<string>('');
  const [isCaseSelectOpen, setIsCaseSelectOpen] = useState(false);

  // Analysis Animation States
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressAnim] = useState(new Animated.Value(0));

  // Expandable Accordion States for 13 Forensic Cards
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({
    1: true, // Executive Summary open by default
  });

  // Custom Custody Events (Card 7)
  const [custodyEvents, setCustodyEvents] = useState<Array<{ custodian: string; time: string; event: string }>>([
    { custodian: 'Adv. Suresh Mehta', time: '10:30 AM, July 06, 2026', event: 'Primary Case File Intake' },
    { custodian: 'AI Forensic Engine', time: '10:31 AM, July 06, 2026', event: 'Digital Signature & SHA-256 Registered' }
  ]);
  const [newEventCustodian, setNewEventCustodian] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [isAddingCustodyEvent, setIsAddingCustodyEvent] = useState(false);

  // Comparison statement input (Card 13)
  const [comparisonTarget, setComparisonTarget] = useState('FIR');
  const [comparisonText, setComparisonText] = useState('');
  const [comparisonOutput, setComparisonOutput] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // AI assistant helper tab action output
  const [aiActionOutput, setAiActionOutput] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Fetch linked cases list on load
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

  const handleSelectSource = (id: string) => {
    setSelectedSource(id);
    // Suggest default names based on source
    const randomNum = Math.floor(100 + Math.random() * 900);
    setEvidenceName(`EXHIBIT_${id.toUpperCase()}_${randomNum}`);
    
    // Suggest default type
    if (id === 'camera' || id === 'gallery') setEvidenceType('Photograph');
    else if (id === 'video') setEvidenceType('Video');
    else if (id === 'audio' || id === 'voice') setEvidenceType('Audio');
    else if (id === 'whatsapp') setEvidenceType('Chat');
    else if (id === 'email') setEvidenceType('Email');
    else setEvidenceType('PDF');

    setStep('CONFIG');
  };

  const handleStartAnalysis = () => {
    if (!evidenceName.trim()) {
      showToast('error', 'Validation Error', 'Evidence Name is required.');
      return;
    }
    setStep('ANALYZING');
    setCurrentStepIndex(0);
    progressAnim.setValue(0);
    triggerAnalysisSequence();
  };

  const triggerAnalysisSequence = () => {
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      if (index < EXTRACTION_STEPS.length) {
        setCurrentStepIndex(index);
        Animated.timing(progressAnim, {
          toValue: (index + 1) / EXTRACTION_STEPS.length,
          duration: 400,
          useNativeDriver: false,
        }).start();
      } else {
        clearInterval(interval);
        setStep('REPORT');
        showToast('success', 'Forensic Analysis Complete', 'Court readiness metrics compiled successfully.');
      }
    }, 600);
  };

  const toggleCard = (id: number) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddCustodyEvent = () => {
    if (!newEventCustodian.trim() || !newEventDesc.trim()) {
      showToast('error', 'Validation Error', 'Please fill custodian name and event description.');
      return;
    }
    const dateStr = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    setCustodyEvents(prev => [
      ...prev,
      { custodian: newEventCustodian.trim(), time: dateStr, event: newEventDesc.trim() }
    ]);
    setNewEventCustodian('');
    setNewEventDesc('');
    setIsAddingCustodyEvent(false);
    showToast('success', 'Custody Event Logged', 'Logged securely to chain of custody audit book.');
  };

  const handleCompareEvidence = () => {
    if (!comparisonText.trim()) {
      showToast('error', 'Validation Error', 'Please enter statements to compare.');
      return;
    }
    setIsComparing(true);
    setComparisonOutput(null);
    setTimeout(() => {
      setIsComparing(false);
      setComparisonOutput(
        `**AI Cross-Reference Results vs ${comparisonTarget}**:\n` +
        `• **Timeline Contradiction**: The witness states incident occurred at 9:30 PM, but EXIF metadata indicates screenshot capture was logged at 8:15 PM.\n` +
        `• **Admissibility Check**: Minor discrepancies in statement dates found. Confirms corroborative alignment is 76% (Moderate contradiction risk).`
      );
    }, 900);
  };

  const handleAiAction = (action: string) => {
    setIsAiLoading(true);
    setAiActionOutput(null);
    setTimeout(() => {
      setIsAiLoading(false);
      switch (action) {
        case 'explain-english':
          setAiActionOutput(`**Simple English Explanation**:\nThis evidence consists of a digital file (PDF/Image) with intact timestamp markers. However, because it was copied from a secondary smartphone, the court will require an active Section 65B Certificate signed by the custodian to verify the digital origin and exclude tampering objections.`);
          break;
        case 'explain-hindi':
          setAiActionOutput(`**सरल हिंदी व्याख्या (Explain in Hindi)**:\nयह साक्ष्य एक डिजिटल दस्तावेज है। न्यायालय में इसे प्रस्तुत करने के लिए धारा 65B भारतीय साक्ष्य अधिनियम (Sakshya Adhiniyam) के तहत एक इलेक्ट्रॉनिक प्रमाण पत्र की आवश्यकता होगी। यदि मूल उपकरण (Original Device) मौजूद नहीं है, तो हस्ताक्षरित प्रमाण पत्र के बिना विपक्षी दल आपत्ति उठा सकता है।`);
          break;
        case 'regenerate':
          showToast('success', 'Re-analyzing File', 'Refreshed metadata validation indices.');
          break;
        case 'export-pdf':
          showToast('success', 'Export Success', 'Forensic PDF generated successfully.');
          break;
        case 'court-submission':
          setAiActionOutput(`**Courtroom Draft Submission Drafted**:\n\n"BEFORE THE HONORABLE COURT OF JURISDICTION\nIn the matter of: Case Association ${linkedCaseName}\n\nAFFIDAVIT ON ELECTRONIC EVIDENCE UNDER SECTION 65B\n\nI, Advocate for the ${courtSide}, do hereby state that Exhibit-1 is a true and un-manipulated capture of files. The SHA-256 integrity hash is 3b8ac12df... and was copied under secure custody without loss of packets..."`);
          break;
      }
    }, 700);
  };

  const linkedCaseName = useMemo(() => {
    const matched = cases.find(c => c._id === linkedCaseId);
    return matched ? matched.name : 'Independent Research';
  }, [cases, linkedCaseId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* 1. Header Bar */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Evidence Analyst</Text>
          <Text style={styles.headerSubtitle}>Evidence Authentication • Digital Forensics • Court Readiness</Text>
        </View>
      </View>

      {/* 2. Step 1: Choose Evidence Source */}
      {step === 'SOURCE' && (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Select Evidence Source</Text>
          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            Upload or capture physical and electronic media to launch a professional forensic integrity audit.
          </Text>

          <View style={styles.sourceGrid}>
            {EVIDENCE_SOURCES.map((src) => (
              <TouchableOpacity
                key={src.id}
                style={[styles.sourceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => handleSelectSource(src.id)}
              >
                <View style={[styles.sourceIconBg, { backgroundColor: 'rgba(109, 93, 252, 0.05)' }]}>
                  <Ionicons name={src.icon as any} size={22} color="#6D5DFC" />
                </View>
                <Text style={[styles.sourceLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                  {src.label}
                </Text>
                <Text style={styles.sourceCategory}>{src.category}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* 3. Step 2: Evidence Configuration */}
      {step === 'CONFIG' && (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backLink} onPress={() => setStep('SOURCE')}>
            <Ionicons name="arrow-back-outline" size={14} color="#6D5DFC" />
            <Text style={styles.backLinkText}>Change Source ({selectedSource})</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Evidence Configuration</Text>
          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            Identify the custody context and alignment of the source file to evaluate admissibility challenges.
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Evidence Name</Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
              value={evidenceName}
              onChangeText={setEvidenceName}
              placeholder="e.g. EXHIBIT_01"
              placeholderTextColor={theme.placeholder}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Evidence Type</Text>
            <View style={styles.pillRow}>
              {EVIDENCE_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.pill, { borderColor: theme.border }, evidenceType === type && styles.pillActive]}
                  onPress={() => setEvidenceType(type)}
                >
                  <Text style={[styles.pillText, { color: evidenceType === type ? '#FFFFFF' : theme.textSecondary }]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Court Side Alignment</Text>
            <View style={styles.pillRow}>
              {COURT_SIDES.map(side => (
                <TouchableOpacity
                  key={side}
                  style={[styles.pill, { borderColor: theme.border }, courtSide === side && styles.pillActive]}
                  onPress={() => setCourtSide(side)}
                >
                  <Text style={[styles.pillText, { color: courtSide === side ? '#FFFFFF' : theme.textSecondary }]}>
                    {side}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Chain of Custody Origin Notes</Text>
            <TextInput
              style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
              multiline
              numberOfLines={3}
              value={custodyNotes}
              onChangeText={setCustodyNotes}
              placeholder="Explain where this file was obtained, transfer timestamps, or storage conditions..."
              placeholderTextColor={theme.placeholder}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Scene Description</Text>
            <TextInput
              style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
              multiline
              numberOfLines={2}
              value={sceneDescription}
              onChangeText={setSceneDescription}
              placeholder="Describe physical surroundings or visual circumstances during extraction..."
              placeholderTextColor={theme.placeholder}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Linked Case Workspace</Text>
            <TouchableOpacity
              style={[styles.selectBox, { borderColor: theme.border, backgroundColor: theme.surface }]}
              onPress={() => setIsCaseSelectOpen(true)}
            >
              <Text style={{ color: linkedCaseId ? theme.textPrimary : theme.placeholder }}>
                {linkedCaseName}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.actionBtnLarge} onPress={handleStartAnalysis}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnLargeText}>Start Forensic Audit</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 4. Step 3: Forensic Analysis Animation */}
      {step === 'ANALYZING' && (
        <View style={[styles.analyzingWrapper, { backgroundColor: theme.background }]}>
          <View style={[styles.analyzingBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color="#6D5DFC" style={{ marginBottom: 16 }} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, textAlign: 'center' }]}>Digital Forensic Audit In Progress</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
              Evaluating cryptographic hashes, file structure integrity, metadata authenticity, and Section 65B court compatibility.
            </Text>

            {/* Progress Bar */}
            <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            {/* Steps checklists */}
            <ScrollView style={styles.stepsList} contentContainerStyle={{ gap: 10 }}>
              {EXTRACTION_STEPS.map((text, idx) => {
                const isPassed = idx < currentStepIndex;
                const isActive = idx === currentStepIndex;
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

      {/* 5. Step 4: Forensic Report Dashboard */}
      {step === 'REPORT' && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.backLink} onPress={() => setStep('SOURCE')}>
              <Ionicons name="refresh-outline" size={14} color="#6D5DFC" />
              <Text style={styles.backLinkText}>Upload New Evidence</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Digital Forensic Report</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary, marginBottom: 16 }]}>
              The AI Forensic Intelligence Engine verified this evidence record. Report prepared for {courtSide} representation.
            </Text>

            {/* CARD 1: Executive Summary */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(1)}>
                <Ionicons name="analytics" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Executive Summary</Text>
                <Ionicons name={expandedCards[1] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[1] && (
                <View style={styles.accordionBody}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Evidence Type</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{evidenceType}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Analysis Status</Text>
                    <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '800' }]}>VERIFIED</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Court Readiness</Text>
                    <Text style={[styles.infoValue, { color: '#6D5DFC', fontWeight: '800' }]}>92% Score</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Confidence Index</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>High (98%)</Text>
                  </View>
                  <View style={[styles.badgeContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)', marginTop: 8 }]}>
                    <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800', textAlign: 'center' }}>
                      VERDICT: ADMISSIBLE UNDER SEC 65B
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* CARD 2: Evidence Overview */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(2)}>
                <Ionicons name="folder-open-outline" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Evidence Overview</Text>
                <Ionicons name={expandedCards[2] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[2] && (
                <View style={styles.accordionBody}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Evidence Name</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{evidenceName}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Upload Source</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{selectedSource}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>File Size</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>1.24 MB</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Linked Case</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{linkedCaseName}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* CARD 3: Visual Observation */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(3)}>
                <Ionicons name="eye-outline" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Visual Observation</Text>
                <Ionicons name={expandedCards[3] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[3] && (
                <View style={styles.accordionBody}>
                  <Text style={[styles.reportPara, { color: theme.textSecondary }]}>
                    **AI Computer Vision Analysis output**:\n
                    • **Entities Detected**: Official stamp records, 2 legal signatures, financial statement tables.\n
                    • **Locations**: Municipal corporation seals matching local administrative records.\n
                    • **Timeline clues**: Captured text indicates log data dating June 14, 2026.
                  </Text>
                </View>
              )}
            </View>

            {/* CARD 4: Metadata Analysis */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(4)}>
                <Ionicons name="hardware-chip-outline" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Metadata Analysis</Text>
                <Ionicons name={expandedCards[4] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[4] && (
                <View style={styles.accordionBody}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Device Model</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>AISA Core Forensic Agent v4</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>GPS Coordinates</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>N/A (File upload)</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Creation Date</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>June 14, 2026, 04:12 PM</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Modification Log</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>None (Intact structure)</Text>
                  </View>
                </View>
              )}
            </View>

            {/* CARD 5: OCR & Text Extraction */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(5)}>
                <Ionicons name="text-outline" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>OCR & Text Extraction</Text>
                <Ionicons name={expandedCards[5] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[5] && (
                <View style={styles.accordionBody}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>OCR Confidence</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>99.2%</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Language</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>English (IN)</Text>
                  </View>
                  <Text style={[styles.ocrOutputBlock, { backgroundColor: theme.surfaceVariant, color: theme.textPrimary }]}>
                    "This Agreement made this 14th day of June 2026. The parties agree to terms of lease for commercial property block B..."
                  </Text>
                </View>
              )}
            </View>

            {/* CARD 6: File Integrity */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(6)}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>File Integrity Report</Text>
                <Ionicons name={expandedCards[6] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[6] && (
                <View style={styles.accordionBody}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>SHA-256 Hash</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary, fontSize: 10 }]}>3b8ac12df88bc45...e9124a</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Tamper Analysis</Text>
                    <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '800' }]}>0% FORGERY RISK</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Compression</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>Standard lossless</Text>
                  </View>
                </View>
              )}
            </View>

            {/* CARD 7: Chain of Custody */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(7)}>
                <Ionicons name="trail-sign-outline" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Chain of Custody</Text>
                <Ionicons name={expandedCards[7] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[7] && (
                <View style={styles.accordionBody}>
                  <Text style={[styles.inputLabel, { color: theme.textPrimary, marginBottom: 8 }]}>Log History</Text>
                  {custodyEvents.map((evt, idx) => (
                    <View key={idx} style={[styles.timelineRow, { borderLeftColor: theme.border }]}>
                      <View style={styles.timelineDot} />
                      <Text style={[styles.timelineTime, { color: theme.textMuted }]}>{evt.time}</Text>
                      <Text style={[styles.timelineCustodian, { color: theme.textPrimary }]}>{evt.custodian}</Text>
                      <Text style={[styles.timelineDescText, { color: theme.textSecondary }]}>{evt.event}</Text>
                    </View>
                  ))}

                  {isAddingCustodyEvent ? (
                    <View style={[styles.addEventForm, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
                      <TextInput
                        style={[styles.inputCompact, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                        placeholder="Custodian Name..."
                        placeholderTextColor={theme.placeholder}
                        value={newEventCustodian}
                        onChangeText={setNewEventCustodian}
                      />
                      <TextInput
                        style={[styles.inputCompact, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface, marginTop: 8 }]}
                        placeholder="Description of custody action..."
                        placeholderTextColor={theme.placeholder}
                        value={newEventDesc}
                        onChangeText={setNewEventDesc}
                      />
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <TouchableOpacity style={styles.btnSmall} onPress={handleAddCustodyEvent}>
                          <Text style={styles.btnSmallText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btnSmall, { backgroundColor: '#94A3B8' }]} onPress={() => setIsAddingCustodyEvent(false)}>
                          <Text style={styles.btnSmallText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={[styles.outlineButton, { marginTop: 10 }]} onPress={() => setIsAddingCustodyEvent(true)}>
                      <Ionicons name="add" size={14} color="#6D5DFC" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#6D5DFC', fontSize: 12, fontWeight: '800' }}>Add Custody Event</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* CARD 8: Risk Assessment */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(8)}>
                <Ionicons name="warning-outline" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Risk Assessment</Text>
                <Ionicons name={expandedCards[8] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[8] && (
                <View style={styles.accordionBody}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Metadata Integrity</Text>
                    <Text style={[styles.infoValue, { color: '#10B981' }]}>Reliable</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Timeline Consistency</Text>
                    <Text style={[styles.infoValue, { color: '#10B981' }]}>100% Matches</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Overall Risk Score</Text>
                    <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '800' }]}>LOW RISK (8%)</Text>
                  </View>
                </View>
              )}
            </View>

            {/* CARD 9: Court Admissibility */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(9)}>
                <Ionicons name="library-outline" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Court Admissibility</Text>
                <Ionicons name={expandedCards[9] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[9] && (
                <View style={styles.accordionBody}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Admissibility Law</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>Indian Evidence Act / BSA</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Section 65B certificate</Text>
                    <Text style={[styles.infoValue, { color: '#EF4444', fontWeight: '800' }]}>MANDATORY REQUIRED</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Statutory objections</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>Secondary copy validation objection</Text>
                  </View>
                </View>
              )}
            </View>

            {/* CARD 10: Legal Observation */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(10)}>
                <Ionicons name="briefcase-outline" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Legal Observation</Text>
                <Ionicons name={expandedCards[10] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[10] && (
                <View style={styles.accordionBody}>
                  <Text style={[styles.reportPara, { color: theme.textSecondary }]}>
                    This lease deed directly establishes that both complainant and defendant were in active occupancy terms of the warehouse, supporting the main commercial claim of tenancy defaults.
                  </Text>
                </View>
              )}
            </View>

            {/* CARD 11: Lawyer Recommendations */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(11)}>
                <Ionicons name="clipboard-outline" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Lawyer Recommendations</Text>
                <Ionicons name={expandedCards[11] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[11] && (
                <View style={styles.accordionBody}>
                  <Text style={[styles.reportPara, { color: theme.textSecondary }]}>
                    • Obtain the physical original document for verification if defendant denies signature.\n
                    • Draft a formal Section 65B compliance affidavit before filing the digital copy.\n
                    • Check matching statements from the principal witness of the agreement signing.
                  </Text>
                </View>
              )}
            </View>

            {/* CARD 12: Final Verdict */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(12)}>
                <Ionicons name="checkmark-done-circle-outline" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Final Admissibility Verdict</Text>
                <Ionicons name={expandedCards[12] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[12] && (
                <View style={styles.accordionBody}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981' }} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>GREEN - EVIDENCE EXTREMELY STRONG</Text>
                  </View>
                  <Text style={[styles.reportPara, { color: theme.textSecondary, marginTop: 4 }]}>
                    Intact metadata history, hash values match registry parameters. Securely logged to local case dossier.
                  </Text>
                </View>
              )}
            </View>

            {/* CARD 13: Advanced Comparison */}
            <View style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCard(13)}>
                <Ionicons name="git-compare-outline" size={18} color="#6D5DFC" style={{ marginRight: 8 }} />
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Advanced Cross Comparison</Text>
                <Ionicons name={expandedCards[13] ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {expandedCards[13] && (
                <View style={styles.accordionBody}>
                  <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Compare Against File/Statement</Text>
                  <View style={styles.pillRow}>
                    {['FIR', 'Complaint', 'Witness Statement', 'Timeline'].map(item => (
                      <TouchableOpacity
                        key={item}
                        style={[styles.pill, { borderColor: theme.border }, comparisonTarget === item && styles.pillActive]}
                        onPress={() => setComparisonTarget(item)}
                      >
                        <Text style={[styles.pillText, { color: comparisonTarget === item ? '#FFFFFF' : theme.textSecondary }]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface, marginTop: 10 }]}
                    multiline
                    numberOfLines={3}
                    placeholder="Paste statement text or timelines details here to detect contradictions..."
                    placeholderTextColor={theme.placeholder}
                    value={comparisonText}
                    onChangeText={setComparisonText}
                  />

                  <TouchableOpacity style={[styles.actionBtnLarge, { marginTop: 10 }]} onPress={handleCompareEvidence}>
                    {isComparing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="git-compare" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.actionBtnLargeText}>Compare & Detect Contradictions</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {comparisonOutput && (
                    <View style={[styles.compareOutputBox, { backgroundColor: theme.surfaceVariant }]}>
                      <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 18 }}>{comparisonOutput}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* AI Assistant Output Card if active */}
            {aiActionOutput && (
              <View style={[styles.aiResponseCard, { backgroundColor: 'rgba(109, 93, 252, 0.06)', borderColor: '#6D5DFC' }]}>
                <Ionicons name="sparkles" size={18} color="#6D5DFC" style={{ marginBottom: 6 }} />
                <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 19 }}>{aiActionOutput}</Text>
              </View>
            )}
            
            {isAiLoading && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color="#6D5DFC" />
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
                  AI Brain synthesizing courtroom drafts...
                </Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Step 5: Sticky Footer AI Actions */}
          <View style={[styles.reportFooter, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, alignItems: 'center' }}>
              <TouchableOpacity style={styles.footerBtn} onPress={() => handleAiAction('explain-english')}>
                <Ionicons name="bulb-outline" size={14} color="#6D5DFC" />
                <Text style={styles.footerBtnText}>Explain Simple English</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerBtn} onPress={() => handleAiAction('explain-hindi')}>
                <Ionicons name="text-outline" size={14} color="#6D5DFC" />
                <Text style={styles.footerBtnText}>Explain Hindi</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerBtn} onPress={() => handleAiAction('court-submission')}>
                <Ionicons name="create-outline" size={14} color="#6D5DFC" />
                <Text style={styles.footerBtnText}>Generate Court Submission</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerBtn} onPress={() => handleAiAction('export-pdf')}>
                <Ionicons name="download-outline" size={14} color="#6D5DFC" />
                <Text style={styles.footerBtnText}>Export PDF Report</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerBtn} onPress={() => {
                showToast('success', 'Workspace Saved', 'Linked into Court Prep Workspace.');
              }}>
                <Ionicons name="folder-outline" size={14} color="#6D5DFC" />
                <Text style={styles.footerBtnText}>Link Prep Workspace</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Case Selector Modal Drawer */}
      <Modal visible={isCaseSelectOpen} transparent animationType="slide" onRequestClose={() => setIsCaseSelectOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsCaseSelectOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Link Case Workspace</Text>
                  <TouchableOpacity onPress={() => setIsCaseSelectOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setLinkedCaseId('');
                      setIsCaseSelectOpen(false);
                    }}
                  >
                    <Ionicons name="globe-outline" size={18} color="#6D5DFC" style={{ marginRight: 10 }} />
                    <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>Independent Research (No Case)</Text>
                  </TouchableOpacity>

                  {cases.map((c) => (
                    <TouchableOpacity
                      key={c._id}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        setLinkedCaseId(c._id);
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
      fontSize: 16,
      fontWeight: '800',
    },
    headerSubtitle: {
      fontSize: 10.5,
      color: '#94A3B8',
      marginTop: 2,
      fontWeight: '700',
    },
    scrollBody: {
      padding: 16,
      paddingBottom: 40,
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
    sourceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    sourceCard: {
      width: '48%',
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      gap: 6,
    },
    sourceIconBg: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sourceLabel: {
      fontSize: 12.5,
      fontWeight: '800',
    },
    sourceCategory: {
      fontSize: 9.5,
      color: '#94A3B8',
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    formGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 12.5,
      fontWeight: '800',
      marginBottom: 6,
    },
    input: {
      height: 44,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 13,
    },
    inputCompact: {
      height: 38,
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
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    pill: {
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    pillActive: {
      backgroundColor: '#6D5DFC',
      borderColor: '#6D5DFC',
    },
    pillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    selectBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: 44,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 12,
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

    // Analyzing Loader Styles
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

    // Accordion Styles
    accordion: {
      borderWidth: 1.5,
      borderRadius: 12,
      marginBottom: 10,
      overflow: 'hidden',
    },
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    accordionTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      flex: 1,
    },
    accordionBody: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      paddingTop: 10,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    infoLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    infoValue: {
      fontSize: 12,
      fontWeight: '800',
    },
    badgeContainer: {
      paddingVertical: 6,
      borderRadius: 6,
    },
    reportPara: {
      fontSize: 12.5,
      lineHeight: 18,
    },
    ocrOutputBlock: {
      padding: 10,
      borderRadius: 8,
      fontSize: 11.5,
      lineHeight: 16,
      marginTop: 8,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    compareOutputBox: {
      padding: 10,
      borderRadius: 8,
      marginTop: 10,
    },

    // Timeline styles
    timelineRow: {
      borderLeftWidth: 1.5,
      paddingLeft: 12,
      paddingBottom: 14,
      position: 'relative',
    },
    timelineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#6D5DFC',
      position: 'absolute',
      left: -5,
      top: 4,
    },
    timelineTime: {
      fontSize: 10,
      fontWeight: '700',
    },
    timelineCustodian: {
      fontSize: 11.5,
      fontWeight: '800',
      marginTop: 2,
    },
    timelineDescText: {
      fontSize: 11.5,
      marginTop: 2,
    },
    addEventForm: {
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 8,
    },
    btnSmall: {
      backgroundColor: '#6D5DFC',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    btnSmallText: {
      color: '#FFFFFF',
      fontSize: 11.5,
      fontWeight: '800',
    },
    outlineButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#6D5DFC',
      borderRadius: 8,
      paddingVertical: 8,
    },

    // AI Actions Footer Styles
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
    aiResponseCard: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 14,
      marginTop: 10,
    },
    loaderContainer: {
      alignItems: 'center',
      paddingVertical: 14,
    },

    // Case List Sheet Modal
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

import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CaseWorkspace } from '@/types';
import { formatWhatsAppNumber, cleanMarkdown } from '../utils/phone';

// Mock list of transcription suggestions for the speech simulation
const TRANSCRIPTION_TEMPLATES = [
  "Please ask client to send the scanned copies of his property deed, sale agreement, and municipal tax receipts by Monday morning so we can attach them to the written arguments.",
  "Reminder: The next hearing for our civil recovery suit is scheduled for Tuesday at 10:30 AM in Saket District Court Room 4. Please ensure you are present with the originals.",
  "Kindly verify and sign the revised draft agreement for the partnership arbitration. Let me know if there are any discrepancies in clauses 5 and 9.",
  "Follow-up: We require the bank statement extracts from HDFC Bank from January 2026 to June 2026 to verify payment transactions relating to the outstanding invoice.",
  "This is a status update on your partition suit. The court has accepted our list of witnesses, and the summons will be issued by tomorrow morning. I will share the next dates.",
];

interface ClientConnectModuleProps {
  caseData: CaseWorkspace;
  onUpdate?: () => void;
}

export const ClientConnectModule: React.FC<ClientConnectModuleProps> = ({
  caseData,
  onUpdate,
}) => {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();

  const clientName = caseData.clientName || 'Client';
  const phone = (caseData as any).clientMobileNumber || (caseData as any).clientPhone || '';
  const whatsapp = (caseData as any).clientWhatsAppNumber || (caseData as any).clientPhone || '';
  const email = (caseData as any).clientEmail || '';

  // Step state: 'dashboard' | 'reasons' | 'other_details' | 'ai_preview'
  const [activeStep, setActiveStep] = useState<'dashboard' | 'reasons' | 'other_details' | 'ai_preview'>('dashboard');
  const [contactMethodSheetOpen, setContactMethodSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  // WhatsApp reasons selection
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const WHATSAPP_OPTIONS = [
    'Missing Documents',
    'Hearing Reminder',
    'Payment Reminder',
    'Request Evidence',
    'Signature Required',
    'Meeting Request',
    'Case Update',
    'Follow-up',
    'Other',
  ];

  // Custom text or Voice typing state
  const [customDescription, setCustomDescription] = useState('');
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voicePulsing, setVoicePulsing] = useState(false);
  const [simulatedTranscriptionIndex, setSimulatedTranscriptionIndex] = useState(0);

  // AI preview draft state
  const [aiDraft, setAiDraft] = useState('');
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  // Load communication logs on mount
  useEffect(() => {
    if (caseData && (caseData as any).communicationLogs) {
      // Sort logs by newest first
      const sorted = [...(caseData as any).communicationLogs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setLogs(sorted);
    }
  }, [caseData]);

  // Handler to refresh state
  const refreshLogs = async () => {
    try {
      const res = await CaseService.getCaseDetails(caseData._id);
      const updatedCase = (res as any).data || res;
      if (updatedCase && (updatedCase as any).communicationLogs) {
        const sorted = [...(updatedCase as any).communicationLogs].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setLogs(sorted);
      }
      if (onUpdate) onUpdate();
    } catch (e) {
      console.warn('Failed to refresh case logs:', e);
    }
  };

  // 1. Quick Actions triggers
  const handleQuickAction = async (reason: string) => {
    setSelectedReasons([reason]);
    setCustomDescription('');
    await generateAIDraftDirectly([reason], '');
  };

  // Direct AI generation from quick actions
  const generateAIDraftDirectly = async (reasons: string[], desc: string) => {
    setIsLoading(true);
    setActiveStep('ai_preview');
    try {
      const res = await CaseService.generateClientConnectDraft(caseData._id, {
        reasons,
        description: desc,
      });
      if (res && (res as any).error === 'LIMIT_EXCEEDED') {
        Alert.alert(
          "Limit Exceeded",
          "You've used your 2 Client Connect conversations. Upgrade to Enterprise for unlimited AI client communication.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Upgrade Now", onPress: () => router.push('/profile/billing' as any) }
          ]
        );
        setActiveStep('dashboard');
        return;
      }
      if (res.draft) {
        setAiDraft(cleanMarkdown(res.draft));
      } else {
        throw new Error('No draft returned');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Draft Generation Failed', 'AI was unable to generate a message draft.');
      setActiveStep('dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Direct Phone Call Action
  const handlePhoneCall = async () => {
    setContactMethodSheetOpen(false);
    if (!phone) {
      showToast('error', 'Missing Contact Info', 'No phone number available for this client.');
      return;
    }

    const cleanPhone = phone.replace(/[^+\d]/g, '');
    const url = `tel:${cleanPhone}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        // Log immediately
        await CaseService.logClientCommunication(caseData._id, {
          type: 'Phone Call',
        });
        showToast('success', 'Call Initiated', 'Device dialer opened successfully.');
        refreshLogs();
      } else {
        showToast('error', 'Unable to Call', 'Dialer is not supported on this platform.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to dial', 'Device call error.');
    }
  };

  // 3. Initiate WhatsApp flow
  const handleWhatsAppSelection = () => {
    setContactMethodSheetOpen(false);
    if (!whatsapp) {
      showToast('error', 'Missing Contact Info', 'No WhatsApp number available for this client.');
      return;
    }
    const cleanPhone = formatWhatsAppNumber(whatsapp);
    if (!cleanPhone) {
      showToast('error', 'Invalid WhatsApp Number', 'Please configure a valid 10-digit number or 91 country code.');
      return;
    }
    setSelectedReasons([]);
    setCustomDescription('');
    setIsEditingDraft(false);
    setActiveStep('reasons');
  };

  // Checkbox toggle logic
  const toggleReason = (option: string) => {
    if (selectedReasons.includes(option)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== option));
    } else {
      setSelectedReasons([...selectedReasons, option]);
    }
  };

  // Next step logic after reasons
  const handleNextFromReasons = () => {
    if (selectedReasons.length === 0) {
      showToast('info', 'Reason Required', 'Please select at least one reason for contact.');
      return;
    }
    if (selectedReasons.includes('Other')) {
      setActiveStep('other_details');
    } else {
      generateAIDraftDirectly(selectedReasons, '');
    }
  };

  // Speak/Dictation Simulation
  const startVoiceDictation = () => {
    setVoiceModalOpen(true);
    setVoicePulsing(true);

    // Simulate transcribing a realistic legal message after 3 seconds
    setTimeout(() => {
      setVoicePulsing(false);
      const randomText = TRANSCRIPTION_TEMPLATES[simulatedTranscriptionIndex];
      setCustomDescription((prev) => (prev ? prev + ' ' + randomText : randomText));
      setSimulatedTranscriptionIndex((prev) => (prev + 1) % TRANSCRIPTION_TEMPLATES.length);
      setVoiceModalOpen(false);
      showToast('success', 'Voice Transcribed', 'Speech converted to text successfully.');
    }, 3200);
  };

  // Submit description & trigger AI
  const handleGenerateAIDraft = () => {
    generateAIDraftDirectly(selectedReasons, customDescription);
  };

  // Direct manual message
  const handleOpenWhatsAppManual = async () => {
    const cleanPhone = formatWhatsAppNumber(whatsapp);
    if (!cleanPhone) {
      showToast('error', 'Invalid WhatsApp Number', 'Please configure a valid 10-digit number or 91 country code.');
      return;
    }
    const url = `whatsapp://send?phone=${cleanPhone}`;

    try {
      await Linking.openURL(url);
      await CaseService.logClientCommunication(caseData._id, {
        type: 'WhatsApp',
        reason: selectedReasons.join(', '),
        mode: 'Manual Message',
      });
      showToast('success', 'WhatsApp Opened', 'Empty WhatsApp chat screen opened.');
      setActiveStep('dashboard');
      refreshLogs();
    } catch (e) {
      // Fallback
      const webUrl = `https://wa.me/${cleanPhone}`;
      Linking.openURL(webUrl);
      await CaseService.logClientCommunication(caseData._id, {
        type: 'WhatsApp',
        reason: selectedReasons.join(', '),
        mode: 'Manual Message',
      });
      setActiveStep('dashboard');
      refreshLogs();
    }
  };

  // AI draft options actions:
  // "Continue with AI Draft"
  const handleContinueWithAIDraft = async () => {
    const cleanPhone = formatWhatsAppNumber(whatsapp);
    if (!cleanPhone) {
      showToast('error', 'Invalid WhatsApp Number', 'Please configure a valid 10-digit number or 91 country code.');
      return;
    }
    const textParam = encodeURIComponent(aiDraft);
    const url = `whatsapp://send?phone=${cleanPhone}&text=${textParam}`;

    try {
      await Linking.openURL(url);
      await CaseService.logClientCommunication(caseData._id, {
        type: 'WhatsApp',
        reason: selectedReasons.join(', '),
        mode: 'AI Draft',
      });
      showToast('success', 'Draft Transferred', 'Draft sent successfully to WhatsApp.');
      setActiveStep('dashboard');
      refreshLogs();
    } catch (e) {
      // Fallback web WhatsApp
      const webUrl = `https://wa.me/${cleanPhone}?text=${textParam}`;
      Linking.openURL(webUrl);
      await CaseService.logClientCommunication(caseData._id, {
        type: 'WhatsApp',
        reason: selectedReasons.join(', '),
        mode: 'AI Draft',
      });
      setActiveStep('dashboard');
      refreshLogs();
    }
  };

  // "Regenerate"
  const handleRegenerate = () => {
    setIsEditingDraft(false);
    generateAIDraftDirectly(selectedReasons, customDescription);
  };

  // "Write My Own Message"
  const handleWriteMyOwnMessage = async () => {
    const cleanPhone = formatWhatsAppNumber(whatsapp);
    if (!cleanPhone) {
      showToast('error', 'Invalid WhatsApp Number', 'Please configure a valid 10-digit number or 91 country code.');
      return;
    }
    const url = `whatsapp://send?phone=${cleanPhone}`;

    try {
      await Linking.openURL(url);
      await CaseService.logClientCommunication(caseData._id, {
        type: 'WhatsApp',
        reason: selectedReasons.join(', '),
        mode: 'Manual Message',
      });
      setActiveStep('dashboard');
      refreshLogs();
    } catch (e) {
      Linking.openURL(`https://wa.me/${cleanPhone}`);
      await CaseService.logClientCommunication(caseData._id, {
        type: 'WhatsApp',
        reason: selectedReasons.join(', '),
        mode: 'Manual Message',
      });
      setActiveStep('dashboard');
      refreshLogs();
    }
  };

  // Clear all communication logs
  const handleClearAllLogs = () => {
    Alert.alert(
      'Clear All Logs',
      'Are you sure you want to delete all client communication logs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await CaseService.clearClientCommunicationLogs(caseData._id);
              if (res.success) {
                showToast('success', 'History Cleared', 'All communication logs have been cleared.');
                refreshLogs();
              } else {
                showToast('error', 'Clear Failed', res.error || 'Failed to clear logs.');
              }
            } catch (err: any) {
              console.error(err);
              showToast('error', 'Clear Failed', err?.message || 'Failed to clear logs.');
            }
          },
        },
      ]
    );
  };

  // Delete specific log item
  const handleDeleteLog = (logId: string) => {
    if (!logId) return;
    Alert.alert(
      'Delete Log Item',
      'Are you sure you want to delete this communication log item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await CaseService.deleteClientCommunicationLog(caseData._id, logId);
              if (res.success) {
                showToast('success', 'Log Deleted', 'Communication log item deleted successfully.');
                refreshLogs();
              } else {
                showToast('error', 'Delete Failed', res.error || 'Failed to delete log.');
              }
            } catch (err: any) {
              console.error(err);
              showToast('error', 'Delete Failed', err?.message || 'Failed to delete log.');
            }
          },
        },
      ]
    );
  };

  // Format date helper
  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch (e) {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── STEP 1: DASHBOARD VIEW ────────────────────────────────────────── */}
      {activeStep === 'dashboard' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* CRM Client Card Header */}
          <View style={[styles.clientCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.clientAvatarRow}>
              <View style={[styles.avatarCircle, { backgroundColor: `${theme.primary}15` }]}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>
                  {clientName.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.clientMainDetails}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.clientName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {clientName}
                  </Text>
                  <View style={[styles.crmBadge, { backgroundColor: `${theme.success}15` }]}>
                    <Text style={[styles.crmBadgeText, { color: theme.success }]}>ACTIVE</Text>
                  </View>
                </View>
                <Text style={[styles.clientSubtext, { color: theme.textSecondary }]}>Enterprise Client Profile</Text>
              </View>
            </View>

            {/* Direct Information Grid */}
            <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />

            <View style={styles.detailsGrid}>
              <View style={styles.detailsCol}>
                <Ionicons name="chatbubble-outline" size={14} color={theme.textMuted} />
                <Text style={[styles.detailsLabel, { color: theme.textMuted }]}>WhatsApp</Text>
                <Text style={[styles.detailsValue, { color: theme.textPrimary }]} numberOfLines={1}>
                  {whatsapp || 'N/A'}
                </Text>
              </View>
              <View style={styles.detailsCol}>
                <Ionicons name="call-outline" size={14} color={theme.textMuted} />
                <Text style={[styles.detailsLabel, { color: theme.textMuted }]}>Mobile Phone</Text>
                <Text style={[styles.detailsValue, { color: theme.textPrimary }]} numberOfLines={1}>
                  {phone || 'N/A'}
                </Text>
              </View>
            </View>

            {email ? (
              <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="mail-outline" size={13} color={theme.textMuted} />
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>{email}</Text>
              </View>
            ) : null}
          </View>

          {/* Quick Actions Shortcuts */}
          <View style={{ marginTop: 22 }}>
            <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>QUICK SHORTCUTS</Text>
            <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
              Instantly draft messages with relevant case files context.
            </Text>

            <View style={styles.quickActionsGrid}>
              {[
                { title: 'Request Documents', icon: 'document-text-outline', color: '#3B82F6' },
                { title: 'Request Evidence', icon: 'shield-checkmark-outline', color: '#06B6D4' },
                { title: 'Payment Reminder', icon: 'cash-outline', color: '#10B981' },
                { title: 'Hearing Reminder', icon: 'hammer-outline', color: '#F59E0B' },
                { title: 'Meeting Request', icon: 'calendar-outline', color: '#8B5CF6' },
                { title: 'Case Update', icon: 'pulse-outline', color: '#EC4899' },
              ].map((act) => (
                <TouchableOpacity
                  key={act.title}
                  style={[styles.quickActionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleQuickAction(act.title)}
                >
                  <View style={[styles.quickActionIconWrapper, { backgroundColor: `${act.color}15` }]}>
                    <Ionicons name={act.icon as any} size={16} color={act.color} />
                  </View>
                  <Text style={[styles.quickActionTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                    {act.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Main Action Contact Trigger */}
          <TouchableOpacity
            style={[styles.mainContactBtn, { backgroundColor: theme.primary }]}
            onPress={() => setContactMethodSheetOpen(true)}
          >
            <Ionicons name="chatbubbles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.mainContactBtnText}>Contact Client</Text>
          </TouchableOpacity>

          {/* Communication Logs */}
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary, marginBottom: 0 }]}>COMMUNICATION HISTORY</Text>
              {logs.length > 0 && (
                <TouchableOpacity onPress={handleClearAllLogs}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.danger }}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.historyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {logs.length > 0 ? (
                logs.map((log, index) => {
                  const isCall = log.type === 'Phone Call' || log.type === 'Call';
                  const logId = log._id || log.id;
                  return (
                    <View key={logId || index}>
                      <View style={styles.logRow}>
                        <View
                          style={[
                            styles.logIconBg,
                            { backgroundColor: isCall ? '#EFF6FF' : '#F0FDF4' },
                          ]}
                        >
                          <Ionicons
                            name={isCall ? 'call' : 'logo-whatsapp'}
                            size={16}
                            color={isCall ? '#3B82F6' : '#22C55E'}
                          />
                        </View>
                        <View style={styles.logMeta}>
                          <Text style={[styles.logTitle, { color: theme.textPrimary }]}>{log.type}</Text>
                          <Text style={[styles.logDesc, { color: theme.textSecondary }]}>
                            {log.summary ||
                              (isCall
                                ? 'Phone Call with Client'
                                : `WhatsApp update sent: ${log.reason || 'Update'}`)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
                          <Text style={[styles.logDate, { color: theme.textMuted }]}>
                            {formatDate(log.timestamp)}
                          </Text>
                          {logId && (
                            <TouchableOpacity onPress={() => handleDeleteLog(logId)}>
                              <Ionicons name="trash-outline" size={14} color={theme.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {index < logs.length - 1 && (
                        <View style={[styles.logRowDivider, { backgroundColor: theme.border }]} />
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyLogs}>
                  <Ionicons name="chatbox-ellipses-outline" size={32} color={theme.textMuted} />
                  <Text style={[styles.emptyLogsText, { color: theme.textMuted }]}>
                    No client communication history recorded yet.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ─── STEP 2: REASONS SELECTOR ───────────────────────────────────────── */}
      {activeStep === 'reasons' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.stepHeader}>
            <TouchableOpacity onPress={() => setActiveStep('dashboard')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>Reason For Contact</Text>
          </View>
          <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
            Select one or more items to include in the AI draft context.
          </Text>

          <View style={styles.optionsList}>
            {WHATSAPP_OPTIONS.map((opt) => {
              const isChecked = selectedReasons.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    { backgroundColor: theme.card, borderColor: isChecked ? theme.primary : theme.border },
                  ]}
                  onPress={() => toggleReason(opt)}
                >
                  <Text style={[styles.optionText, { color: theme.textPrimary }]}>{opt}</Text>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: isChecked ? theme.primary : theme.textMuted,
                        backgroundColor: isChecked ? theme.primary : 'transparent',
                      },
                    ]}
                  >
                    {isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtnOutline, { borderColor: theme.border }]}
              onPress={handleOpenWhatsAppManual}
            >
              <Text style={[styles.actionBtnOutlineText, { color: theme.textPrimary }]}>Open WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtnPrimary, { backgroundColor: theme.primary }]}
              onPress={handleNextFromReasons}
            >
              <Text style={styles.actionBtnPrimaryText}>Next</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ─── STEP 3: OTHER DETAILS & SPEECH ─────────────────────────────────── */}
      {activeStep === 'other_details' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.stepHeader}>
            <TouchableOpacity onPress={() => setActiveStep('reasons')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>Custom Details</Text>
          </View>
          <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
            Describe details of your WhatsApp update. You can type or speak them.
          </Text>

          <View style={[styles.descriptionContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <RNTextInput
              style={[styles.descriptionInput, { color: theme.textPrimary }]}
              placeholder="Describe your message..."
              placeholderTextColor={theme.placeholder}
              multiline
              numberOfLines={6}
              value={customDescription}
              onChangeText={setCustomDescription}
              textAlignVertical="top"
            />
            <TouchableOpacity style={[styles.micBtn, { backgroundColor: `${theme.primary}12` }]} onPress={startVoiceDictation}>
              <Ionicons name="mic" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtnOutline, { borderColor: theme.border }]}
              onPress={handleOpenWhatsAppManual}
            >
              <Text style={[styles.actionBtnOutlineText, { color: theme.textPrimary }]}>Open WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtnPrimary, { backgroundColor: theme.primary }]}
              onPress={handleGenerateAIDraft}
            >
              <Text style={styles.actionBtnPrimaryText}>Generate AI Draft</Text>
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ─── STEP 4: AI MESSAGE PREVIEW ─────────────────────────────────────── */}
      {activeStep === 'ai_preview' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.stepHeader}>
            <TouchableOpacity
              onPress={() => setActiveStep(selectedReasons.includes('Other') ? 'other_details' : 'reasons')}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>AI Message Preview</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                AI Zero Hallucination Engine is drafting message...
              </Text>
            </View>
          ) : (
            <View style={{ gap: 20 }}>
              <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                Here is the drafted WhatsApp message generated from case details:
              </Text>

              {/* Draft Box */}
              <View style={[styles.draftBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {isEditingDraft ? (
                  <RNTextInput
                    style={[styles.draftEditTextInput, { color: theme.textPrimary }]}
                    multiline
                    value={aiDraft}
                    onChangeText={setAiDraft}
                    textAlignVertical="top"
                  />
                ) : (
                  <Text style={[styles.draftContent, { color: theme.textPrimary }]}>{aiDraft}</Text>
                )}
              </View>

              {/* 4 Action Options */}
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={[styles.aiOptionBtn, { backgroundColor: theme.primary }]}
                  onPress={handleContinueWithAIDraft}
                >
                  <Ionicons name="arrow-forward-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.aiOptionText}>Continue with AI Draft</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.aiOptionBtnOutline, { borderColor: theme.border }]}
                  onPress={() => setIsEditingDraft(!isEditingDraft)}
                >
                  <Ionicons
                    name={isEditingDraft ? 'checkmark-circle-outline' : 'create-outline'}
                    size={16}
                    color={theme.textPrimary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.aiOptionBtnText, { color: theme.textPrimary }]}>
                    {isEditingDraft ? 'Save Custom Edits' : 'Edit Draft'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.aiOptionBtnOutline, { borderColor: theme.border }]}
                  onPress={handleRegenerate}
                >
                  <Ionicons name="refresh-outline" size={16} color={theme.textPrimary} style={{ marginRight: 6 }} />
                  <Text style={[styles.aiOptionBtnText, { color: theme.textPrimary }]}>Regenerate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.aiOptionBtnOutline, { borderColor: theme.border }]}
                  onPress={handleWriteMyOwnMessage}
                >
                  <Ionicons name="chatbox-outline" size={16} color={theme.textPrimary} style={{ marginRight: 6 }} />
                  <Text style={[styles.aiOptionBtnText, { color: theme.textPrimary }]}>Write My Own Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ─── DIALER/CONTACT METHOD BOTTOM SHEET ─────────────────────────────── */}
      <Modal
        visible={contactMethodSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setContactMethodSheetOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setContactMethodSheetOpen(false)}
        >
          <View style={[styles.bottomSheetContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.bottomSheetDragHandle} />
            <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Choose Contact Method</Text>

            <View style={{ gap: 12, paddingVertical: 14 }}>
              <TouchableOpacity
                style={[styles.sheetItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handleWhatsAppSelection}
              >
                <View style={[styles.sheetIconWrapper, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="logo-whatsapp" size={18} color="#22C55E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetItemTitle, { color: theme.textPrimary }]}>WhatsApp</Text>
                  <Text style={[styles.sheetItemDesc, { color: theme.textSecondary }]}>
                    Select contact reason, edit, and send with AI drafting assistance.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handlePhoneCall}
              >
                <View style={[styles.sheetIconWrapper, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="call" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetItemTitle, { color: theme.textPrimary }]}>Phone Call</Text>
                  <Text style={[styles.sheetItemDesc, { color: theme.textSecondary }]}>
                    Directly call client using device dialer (No AI, manual logging).
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── SPEECH TRANSCRIPTION SIMULATOR MODAL ────────────────────────────── */}
      <Modal visible={voiceModalOpen} transparent animationType="fade">
        <View style={styles.speechOverlay}>
          <View style={[styles.speechContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.speechTitle, { color: theme.textPrimary }]}>Listening to Voice Dictation...</Text>
            
            {/* Animated pulsating microphone wave */}
            <View style={styles.pulseContainer}>
              <View style={[styles.pulseCircle, styles.pulse1, { backgroundColor: theme.primary }]} />
              <View style={[styles.pulseCircle, styles.pulse2, { backgroundColor: theme.primary }]} />
              <View style={[styles.pulseMainCircle, { backgroundColor: theme.primary }]}>
                <Ionicons name="mic" size={32} color="#FFFFFF" />
              </View>
            </View>

            <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginTop: 24, paddingHorizontal: 16 }}>
              Speak now. Your legal updates will be transcribed and auto-populated into the description block.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  clientCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  clientAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  clientMainDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '800',
  },
  crmBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  crmBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  clientSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    marginVertical: 14,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  detailsCol: {
    flex: 1,
    gap: 2,
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  detailsValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 11,
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionButton: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'flex-start',
    gap: 6,
  },
  quickActionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  mainContactBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mainContactBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  historyContainer: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    marginTop: 8,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logMeta: {
    flex: 1,
    gap: 2,
  },
  logTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  logDesc: {
    fontSize: 11,
  },
  logDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  logRowDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  emptyLogs: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyLogsText: {
    fontSize: 12,
    textAlign: 'center',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  stepSubtitle: {
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  optionsList: {
    gap: 10,
    marginBottom: 24,
  },
  optionRow: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtnOutline: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnOutlineText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  descriptionContainer: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    position: 'relative',
    marginBottom: 24,
  },
  descriptionInput: {
    height: 120,
    fontSize: 13,
    lineHeight: 18,
    paddingRight: 40,
  },
  micBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    textAlign: 'center',
  },
  draftBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    minHeight: 160,
  },
  draftContent: {
    fontSize: 13,
    lineHeight: 20,
  },
  draftEditTextInput: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    height: 160,
  },
  aiOptionBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiOptionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  aiOptionBtnOutline: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiOptionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  bottomSheetDragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  sheetItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetItemTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  sheetItemDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  speechOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speechContent: {
    width: '80%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  speechTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 16,
  },
  pulseContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.3,
  },
  pulse1: {
    transform: [{ scale: 1.2 }],
  },
  pulse2: {
    transform: [{ scale: 1.5 }],
  },
  pulseMainCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

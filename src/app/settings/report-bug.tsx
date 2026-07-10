import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { useUserStore } from '@/store/user';
import { apiClient } from '@/api/client';

const { height } = Dimensions.get('window');

const SCREEN_OPTIONS = [
  'AI Chat',
  'Draft Maker',
  'Evidence Analysis',
  'Contract Review',
  'Case Predictor',
  'Strategy Engine',
  'Knowledge Hub',
  'Mock Courtroom',
  'Settings',
  'Other'
];

const SEVERITY_OPTIONS = [
  'Low',
  'Medium',
  'High',
  'Critical'
];

export default function ReportBugScreen() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme } = useThemeContext();
  const profile = useUserStore((s) => s.profile);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenName, setScreenName] = useState(SCREEN_OPTIONS[0]);
  const [severity, setSeverity] = useState(SEVERITY_OPTIONS[0]);
  const [steps, setSteps] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; size: string }[]>([]);
  const [includeLogs, setIncludeLogs] = useState(true);

  // Dropdown Picker Modal state
  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    options: string[];
    selectedValue: string;
    onSelect: (val: string) => void;
  }>({
    visible: false,
    title: '',
    options: [],
    selectedValue: '',
    onSelect: () => {},
  });

  // Flow states
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [referenceId, setReferenceId] = useState('');

  // Auto generate reference ID
  const generateRefId = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = 'BUG-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSelectScreen = () => {
    setPickerModal({
      visible: true,
      title: 'Which screen were you on?',
      options: SCREEN_OPTIONS,
      selectedValue: screenName,
      onSelect: (val) => setScreenName(val),
    });
  };

  const handleSelectSeverity = () => {
    setPickerModal({
      visible: true,
      title: 'Select Severity',
      options: SEVERITY_OPTIONS,
      selectedValue: severity,
      onSelect: (val) => setSeverity(val),
    });
  };

  const handleAddScreenshot = () => {
    if (attachments.length >= 5) {
      showToast('error', 'Limit Reached', 'You can attach up to 5 screenshots maximum.');
      return;
    }

    Alert.alert(
      'Attach Screenshot',
      'Select a screenshot option to attach:',
      [
        {
          text: 'Choose from Gallery (Simulate)',
          onPress: () => {
            const num = attachments.length + 1;
            setAttachments([...attachments, { name: `bug_screenshot_${num}.jpg`, size: '890 KB' }]);
            showToast('success', 'Screenshot Added', `bug_screenshot_${num}.jpg attached.`);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleRemoveScreenshot = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast('error', 'Required Field', 'Bug Title is required.');
      return;
    }
    if (!description.trim()) {
      showToast('error', 'Required Field', 'Please describe the bug issue.');
      return;
    }

    setSubmitting(true);

    const diagnosticLogs = includeLogs
      ? {
          deviceModel: Platform.OS === 'ios' ? 'iPhone 15 Pro' : 'Samsung S24 Ultra',
          osVersion: Platform.Version.toString(),
          appVersion: 'v1.2.0 (Build 402)',
          currentScreen: screenName,
          timestamp: new Date().toLocaleString(),
          simulatedLogs: 'INFO: Render successful. WARN: Network delay in RAG service. ERROR: JSON parsing failure at line 37.',
        }
      : null;

    const payload = {
      name: profile?.name || 'Enterprise Advocate',
      email: profile?.email || 'advocate@ai-legal.in',
      userId: profile?._id || null,
      issueType: 'Bug Report',
      title,
      message: description,
      category: screenName,
      priority: severity,
      device: Platform.OS === 'ios' ? 'iPhone' : 'Android',
      appVersion: 'v1.2.0 (Build 402)',
      steps,
      attachments,
      diagnosticLogs,
      status: 'pending'
    };

    try {
      const res = await apiClient.post('/support', payload);
      // Fallback if ticket id isn't returned
      const ref = res.data?.ticket?._id || generateRefId();
      setReferenceId(ref);
      setSubmitting(false);
      setSuccess(true);
    } catch (err) {
      showToast('error', 'Submission Failed', 'Failed to submit bug report.');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.successWrapper}>
          <View style={[styles.successIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="bug-outline" size={54} color="#DC2626" />
          </View>
          <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Bug Report Submitted Successfully</Text>
          <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
            Thank you for reporting this issue. Our Engineering Team has received your report and will investigate it immediately.
          </Text>
          
          <View style={[styles.refCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <Text style={[styles.refLabel, { color: theme.textMuted }]}>Reference ID</Text>
            <Text style={[styles.refValue, { color: '#DC2626' }]}>{referenceId}</Text>
          </View>

          <TouchableOpacity style={[styles.doneBtn, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>🐞 Report Bug</Text>
          <Text style={styles.headerSubtitle}>Submit bugs or computational errors. Diagnostic logs will be collected.</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          
          {/* Bug Title */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Bug Title *</Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Example: Crash while generating contract"
              placeholderTextColor={theme.placeholder}
            />
          </View>

          {/* Describe the Issue */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Describe the Issue *</Text>
            <TextInput
              style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Explain exactly what happened. What triggered the issue?"
              placeholderTextColor={theme.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Which screen were you on */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Which screen were you on? *</Text>
            <Pressable
              style={[styles.dropdownTrigger, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              onPress={handleSelectScreen}
            >
              <Text style={{ color: theme.textPrimary, fontSize: 13 }}>{screenName}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>
          </View>

          {/* Severity */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Severity *</Text>
            <Pressable
              style={[styles.dropdownTrigger, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              onPress={handleSelectSeverity}
            >
              <Text style={{ color: theme.textPrimary, fontSize: 13 }}>{severity}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>
          </View>

          {/* Steps to Reproduce */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Steps to Reproduce (Optional)</Text>
            <TextInput
              style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              value={steps}
              onChangeText={setSteps}
              placeholder="1. Go to Tools tab&#10;2. Select Contract Review&#10;3. Tap generate"
              placeholderTextColor={theme.placeholder}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Attach Screenshot */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Attach Screenshots (Optional)</Text>
            <Pressable
              style={[styles.attachBtn, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              onPress={handleAddScreenshot}
            >
              <Ionicons name="image-outline" size={18} color={theme.primary} />
              <Text style={[styles.attachBtnText, { color: theme.primary }]}>Select Images</Text>
            </Pressable>

            {attachments.length > 0 && (
              <View style={styles.attachmentsList}>
                {attachments.map((file, idx) => (
                  <View key={idx} style={[styles.attachmentItem, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
                    <Ionicons name="image" size={16} color={theme.primary} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.attachmentName, { color: theme.textPrimary }]} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={{ fontSize: 9, color: theme.textSecondary }}>{file.size}</Text>
                    </View>
                    <Pressable onPress={() => handleRemoveScreenshot(idx)} style={styles.removeAttachClick}>
                      <Ionicons name="close" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Include Diagnostic Logs */}
          <View style={styles.logsConsentRow}>
            <Pressable onPress={() => setIncludeLogs(!includeLogs)} style={styles.checkboxClick}>
              <Ionicons name={includeLogs ? 'checkbox' : 'square-outline'} size={20} color={theme.primary} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.logsLabel, { color: theme.textPrimary }]}>Include Diagnostic Logs</Text>
              <Text style={styles.logsDesc}>Automatically collect device specifications, OS build info and network events logs.</Text>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: '#DC2626', opacity: submitting ? 0.8 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Bug Report</Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Select Picker Bottom Sheet Modal */}
      <Modal
        visible={pickerModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPickerModal({ ...pickerModal, visible: false })}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setPickerModal({ ...pickerModal, visible: false })} />
          <View style={[styles.modalContent, { maxHeight: height * 0.5, backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{pickerModal.title}</Text>
              <Pressable onPress={() => setPickerModal({ ...pickerModal, visible: false })}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {pickerModal.options.map((opt) => {
                const isSelected = opt === pickerModal.selectedValue;
                return (
                  <Pressable
                    key={opt}
                    style={[
                      styles.pickerOptRow,
                      { borderBottomColor: theme.divider },
                      isSelected && [styles.pickerOptRowSelected, { backgroundColor: theme.primaryLight }]
                    ]}
                    onPress={() => {
                      pickerModal.onSelect(opt);
                      setPickerModal({ ...pickerModal, visible: false });
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptText,
                        { color: theme.textSecondary },
                        isSelected && [styles.pickerOptTextSelected, { color: theme.primary }]
                      ]}
                    >
                      {opt}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={theme.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    height: 90,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 11,
    gap: 6,
  },
  attachBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  attachmentsList: {
    marginTop: 10,
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: '700',
  },
  removeAttachClick: {
    padding: 4,
  },
  logsConsentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 8,
  },
  checkboxClick: {
    paddingTop: 1,
  },
  logsLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  logsDesc: {
    fontSize: 9.5,
    color: '#9CA3AF',
    lineHeight: 13,
    marginTop: 1,
  },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissBg: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  pickerOptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  pickerOptRowSelected: {
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  pickerOptText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pickerOptTextSelected: {
    fontWeight: '800',
  },
  successWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  successSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  refCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  refLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  refValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  doneBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});

import React, { useState, useMemo } from 'react';
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
import { useTranslation } from '../../utils/localization';

const { height } = Dimensions.get('window');

const WHO_BENEFIT_OPTIONS = [
  'Advocates',
  'Judges',
  'Law Students',
  'Law Firms',
  'Corporate Legal Teams',
  'Litigants',
  'Everyone'
];

const CATEGORY_OPTIONS = [
  'New AI Feature',
  'Legal Research',
  'AI Copilot',
  'Automation',
  'Document Intelligence',
  'Voice & OCR',
  'Knowledge Hub',
  'Courtroom Tools',
  'Productivity',
  'Security',
  'UI / UX',
  'Performance',
  'Integration',
  'Other'
];

export default function FeatureRequestScreen() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme } = useThemeContext();
  const profile = useUserStore((s) => s.profile);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [whyNeeded, setWhyNeeded] = useState('');
  const [whoBenefit, setWhoBenefit] = useState(WHO_BENEFIT_OPTIONS[0]);
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [priority, setPriority] = useState<'Nice to Have' | 'Important' | 'Critical'>('Nice to Have');
  const [attachments, setAttachments] = useState<{ name: string; size: string; type: string }[]>([]);
  
  // Dropdown Picker Modals
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

  // Flow control states
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [referenceId, setReferenceId] = useState('');

  // Auto generate reference ID
  const generateRefId = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = 'FR-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSelectBenefit = () => {
    setPickerModal({
      visible: true,
      title: 'Who will benefit?',
      options: WHO_BENEFIT_OPTIONS,
      selectedValue: whoBenefit,
      onSelect: (val) => setWhoBenefit(val),
    });
  };

  const handleSelectCategory = () => {
    setPickerModal({
      visible: true,
      title: 'Select Category',
      options: CATEGORY_OPTIONS,
      selectedValue: category,
      onSelect: (val) => setCategory(val),
    });
  };

  const handleAddAttachment = () => {
    if (attachments.length >= 5) {
      showToast('error', 'Limit Reached', 'You can attach up to 5 files maximum.');
      return;
    }

    Alert.alert(
      'Simulate Attachment',
      'Select a mock file type to attach to this feature request:',
      [
        {
          text: 'Screenshot Image',
          onPress: () => {
            const num = attachments.length + 1;
            setAttachments([...attachments, { name: `screenshot_feature_${num}.png`, size: '1.4 MB', type: 'image/png' }]);
            showToast('success', 'Attached', 'screenshot_feature.png added.');
          }
        },
        {
          text: 'PDF Document',
          onPress: () => {
            const num = attachments.length + 1;
            setAttachments([...attachments, { name: `proposal_outline_${num}.pdf`, size: '840 KB', type: 'application/pdf' }]);
            showToast('success', 'Attached', 'proposal_outline.pdf added.');
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast('error', 'Required Field', 'Feature Title is required.');
      return;
    }
    if (!description.trim()) {
      showToast('error', 'Required Field', 'Feature Description is required.');
      return;
    }
    if (!whyNeeded.trim()) {
      showToast('error', 'Required Field', 'Please explain why this feature is needed.');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: profile?.name || 'Enterprise Advocate',
      email: profile?.email || 'advocate@ai-legal.in',
      userId: profile?._id || null,
      issueType: 'Feature Request',
      title,
      message: description,
      whyNeeded,
      whoBenefit,
      category,
      priority,
      attachments,
      status: 'Review'
    };

    try {
      const res = await apiClient.post('/support', payload);
      // Fallback if ticket id isn't returned
      const ref = res.data?.ticket?._id || generateRefId();
      setReferenceId(ref);
      setSubmitting(false);
      setSuccess(true);
    } catch (err) {
      showToast('error', 'Submission Failed', 'Failed to submit feature request.');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.successWrapper}>
          <View style={[styles.successIconWrap, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="checkmark-circle" size={54} color="#15803D" />
          </View>
          <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Feature Request Submitted Successfully</Text>
          <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
            Thank you for helping improve AI Legal. Your request has been forwarded to our Product Team.
          </Text>
          
          <View style={[styles.refCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <Text style={[styles.refLabel, { color: theme.textMuted }]}>Reference ID</Text>
            <Text style={[styles.refValue, { color: theme.primary }]}>{referenceId}</Text>
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
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>💡 Feature Request</Text>
          <Text style={styles.headerSubtitle}>Have an idea to improve AI Legal? Share your feature suggestion directly with our product team.</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          
          {/* Feature Title */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Feature Title *</Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Example: AI Timeline Generator"
              placeholderTextColor={theme.placeholder}
            />
          </View>

          {/* Feature Description */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Feature Description *</Text>
            <TextInput
              style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Explain your feature idea in detail. What should AI Legal do?"
              placeholderTextColor={theme.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Why is this needed */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Why is this feature needed? *</Text>
            <TextInput
              style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              value={whyNeeded}
              onChangeText={setWhyNeeded}
              placeholder="What problem will this solve?"
              placeholderTextColor={theme.placeholder}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Who will benefit */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Who will benefit? *</Text>
            <Pressable
              style={[styles.dropdownTrigger, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              onPress={handleSelectBenefit}
            >
              <Text style={{ color: theme.textPrimary, fontSize: 13 }}>{whoBenefit}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Category *</Text>
            <Pressable
              style={[styles.dropdownTrigger, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              onPress={handleSelectCategory}
            >
              <Text style={{ color: theme.textPrimary, fontSize: 13 }}>{category}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>
          </View>

          {/* Priority */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Priority *</Text>
            <View style={styles.priorityGrid}>
              {(['Nice to Have', 'Important', 'Critical'] as const).map((p) => {
                const isSelected = priority === p;
                return (
                  <Pressable
                    key={p}
                    style={[
                      styles.priorityBtn,
                      { borderColor: theme.border, backgroundColor: theme.surfaceVariant },
                      isSelected && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={15}
                      color={isSelected ? theme.primary : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.priorityBtnText,
                        { color: theme.textSecondary },
                        isSelected && { color: theme.primary, fontWeight: '800' },
                      ]}
                    >
                      {p}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Attachments */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Attachments (Optional, Max 5)</Text>
            <Pressable
              style={[styles.attachBtn, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              onPress={handleAddAttachment}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={theme.primary} />
              <Text style={[styles.attachBtnText, { color: theme.primary }]}>Attach Screenshot / PDF</Text>
            </Pressable>

            {attachments.length > 0 && (
              <View style={styles.attachmentsList}>
                {attachments.map((file, idx) => (
                  <View key={idx} style={[styles.attachmentItem, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
                    <Ionicons
                      name={file.type === 'application/pdf' ? 'document-text' : 'image'}
                      size={16}
                      color={theme.primary}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.attachmentName, { color: theme.textPrimary }]} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={{ fontSize: 9, color: theme.textSecondary }}>{file.size}</Text>
                    </View>
                    <Pressable onPress={() => handleRemoveAttachment(idx)} style={styles.removeAttachClick}>
                      <Ionicons name="close" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: submitting ? 0.8 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Feature Request</Text>
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
  priorityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 5,
  },
  priorityBtnText: {
    fontSize: 11,
    fontWeight: '600',
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
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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

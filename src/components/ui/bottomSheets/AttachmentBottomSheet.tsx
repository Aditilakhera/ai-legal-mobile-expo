import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius, Shadows } from '@/theme';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';

export interface AttachmentBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectOption: (option: 'camera' | 'picker') => void;
}

export const AttachmentBottomSheet: React.FC<AttachmentBottomSheetProps> = ({
  visible,
  onClose,
  onSelectOption,
}) => {
  const { theme } = useThemeContext();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: theme.card || '#FFFFFF',
                  borderColor: theme.border || '#ECECEC',
                },
                Shadows.bottomSheet,
              ]}
            >
              {/* Drag Handle */}
              <View style={[styles.dragHandle, { backgroundColor: theme.border || '#D1D5DB' }]} />

              {/* Title Header */}
              <View style={[styles.sheetHeader, { borderBottomColor: theme.divider || '#ECECEC', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary || '#1F2937' }]}>
                  Add Attachment
                </Text>
                <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                  <Ionicons name="close" size={22} color={theme.textSecondary || '#6B7280'} />
                </TouchableOpacity>
              </View>

              {/* Option 1: Scan & Capture */}
              <TouchableOpacity
                onPress={() => {
                  onSelectOption('camera');
                  onClose();
                }}
                style={[styles.actionItem, { borderBottomColor: theme.divider || '#ECECEC' }]}
                accessibilityRole="button"
                accessibilityLabel="Scan & Capture"
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.optionIcon}>📷</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.actionLabel, { color: theme.textPrimary || '#1F2937' }]}>
                    Scan & Capture
                  </Text>
                  <Text style={[styles.actionDesc, { color: theme.textSecondary || '#6B7280' }]}>
                    Use camera to capture a document or image.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Add Photos or Files */}
              <TouchableOpacity
                onPress={() => {
                  onSelectOption('picker');
                  onClose();
                }}
                style={[styles.actionItem, { borderBottomColor: 'transparent' }]}
                accessibilityRole="button"
                accessibilityLabel="Add Photos or Files"
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.optionIcon}>📁</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.actionLabel, { color: theme.textPrimary || '#1F2937' }]}>
                    Add Photos or Files
                  </Text>
                  <Text style={[styles.actionDesc, { color: theme.textSecondary || '#6B7280' }]}>
                    Choose images, PDFs or documents from your device.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Cancel */}
              <TouchableOpacity
                onPress={onClose}
                style={[styles.cancelButton, { backgroundColor: theme.surfaceVariant || '#F3F4F6' }]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={[styles.cancelButtonText, { color: theme.textPrimary || '#1F2937' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.xxl || 24,
    borderTopRightRadius: Radius.xxl || 24,
    paddingBottom: Platform.OS === 'ios' ? Spacing[32] || 32 : Spacing[24] || 24,
    paddingHorizontal: Spacing[20] || 20,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: Radius.full || 9999,
    marginVertical: Spacing[12] || 12,
  },
  sheetHeader: {
    width: '100%',
    paddingBottom: Spacing[16] || 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    marginBottom: Spacing[8] || 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: Spacing[16] || 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[16] || 16,
  },
  optionIcon: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  cancelButton: {
    width: '100%',
    height: 52,
    borderRadius: Radius.md || 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing[20] || 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

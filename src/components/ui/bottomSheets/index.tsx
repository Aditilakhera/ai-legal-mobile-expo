/**
 * AI Legal Mobile - Custom Bottom Sheet & Drawer System
 * Gesture-friendly modal sheets, action listings, filter selection drawers, and attachment selectors.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { useThemeContext, useBottomSheetContext } from '@/providers';
import { Spacing, Radius, Shadows } from '@/theme';
import { Button } from '../buttons';

export interface ActionSheetItem {
  label: string;
  onPress: () => void;
  icon?: string;
  isDestructive?: boolean;
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items: ActionSheetItem[];
}

/**
 * Standard Action Sheet list overlay.
 */
export const ActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  onClose,
  title,
  items,
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
            <View style={[styles.sheetContainer, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.bottomSheet]}>
              <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />

              {title && (
                <View style={[styles.sheetHeader, { borderBottomColor: theme.divider }]}>
                  <Text style={[styles.sheetTitle, { color: theme.textSecondary }]}>{title}</Text>
                </View>
              )}

              <ScrollView style={styles.actionList} bounces={false}>
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      item.onPress();
                      onClose();
                    }}
                    style={[
                      styles.actionItem,
                      { borderBottomColor: index === items.length - 1 ? 'transparent' : theme.divider },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <Text style={{ fontSize: 18, marginRight: Spacing[12] }}>{item.icon || '🔸'}</Text>
                    <Text
                      style={[
                        styles.actionItemText,
                        { color: item.isDestructive ? theme.danger : theme.textPrimary },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                onPress={onClose}
                style={[styles.cancelButton, { backgroundColor: theme.surfaceVariant }]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={[styles.cancelButtonText, { color: theme.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

/**
 * Filter Sheet Drawer wrapper.
 */
export interface FilterSheetProps extends Omit<ActionSheetProps, 'items'> {
  options: Array<{ label: string; selected: boolean; onToggle: () => void }>;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({ visible, onClose, title = 'Filter Items', options }) => {
  const { theme } = useThemeContext();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.sheetContainer, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.bottomSheet]}>
              <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
              <View style={[styles.sheetHeader, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>{title}</Text>
              </View>
              <ScrollView style={styles.actionList} bounces={false}>
                {options.map((opt, idx) => (
                  <TouchableOpacity key={idx} onPress={opt.onToggle} style={styles.actionItem}>
                    <Text style={{ fontSize: 18, marginRight: Spacing[12] }}>{opt.selected ? '✅' : '⬜'}</Text>
                    <Text style={[styles.actionItemText, { color: theme.textPrimary }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Button title="Apply Filters" variant="primary" onPress={onClose} style={styles.applyBtn} />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

/**
 * Specialized Picker sheet lists.
 */
export const ToolPickerSheet: React.FC<Omit<ActionSheetProps, 'items' | 'title'>> = (props) => {
  const items: ActionSheetItem[] = [
    { label: 'Draft Maker', icon: '📝', onPress: () => {} },
    { label: 'Contract Analyzer', icon: '🔍', onPress: () => {} },
    { label: 'Evidence Analyst', icon: '📂', onPress: () => {} },
    { label: 'Case Predictor', icon: '📈', onPress: () => {} },
  ];
  return <ActionSheet title="Select AI Tool" items={items} {...props} />;
};

export const AttachmentPickerSheet: React.FC<Omit<ActionSheetProps, 'items' | 'title'>> = (props) => {
  const items: ActionSheetItem[] = [
    { label: 'Take Photo', icon: '📷', onPress: () => {} },
    { label: 'Upload PDF / Document', icon: '📄', onPress: () => {} },
    { label: 'Import from Scans', icon: '📤', onPress: () => {} },
  ];
  return <ActionSheet title="Add Attachment" items={items} {...props} />;
};

/**
 * Global Bottom Sheet presenter template. Mounts to BottomSheetProvider outputs.
 */
export const GlobalBottomSheetModal: React.FC = () => {
  const { theme } = useThemeContext();
  const { isOpen, closeBottomSheet, sheetContent, snapPoints } = useBottomSheetContext();

  const heightStyle: ViewStyle = {
    height: typeof snapPoints[0] === 'string' && snapPoints[0].endsWith('%') 
      ? snapPoints[0] as any 
      : snapPoints[0],
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={closeBottomSheet}
    >
      <TouchableWithoutFeedback onPress={closeBottomSheet}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.sheetContainer,
                heightStyle,
                { backgroundColor: theme.card, borderColor: theme.border },
                Shadows.bottomSheet,
              ]}
            >
              <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
              <View style={{ flex: 1, padding: Spacing[16], width: '100%' }}>
                {sheetContent}
              </View>
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
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingBottom: Spacing[24],
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: Radius.full,
    marginVertical: Spacing[12],
  },
  sheetHeader: {
    width: '100%',
    paddingVertical: Spacing[12],
    paddingHorizontal: Spacing[16],
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionList: {
    width: '100%',
    paddingHorizontal: Spacing[16],
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[16],
    borderBottomWidth: 1,
    minHeight: 48,
  },
  actionItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    width: '90%',
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing[12],
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  applyBtn: {
    width: '90%',
    marginTop: Spacing[16],
  },
});

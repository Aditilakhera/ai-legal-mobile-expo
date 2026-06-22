/**
 * AI Legal Mobile - Custom Dialog & Modal Overlays System
 * Provides confirmation prompts, warning dialogs, alert blocks, and success modals.
 */

import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableWithoutFeedback, ViewStyle, StyleProp } from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius, Shadows } from '@/theme';
import { Button } from '../buttons';

export interface DialogProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'info' | 'danger' | 'warning' | 'success';
  style?: StyleProp<ViewStyle>;
}

/**
 * Reusable Confirmation & Action Dialog.
 */
export const Dialog: React.FC<DialogProps> = ({
  visible,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'info',
  style,
}) => {
  const { theme } = useThemeContext();

  const getConfirmVariant = () => {
    switch (variant) {
      case 'danger':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      case 'info':
      default:
        return 'primary';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.dialogBox, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.modal, style]}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
              
              {!!description && (
                <Text style={[styles.desc, { color: theme.textSecondary }]}>{description}</Text>
              )}

              <View style={styles.actionRow}>
                {onCancel && (
                  <Button
                    title={cancelLabel}
                    variant="outlined"
                    onPress={onCancel}
                    style={{ flex: 1, marginRight: Spacing[8] }}
                  />
                )}
                <Button
                  title={confirmLabel}
                  variant={getConfirmVariant()}
                  onPress={onConfirm}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

/**
 * Delete confirmation dialog preset.
 */
export const DeleteDialog: React.FC<Omit<DialogProps, 'variant'>> = ({
  title = "Delete Entry?",
  description = "This action cannot be undone. All associated evidence or drafts will be permanently deleted.",
  confirmLabel = "Delete",
  ...props
}) => {
  return (
    <Dialog
      variant="danger"
      confirmLabel={confirmLabel}
      title={title}
      description={description}
      {...props}
    />
  );
};

/**
 * Logout confirmation dialog preset.
 */
export const LogoutDialog: React.FC<Omit<DialogProps, 'variant'>> = ({
  title = "Log Out",
  description = "Are you sure you want to end your active workspace session?",
  confirmLabel = "Log Out",
  ...props
}) => {
  return (
    <Dialog
      variant="warning"
      confirmLabel={confirmLabel}
      title={title}
      description={description}
      {...props}
    />
  );
};

/**
 * Success modal display preset.
 */
export const SuccessDialog: React.FC<Omit<DialogProps, 'variant' | 'cancelLabel' | 'onCancel'>> = ({
  confirmLabel = "Continue",
  style,
  ...props
}) => {
  const { theme } = useThemeContext();
  return (
    <Dialog
      variant="success"
      confirmLabel={confirmLabel}
      style={[{ borderTopWidth: 4, borderTopColor: theme.success }, style]}
      {...props}
    />
  );
};

/**
 * Error boundary warning modal.
 */
export const ErrorDialog: React.FC<Omit<DialogProps, 'variant' | 'cancelLabel' | 'onCancel'>> = ({
  confirmLabel = "Close",
  style,
  ...props
}) => {
  const { theme } = useThemeContext();
  return (
    <Dialog
      variant="danger"
      confirmLabel={confirmLabel}
      style={[{ borderTopWidth: 4, borderTopColor: theme.danger }, style]}
      {...props}
    />
  );
};

/**
 * Native hardware Permission warning prompt.
 */
export const PermissionDialog: React.FC<DialogProps> = ({
  confirmLabel = "Grant",
  cancelLabel = "Deny",
  ...props
}) => {
  return (
    <Dialog
      variant="info"
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      {...props}
    />
  );
};

/**
 * Persistent Loading Dialog block.
 */
export interface LoadingDialogProps {
  visible: boolean;
  message?: string;
}

export const LoadingDialog: React.FC<LoadingDialogProps> = ({
  visible,
  message = 'Loading. Please wait...',
}) => {
  const { theme } = useThemeContext();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.dialogBox, { backgroundColor: theme.card, alignItems: 'center' }, Shadows.popup]}>
          <Text style={{ fontSize: 32, marginBottom: Spacing[12] }}>⚖️</Text>
          <Text style={[styles.loadingText, { color: theme.textPrimary }]}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[24],
  },
  dialogBox: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing[20],
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing[8],
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing[20],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});

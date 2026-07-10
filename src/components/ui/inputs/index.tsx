/**
 * AI Legal Mobile - Custom Input Component System
 * High quality input components with full accessibility, screen reader, and state support.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps as RNTextInputProps,
  ActivityIndicator,
  StyleProp,
  Modal,
  FlatList,
} from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';
import { Spacing, Radius, Opacity } from '@/theme';

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  success?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standard text input with customizable states.
 */
export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  success,
  loading,
  disabled,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const { theme } = useThemeContext();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const getBorderColor = () => {
    if (error) return theme.danger;
    if (success) return theme.success;
    if (isFocused) return theme.primary;
    return theme.border;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: getBorderColor(),
            backgroundColor: disabled ? theme.surfaceVariant : theme.surface,
          },
          style,
        ]}
      >
        {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}
        <RNTextInput
          style={[
            styles.input,
            { color: disabled ? theme.textMuted : theme.textPrimary },
            inputStyle,
          ]}
          placeholderTextColor={theme.placeholder}
          editable={!disabled && !loading}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {loading && <ActivityIndicator size="small" color={theme.primary} style={styles.rightIconWrapper} />}
        {!loading && rightIcon && <View style={styles.rightIconWrapper}>{rightIcon}</View>}
      </View>
      {!!error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}
    </View>
  );
};

/**
 * Search input with magnifying glass.
 */
export const SearchInput: React.FC<TextInputProps> = ({ leftIcon, ...props }) => {
  const { theme } = useThemeContext();
  return (
    <TextInput
      leftIcon={leftIcon || <Text style={{ color: theme.textSecondary }}>🔍</Text>}
      placeholder="Search cases, documents..."
      {...props}
    />
  );
};

/**
 * Password input with visibility toggle.
 */
export const PasswordInput: React.FC<TextInputProps> = ({ ...props }) => {
  const [secure, setSecure] = useState(true);
  const { theme } = useThemeContext();

  return (
    <TextInput
      secureTextEntry={secure}
      rightIcon={
        <TouchableOpacity onPress={() => setSecure(!secure)} activeOpacity={0.7} style={styles.iconButton}>
          <Text style={{ color: theme.primary, fontSize: 12 }}>{secure ? 'SHOW' : 'HIDE'}</Text>
        </TouchableOpacity>
      }
      {...props}
    />
  );
};

/**
 * Phone input with phone pad layout.
 */
export const PhoneInput: React.FC<TextInputProps> = (props) => {
  return (
    <TextInput
      keyboardType="phone-pad"
      placeholder="+1 (555) 000-0000"
      {...props}
    />
  );
};

/**
 * Email input with clean formatting bounds.
 */
export const EmailInput: React.FC<TextInputProps> = (props) => {
  return (
    <TextInput
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      placeholder="e.g. name@company.com"
      {...props}
    />
  );
};

/**
 * Numeric verification / count fields.
 */
export const NumberInput: React.FC<TextInputProps> = (props) => {
  return (
    <TextInput
      keyboardType="numeric"
      placeholder="0.00"
      {...props}
    />
  );
};

/**
 * OTP cell inputs.
 */
export interface OtpInputProps {
  codeLength?: number;
  value: string;
  onChangeValue: (val: string) => void;
  error?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  codeLength = 6,
  value,
  onChangeValue,
  error,
}) => {
  const { theme } = useThemeContext();
  const inputRef = useRef<RNTextInput>(null);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1} style={styles.otpWrapper}>
        {Array.from({ length: codeLength }).map((_, index) => {
          const char = value[index] || '';
          const isCurrent = index === value.length;
          return (
            <View
              key={index}
              style={[
                styles.otpCell,
                {
                  borderColor: isCurrent ? theme.primary : theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
            >
              <Text style={[styles.otpCellText, { color: theme.textPrimary }]}>{char}</Text>
            </View>
          );
        })}
      </TouchableOpacity>
      <RNTextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={(text) => onChangeValue(text.replace(/[^0-9]/g, '').slice(0, codeLength))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
      />
      {!!error && <Text style={[styles.errorText, { color: theme.danger, textAlign: 'center' }]}>{error}</Text>}
    </View>
  );
};

/**
 * Large multi-line text area.
 */
export const TextArea: React.FC<TextInputProps> = ({ ...props }) => {
  return (
    <TextInput
      multiline
      numberOfLines={4}
      style={styles.textArea}
      inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
      {...props}
    />
  );
};

/**
 * Chat panel query input.
 */
export interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  placeholder?: string;
  sending?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  onAttach,
  placeholder = 'Ask AI anything...',
  sending = false,
}) => {
  const { theme } = useThemeContext();

  return (
    <View style={[styles.chatInputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {onAttach && (
        <TouchableOpacity onPress={onAttach} style={styles.chatAttachButton} accessibilityLabel="Attach file">
          <Text style={{ color: theme.textSecondary, fontSize: 20 }}>📎</Text>
        </TouchableOpacity>
      )}
      <RNTextInput
        style={[styles.chatTextInput, { color: theme.textPrimary, backgroundColor: theme.surfaceVariant, maxHeight: 120 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.placeholder}
        multiline
      />
      <TouchableOpacity
        onPress={value.trim() && !sending ? onSend : undefined}
        style={[
          styles.chatSendButton,
          { backgroundColor: value.trim() && !sending ? theme.primary : theme.border },
        ]}
        disabled={!value.trim() || sending}
        accessibilityLabel="Send message"
      >
        {sending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>➔</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

/**
 * Upload Box Selector.
 */
export interface UploadInputProps {
  onPress: () => void;
  fileName?: string;
  loading?: boolean;
  error?: string;
}

export const UploadInput: React.FC<UploadInputProps> = ({
  onPress,
  fileName,
  loading = false,
  error,
}) => {
  const { theme } = useThemeContext();

  return (
    <TouchableOpacity
      onPress={loading ? undefined : onPress}
      activeOpacity={Opacity.pressed}
      style={[
        styles.uploadBox,
        {
          borderColor: error ? theme.danger : theme.border,
          backgroundColor: theme.surface,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={fileName ? `Selected file ${fileName}` : 'Upload file'}
    >
      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} />
      ) : fileName ? (
        <View style={styles.uploadInfo}>
          <Text style={{ color: theme.textSecondary, fontSize: 28 }}>📄</Text>
          <Text style={[styles.uploadText, { color: theme.textPrimary }]}>{fileName}</Text>
          <Text style={{ color: theme.primary, fontSize: 13, marginTop: Spacing[4] }}>Change File</Text>
        </View>
      ) : (
        <View style={styles.uploadInfo}>
          <Text style={{ color: theme.textMuted, fontSize: 32 }}>📤</Text>
          <Text style={[styles.uploadText, { color: theme.textPrimary }]}>Choose PDF, Doc, or Scans</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: Spacing[2] }}>Max size 25MB</Text>
        </View>
      )}
      {!!error && <Text style={[styles.errorText, { color: theme.danger, marginTop: Spacing[4] }]}>{error}</Text>}
    </TouchableOpacity>
  );
};

/**
 * Cross-platform Date Picker — pure React Native, Expo Go compatible.
 * No native packages required.
 */
export interface DatePickerProps {
  label?: string;
  placeholder?: string;
  value?: string; // stored as YYYY-MM-DD
  onChangeDate: (date: string) => void;
  containerStyle?: ViewStyle;
  error?: string;
  disabled?: boolean;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  placeholder = 'Select date...',
  value,
  onChangeDate,
  containerStyle,
  error,
  disabled,
}) => {
  const { theme } = useThemeContext();
  const [open, setOpen] = useState(false);

  const today = new Date();
  const [selYear, setSelYear] = useState(value ? parseInt(value.split('-')[0], 10) : today.getFullYear());
  const [selMonth, setSelMonth] = useState(value ? parseInt(value.split('-')[1], 10) - 1 : today.getMonth());
  const [selDay, setSelDay] = useState(value ? parseInt(value.split('-')[2], 10) : today.getDate());

  const getDisplayDate = (): string => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return value;
  };

  const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const months = MONTHS;
  const years = Array.from({ length: 125 }, (_, i) => today.getFullYear() - i);

  const handleConfirm = () => {
    const safeDay = Math.min(selDay, daysInMonth);
    const iso = `${selYear}-${String(selMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    onChangeDate(iso);
    setOpen(false);
  };

  const handleClear = (e: any) => {
    e.stopPropagation();
    onChangeDate('');
  };

  return (
    <View style={containerStyle}>
      {!!label && <Text style={[dpStyles.label, { color: theme.textSecondary }]}>{label}</Text>}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => { if (!disabled) setOpen(true); }}
        disabled={disabled}
        style={[
          dpStyles.inputWrapper,
          {
            borderColor: error ? theme.danger : theme.border,
            backgroundColor: disabled ? theme.surfaceVariant : theme.surface,
          },
        ]}
      >
        <View style={dpStyles.leftIconWrapper}>
          <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
        </View>

        <Text
          style={[dpStyles.inputText, { color: value ? theme.textPrimary : theme.placeholder }]}
          numberOfLines={1}
        >
          {getDisplayDate() || placeholder}
        </Text>

        {!!value && !disabled && (
          <TouchableOpacity onPress={handleClear} activeOpacity={0.7} style={dpStyles.clearButton}>
            <Ionicons name="close-circle" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {!!error && <Text style={[dpStyles.errorText, { color: theme.danger }]}>{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[dpStyles.modalOverlay]}>
          <View style={[dpStyles.modalContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Header */}
            <View style={[dpStyles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[dpStyles.modalTitle, { color: theme.textPrimary }]}>Select Date</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Column Pickers */}
            <View style={dpStyles.pickersRow}>
              {/* Day */}
              <View style={dpStyles.pickerCol}>
                <Text style={[dpStyles.pickerColLabel, { color: theme.textSecondary }]}>Day</Text>
                <FlatList
                  data={days}
                  keyExtractor={(item) => String(item)}
                  style={dpStyles.pickerList}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
                  initialScrollIndex={Math.max(0, selDay - 1)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => setSelDay(item)}
                      style={[dpStyles.pickerItem, selDay === item && { backgroundColor: theme.primary + '22' }]}
                    >
                      <Text style={[dpStyles.pickerItemText, { color: selDay === item ? theme.primary : theme.textPrimary }, selDay === item && { fontWeight: '700' }]}>
                        {String(item).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              {/* Month */}
              <View style={[dpStyles.pickerCol, { flex: 2 }]}>
                <Text style={[dpStyles.pickerColLabel, { color: theme.textSecondary }]}>Month</Text>
                <FlatList
                  data={months}
                  keyExtractor={(item) => item}
                  style={dpStyles.pickerList}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
                  initialScrollIndex={selMonth}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      onPress={() => setSelMonth(index)}
                      style={[dpStyles.pickerItem, selMonth === index && { backgroundColor: theme.primary + '22' }]}
                    >
                      <Text style={[dpStyles.pickerItemText, { color: selMonth === index ? theme.primary : theme.textPrimary }, selMonth === index && { fontWeight: '700' }]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              {/* Year */}
              <View style={[dpStyles.pickerCol, { flex: 1.2 }]}>
                <Text style={[dpStyles.pickerColLabel, { color: theme.textSecondary }]}>Year</Text>
                <FlatList
                  data={years}
                  keyExtractor={(item) => String(item)}
                  style={dpStyles.pickerList}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
                  initialScrollIndex={0}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => setSelYear(item)}
                      style={[dpStyles.pickerItem, selYear === item && { backgroundColor: theme.primary + '22' }]}
                    >
                      <Text style={[dpStyles.pickerItemText, { color: selYear === item ? theme.primary : theme.textPrimary }, selYear === item && { fontWeight: '700' }]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>

            {/* Actions */}
            <View style={[dpStyles.modalActions, { borderTopColor: theme.border }]}>
              <TouchableOpacity onPress={() => setOpen(false)} style={[dpStyles.modalBtn, { borderColor: theme.border }]}>
                <Text style={[dpStyles.modalBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={[dpStyles.modalBtn, dpStyles.modalConfirmBtn, { backgroundColor: theme.primary }]}>
                <Text style={[dpStyles.modalBtnText, { color: '#fff' }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const dpStyles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing[4],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    minHeight: 48,
    paddingHorizontal: Spacing[12],
  },
  leftIconWrapper: {
    marginRight: Spacing[8],
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing[8],
  },
  clearButton: {
    padding: Spacing[4],
    marginLeft: Spacing[4],
  },
  errorText: {
    fontSize: 12,
    marginTop: Spacing[4],
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  pickersRow: {
    flexDirection: 'row',
    height: 220,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  pickerCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  pickerColLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pickerList: {
    flex: 1,
  },
  pickerItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 1,
    paddingHorizontal: 4,
  },
  pickerItemText: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  modalConfirmBtn: {
    borderWidth: 0,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});


const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing[8],
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing[4],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    minHeight: 48,
    paddingHorizontal: Spacing[12],
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing[8],
  },
  leftIconWrapper: {
    marginRight: Spacing[8],
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIconWrapper: {
    marginLeft: Spacing[8],
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    padding: Spacing[8],
  },
  errorText: {
    fontSize: 12,
    marginTop: Spacing[4],
    fontWeight: '500',
  },
  textArea: {
    alignItems: 'flex-start',
  },
  otpWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing[8],
    paddingHorizontal: Spacing[16],
  },
  otpCell: {
    width: 44,
    height: 48,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpCellText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[12],
    paddingVertical: Spacing[8],
    borderTopWidth: 1,
    minHeight: 56,
  },
  chatAttachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatTextInput: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[12],
    paddingVertical: Spacing[8],
    fontSize: 15,
    marginHorizontal: Spacing[8],
    maxHeight: 120,
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[16],
  },
  uploadInfo: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing[8],
  },
});

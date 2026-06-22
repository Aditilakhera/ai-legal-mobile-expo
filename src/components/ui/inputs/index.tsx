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
} from 'react-native';
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
        autoComplete="one-time-code"
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

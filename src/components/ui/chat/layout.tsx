import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface KeyboardSafeChatLayoutProps {
  header: React.ReactNode;
  messages: React.ReactNode;
  composer: React.ReactNode;
  attachments?: React.ReactNode;
  scrollBtn?: React.ReactNode;
  backgroundColor?: string;
  isFocusMode?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  hasPageHeader?: boolean;
}

export const KeyboardSafeChatLayout: React.FC<KeyboardSafeChatLayoutProps> = ({
  header,
  messages,
  composer,
  attachments,
  scrollBtn,
  backgroundColor = '#FFFFFF',
  isFocusMode = true,
  style,
  children,
  hasPageHeader = false,
}) => {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  
  // Calculate dynamic bottom padding:
  // Keyboard open: 0px offset so composer sits flush on top of keyboard.
  // Keyboard closed: respect focus mode (fullscreen safe area bottom) or standard 8px clearance.
  const bottomPadding = isKeyboardVisible
    ? 0
    : (isFocusMode
        ? (insets.bottom > 0 ? insets.bottom + 8 : 8)
        : 8);

  // Calculate container top padding (skip if PageHeader handles safe area top)
  const containerPaddingTop = hasPageHeader ? 0 : (insets.top > 0 ? insets.top : 12);

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: containerPaddingTop }, style]}>
      {/* Screen Header - Outside scrollview */}
      {header}

      {/* Main Keyboard Avoiding / Resizing Container */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.select({ ios: hasPageHeader ? 90 : 60, android: 0 })}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.chatArea}>
          {/* Messages list takes remaining space */}
          <View style={styles.messagesWrapper}>
            {messages}
            {scrollBtn}
          </View>

          {/* Attachments preview queue */}
          {attachments}

          {/* Inline Composer sitting naturally at the bottom - padded cleanly */}
          <View style={[styles.composerContainer, { paddingBottom: bottomPadding }]}>
            {composer}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modals, drawers, and other overlay components */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  messagesWrapper: {
    flex: 1,
    position: 'relative',
    paddingTop: 20, // Proper top spacing below header
  },
  composerContainer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingTop: 4,
  },
});

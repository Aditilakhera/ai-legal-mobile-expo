/**
 * AI Legal Mobile - useKeyboard Custom Hook
 * Listens to device keyboard activities to offset text fields and views.
 */

import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';

export function useKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Select OS-specific events
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    };

    const onKeyboardHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showSubscription = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardVisible,
  };
}

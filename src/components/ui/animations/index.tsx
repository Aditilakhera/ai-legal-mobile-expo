/**
 * AI Legal Mobile - Custom Motion & Layout Animations System
 * Declarative animation containers utilizing native driver transitions.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { Animation } from '@/theme';

export interface MotionProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

/**
 * Fade-In Motion wrapper.
 */
export const Fade: React.FC<MotionProps> = ({
  children,
  duration = Animation.duration.medium,
  delay = 0,
  style,
}) => {
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration, delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
};
export { Fade as FadeIn };

/**
 * Scale-In Motion wrapper.
 */
export const Scale: React.FC<MotionProps> = ({
  children,
  duration = Animation.duration.medium,
  delay = 0,
  style,
}) => {
  const [scaleAnim] = useState(() => new Animated.Value(0.95));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim, duration, delay]);

  return (
    <Animated.View style={[{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};
export { Scale as ScaleIn };

/**
 * Slide-In Motion wrapper.
 */
export interface SlideProps extends MotionProps {
  from?: 'bottom' | 'top' | 'left' | 'right';
}

export const Slide: React.FC<SlideProps> = ({
  children,
  duration = Animation.duration.medium,
  delay = 0,
  from = 'bottom',
  style,
}) => {
  const isHorizontal = from === 'left' || from === 'right';
  const startVal = from === 'bottom' || from === 'right' ? 40 : -40;
  
  const [slideAnim] = useState(() => new Animated.Value(startVal));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim, duration, delay]);

  const transformStyle = isHorizontal
    ? { translateX: slideAnim }
    : { translateY: slideAnim };

  return (
    <Animated.View style={[{ opacity: opacityAnim, transform: [transformStyle] }, style]}>
      {children}
    </Animated.View>
  );
};
export { Slide as SlideIn };

/**
 * Pulse loop animation.
 */
export const Pulse: React.FC<MotionProps> = ({
  children,
  duration = 1000,
  style,
}) => {
  const [pulseAnim] = useState(() => new Animated.Value(0.8));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim, duration]);

  return (
    <Animated.View style={[{ transform: [{ scale: pulseAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

/**
 * Expand & Collapse wrapper using Reanimated or standard height animations.
 */
export interface ExpandProps {
  children: React.ReactNode;
  expanded: boolean;
  style?: ViewStyle;
}

export const Expand: React.FC<ExpandProps> = ({ children, expanded, style }) => {
  const [heightAnim] = useState(() => new Animated.Value(expanded ? 1 : 0));

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: expanded ? 1 : 0,
      duration: Animation.duration.medium,
      useNativeDriver: false, // height cannot use native driver
    }).start();
  }, [expanded, heightAnim]);

  const maxHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500], // arbitary max height threshold
  });

  return (
    <Animated.View style={[{ maxHeight, overflow: 'hidden' }, style]}>
      {children}
    </Animated.View>
  );
};
export { Expand as ExpandCollapse };

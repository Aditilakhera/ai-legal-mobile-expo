/**
 * AI Legal Mobile - Custom Feedback & State Indicators System
 * Conforming WCAG visual cues: Snackbars, linear progress, circular spinners,
 * skeleton placeholders, and offline connectivity status bands.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Animated,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius, StatusColors, Shadows } from '@/theme';
import { Button } from '../buttons';

/**
 * Linear Progress Bar.
 */
export interface LinearProgressProps {
  progress: number; // 0 to 100
  color?: string;
  style?: ViewStyle;
}

export const LinearProgress: React.FC<LinearProgressProps> = ({
  progress,
  color,
  style,
}) => {
  const { theme } = useThemeContext();
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={[styles.progressTrack, { backgroundColor: theme.border }, style]}>
      <View
        style={[
          styles.progressBar,
          {
            width: `${clampedProgress}%`,
            backgroundColor: color || theme.primary,
          },
        ]}
      />
    </View>
  );
};

/**
 * Circular Activity Indicator.
 */
export interface CircularProgressProps {
  size?: 'small' | 'large' | number;
  color?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 'large',
  color,
}) => {
  const { theme } = useThemeContext();

  return (
    <ActivityIndicator
      size={size === 'small' ? 'small' : 'large'}
      color={color || theme.primary}
    />
  );
};

/**
 * Skeleton Placeholder Cell.
 */
export interface SkeletonProps {
  width?: number | string;
  height?: number;
  circle?: boolean;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  circle = false,
  style,
}) => {
  const { theme } = useThemeContext();
  const [pulseAnim] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius: circle ? Radius.full : Radius.sm,
          backgroundColor: theme.border,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

/**
 * Offline Mode warning banner.
 */
export interface OfflineStateProps {
  onRefresh?: () => void;
  style?: ViewStyle;
}

export const OfflineState: React.FC<OfflineStateProps> = ({ onRefresh, style }) => {
  const { theme } = useThemeContext();

  return (
    <View style={[styles.centeredContainer, style]}>
      <Text style={styles.stateIcon}>🔌</Text>
      <Text style={[styles.stateTitle, { color: theme.textPrimary }]}>Offline Mode Active</Text>
      <Text style={[styles.stateDesc, { color: theme.textSecondary }]}>
        You are disconnected. Access cached cases or reconnect to trigger AI modules.
      </Text>
      {onRefresh && (
        <Button title="Check Connection" variant="outlined" onPress={onRefresh} style={{ marginTop: Spacing[16] }} />
      )}
    </View>
  );
};

/**
 * Maintenance Screen blocker.
 */
export const MaintenanceScreen: React.FC = () => {
  const { theme } = useThemeContext();
  return (
    <View style={[styles.centeredContainer, { flex: 1, backgroundColor: theme.background }]}>
      <Text style={styles.stateIcon}>⚖️</Text>
      <Text style={[styles.stateTitle, { color: theme.textPrimary }]}>Under Scheduled Maintenance</Text>
      <Text style={[styles.stateDesc, { color: theme.textSecondary, marginBottom: Spacing[24] }]}>
        We are upgrading our semantic model libraries. AI LEGAL will be back online shortly.
      </Text>
      <Button title="Contact Support" variant="outlined" onPress={() => {}} />
    </View>
  );
};

/**
 * Action toast snackbars.
 */
export interface SnackbarProps {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  actionLabel,
  onAction,
  onDismiss,
}) => {
  const { theme } = useThemeContext();

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <View style={[styles.snackbar, { backgroundColor: theme.secondary }, Shadows.floating]}>
      <Text style={[styles.snackbarText, { color: '#FFFFFF' }]} numberOfLines={2}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={styles.snackbarButton}>
          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
export const Toast = Snackbar; // Alias for backward compatibility

const styles = StyleSheet.create({
  progressTrack: {
    height: 4,
    width: '100%',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: Radius.full,
  },
  skeleton: {
    marginVertical: Spacing[4],
  },
  centeredContainer: {
    padding: Spacing[24],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  stateIcon: {
    fontSize: 48,
    marginBottom: Spacing[12],
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing[8],
    maxWidth: 280,
  },
  snackbar: {
    position: 'absolute',
    bottom: Spacing[24],
    left: Spacing[16],
    right: Spacing[16],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[16],
    paddingVertical: Spacing[12],
    borderRadius: Radius.md,
    minHeight: 48,
  },
  snackbarText: {
    fontSize: 14,
    flex: 1,
    marginRight: Spacing[8],
  },
  snackbarButton: {
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[8],
  },
});

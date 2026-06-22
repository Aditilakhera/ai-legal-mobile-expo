/**
 * AI Legal Mobile - Custom Avatar Components
 * User avatar representations with fallback character initials and sizing keys.
 */

import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { useThemeContext } from '@/providers';
import { Radius, AvatarSizes } from '@/theme';

export type AvatarSizeKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name: string;
  sourceUri?: string | null;
  size?: AvatarSizeKey;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  sourceUri,
  size = 'md',
  style,
}) => {
  const { theme } = useThemeContext();
  const [imageError, setImageError] = useState(false);

  const getAvatarSize = (): number => {
    switch (size) {
      case 'xs':
        return AvatarSizes.sm;
      case 'sm':
        return AvatarSizes.sm;
      case 'lg':
        return AvatarSizes.lg;
      case 'xl':
        return AvatarSizes.xl;
      case 'md':
      default:
        return AvatarSizes.md;
    }
  };

  const getInitials = (fullName: string): string => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
  };

  const dimension = getAvatarSize();
  const initials = getInitials(name);

  const containerStyle = [
    styles.container,
    {
      width: dimension,
      height: dimension,
      borderRadius: Radius.full,
      backgroundColor: theme.surfaceVariant,
      borderColor: theme.border,
    },
    style,
  ];

  const renderContent = () => {
    if (sourceUri && !imageError) {
      return (
        <Image
          source={{ uri: sourceUri }}
          onError={() => setImageError(true)}
          style={{ width: dimension, height: dimension, borderRadius: dimension / 2 }}
        />
      );
    }

    return (
      <Text style={[styles.initials, { fontSize: dimension * 0.4, color: theme.primary }]}>
        {initials}
      </Text>
    );
  };

  return <View style={containerStyle}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '700',
  },
});

/**
 * AI Legal Mobile - Custom Attachment Preview Components
 * File indicators, upload progress bars, and image preview modals.
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ViewStyle } from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius } from '@/theme';
import { AttachmentCard } from '../chat';
import { LinearProgress } from '../feedback';

export { AttachmentCard as FileCard };

export interface ImagePreviewProps {
  uri: string;
  style?: ViewStyle;
}

/**
 * Image attachment preview container.
 */
export const ImagePreview: React.FC<ImagePreviewProps> = ({ uri, style }) => {
  const { theme } = useThemeContext();

  return (
    <View style={[styles.imageFrame, { borderColor: theme.border }, style]}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    </View>
  );
};

export interface UploadProgressProps {
  progress: number; // 0 to 100
  fileName: string;
}

/**
 * File upload progress layout.
 */
export const UploadProgress: React.FC<UploadProgressProps> = ({ progress, fileName }) => {
  const { theme } = useThemeContext();

  return (
    <View style={[styles.progressBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.fileName, { color: theme.textPrimary }]} numberOfLines={1}>
          ⏳ {fileName}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>{progress}%</Text>
      </View>
      <LinearProgress progress={progress} style={{ marginTop: Spacing[8] }} />
    </View>
  );
};

export interface AttachmentGridProps {
  children: React.ReactNode;
}

/**
 * Flex layout container for multiple attachments.
 */
export const AttachmentGrid: React.FC<AttachmentGridProps> = ({ children }) => {
  return <View style={styles.grid}>{children}</View>;
};

const styles = StyleSheet.create({
  imageFrame: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  progressBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing[12],
    alignSelf: 'stretch',
    marginVertical: Spacing[6],
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing[12],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[8],
    marginVertical: Spacing[6],
  },
});

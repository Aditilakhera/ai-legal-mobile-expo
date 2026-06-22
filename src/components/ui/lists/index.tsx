/**
 * AI Legal Mobile - Custom List Components
 * Wrapping scrolling flat lists and section collections with pull-to-refresh and page loading indicators.
 */

import React from 'react';
import {
  FlatList,
  SectionList as RNSectionList,
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  FlatListProps,
  SectionListProps as RNSectionListProps,
} from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing } from '@/theme';
import { EmptyState } from '../emptyStates';
import { Skeleton } from '../feedback';

export interface InfiniteListProps<T> extends Omit<FlatListProps<T>, 'data'> {
  data: T[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  emptyTitle?: string;
  emptyDesc?: string;
}

/**
 * Scrollable list with Pull-to-Refresh and infinite page end scroll triggers.
 */
export function InfiniteList<T>({
  data,
  loading = false,
  refreshing = false,
  onRefresh,
  onLoadMore,
  emptyTitle = 'No entries found',
  emptyDesc = 'We couldn\'t find any files matching your active query.',
  renderItem,
  ...props
}: InfiniteListProps<T>) {
  const { theme } = useThemeContext();

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDesc}
      />
    );
  };

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(_, index) => index.toString()}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.2}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={[styles.listContent, data.length === 0 ? styles.flexGrow : {}]}
      {...props}
    />
  );
}

/**
 * Loading state skeleton placeholders loop.
 */
export const LoadingList: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: rows }).map((_, idx) => (
        <View key={idx} style={styles.skeletonRow}>
          <Skeleton height={24} width="40%" style={{ marginBottom: Spacing[6] }} />
          <Skeleton height={16} width="90%" style={{ marginBottom: Spacing[4] }} />
          <Skeleton height={14} width="70%" />
        </View>
      ))}
    </View>
  );
};

export interface GroupedListProps<T> extends Omit<RNSectionListProps<T, { title: string; data: T[] }>, 'sections'> {
  sections: Array<{ title: string; data: T[] }>;
}

/**
 * Grouped Section list wrapper.
 */
export function GroupedList<T>({ sections, renderItem, ...props }: GroupedListProps<T>) {
  const { theme } = useThemeContext();

  return (
    <RNSectionList
      sections={sections}
      renderItem={renderItem}
      keyExtractor={(_, index) => index.toString()}
      renderSectionHeader={({ section: { title } }) => (
        <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {title.toUpperCase()}
          </Text>
        </View>
      )}
      contentContainerStyle={styles.listContent}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: Spacing[12],
  },
  flexGrow: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: Spacing[16],
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonContainer: {
    padding: Spacing[16],
    gap: Spacing[20],
  },
  skeletonRow: {
    alignSelf: 'stretch',
  },
  sectionHeader: {
    paddingVertical: Spacing[8],
    paddingHorizontal: Spacing[16],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

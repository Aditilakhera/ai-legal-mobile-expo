/**
 * AI Legal Mobile - Custom Card Components System
 * High quality visual cards representing core entities in the AI Legal ecosystem.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, Platform, StyleProp } from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius, Typography, Shadows, Colors, StatusColors } from '@/theme';
import { Badge } from '../badges';

export interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

/**
 * Standard card template container.
 */
export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const { theme } = useThemeContext();

  const containerStyle = [
    styles.card,
    {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    Shadows.card,
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={containerStyle}>
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

/**
 * AI Tool card representing an active LLM helper workspace.
 */
export interface AICardProps extends CardProps {
  title: string;
  desc: string;
  icon: string;
  colorHex?: string;
}

export const AICard: React.FC<AICardProps> = ({
  title,
  desc,
  icon,
  colorHex,
  onPress,
}) => {
  const { theme } = useThemeContext();

  return (
    <Card style={styles.aiCard} onPress={onPress}>
      <View style={[styles.aiIconWrapper, { backgroundColor: colorHex || theme.primary }]}>
        <Text style={styles.aiIconText}>{icon}</Text>
      </View>
      <View style={styles.aiContent}>
        <Text style={[styles.aiTitle, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.aiDesc, { color: theme.textSecondary }]}>{desc}</Text>
      </View>
    </Card>
  );
};

/**
 * Case card summary representation.
 */
export interface CaseCardProps extends CardProps {
  caseId: string;
  title: string;
  clientName: string;
  status: 'Open' | 'Pending' | 'Closed' | 'Under Review';
}

export const CaseCard: React.FC<CaseCardProps> = ({
  caseId,
  title,
  clientName,
  status,
  onPress,
}) => {
  const { theme } = useThemeContext();

  const getStatusVariant = () => {
    switch (status) {
      case 'Open':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Closed':
        return 'danger';
      default:
        return 'info';
    }
  };

  return (
    <Card style={styles.caseCard} onPress={onPress}>
      <View style={styles.caseHeader}>
        <Text style={[styles.caseIdText, { color: theme.textSecondary }]}>#{caseId}</Text>
        <Badge label={status} variant={getStatusVariant()} />
      </View>
      <Text style={[styles.caseTitle, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.clientLabel, { color: theme.textSecondary }]}>Client: <Text style={{ color: theme.textPrimary, fontWeight: '500' }}>{clientName}</Text></Text>
    </Card>
  );
};

/**
 * Legal document file card.
 */
export interface DocCardProps extends CardProps {
  title: string;
  extension: string;
  fileSize?: string;
  analyzed?: boolean;
}

export const DocCard: React.FC<DocCardProps> = ({
  title,
  extension,
  fileSize = 'N/A',
  analyzed = false,
  onPress,
}) => {
  const { theme } = useThemeContext();

  return (
    <Card style={styles.docCard} onPress={onPress}>
      <View style={[styles.docExtIcon, { backgroundColor: theme.surfaceVariant }]}>
        <Text style={[styles.docExtText, { color: theme.primary }]}>{extension.toUpperCase()}</Text>
      </View>
      <View style={styles.docInfo}>
        <Text style={[styles.docTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.docDetails, { color: theme.textSecondary }]}>{fileSize}</Text>
      </View>
      {analyzed && <Badge label="AI Analyzed" variant="info" />}
    </Card>
  );
};

/**
 * Admissible Evidence Card.
 */
export interface EvidenceCardProps extends CardProps {
  title: string;
  source: string;
  admissibilityScore: number;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  title,
  source,
  admissibilityScore,
  onPress,
}) => {
  const { theme } = useThemeContext();

  const getAdmissibilityColor = () => {
    if (admissibilityScore >= 70) return StatusColors.success.primary;
    if (admissibilityScore >= 45) return StatusColors.warning.primary;
    return StatusColors.danger.primary;
  };

  return (
    <Card style={styles.evidenceCard} onPress={onPress}>
      <Text style={[styles.evidenceTitle, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.evidenceSource, { color: theme.textSecondary }]}>Source: {source}</Text>
      <View style={styles.evidenceFooter}>
        <Text style={{ fontSize: 13, color: theme.textSecondary }}>Admissibility</Text>
        <Text style={[styles.evidencePercent, { color: getAdmissibilityColor() }]}>
          {admissibilityScore}%
        </Text>
      </View>
    </Card>
  );
};

/**
 * Precedent Legal Research Card.
 */
export interface ResearchCardProps extends CardProps {
  query: string;
  matchScore: number;
  snippet: string;
}

export const ResearchCard: React.FC<ResearchCardProps> = ({
  query,
  matchScore,
  snippet,
  onPress,
}) => {
  const { theme } = useThemeContext();
  return (
    <Card style={styles.cardPadding} onPress={onPress}>
      <View style={styles.rowBetween}>
        <Text style={[styles.boldText, { color: theme.textPrimary }]} numberOfLines={1}>
          {query}
        </Text>
        <Badge label={`${matchScore}% Match`} variant="success" />
      </View>
      <Text style={[styles.snippetText, { color: theme.textSecondary }]} numberOfLines={2}>
        {snippet}
      </Text>
    </Card>
  );
};

/**
 * Drafting Progress Card.
 */
export interface DraftCardProps extends CardProps {
  title: string;
  progress: number;
  caseAssociated: string;
}

export const DraftCard: React.FC<DraftCardProps> = ({
  title,
  progress,
  caseAssociated,
  onPress,
}) => {
  const { theme } = useThemeContext();
  return (
    <Card style={styles.cardPadding} onPress={onPress}>
      <Text style={[styles.boldText, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: Spacing[4] }}>
        Case: {caseAssociated}
      </Text>
      <View style={styles.progressRow}>
        <View style={[styles.progressBarTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
        </View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary, marginLeft: Spacing[8] }}>
          {progress}%
        </Text>
      </View>
    </Card>
  );
};

/**
 * Court Hearing Card.
 */
export interface HearingCardProps extends CardProps {
  date: string;
  time: string;
  courtroom: string;
  judge: string;
  caseTitle: string;
}

export const HearingCard: React.FC<HearingCardProps> = ({
  date,
  time,
  courtroom,
  judge,
  caseTitle,
  onPress,
}) => {
  const { theme } = useThemeContext();
  return (
    <Card style={styles.cardPadding} onPress={onPress}>
      <View style={[styles.hearingHeader, { backgroundColor: theme.surfaceVariant }]}>
        <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
          {date} • {time}
        </Text>
      </View>
      <Text style={[styles.boldText, { color: theme.textPrimary, marginTop: Spacing[12] }]}>
        {caseTitle}
      </Text>
      <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: Spacing[4] }}>
        Judge: {judge} | Courtroom: {courtroom}
      </Text>
    </Card>
  );
};

/**
 * Inbox Notification Card.
 */
export interface NotificationCardProps extends CardProps {
  title: string;
  desc: string;
  time: string;
  unread?: boolean;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  title,
  desc,
  time,
  unread = false,
  onPress,
}) => {
  const { theme } = useThemeContext();
  return (
    <Card
      style={[
        styles.cardPadding,
        unread ? { borderLeftWidth: 3, borderLeftColor: theme.primary } : {},
      ]}
      onPress={onPress}
    >
      <View style={styles.rowBetween}>
        <Text style={[styles.boldText, { color: theme.textPrimary, flex: 1, marginRight: Spacing[8] }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={{ fontSize: 11, color: theme.textMuted }}>{time}</Text>
      </View>
      <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: Spacing[4] }} numberOfLines={2}>
        {desc}
      </Text>
    </Card>
  );
};

/**
 * Profile Overview Card.
 */
export interface ProfileCardProps extends CardProps {
  name: string;
  role: string;
  credits: number;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  role,
  credits,
  onPress,
}) => {
  const { theme } = useThemeContext();
  return (
    <Card style={styles.cardPadding} onPress={onPress}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={[styles.boldText, { color: theme.textPrimary, fontSize: 18 }]}>{name}</Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary, textTransform: 'capitalize' }}>
            {role}
          </Text>
        </View>
        <View style={styles.alignRight}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.primary }}>{credits}</Text>
          <Text style={{ fontSize: 11, color: theme.textSecondary }}>Credits</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    marginVertical: Spacing[8],
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  cardPadding: {
    padding: Spacing[16],
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[12],
  },
  aiIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiIconText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  aiContent: {
    flex: 1,
    marginLeft: Spacing[12],
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  aiDesc: {
    fontSize: 13,
    marginTop: Spacing[2],
  },
  caseCard: {
    padding: Spacing[16],
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caseIdText: {
    fontSize: 13,
    fontWeight: '700',
  },
  caseTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginVertical: Spacing[10],
  },
  clientLabel: {
    fontSize: 13,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[12],
  },
  docExtIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docExtText: {
    fontSize: 12,
    fontWeight: '800',
  },
  docInfo: {
    flex: 1,
    marginLeft: Spacing[12],
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  docDetails: {
    fontSize: 12,
    marginTop: Spacing[2],
  },
  evidenceCard: {
    padding: Spacing[16],
    gap: Spacing[8],
  },
  evidenceTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  evidenceSource: {
    fontSize: 13,
  },
  evidenceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing[4],
  },
  evidencePercent: {
    fontSize: 16,
    fontWeight: '800',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boldText: {
    fontSize: 15,
    fontWeight: '700',
  },
  snippetText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: Spacing[8],
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[12],
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  hearingHeader: {
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[8],
    borderRadius: Radius.xs,
    alignSelf: 'flex-start',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
});

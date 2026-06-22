/**
 * AI Legal Mobile - Legal Domain Specific UI Components
 * Custom tools and visualizations for case workspaces, predictions, notices, and clause assessments.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius, Typography, Shadows, Colors, StatusColors } from '@/theme';
import { Badge } from '../badges';
import { Card } from '../cards';

/**
 * Timeline event item.
 */
export interface TimelineItemProps {
  title: string;
  date: string;
  description: string;
  isLast?: boolean;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  title,
  date,
  description,
  isLast = false,
}) => {
  const { theme } = useThemeContext();

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, { backgroundColor: theme.primary }]} />
        {!isLast && <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />}
      </View>
      <View style={styles.timelineRight}>
        <Text style={[styles.timelineDate, { color: theme.textSecondary }]}>{date}</Text>
        <Text style={[styles.timelineTitle, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.timelineDesc, { color: theme.textSecondary }]}>{description}</Text>
      </View>
    </View>
  );
};

/**
 * Contract Clause Risk Block.
 */
export interface ContractClauseProps {
  title: string;
  text: string;
  riskRating: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendation?: string;
}

export const ContractClause: React.FC<ContractClauseProps> = ({
  title,
  text,
  riskRating,
  recommendation,
}) => {
  const { theme } = useThemeContext();

  const getRiskColor = () => {
    switch (riskRating) {
      case 'Critical':
      case 'High':
        return StatusColors.danger.primary;
      case 'Medium':
        return StatusColors.warning.primary;
      default:
        return StatusColors.success.primary;
    }
  };

  return (
    <Card style={[styles.clauseCard, { borderLeftColor: getRiskColor(), borderLeftWidth: 4 }]}>
      <View style={styles.clauseHeader}>
        <Text style={[styles.clauseTitle, { color: theme.textPrimary }]}>{title}</Text>
        <Badge
          label={`${riskRating} Risk`}
          variant={riskRating === 'Critical' || riskRating === 'High' ? 'danger' : riskRating === 'Medium' ? 'warning' : 'success'}
        />
      </View>
      <Text style={[styles.clauseText, { color: theme.textSecondary }]}>{`"${text}"`}</Text>
      {recommendation && (
        <View style={[styles.clauseRecommendation, { backgroundColor: theme.surfaceVariant }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary, marginBottom: Spacing[4] }}>RECOMMENDED REVISION:</Text>
          <Text style={{ fontSize: 13, color: theme.textPrimary, fontStyle: 'italic' }}>{recommendation}</Text>
        </View>
      )}
    </Card>
  );
};

/**
 * Prediction Win Probability Gauge.
 */
export interface PredictionGaugeProps {
  probability: number;
  title: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

export const PredictionGauge: React.FC<PredictionGaugeProps> = ({
  probability,
  title,
  riskLevel,
}) => {
  const { theme } = useThemeContext();

  const getGaugeColor = () => {
    if (probability >= 70) return StatusColors.success.primary;
    if (probability >= 50) return StatusColors.warning.primary;
    return StatusColors.danger.primary;
  };

  const color = getGaugeColor();

  return (
    <Card style={styles.gaugeCard}>
      <Text style={[styles.gaugeTitle, { color: theme.textPrimary }]}>{title}</Text>
      
      <View style={styles.gaugeContainer}>
        <View style={[styles.gaugeTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.gaugeFill, { width: `${probability}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.gaugePercent, { color }]}>{probability}%</Text>
      </View>
      
      <View style={styles.gaugeFooter}>
        <Text style={{ fontSize: 13, color: theme.textSecondary }}>Win Probability</Text>
        <Badge
          label={`Risk Level: ${riskLevel}`}
          variant={riskLevel === 'Critical' || riskLevel === 'High' ? 'danger' : riskLevel === 'Medium' ? 'warning' : 'success'}
        />
      </View>
    </Card>
  );
};

/**
 * Court Notice framed document page preview simulator.
 */
export interface NoticePreviewProps {
  title: string;
  court: string;
  parties: string;
  clauseSummary: string;
  style?: ViewStyle;
}

export const LegalNoticePreview: React.FC<NoticePreviewProps> = ({
  title,
  court,
  parties,
  clauseSummary,
  style,
}) => {
  const { theme } = useThemeContext();

  return (
    <View style={[styles.noticePaper, { backgroundColor: '#FCFCFA', borderColor: '#EAEAE6' }, Shadows.card, style]}>
      <Text style={styles.noticeHeader}>BEFORE THE COURT OF {court.toUpperCase()}</Text>
      <View style={styles.noticeDivider} />
      <Text style={styles.noticeParties}>{parties.toUpperCase()}</Text>
      <View style={styles.noticeDivider} />
      <Text style={styles.noticeTitle}>{title.toUpperCase()}</Text>
      <Text style={styles.noticeBody}>{clauseSummary}</Text>
      <View style={styles.noticeSignatures}>
        <Text style={styles.noticeSignatureText}>ADVOCATE FOR PETITIONER</Text>
      </View>
    </View>
  );
};

/**
 * Argument logic blocks.
 */
export interface ArgumentBlockProps {
  claim: string;
  rebuttal: string;
  statutes: string[];
}

export const ArgumentBlock: React.FC<ArgumentBlockProps> = ({
  claim,
  rebuttal,
  statutes,
}) => {
  const { theme } = useThemeContext();

  return (
    <Card style={styles.argumentBlock}>
      <View style={[styles.argSec, { borderLeftColor: theme.primary }]}>
        <Text style={styles.argLabel}>CLAIM & PROOF</Text>
        <Text style={[styles.argText, { color: theme.textPrimary }]}>{claim}</Text>
      </View>
      
      <View style={[styles.argSec, { borderLeftColor: theme.danger, marginTop: Spacing[12] }]}>
        <Text style={[styles.argLabel, { color: theme.danger }]}>OPPOSING COUNTER & REBUTTAL</Text>
        <Text style={[styles.argText, { color: theme.textPrimary }]}>{rebuttal}</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.divider }]} />
      
      <Text style={[styles.statutesTitle, { color: theme.textSecondary }]}>CITED STATUTES / PRECEDENTS:</Text>
      <View style={styles.statutesList}>
        {statutes.map((stat, idx) => (
          <Badge key={idx} label={stat} variant="info" style={{ marginRight: Spacing[6] }} />
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  timelineContainer: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    zIndex: 2,
    marginTop: Spacing[4],
  },
  timelineLine: {
    width: 2,
    position: 'absolute',
    top: 12,
    bottom: -12,
    zIndex: 1,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: Spacing[8],
    paddingBottom: Spacing[20],
  },
  timelineDate: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: Spacing[2],
  },
  timelineDesc: {
    fontSize: 13.5,
    lineHeight: 18,
    marginTop: Spacing[4],
  },
  clauseCard: {
    gap: Spacing[8],
  },
  clauseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clauseTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: Spacing[8],
  },
  clauseText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  clauseRecommendation: {
    borderRadius: Radius.md,
    padding: Spacing[10],
    marginTop: Spacing[4],
  },
  gaugeCard: {
    gap: Spacing[12],
  },
  gaugeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  gaugeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  gaugeTrack: {
    flex: 1,
    height: 12,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginRight: Spacing[12],
  },
  gaugeFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  gaugePercent: {
    fontSize: 18,
    fontWeight: '800',
    width: 50,
    textAlign: 'right',
  },
  gaugeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noticePaper: {
    borderWidth: 1,
    borderRadius: Radius.xs,
    padding: Spacing[24],
    alignSelf: 'stretch',
    minHeight: 320,
  },
  noticeHeader: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    color: '#1A1A1A',
    fontFamily: Typography.legalContent.fontFamily,
  },
  noticeDivider: {
    height: 1,
    backgroundColor: '#CCCCCC',
    marginVertical: Spacing[8],
  },
  noticeParties: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333333',
    fontFamily: Typography.legalContent.fontFamily,
    lineHeight: 18,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    color: '#000000',
    marginVertical: Spacing[16],
    fontFamily: Typography.legalContent.fontFamily,
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 20,
    color: '#222222',
    textAlign: 'justify',
    fontFamily: Typography.legalContent.fontFamily,
  },
  noticeSignatures: {
    alignItems: 'flex-end',
    marginTop: Spacing[32],
  },
  noticeSignatureText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#444444',
  },
  argumentBlock: {
    gap: Spacing[12],
  },
  argSec: {
    borderLeftWidth: 3,
    paddingLeft: Spacing[8],
  },
  argLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.brand.primary,
    marginBottom: Spacing[2],
  },
  argText: {
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
  },
  statutesTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  statutesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[4],
  },
});

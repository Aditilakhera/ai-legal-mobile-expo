import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { PageHeader } from '@/components/ui';
import { useThemeContext } from '@/providers';
import { useTranslation } from '@/localization';
import { useAuthGuard } from '@/navigation/guards';

interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
}

const TOOLS_LIST: ToolItem[] = [
  {
    id: 'draft-maker',
    title: 'Draft Maker',
    description: 'Create contracts, pleadings, and notifications automatically.',
    icon: 'document-text-outline',
    color: '#6366F1',
    route: '/tools/draft-maker',
  },
  {
    id: 'legal-precedents',
    title: '⚖️ Legal Precedents',
    description: 'Find relevant court judgments, precedents, citations and similar legal cases using AI.',
    icon: 'library-outline',
    color: '#6D5DFC',
    route: '/tools/legal-precedents',
  },
  {
    id: 'contract-analyzer',
    title: 'Contract Analyzer',
    description: 'Parse clauses, flag high-risk terms, and check discrepancies.',
    icon: 'search-outline',
    color: '#3B82F6',
    route: '/tools/contract-analyzer',
  },
  {
    id: 'evidence-analyst',
    title: 'Evidence Analyst',
    description: 'Scan discovery documents to extract critical trial points.',
    icon: 'attach-outline',
    color: '#10B981',
    route: '/tools/evidence-analyst',
  },
  {
    id: 'argument-builder',
    title: 'Argument Builder',
    description: 'Construct trial positions, rebuttals, and core arguments.',
    icon: 'shield-checkmark-outline',
    color: '#EF4444',
    route: '/tools/argument-builder',
  },
  {
    id: 'strategy-engine',
    title: 'Strategy Engine',
    description: 'Design litigation roadmaps and active defense strategies.',
    icon: 'bulb-outline',
    color: '#8A5CF5',
    route: '/tools/strategy-engine',
  },
  {
    id: 'case-predictor',
    title: 'Case Predictor',
    description: 'Score success probability using analytical model stats.',
    icon: 'trending-up-outline',
    color: '#06B6D4',
    route: '/tools/case-predictor',
  },
  {
    id: 'research-assistant',
    title: 'Research Assistant',
    description: 'Query citations, case law precedents, and statutes.',
    icon: 'library-outline',
    color: '#14B8A6',
    route: '/tools/research-assistant',
  },
];

export default function ToolsScreen() {
  useAuthGuard();
  const router = useRouter();
  const { theme } = useThemeContext();
  const { t } = useTranslation();

  const getToolText = (id: string, field: 'title' | 'description') => {
    switch (id) {
      case 'draft-maker':
        return field === 'title' ? t('tools.draftMaker') : t('tools.draftMakerDesc');
      case 'legal-precedents':
        return field === 'title' ? `⚖️ ${t('tools.legalResearch')}` : t('tools.legalResearchDesc');
      case 'contract-analyzer':
        return field === 'title' ? t('tools.contractAnalyzer') : t('tools.contractAnalyzerDesc');
      case 'evidence-analyst':
        return field === 'title' ? t('tools.ocr') : 'Scan discovery documents to extract critical trial points.';
      case 'argument-builder':
        return field === 'title' ? t('tools.argumentsBuilder') : t('tools.argumentsBuilderDesc');
      case 'strategy-engine':
        return field === 'title' ? t('tools.strategyEngine') : 'Design litigation roadmaps and active defense strategies.';
      case 'case-predictor':
        return field === 'title' ? t('tools.casePredictor') : 'Score success probability using analytical model stats.';
      case 'research-assistant':
        return field === 'title' ? t('tools.researchAssistant') : 'Query citations, case law precedents, and statutes.';
      default:
        return '';
    }
  };

  const handleLaunchTool = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader
        title={t('tools.title')}
        subtitle={t('home.aiLegalAssistant')}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>
          {TOOLS_LIST.map((tool) => (
            <Pressable
              key={tool.id}
              style={({ pressed }) => [
                styles.toolCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && [styles.toolCardPressed, { backgroundColor: theme.hover }],
              ]}
              onPress={() => handleLaunchTool(tool.route)}
              accessibilityRole="button"
              accessibilityLabel={`Launch ${getToolText(tool.id, 'title')}`}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconWrapper,
                    { backgroundColor: `${tool.color}15` },
                  ]}
                >
                  <Ionicons name={tool.icon} size={22} color={tool.color} />
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.textMuted}
                  style={styles.chevron}
                />
              </View>

              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{getToolText(tool.id, 'title')}</Text>
              <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>{getToolText(tool.id, 'description')}</Text>

              <View style={styles.cardFooter}>
                <Text style={[styles.actionText, { color: tool.color }]}>
                  {t('cases.openWorkspace')}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={tool.color} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  gridContainer: {
    gap: 16,
  },
  toolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    // Premium subtle shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  toolCardPressed: {
    opacity: 0.9,
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    marginTop: -4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

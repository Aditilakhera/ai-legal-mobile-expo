import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
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
  image: any;
  bgColor: string;
  color: string;
  route: string;
}

const TOOLS_LIST: ToolItem[] = [
  {
    id: 'draft-maker',
    title: 'Draft Maker',
    description: 'FIR, Affidavit & Agreement Architect',
    image: require('../../../assets/images/tools/draft_maker.png'),
    bgColor: '#F3E8FF',
    color: '#6366F1',
    route: '/tools/draft-maker',
  },
  {
    id: 'argument-builder',
    title: 'Argument Builder',
    description: 'Courtroom-Ready Arguments & Counterpoints',
    image: require('../../../assets/images/tools/argument_builder.png'),
    bgColor: '#FCE8E6',
    color: '#EF4444',
    route: '/tools/argument-builder',
  },
  {
    id: 'legal-precedents',
    title: 'Legal Precedent',
    description: 'Searchable Case Laws & Citation Generator',
    image: require('../../../assets/images/tools/legal_precedent.png'),
    bgColor: '#EBF5FF',
    color: '#6D5DFC',
    route: '/tools/legal-precedents',
  },
  {
    id: 'evidence-analyst',
    title: 'Evidence Analysis',
    description: 'OCR Scanning & Authenticity Scoring',
    image: require('../../../assets/images/tools/evidence_analysis.png'),
    bgColor: '#E6F7F0',
    color: '#10B981',
    route: '/tools/evidence-analyst',
  },
  {
    id: 'contract-analyzer',
    title: 'Contract Review',
    description: 'Clause Detection & Risky Term Alerts',
    image: require('../../../assets/images/tools/contract_review.png'),
    bgColor: '#FEF3C7',
    color: '#D97706',
    route: '/tools/contract-analyzer',
  },
  {
    id: 'case-predictor',
    title: 'Case Predictor',
    description: 'Success Probability & AI Risk Analysis',
    image: require('../../../assets/images/tools/case_predictor.png'),
    bgColor: '#E0F2FE',
    color: '#06B6D4',
    route: '/tools/case-predictor',
  },
  {
    id: 'strategy-engine',
    title: 'Strategy Engine',
    description: 'Litigation Roadmap & Tactical Suggestions',
    image: require('../../../assets/images/tools/strategy_engine.png'),
    bgColor: '#F3E8FF',
    color: '#8A5CF5',
    route: '/tools/strategy-engine',
  },
];

export default function ToolsScreen() {
  useAuthGuard();
  const router = useRouter();
  const { theme } = useThemeContext();
  const { t } = useTranslation();

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
                accessibilityLabel={`Launch ${tool.title}`}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconWrapper,
                      { backgroundColor: tool.bgColor },
                    ]}
                  >
                    <Image
                      source={tool.image}
                      style={styles.toolIcon3D}
                      resizeMode="contain"
                    />
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.textMuted}
                    style={styles.chevron}
                  />
                </View>

                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                  {tool.title}
                </Text>
                <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                  {tool.description}
                </Text>

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
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  toolIcon3D: {
    width: '78%',
    height: '78%',
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

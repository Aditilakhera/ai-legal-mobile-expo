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
    title: 'Court Prep Workspace',
    description: 'Complete Hearing Intelligence Platform',
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

const ADVANCED_FEATURES_LIST = [
  {
    id: 'mock-courtroom',
    title: 'AI Mock Courtroom',
    description: 'Practice realistic courtroom hearings with an AI Judge, opposing counsel, witness simulations, objection handling, oral arguments, courtroom scoring, performance feedback, and trial preparation in a fully interactive environment.',
    image: require('../../../assets/images/tools/courtroom_voice_3d.png'),
    bgColor: '#F5F3FF',
    color: '#7C3AED',
    route: '/tools/mock-courtroom',
    badge: '👑 PRO',
  },
  {
    id: 'knowledge-hub',
    title: 'AI Legal Knowledge Hub™',
    description: 'Explore India\'s complete AI-powered legal knowledge ecosystem featuring Acts, Sections, Bare Laws, Judgments, Legal Dictionary, Procedures, Drafts, AI explanations, interactive learning, and intelligent legal research in a premium digital reading experience.',
    image: require('../../../assets/images/tools/legal_precedent.png'),
    bgColor: '#F0F9FF',
    color: '#0284C7',
    route: '/tools/knowledge-hub',
    badge: '⭐ PREMIUM',
  },
  {
    id: 'client-connect',
    title: 'AI Client Connect™',
    description: 'Smart AI-powered communication system that helps lawyers professionally contact clients through WhatsApp or Phone, generate AI message drafts, send hearing reminders, request documents, follow up on payments, collect evidence, and maintain complete communication history.',
    image: null as any,
    bgColor: '#E8FDF0',
    color: '#22C55E',
    route: '/tools/client-connect',
    badge: '⭐ PREMIUM',
  },
];

export default function ToolsScreen() {
  useAuthGuard();
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
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
          {/* Section 1: Standard AI Tools */}
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

          {/* Spacer & Divider */}
          <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />

          {/* Section 2: Flagship Advanced Features */}
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.advancedSectionTitle, { color: theme.textPrimary }]}>🚀 ADVANCED FEATURES</Text>
            <Text style={styles.advancedSectionSubtitle}>
              Enterprise-grade AI workspaces for courtroom simulation, legal research and intelligent learning.
            </Text>
          </View>

          <View style={styles.gridContainer}>
            {ADVANCED_FEATURES_LIST.map((tool) => (
              <Pressable
                key={tool.id}
                style={({ pressed }) => [
                  styles.advancedCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  pressed && { backgroundColor: theme.hover, opacity: 0.95 },
                ]}
                onPress={() => handleLaunchTool(tool.route)}
                accessibilityRole="button"
                accessibilityLabel={`Launch ${tool.title}`}
              >
                {/* Premium Badge */}
                <View style={[styles.premiumBadge, { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.08)' }]}>
                  <Text style={styles.premiumBadgeText}>{tool.badge}</Text>
                </View>

                <View style={styles.cardHeader}>
                  {/* Premium Courtroom representation vector container */}
                  <View style={[styles.iconWrapper, { backgroundColor: tool.bgColor, justifyContent: 'center', alignItems: 'center' }]}>
                    {tool.id === 'client-connect' ? (
                      <Ionicons name="logo-whatsapp" size={26} color="#22C55E" />
                    ) : (
                      <Image
                        source={tool.image}
                        style={styles.toolIcon3D}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.textMuted}
                    style={styles.chevron}
                  />
                </View>

                <Text style={[styles.advancedCardTitle, { color: theme.textPrimary }]}>
                  {tool.title}
                </Text>
                <Text style={[styles.advancedCardDescription, { color: theme.textSecondary }]}>
                  {tool.description}
                </Text>

                <View style={[styles.advancedCardFooter, { borderTopColor: theme.border }]}>
                  <Text style={[styles.advancedActionText, { color: tool.color }]}>
                    Open Premium Workspace
                  </Text>
                  <Ionicons name="arrow-forward" size={15} color={tool.color} />
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

  // ─── ADVANCED FEATURES STYLING ──────────────────────────────────────────
  sectionDivider: {
    height: 1,
    marginVertical: 26,
    opacity: 0.6,
  },
  advancedSectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  advancedSectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 16,
  },
  advancedCard: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  premiumBadge: {
    position: 'absolute',
    top: 20,
    right: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  premiumBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 0.8,
  },
  advancedIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  subIconOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 1,
  },
  advancedCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  advancedCardDescription: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 18,
  },
  advancedCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 14,
  },
  advancedActionText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

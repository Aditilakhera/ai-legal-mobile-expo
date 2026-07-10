/**
 * AI Legal Mobile - Specialized AI Tools Stack Layout
 * Manages specialized legal workflows (Draft Maker, Contract Analyzer, etc.)
 */

import { Stack } from 'expo-router';
import { useThemeContext } from '@/providers';

export default function ToolsLayout() {
  const { theme } = useThemeContext();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.backgroundElement,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: theme.background,
        },
      }}>
      <Stack.Screen name="index" options={{ title: 'AI Tools' }} />
      <Stack.Screen name="draft-maker" options={{ title: 'Draft Maker' }} />
      <Stack.Screen name="legal-precedents" options={{ title: 'Legal Precedents' }} />
      <Stack.Screen name="contract-analyzer" options={{ title: 'Contract Analyzer' }} />
      <Stack.Screen name="evidence-analyst" options={{ title: 'Evidence Analyst' }} />
      <Stack.Screen name="argument-builder" options={{ title: 'Argument Builder' }} />
      <Stack.Screen name="strategy-engine" options={{ title: 'Strategy Engine' }} />
      <Stack.Screen name="case-predictor" options={{ title: 'Case Predictor' }} />
      <Stack.Screen name="research-assistant" options={{ title: 'Research Assistant' }} />
      <Stack.Screen name="mock-courtroom" options={{ title: 'Mock Courtroom' }} />
      <Stack.Screen name="knowledge-hub" options={{ title: 'AI Legal Knowledge Hub' }} />
    </Stack>
  );
}

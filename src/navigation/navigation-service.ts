/**
 * AI Legal Mobile - Navigation Service
 * Programmatic routing wrapper for Expo Router.
 * Centralizes common transition operations, deep-linking pushes, stack resets, and state redirections.
 */

import { router } from 'expo-router';

export const NavigationService = {
  /**
   * Navigate to a route programmatically.
   */
  navigate(route: string, params?: Record<string, any>) {
    try {
      if (params) {
        router.push({ pathname: route as any, params });
      } else {
        router.push(route as any);
      }
    } catch (err) {
      console.error(`[NavigationService] Failed navigating to route: ${route}`, err);
    }
  },

  /**
   * Replace the current route in the stack.
   */
  replace(route: string, params?: Record<string, any>) {
    try {
      if (params) {
        router.replace({ pathname: route as any, params });
      } else {
        router.replace(route as any);
      }
    } catch (err) {
      console.error(`[NavigationService] Failed replacing route: ${route}`, err);
    }
  },

  /**
   * Go back one step in the history stack.
   */
  back() {
    if (router.canGoBack()) {
      router.back();
    } else {
      console.warn('[NavigationService] Attempted to navigate back, but history stack is empty.');
    }
  },

  /**
   * Reset the routing state to a target route, wiping the history stack.
   */
  reset(route: string) {
    try {
      router.dismissAll();
      router.replace(route as any);
    } catch (err) {
      console.error(`[NavigationService] Failed to reset stack to: ${route}`, err);
    }
  },

  /**
   * Typed auth transitions
   */
  auth: {
    login() {
      router.push('/auth/login' as any);
    },
    signup() {
      router.push('/auth/signup' as any);
    },
    forgotPassword(email?: string) {
      router.push({
        pathname: '/auth/forgot-password' as any,
        params: email ? { email } : undefined,
      });
    },
    verification(email: string, reason: 'signup' | 'reset') {
      router.push({
        pathname: '/auth/verification' as any,
        params: { email, reason },
      });
    },
    resetPassword(token: string) {
      router.push(`/auth/reset-password/${token}` as any);
    },
  },

  /**
   * Typed workspace transitions
   */
  workspace: {
    home(id: string) {
      router.push(`/workspace/${id}` as any);
    },
    copilot(id: string) {
      router.push({
        pathname: '/workspace/copilot' as any,
        params: { id },
      });
    },
    documentViewer(id: string, docId: string, url: string, title: string) {
      router.push({
        pathname: '/workspace/document-viewer' as any,
        params: { id, docId, url, title },
      });
    },
  },

  /**
   * Typed tools transitions
   */
  tools: {
    draftMaker(caseId?: string) {
      router.push({
        pathname: '/tools/draft-maker' as any,
        params: caseId ? { caseId } : undefined,
      });
    },
    legalPrecedents(caseId?: string) {
      router.push({
        pathname: '/tools/legal-precedents' as any,
        params: caseId ? { caseId } : undefined,
      });
    },
    contractAnalyzer(caseId?: string, documentId?: string) {
      router.push({
        pathname: '/tools/contract-analyzer' as any,
        params: { caseId, documentId },
      });
    },
    evidenceAnalyst(caseId?: string) {
      router.push({
        pathname: '/tools/evidence-analyst' as any,
        params: caseId ? { caseId } : undefined,
      });
    },
    argumentBuilder(caseId?: string) {
      router.push({
        pathname: '/tools/argument-builder' as any,
        params: caseId ? { caseId } : undefined,
      });
    },
    strategyEngine(caseId?: string) {
      router.push({
        pathname: '/tools/strategy-engine' as any,
        params: caseId ? { caseId } : undefined,
      });
    },
    casePredictor(caseId?: string) {
      router.push({
        pathname: '/tools/case-predictor' as any,
        params: caseId ? { caseId } : undefined,
      });
    },
    researchAssistant(caseId?: string, topic?: string) {
      router.push({
        pathname: '/tools/research-assistant' as any,
        params: { caseId, topic },
      });
    },
  },

  /**
   * Deep Link router pushes
   */
  handleDeepLink(url: string) {
    console.log(`[NavigationService] Parsing deep link: ${url}`);
    
    // Clean protocol prefix
    const cleanUrl = url.replace(/^(ailegalmobile:\/\/|app:\/\/|https:\/\/ailegal\.com\/|https:\/\/.*\.ailegal\.com\/)/, '');
    const [path, query] = cleanUrl.split('?');
    const segments = path.split('/');

    const params: Record<string, string> = {};
    if (query) {
      const searchParams = new URLSearchParams(query);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    if (segments[0] === 'case' && segments[1]) {
      this.workspace.home(segments[1]);
    } else if (segments[0] === 'workspace' && segments[1]) {
      this.workspace.home(segments[1]);
    } else if (segments[0] === 'draft' && segments[1]) {
      this.tools.draftMaker(segments[1]);
    } else if (segments[0] === 'precedents') {
      this.tools.legalPrecedents(params.caseId);
    } else if (segments[0] === 'research') {
      this.tools.researchAssistant(params.caseId, params.topic);
    } else {
      // General routing fallback
      this.navigate(`/${path}`, params);
    }
  },
};

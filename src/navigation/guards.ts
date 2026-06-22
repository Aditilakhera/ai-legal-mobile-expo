/**
 * AI Legal Mobile - Navigation Guards
 * Implements security check redirects for routing boundaries (Auth, Guest, Roles, Subscription status).
 */

import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { useUserStore } from '../store/user';
import { useAuthContext } from '../providers/auth-provider';

/**
 * Auth Guard: Restricts access to authenticated users only.
 * Redirects guests to the Login screen.
 */
export function useAuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isHydrated } = useAuthContext();

  useEffect(() => {
    if (!isHydrated) return;

    // Check if current route is inside public segments
    const firstSegment = segments[0];
    const inPublicRoute = 
      firstSegment === 'auth' || 
      firstSegment === 'onboarding' || 
      firstSegment === 'privacy' || 
      firstSegment === 'terms' ||
      firstSegment === undefined; // Root index / splash

    if (!isAuthenticated && !inPublicRoute) {
      console.log('[AUTH GUARD] Restricting access: redirecting to login');
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isHydrated, segments]);
}

/**
 * Guest Guard: Restricts access to unauthenticated users only.
 * Redirects authenticated users away from auth screens (e.g., Login, Signup) to the Dashboard.
 */
export function useGuestGuard() {
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isHydrated } = useAuthContext();

  useEffect(() => {
    if (!isHydrated) return;

    const firstSegment = segments[0];
    const inAuthGroup = firstSegment === 'auth';

    if (isAuthenticated && inAuthGroup) {
      console.log('[GUEST GUARD] User authenticated: redirecting to dashboard');
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthenticated, isHydrated, segments]);
}

/**
 * Role Guard: Ensures the user has the required roles.
 * Redirects unauthorized users to a billing, help, or forbidden route.
 */
export function useRoleGuard(allowedRoles: Array<'user' | 'admin'>) {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const { isHydrated } = useAuthContext();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;

    const role = profile?.role || 'user';
    if (!allowedRoles.includes(role)) {
      console.warn(`[ROLE GUARD] Unauthorized access: User role '${role}' is not in [${allowedRoles.join(', ')}]`);
      router.replace('/help'); // fallback
    }
  }, [profile, isHydrated, isAuthenticated]);
}

/**
 * Safe Base64 decoder helper for React Native environment.
 */
function decodeBase64(str: string): string {
  try {
    if (typeof atob === 'function') {
      return atob(str);
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    const cleanStr = String(str).replace(/=+$/, '');
    if (cleanStr.length % 4 === 1) {
      return '';
    }
    for (
      let bc = 0, bs = 0, buffer, idx = 0;
      (buffer = cleanStr.charAt(idx++));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  } catch (e) {
    return '';
  }
}

/**
 * Session Guard: Monitors session expiration.
 * In addition to client token refreshes, handles forced logout if validation expires.
 */
export function useSessionGuard() {
  const router = useRouter();
  const { isHydrated } = useAuthContext();
  const token = useAuthStore((s) => s.token);
  const clearCredentials = useAuthStore((s) => s.clearCredentials);

  useEffect(() => {
    if (!isHydrated) return;

    // Check JWT expiry from client token
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length > 1) {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeBase64(base64);
          if (jsonPayload) {
            const payload = JSON.parse(jsonPayload);
            const expiryTime = payload.exp * 1000;
            if (Date.now() >= expiryTime) {
              console.warn('[SESSION GUARD] JWT Token expired. Triggering logout.');
              clearCredentials();
              router.replace('/auth/login');
            }
          }
        }
      } catch (err) {
        // Not a standard JWT or error parsing
      }
    }
  }, [token, isHydrated]);
}

/**
 * Subscription Guard: Future-proof subscription restrictions (Premium / Pro vs Free).
 */
export function useSubscriptionGuard(requirePremium = true) {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const { isHydrated } = useAuthContext();

  useEffect(() => {
    if (!isHydrated || !profile) return;

    const isPremium = profile.founderStatus || profile.credits > 0; // Quick rule placeholder
    if (requirePremium && !isPremium) {
      console.warn('[SUBSCRIPTION GUARD] Premium tier required. Redirecting to billing.');
      router.replace('/billing');
    }
  }, [profile, isHydrated, requirePremium]);
}

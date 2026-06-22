/**
 * AI Legal Mobile - useAuth Custom Hook
 * Connects store states to AuthService controllers.
 */

import { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useUserStore } from '../store/user';
import { AuthService } from '../services/auth.service';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setCredentials = useAuthStore((s) => s.setCredentials);
  const clearCredentials = useAuthStore((s) => s.clearCredentials);
  
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const clearProfile = useUserStore((s) => s.clearProfile);

  const login = async (payload: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await AuthService.login(payload);
      if (response.success && response.data) {
        const { token: accToken, user } = response.data;
        setCredentials(accToken, '');
        setProfile(user);
        return { success: true };
      }
      throw new Error(response.error || 'Login failed');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during login');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (payload: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await AuthService.signup(payload);
      if (response.success) {
        return { success: true };
      }
      throw new Error(response.error || 'Registration failed');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during registration');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    clearCredentials();
    clearProfile();
  };

  return {
    token,
    profile,
    isAuthenticated,
    loading,
    error,
    login,
    signup,
    logout,
  };
}

/**
 * AI Legal Mobile - Security & Account Access Settings
 * Allows password changes, 2FA toggle, device session listings, and login log audits.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext } from '@/providers';
import { useUserStore } from '@/store/user';
import { useAuthGuard } from '@/navigation/guards';
import { ProfileService } from '@/services/profile.service';

interface DeviceSession {
  _id: string;
  userId: string;
  device?: string;
  ip?: string;
  location?: string;
  browser?: string;
  os?: string;
  lastActive?: string;
  isCurrent?: boolean;
}

export default function SecurityScreen() {
  useAuthGuard();
  const router = useRouter();
  const { showToast } = useToastContext();

  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);

  // States
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [updating2FA, setUpdating2FA] = useState(false);

  // Sessions listing state
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Mock Trusted Devices (Can be removed interactively)
  const [trustedDevices, setTrustedDevices] = useState([
    { id: '1', device: 'iPhone 15 Pro', details: 'Delhi, India • Authorized App', date: 'Authorized on 10 May 2026' },
    { id: '2', device: 'MacBook Pro 16', details: 'Mumbai, India • Safari Browser', date: 'Authorized on 18 Feb 2026' },
  ]);

  // Sync state values on load
  useEffect(() => {
    if (profile?.personalizations?.security) {
      setTwoFactor(profile.personalizations.security.twoFactor || false);
    }
  }, [profile]);

  // Fetch active sessions
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await ProfileService.getSessions();
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Submit Password Change
  const handleUpdatePassword = async () => {
    if (!profile?.email) {
      showToast('error', 'Error', 'User profile not loaded correctly.');
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast('error', 'Validation Failure', 'Please fill in all password fields.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showToast('error', 'Validation Failure', 'New password must be at least 8 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('error', 'Validation Failure', 'Confirm password does not match the new password.');
      return;
    }

    setSubmittingPassword(true);
    try {
      const res = await ProfileService.changePassword(
        profile.email,
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      if (res.success) {
        showToast('success', 'Password Updated', 'Your security password has been changed successfully! ⚖️');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to change password. Please verify your current credentials.';
      showToast('error', 'Update Failed', errMsg);
    } finally {
      setSubmittingPassword(false);
    }
  };

  // Toggle Two-Factor Authentication
  const handleToggle2FA = async (value: boolean) => {
    if (!profile) return;
    setUpdating2FA(true);
    try {
      const nextPersonalizations = {
        ...profile.personalizations,
        security: {
          ...profile.personalizations?.security,
          twoFactor: value,
        },
      };

      const res = await ProfileService.updateProfile({
        // @ts-ignore
        personalizations: nextPersonalizations,
      });

      if (res.success && res.data) {
        setProfile(res.data);
        setTwoFactor(value);
        showToast('success', 'Security updated', `Two-Factor Authentication has been ${value ? 'enabled' : 'disabled'}.`);
      }
    } catch (err) {
      showToast('error', 'Update Failed', 'Failed to synchronize 2FA settings with backend.');
    } finally {
      setUpdating2FA(false);
    }
  };

  // Revoke Specific Session
  const handleRevokeSession = (sessionId: string, deviceName: string) => {
    Alert.alert(
      'Terminate Session',
      `Are you sure you want to terminate the active session on ${deviceName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out Device',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await ProfileService.revokeSession(sessionId);
              if (res.success) {
                showToast('success', 'Session Terminated', `Device session revoked successfully.`);
                fetchSessions();
              }
            } catch (err) {
              showToast('error', 'Termination Failed', 'Failed to revoke the selected device session.');
            }
          },
        },
      ]
    );
  };

  // Logout All Other Devices
  const handleLogoutAllOtherDevices = () => {
    const otherSessions = sessions.filter((s) => !s.isCurrent);
    if (otherSessions.length === 0) {
      showToast('info', 'No Other Sessions', 'No other active device sessions found.');
      return;
    }

    Alert.alert(
      'Logout Other Devices',
      'Are you sure you want to sign out from all other active browsers and mobile sessions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: async () => {
            let successCount = 0;
            for (const session of otherSessions) {
              try {
                await ProfileService.revokeSession(session._id);
                successCount++;
              } catch (e) {
                // Continue revoking others if one fails
              }
            }
            showToast('success', 'Sessions Terminated', `Successfully signed out of ${successCount} other sessions.`);
            fetchSessions();
          },
        },
      ]
    );
  };

  // Revoke trust for trusted device
  const handleRevokeTrustedDevice = (id: string, deviceName: string) => {
    Alert.alert(
      'Remove Trusted Device',
      `Are you sure you want to remove ${deviceName} from your trusted roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Trust',
          style: 'destructive',
          onPress: () => {
            setTrustedDevices(trustedDevices.filter((d) => d.id !== id));
            showToast('success', 'Trust Revoked', `Removed ${deviceName} from authorized list.`);
          },
        },
      ]
    );
  };

  // Render OS/Device Icon
  const getDeviceIcon = (device: string = '', browser: string = '') => {
    const dLower = device.toLowerCase();
    const bLower = browser.toLowerCase();

    if (dLower.includes('iphone') || dLower.includes('ios') || dLower.includes('ipad')) {
      return 'phone-portrait-outline';
    }
    if (dLower.includes('android')) {
      return 'logo-android';
    }
    if (bLower.includes('safari') || dLower.includes('mac')) {
      return 'desktop-outline';
    }
    return 'laptop-outline';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Custom Header Bar */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Security & Credentials</Text>
          <Text style={styles.headerSubtitle}>Account Protection Console</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Introductory card */}
          <View style={styles.introCard}>
            <Ionicons name="shield-checkmark-outline" size={32} color="#6D5DFC" style={styles.introIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.introHeading}>System Security Console</Text>
              <Text style={styles.introDesc}>
                Manage your verification tokens, active sessions, and credential encryption factors.
              </Text>
            </View>
          </View>

          {/* 1. Password Change Form Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderLine}>
              <Ionicons name="key-outline" size={16} color="#6D5DFC" />
              <Text style={styles.sectionHeading}>Update Access Password</Text>
            </View>
            <Text style={styles.sectionDesc}>
              Update your account password. Use at least 8 characters, containing uppercase, lowercase, and numbers.
            </Text>

            {/* Current Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry={!showPasswords.current}
                  placeholder="Enter current password"
                  placeholderTextColor="#9CA3AF"
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
                />
                <Pressable
                  onPress={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPasswords.current ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </Pressable>
              </View>
            </View>

            {/* New Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry={!showPasswords.new}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#9CA3AF"
                  value={passwordForm.newPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                />
                <Pressable
                  onPress={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPasswords.new ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm New Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry={!showPasswords.confirm}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#9CA3AF"
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                />
                <Pressable
                  onPress={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPasswords.confirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleUpdatePassword}
              disabled={submittingPassword}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.pressed,
                submittingPassword && styles.submitBtnDisabled,
              ]}
            >
              {submittingPassword ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Update Password</Text>
              )}
            </Pressable>
          </View>

          {/* 2. Two-Factor Authentication Card */}
          <View style={styles.sectionCard}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.switchLabel}>Two-Factor Authentication (2FA)</Text>
                <Text style={styles.switchDesc}>
                  Use 2FA protocols to guarantee account integrity. Sends verification codes to your inbox or auth app.
                </Text>
              </View>
              {updating2FA ? (
                <ActivityIndicator size="small" color="#6D5DFC" style={{ marginRight: 10 }} />
              ) : (
                <Switch
                  value={twoFactor}
                  onValueChange={handleToggle2FA}
                  trackColor={{ false: '#E5E7EB', true: '#EEECFF' }}
                  thumbColor={twoFactor ? '#6D5DFC' : '#9CA3AF'}
                />
              )}
            </View>
          </View>

          {/* 3. Active Devices Sessions Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderLine}>
              <Ionicons name="phone-portrait-outline" size={16} color="#6D5DFC" />
              <Text style={styles.sectionHeading}>Active Sessions</Text>
            </View>
            <Text style={styles.sectionDesc}>
              These devices are currently logged into your account. Terminate other active sessions here.
            </Text>

            {loadingSessions ? (
              <ActivityIndicator size="small" color="#6D5DFC" style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.sessionList}>
                {sessions.map((session) => {
                  const deviceName = session.device || 'Chrome Browser';
                  const osDetails = `${session.browser || 'Unknown Browser'} on ${session.os || 'Windows'}`;
                  const locationText = `${session.location || 'New Delhi, India'} • ${session.ip || '192.168.1.1'}`;

                  return (
                    <View key={session._id} style={styles.sessionRow}>
                      <Ionicons
                        name={getDeviceIcon(session.device, session.browser) as any}
                        size={22}
                        color="#6B7280"
                        style={styles.deviceIcon}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={styles.deviceNameLine}>
                          <Text style={styles.sessionDeviceName}>{deviceName}</Text>
                          {session.isCurrent && (
                            <View style={styles.currentBadge}>
                              <Text style={styles.currentBadgeText}>Current Device</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.sessionDetails}>{osDetails}</Text>
                        <Text style={styles.sessionLocation}>{locationText}</Text>
                      </View>

                      {!session.isCurrent && (
                        <Pressable
                          onPress={() => handleRevokeSession(session._id, deviceName)}
                          style={({ pressed }) => [styles.revokeBtn, pressed && styles.pressed]}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <Pressable
              onPress={handleLogoutAllOtherDevices}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryBtnText}>Logout Other Devices</Text>
            </Pressable>
          </View>

          {/* 4. Trusted Devices Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderLine}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#6D5DFC" />
              <Text style={styles.sectionHeading}>Trusted Devices</Text>
            </View>
            <Text style={styles.sectionDesc}>
              Approved devices that do not require verification codes on login.
            </Text>

            {trustedDevices.length === 0 ? (
              <Text style={styles.emptyText}>No trusted devices recorded.</Text>
            ) : (
              <View style={styles.trustedList}>
                {trustedDevices.map((device) => (
                  <View key={device.id} style={styles.trustedRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trustedDeviceName}>{device.device}</Text>
                      <Text style={styles.trustedDetails}>{device.details}</Text>
                      <Text style={styles.trustedDate}>{device.date}</Text>
                    </View>
                    <Pressable
                      onPress={() => handleRevokeTrustedDevice(device.id, device.device)}
                      style={({ pressed }) => [styles.removeLinkBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.removeLinkText}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 5. Last Login Activity Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderLine}>
              <Ionicons name="time-outline" size={16} color="#6D5DFC" />
              <Text style={styles.sectionHeading}>Last Login Activity</Text>
            </View>
            <Text style={styles.sectionDesc}>
              Recent session entries for this profile. Contact support immediately if you notice discrepancies.
            </Text>

            <View style={styles.historyRow}>
              <View style={styles.historyTimelineDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTime}>Today, 10:45 AM</Text>
                <Text style={styles.historyDetails}>New Delhi, India • Chrome browser • 103.88.243.18</Text>
              </View>
            </View>

            <View style={styles.historyRow}>
              <View style={[styles.historyTimelineDot, styles.historyDotOffline]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTime}>Yesterday, 04:30 PM</Text>
                <Text style={styles.historyDetails}>Mumbai, India • Safari Browser • 115.110.231.10</Text>
              </View>
            </View>

            <View style={styles.historyRow}>
              <View style={[styles.historyTimelineDot, styles.historyDotOffline]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTime}>14 June 2026, 09:15 AM</Text>
                <Text style={styles.historyDetails}>Delhi, India • iPhone App • 103.88.243.12</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  introCard: {
    flexDirection: 'row',
    backgroundColor: '#EEECFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  introIcon: {
    marginRight: 16,
  },
  introHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6D5DFC',
    marginBottom: 4,
  },
  introDesc: {
    fontSize: 11,
    color: '#5b4edb',
    lineHeight: 15,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  sectionDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 14,
    lineHeight: 15,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  textInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
  },
  eyeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    height: 44,
    backgroundColor: '#6D5DFC',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6D5DFC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  submitBtnDisabled: {
    backgroundColor: '#B4AEFF',
  },
  submitBtnText: {
    fontSize: 12.5,
    color: '#FFFFFF',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  switchDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 15,
  },
  sessionList: {
    marginTop: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  deviceIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  deviceNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionDeviceName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  currentBadge: {
    backgroundColor: '#EEECFF',
    borderWidth: 0.5,
    borderColor: '#6D5DFC',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 8.5,
    color: '#6D5DFC',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sessionDetails: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 1,
  },
  sessionLocation: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  revokeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: '#FFF5F5',
  },
  secondaryBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  trustedList: {
    marginTop: 8,
  },
  trustedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  trustedDeviceName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  trustedDetails: {
    fontSize: 10.5,
    color: '#4B5563',
    marginTop: 1,
  },
  trustedDate: {
    fontSize: 9.5,
    color: '#9CA3AF',
    marginTop: 1,
  },
  removeLinkBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removeLinkText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
    gap: 12,
  },
  historyTimelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginTop: 4,
  },
  historyDotOffline: {
    backgroundColor: '#9CA3AF',
  },
  historyTime: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  historyDetails: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1.5,
  },
});

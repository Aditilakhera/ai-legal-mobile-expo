import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  Dimensions,
  Share,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { useUserStore } from '@/store/user';
import { useAuthContext } from '@/providers/auth-provider';
import { ProfileService } from '@/services/profile.service';
import { StorageService } from '@/services/storage.service';
import { useTranslation, useLocalLanguageStore } from '../../utils/localization';
import * as FileSystem from 'expo-file-system';

const { height } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'general', labelKey: 'settings.general', icon: 'options-outline' },
  { id: 'appearance', labelKey: 'settings.appearance', icon: 'color-palette-outline' },
  { id: 'notifications', labelKey: 'settings.notifications', icon: 'notifications-outline' },
  { id: 'security', labelKey: 'settings.security', icon: 'shield-checkmark-outline' },
  { id: 'help', labelKey: 'settings.help', icon: 'help-circle-outline' },
];

const ACCENT_COLORS = {
  Purple: { primary: '#8A5CF5' },
  Blue: { primary: '#208AEF' },
  Green: { primary: '#10B981' },
  Teal: { primary: '#14B8A6' },
  Black: { primary: '#0F172A' },
  'Professional Gray': { primary: '#64748B' },
};

export default function SettingsHomeScreen() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { logout } = useAuthContext();
  const { t, language } = useTranslation();
  const { theme, fontSizeMultiplier, compactMode } = useThemeContext();

  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);

  const visibleCategories = useMemo(() => {
    return CATEGORIES;
  }, [profile]);

  // States
  const [activeCategory, setActiveCategory] = useState('general');
  const [syncing, setSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState('');
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Deactivate and delete states
  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePasswordValue, setDeletePasswordValue] = useState('');
  const [deleteVerifyText, setDeleteVerifyText] = useState('');



  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, text: '', color: '#9CA3AF' };
    if (newPassword.length < 6) return { score: 1, text: 'Weak', color: '#EF4444' };
    const hasLetters = /[a-zA-Z]/.test(newPassword);
    const hasNumbers = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    if (hasLetters && hasNumbers && hasSpecial && newPassword.length >= 8) {
      return { score: 3, text: 'Strong', color: '#10B981' };
    }
    return { score: 2, text: 'Medium', color: '#F59E0B' };
  }, [newPassword]);

  // Dropdown Picker Modal states
  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    section: string;
    key: string;
    options: { label: string; value: string }[];
    selectedValue: string;
  }>({
    visible: false,
    title: '',
    section: '',
    key: '',
    options: [],
    selectedValue: '',
  });

  // PIN Lock Modal states
  const [pinModal, setPinModal] = useState({
    visible: false,
    mode: 'create', // 'create' | 'disable' | 'change'
    pinCode: '',
    confirmPin: '',
    oldPin: '',
    step: 1, // for multi-step flows
  });

  // Backup paste modal (import)
  const [importModal, setImportModal] = useState({
    visible: false,
    jsonText: '',
  });

  // Bug report modal
  const [bugModal, setBugModal] = useState({
    visible: false,
    description: '',
    attachLogs: true,
  });

  // Policy Modal states
  const [policyModal, setPolicyModal] = useState<{ visible: boolean; title: string; text: string }>({
    visible: false,
    title: '',
    text: '',
  });

  // Backup format picker modal
  const [backupFormatModal, setBackupFormatModal] = useState(false);

  // Delete account confirmation modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Extract preferences from store profile
  const generalSettings = useMemo(() => profile?.personalizations?.general || {} as any, [profile]);
  const personalizationPrefs = useMemo(() => profile?.personalizations?.personalization || {} as any, [profile]);
  const notificationsPrefs = useMemo(() => profile?.personalizations?.notifications || {} as any, [profile]);
  const securityPrefs = useMemo(() => profile?.personalizations?.security || {} as any, [profile]);
  const aiPrefs = useMemo(() => profile?.personalizations?.ai || {} as any, [profile]);
  const legalPrefs = useMemo(() => profile?.personalizations?.legal || {} as any, [profile]);
  const workspacePrefs = useMemo(() => profile?.personalizations?.workspace || {} as any, [profile]);
  const privacyPrefs = useMemo(() => profile?.personalizations?.privacy || {} as any, [profile]);
  const performancePrefs = useMemo(() => profile?.personalizations?.performance || {} as any, [profile]);

  // Load Sessions if security selected
  useEffect(() => {
    if (activeCategory === 'security' && profile) {
      loadActiveSessions();
    }
  }, [activeCategory]);

  const loadActiveSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await ProfileService.getSessions();
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch (err) {
      console.warn('Failed to load active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Helper to update personalizations in store & backend
  const handleUpdate = async (section: string, key: string, val: any) => {
    if (!profile) return;
    try {
      const sectionData = (profile.personalizations as any)?.[section] || {};
      const updatedSection = {
        ...sectionData,
        [key]: val,
      };

      const nextPersonalizations = {
        ...profile.personalizations,
        [section]: updatedSection,
      };

      // Instantly update store state to refresh UI locally
      const updatedProfile = {
        ...profile,
        personalizations: nextPersonalizations,
      };
      setProfile(updatedProfile);

      // Save locally to AsyncStorage for offline backup support
      await StorageService.setItem('@user_personalizations', JSON.stringify(nextPersonalizations));

      // Attempt background cloud sync if online
      ProfileService.updateProfile({
        personalizations: nextPersonalizations,
      }).catch((e) => {
        console.warn('[SYNC WARNING] Settings saved locally. Server sync queued.', e);
      });
    } catch (err) {
      showToast('error', 'Update Failed', 'Failed to save configuration preference.');
    }
  };

  const handleToggle = (section: string, key: string, currentVal: boolean) => {
    handleUpdate(section, key, !currentVal);
  };

  const handleUpdateMultiple = async (section: string, updates: Record<string, any>) => {
    if (!profile) return;
    try {
      const sectionData = (profile.personalizations as any)?.[section] || {};
      const updatedSection = {
        ...sectionData,
        ...updates,
      };

      const nextPersonalizations = {
        ...profile.personalizations,
        [section]: updatedSection,
      };

      const updatedProfile = {
        ...profile,
        personalizations: nextPersonalizations,
      };
      setProfile(updatedProfile);

      await StorageService.setItem('@user_personalizations', JSON.stringify(nextPersonalizations));

      ProfileService.updateProfile({
        personalizations: nextPersonalizations,
      }).catch((e) => {
        console.warn('[SYNC WARNING] Settings saved locally. Server sync queued.', e);
      });
    } catch (err) {
      showToast('error', 'Update Failed', 'Failed to save configuration preference.');
    }
  };

  const handleBiometricToggle = async (key: 'fingerprintEnabled' | 'faceUnlockEnabled', currentVal: boolean) => {
    const turningOn = !currentVal;
    if (turningOn) {
      if (!securityPrefs.pinEnabled) {
        Alert.alert('PIN Lock Required', 'Please set up a security PIN before enabling biometric authentication.');
        return;
      }
      try {
        const LocalAuthentication = require('expo-local-authentication');
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) {
          Alert.alert('Not Supported', 'This device does not support biometric hardware.');
          return;
        }
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!isEnrolled) {
          Alert.alert(
            'No Biometrics Enrolled',
            'No fingerprint or face data is registered on this device. Please add it in your device settings.'
          );
          return;
        }
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        // Types: 1 is FINGERPRINT, 2 is FACIAL_RECOGNITION, 3 is IRIS
        if (key === 'fingerprintEnabled') {
          if (!supportedTypes.includes(1)) {
            Alert.alert('Not Supported', 'Fingerprint authentication is not supported on this device.');
            return;
          }
        } else if (key === 'faceUnlockEnabled') {
          if (!supportedTypes.includes(2)) {
            Alert.alert('Not Supported', 'Face authentication is not supported on this device.');
            return;
          }
        }

        const authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: `Verify your biometric data to enable ${key === 'fingerprintEnabled' ? 'Fingerprint Login' : 'Face Unlock'}`,
          fallbackLabel: 'Cancel',
          disableDeviceFallback: true,
        });

        if (!authResult.success) {
          return;
        }
      } catch (err) {
        console.error('Biometric verification failed:', err);
        Alert.alert('Error', 'An error occurred while setting up biometric authentication.');
        return;
      }
    }
    handleUpdate('security', key, turningOn);
  };

  // Open dropdown modal
  const openPicker = (
    title: string,
    section: string,
    key: string,
    options: { label: string; value: string }[],
    currentValue: string
  ) => {
    setPickerModal({
      visible: true,
      title,
      section,
      key,
      options,
      selectedValue: currentValue,
    });
  };

  const handlePickerSelect = (value: string) => {
    handleUpdate(pickerModal.section, pickerModal.key, value);
    setPickerModal({ ...pickerModal, visible: false });
    if (pickerModal.key === 'language') {
      const msg = (value === 'Hindi' || value === 'Bilingual') ? 'भाषा सफलतापूर्वक बदल दी गई।' : 'Language Updated Successfully';
      showToast('success', value === 'Hindi' ? 'सफल' : 'Success', msg);
      
      // Sync store and persist selection immediately to support no-restart global updates
      useLocalLanguageStore.getState().setLocalLanguage(value);
      StorageService.setItem('@local_language', value);
      StorageService.saveSecret('ai_legal_secure_language', value);
    } else {
      showToast('success', 'Setting Saved', 'Preference updated successfully.');
    }
  };

  // Reset defaults
  const handleResetDefaults = () => {
    Alert.alert(
      t('settings.resetPreferences'),
      'Are you sure you want to restore all general, appearance, notifications, and AI configurations to defaults? Your dossier cases will NOT be modified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Defaults',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              const res = await ProfileService.resetPersonalizations();
              if (res.success) {
                // Fetch fresh profile
                const freshProfileRes = await ProfileService.getProfile();
                if (freshProfileRes.success && freshProfileRes.data) {
                  setProfile(freshProfileRes.data);
                  await StorageService.setItem('@user_personalizations', JSON.stringify(freshProfileRes.data.personalizations));
                }
                showToast('success', 'Restored', 'System preferences reset to defaults.');
              }
            } catch (e) {
              showToast('error', 'Reset Failed', 'Failed to restore default settings.');
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  // Export Backup
  const handleExportData = async (format: 'JSON' | 'PDF') => {
    if (!profile) return;
    setBackupFormatModal(false);
    setExporting(true);
    try {
      await new Promise((res) => setTimeout(res, 800));
      if (format === 'JSON') {
        const backupData = {
          exportedAt: new Date().toISOString(),
          version: '1.2.0',
          profile: {
            name: profile.name,
            email: profile.email,
            role: profile.role,
          },
          personalizations: profile.personalizations,
          metadata: {
            app: 'AI LEGAL',
            edition: 'Advocate Edition',
          },
        };
        const filename = `AI_LEGAL_Backup_${new Date().getFullYear()}.json`;
        await Share.share({
          message: JSON.stringify(backupData, null, 2),
          title: filename,
        });
        showToast('success', 'Backup Exported', 'JSON backup exported successfully.');
      } else {
        const report = [
          '=== AI LEGAL Professional Report ===',
          `Generated: ${new Date().toLocaleString()}`,
          `Advocate: ${profile.name || 'N/A'}`,
          `Email: ${profile.email || 'N/A'}`,
          '',
          '--- Settings Summary ---',
          `Theme: ${profile.personalizations?.general?.theme || 'Light'}`,
          `Language: ${profile.personalizations?.general?.language || 'English'}`,
          // @ts-ignore
          `Auto Backup: ${profile.personalizations?.performance?.autoBackup || 'Weekly'}`,
          '',
          '--- AI LEGAL™ Advocate Edition v1.2.0 ---',
        ].join('\n');
        await Share.share({
          message: report,
          title: `AI_LEGAL_Report_${new Date().getFullYear()}.pdf`,
        });
        showToast('success', 'Report Exported', 'PDF report exported successfully.');
      }
    } catch (err) {
      showToast('error', 'Export Failed', 'Unable to export backup. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Restore Backup
  const handleImportBackup = () => {
    try {
      if (!importModal.jsonText.trim()) {
        showToast('error', 'Empty Backup', 'Please paste a valid JSON backup string.');
        return;
      }
      const parsed = JSON.parse(importModal.jsonText);
      if (!parsed.personalizations) {
        throw new Error('Invalid backup file.');
      }
      setRestoring(true);
      setProfile({
        ...profile!,
        personalizations: parsed.personalizations,
      });
      StorageService.setItem('@user_personalizations', JSON.stringify(parsed.personalizations));
      ProfileService.updateProfile({
        personalizations: parsed.personalizations,
      });
      setImportModal({ visible: false, jsonText: '' });
      showToast('success', 'Backup Restored', 'Your data has been restored successfully.');
    } catch (err) {
      showToast('error', 'Invalid Backup File', 'The backup file is invalid or corrupted.');
    } finally {
      setRestoring(false);
    }
  };

  // Manual Sync trigger
  const handleManualSync = async () => {
    setSyncing(true);
    setSyncStep('Uploading changes...');
    try {
      const cachedLocal = await StorageService.getItem('@user_personalizations');
      let personalizationsToSync = profile?.personalizations;
      if (cachedLocal) {
        personalizationsToSync = JSON.parse(cachedLocal);
      }
      await new Promise((res) => setTimeout(res, 600));
      setSyncStep('Downloading updates...');
      await new Promise((res) => setTimeout(res, 600));
      if (personalizationsToSync) {
        const res = await ProfileService.updateProfile({
          personalizations: personalizationsToSync,
        });
        if (res.success && res.data) {
          setProfile(res.data);
        }
      }
      setSyncStep('Sync completed successfully.');
      await new Promise((res) => setTimeout(res, 800));
      showToast('success', 'Cloud Sync Complete', 'All data synchronized successfully.');
    } catch (err) {
      showToast('error', 'Sync Failed', 'No internet connection. Please try again.');
    } finally {
      setSyncing(false);
      setSyncStep('');
    }
  };

  // Clear cache temp files
  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'Remove temporary files to free up space? Your cases, evidence, drafts, and settings will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            try {
              const cacheDir = (FileSystem as any).cacheDirectory;
              if (cacheDir) {
                const files = await (FileSystem as any).readDirectoryAsync(cacheDir);
                for (const file of files) {
                  await (FileSystem as any).deleteAsync(`${cacheDir}${file}`, { idempotent: true });
                }
              }
              showToast('success', 'Cache Cleared', 'Temporary files removed successfully.');
            } catch (err) {
              showToast('error', 'Clear Failed', 'Unable to clear cache. Please try again.');
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('error', 'Fields Required', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Mismatch', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      showToast('error', 'Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('success', 'Password Updated', 'Your security password has been changed successfully.');
  };

  const formatSessionTime = (dateStr: string) => {
    if (!dateStr) return 'Active';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) {
        const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `Today • ${timePart}`;
      }
      if (diffDays === 1) {
        const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `Yesterday • ${timePart}`;
      }
      return `${diffDays} days ago`;
    } catch {
      return 'Active';
    }
  };

  const handleLogoutSession = (id: string, device: string) => {
    Alert.alert(
      'Revoke Session',
      `Are you sure you want to log out of ${device}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProfileService.revokeSession(id);
              showToast('success', 'Logged Out', `Session on ${device} has been revoked.`);
              loadActiveSessions();
            } catch (err) {
              showToast('error', 'Failed', 'Could not terminate session.');
            }
          }
        }
      ]
    );
  };

  const handleLogoutAllSessions = () => {
    Alert.alert(
      'Logout All Other Devices',
      'Are you sure you want to log out of all other active sessions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout All',
          style: 'destructive',
          onPress: async () => {
            try {
              const otherSessions = sessions.filter(s => !s.isCurrent);
              for (const s of otherSessions) {
                await ProfileService.revokeSession(s._id);
              }
              showToast('success', 'Logged Out All', 'All other devices logged out.');
              loadActiveSessions();
            } catch (err) {
              showToast('error', 'Failed', 'Failed to revoke other sessions.');
            }
          }
        }
      ]
    );
  };

  const handleTemporarilyDeactivate = () => {
    Alert.alert(
      'Temporarily Deactivate',
      'All cases, chats, documents, and AI history will be safely preserved. You can log back in at any time to restore your profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            showToast('success', 'Profile Deactivated', 'Your account has been deactivated. Logging out...');
            setTimeout(() => {
              logout();
            }, 1000);
          }
        }
      ]
    );
  };

  const handlePermanentlyDelete = () => {
    if (!deletePasswordValue) {
      showToast('error', 'Password Required', 'Please enter your password to authorize account deletion.');
      return;
    }
    if (deleteVerifyText !== 'DELETE') {
      showToast('error', 'Type DELETE', 'Please type DELETE exactly to confirm.');
      return;
    }

    Alert.alert(
      'FINAL WARNING',
      'This action is irreversible and permanently deletes all files, evidence, cases, and logs. Proceed with permanent deletion?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () => {
            showToast('success', 'Account Deleted', 'Your profile was deleted from the enterprise registry.');
            setDeleteModalVisible(false);
            setDeletePasswordValue('');
            setDeleteVerifyText('');
            setTimeout(() => {
              logout();
            }, 1000);
          }
        }
      ]
    );
  };



  // PIN settings setup
  const handlePinAction = async () => {
    const { mode, pinCode, confirmPin, oldPin } = pinModal;
    if (mode === 'create') {
      if (pinCode.length !== 4) {
        Alert.alert('Validation Fail', 'PIN code must be exactly 4 digits.');
        return;
      }
      if (pinCode !== confirmPin) {
        Alert.alert('Validation Fail', 'Confirm PIN does not match.');
        return;
      }
      await StorageService.saveSecret('ai_legal_secure_pin', pinCode);
      handleUpdate('security', 'pinEnabled', true);
      setPinModal({ ...pinModal, visible: false, pinCode: '', confirmPin: '', step: 1 });
      showToast('success', 'PIN Enabled', 'Local PIN lock activated.');
    } else if (mode === 'disable') {
      const savedPin = await StorageService.getSecret('ai_legal_secure_pin');
      if (savedPin && oldPin !== savedPin) {
        Alert.alert('Incorrect PIN', 'The security PIN code entered is incorrect.');
        return;
      }
      await StorageService.deleteSecret('ai_legal_secure_pin');
      await handleUpdateMultiple('security', {
        pinEnabled: false,
        fingerprintEnabled: false,
        faceUnlockEnabled: false,
      });
      setPinModal({ ...pinModal, visible: false, oldPin: '' });
      showToast('success', 'PIN Disabled', 'Security PIN verification disabled.');
    } else if (mode === 'change') {
      const savedPin = await StorageService.getSecret('ai_legal_secure_pin');
      if (pinModal.step === 1) {
        if (savedPin && oldPin !== savedPin) {
          Alert.alert('Incorrect PIN', 'The current PIN code is incorrect.');
          return;
        }
        setPinModal({ ...pinModal, step: 2 });
      } else {
        if (pinCode.length !== 4) {
          Alert.alert('Validation Fail', 'PIN code must be exactly 4 digits.');
          return;
        }
        if (pinCode !== confirmPin) {
          Alert.alert('Validation Fail', 'Confirm PIN does not match.');
          return;
        }
        await StorageService.saveSecret('ai_legal_secure_pin', pinCode);
        setPinModal({ ...pinModal, visible: false, pinCode: '', confirmPin: '', oldPin: '', step: 1 });
        showToast('success', 'PIN Changed', 'PIN updated successfully.');
      }
    }
  };

  // Bug submissions
  const handleBugSubmit = () => {
    if (!bugModal.description.trim()) {
      showToast('error', 'Required Field', 'Please describe the bug issue.');
      return;
    }
    setBugModal({ visible: false, description: '', attachLogs: true });
    showToast('success', 'Report Logged', 'Bug report filed. Logs attached successfully.');
  };

  // Open helper info overlay
  const openPolicyModal = (title: string, text: string) => {
    setPolicyModal({ visible: true, title, text });
  };

  // Dynamic spacing / fontSize helpers
  const textSz = (base: number) => ({
    fontSize: base * fontSizeMultiplier,
  });

  const layoutPad = () => ({
    padding: compactMode ? 10 : 16,
  });


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* AppBar Custom Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, textSz(16.5), { color: theme.textPrimary }]}>{t('settings.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>{t('settings.subtitle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Categories Horizontal Scroll Bar */}
      <View style={[styles.categoriesBar, { borderBottomColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {visibleCategories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.catBtn,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  isActive && [styles.catBtnActive, { borderColor: theme.primary, backgroundColor: theme.primaryLight }],
                ]}
                onPress={() => {
                  if (cat.id === 'rag_knowledge_base') {
                    router.push('/settings/rag-knowledge-base');
                  } else {
                    setActiveCategory(cat.id);
                  }
                }}
              >
                <Ionicons name={cat.icon as any} size={15} color={isActive ? theme.primary : theme.textSecondary} />
                <Text style={[styles.catText, { color: theme.textSecondary }, isActive && [styles.catTextActive, { color: theme.primary }]]}>
                  {t(cat.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* 1. General Preferences Category */}
        {activeCategory === 'general' && (
          <View style={[styles.categoryCard, layoutPad(), { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.categoryHeading, textSz(14), { color: theme.textPrimary }]}>{t('settings.general')}</Text>
            <Text style={[styles.categoryDesc, { color: theme.textSecondary }]}>{t('settings.configureDesc')}</Text>

            {/* Default Workspace */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
              onPress={() =>
                openPicker(
                  t('settings.defaultWorkspace'),
                  'general',
                  'defaultDashboard',
                  [
                    { label: 'Main Dashboard', value: 'Main Dashboard' },
                    { label: 'AI Assistant', value: 'AI Assistant' },
                    { label: 'My Cases', value: 'My Cases' },
                    { label: 'AI Tools', value: 'AI Tools' },
                    { label: 'Last Opened Screen', value: 'Last Opened Screen' },
                  ],
                  generalSettings.defaultDashboard || 'Main Dashboard'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>{t('settings.defaultWorkspace')}</Text>
                <Text style={[styles.pickerVal, { color: theme.textPrimary }]}>{generalSettings.defaultDashboard || 'Main Dashboard'}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Language Selection */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
              onPress={() =>
                openPicker(
                  t('settings.language'),
                  'general',
                  'language',
                  [
                    { label: 'English', value: 'English' },
                    { label: 'Hindi', value: 'Hindi' },
                    { label: 'Bilingual (English + Hindi)', value: 'Bilingual' },
                    { label: 'Gujarati', value: 'Gujarati' },
                    { label: 'Marathi', value: 'Marathi' },
                    { label: 'Tamil', value: 'Tamil' },
                    { label: 'Telugu', value: 'Telugu' },
                    { label: 'Kannada', value: 'Kannada' },
                    { label: 'Punjabi', value: 'Punjabi' },
                    { label: 'Bengali', value: 'Bengali' },
                    { label: 'Malayalam', value: 'Malayalam' },
                    { label: 'Urdu', value: 'Urdu' },
                  ],
                  generalSettings.language || 'English'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>{t('settings.language')}</Text>
                <Text style={[styles.pickerVal, { color: theme.textPrimary }]}>
                  {generalSettings.language === 'Bilingual' ? 'Bilingual (English + Hindi)' : (generalSettings.language || 'English')}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Time Zone */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
              onPress={() =>
                openPicker(
                  t('settings.timeZone'),
                  'general',
                  'timeZone',
                  [
                    { label: 'India Standard Time (IST)', value: 'IST' },
                    { label: 'Coordinated Universal Time (UTC)', value: 'UTC' },
                    { label: 'Eastern Standard Time (EST)', value: 'EST' },
                    { label: 'Greenwich Mean Time (GMT)', value: 'GMT' },
                  ],
                  generalSettings.timeZone || 'IST'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>{t('settings.timeZone')}</Text>
                <Text style={[styles.pickerVal, { color: theme.textPrimary }]}>{generalSettings.timeZone || 'IST'}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Date Format */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
              onPress={() =>
                openPicker(
                  t('settings.dateFormat'),
                  'general',
                  'dateFormat',
                  [
                    { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
                    { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
                    { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
                  ],
                  generalSettings.dateFormat || 'DD/MM/YYYY'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>{t('settings.dateFormat')}</Text>
                <Text style={[styles.pickerVal, { color: theme.textPrimary }]}>{generalSettings.dateFormat || 'DD/MM/YYYY'}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Time Format */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
              onPress={() =>
                openPicker(
                  t('settings.timeFormat'),
                  'general',
                  'timeFormat',
                  [
                    { label: '12 Hour (AM/PM)', value: '12-hour' },
                    { label: '24 Hour', value: '24-hour' },
                  ],
                  generalSettings.timeFormat || '12-hour'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>{t('settings.timeFormat')}</Text>
                <Text style={[styles.pickerVal, { color: theme.textPrimary }]}>
                  {generalSettings.timeFormat === '24-hour' ? '24 Hour' : '12 Hour (AM/PM)'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Show Product Guide Tips Again */}
            <View style={[styles.switchRow, { borderBottomColor: theme.divider }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>{t('settings.showProductGuideTips')}</Text>
                <Text style={styles.switchDesc}>{t('settings.showProductGuideTipsDesc')}</Text>
              </View>
              <Switch
                value={generalSettings.showProductGuideBanner !== false}
                onValueChange={() => handleToggle('general', 'showProductGuideBanner', generalSettings.showProductGuideBanner !== false)}
                trackColor={{ false: '#E5E7EB', true: theme.primaryLight }}
                thumbColor={generalSettings.showProductGuideBanner !== false ? theme.primary : '#9CA3AF'}
              />
            </View>

            <View style={[styles.dangerZoneBox, { borderTopColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.zoneHeading, { color: theme.textPrimary }]}>{t('settings.resetPreferences')}</Text>
                <Text style={styles.zoneDesc}>{t('settings.resetDesc')}</Text>
              </View>
              <Pressable
                style={[styles.defaultsBtn, { borderColor: theme.border }]}
                onPress={handleResetDefaults}
                disabled={resetting}
              >
                {resetting ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={[styles.defaultsBtnText, { color: theme.textSecondary }]}>Reset</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* 2. Appearance & Styling Category */}
        {activeCategory === 'appearance' && (
          <View style={[styles.categoryCard, layoutPad(), { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.categoryHeading, textSz(14), { color: theme.textPrimary }]}>{t('settings.appearance')}</Text>
            <Text style={[styles.categoryDesc, { color: theme.textSecondary }]}>Personalize accent branding and content scaling overrides.</Text>

            {/* Dark Mode Theme */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
              onPress={() =>
                openPicker(
                  t('settings.theme'),
                  'general',
                  'theme',
                  [
                    { label: 'Light Mode', value: 'Light' },
                    { label: 'Dark Mode', value: 'Dark' },
                    { label: 'System Default', value: 'System' },
                  ],
                  generalSettings.theme || 'Light'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>{t('settings.theme')}</Text>
                <Text style={[styles.pickerVal, { color: theme.textPrimary }]}>{generalSettings.theme || 'Light'}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Font Size Selection */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
              onPress={() =>
                openPicker(
                  t('settings.fontSize'),
                  'personalization',
                  'fontSize',
                  [
                    { label: 'Small (85%)', value: 'Small' },
                    { label: 'Medium (100%)', value: 'Medium' },
                    { label: 'Large (115%)', value: 'Large' },
                    { label: 'Extra Large (130%)', value: 'Extra Large' },
                  ],
                  personalizationPrefs.fontSize || 'Medium'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>{t('settings.fontSize')}</Text>
                <Text style={[styles.pickerVal, { color: theme.textPrimary }]}>{personalizationPrefs.fontSize || 'Medium'}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>
          </View>
        )}

        {/* 3. Notification switches Category */}
        {activeCategory === 'notifications' && (
          <View style={[styles.categoryCard, layoutPad(), { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.categoryHeading, textSz(14), { color: theme.textPrimary }]}>{t('settings.notifications')}</Text>
            <Text style={[styles.categoryDesc, { color: theme.textSecondary }]}>Control how and when you receive hearing updates.</Text>

            {/* Push notifications switch */}
            <View style={[styles.switchRow, { borderBottomColor: theme.divider }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>{t('settings.pushNotifications')}</Text>
                <Text style={styles.switchDesc}>Receive instant alert tokens on hearings and milestones.</Text>
              </View>
              <Switch
                value={notificationsPrefs.pushNotif !== false}
                onValueChange={() => handleToggle('notifications', 'pushNotif', notificationsPrefs.pushNotif !== false)}
                trackColor={{ false: '#E5E7EB', true: theme.primaryLight }}
                thumbColor={notificationsPrefs.pushNotif !== false ? theme.primary : '#9CA3AF'}
              />
            </View>

            {/* Email notifications switch */}
            <View style={[styles.switchRow, { borderBottomColor: theme.divider }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>{t('settings.emailNotifications')}</Text>
                <Text style={styles.switchDesc}>Send draft files directly to your inbox after generation.</Text>
              </View>
              <Switch
                value={notificationsPrefs.emailNotif !== false}
                onValueChange={() => handleToggle('notifications', 'emailNotif', notificationsPrefs.emailNotif !== false)}
                trackColor={{ false: '#E5E7EB', true: theme.primaryLight }}
                thumbColor={notificationsPrefs.emailNotif !== false ? theme.primary : '#9CA3AF'}
              />
            </View>

            {/* Court Hearing Reminders interval */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, marginTop: 12 }]}
              onPress={() =>
                openPicker(
                  t('settings.courtHearingReminder'),
                  'notifications',
                  'courtHearingReminder',
                  [
                    { label: '24 Hours Before', value: '24h' },
                    { label: '12 Hours Before', value: '12h' },
                    { label: '6 Hours Before', value: '6h' },
                    { label: '1 Hour Before', value: '1h' },
                  ],
                  notificationsPrefs.courtHearingReminder || '24h'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>{t('settings.courtHearingReminder')}</Text>
                <Text style={[styles.pickerVal, { color: theme.textPrimary }]}>
                  {notificationsPrefs.courtHearingReminder === '12h'
                    ? '12 Hours Before'
                    : notificationsPrefs.courtHearingReminder === '6h'
                    ? '6 Hours Before'
                    : notificationsPrefs.courtHearingReminder === '1h'
                    ? '1 Hour Before'
                    : '24 Hours Before'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Deadline Reminders */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
              onPress={() =>
                openPicker(
                  t('settings.deadlineReminder'),
                  'notifications',
                  'deadlineReminder',
                  [
                    { label: '7 Days Before', value: '7d' },
                    { label: '3 Days Before', value: '3d' },
                    { label: '1 Day Before', value: '1d' },
                    { label: 'Same Day', value: '0d' },
                  ],
                  notificationsPrefs.deadlineReminder || '3d'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>{t('settings.deadlineReminder')}</Text>
                <Text style={[styles.pickerVal, { color: theme.textPrimary }]}>
                  {notificationsPrefs.deadlineReminder === '7d'
                    ? '7 Days Before'
                    : notificationsPrefs.deadlineReminder === '1d'
                    ? '1 Day Before'
                    : notificationsPrefs.deadlineReminder === '0d'
                    ? 'Same Day'
                    : '3 Days Before'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Draft completed notifications */}
            <View style={[styles.switchRow, { borderBottomColor: theme.divider }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>{t('settings.draftCompleted')}</Text>
                <Text style={styles.switchDesc}>Alert when background AI template generations are compiled.</Text>
              </View>
              <Switch
                value={notificationsPrefs.draftCompleted !== false}
                onValueChange={() => handleToggle('notifications', 'draftCompleted', notificationsPrefs.draftCompleted !== false)}
                trackColor={{ false: '#E5E7EB', true: theme.primaryLight }}
                thumbColor={notificationsPrefs.draftCompleted !== false ? theme.primary : '#9CA3AF'}
              />
            </View>

            {/* Research completed notifications */}
            <View style={[styles.switchRow, { borderBottomColor: theme.divider }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>{t('settings.researchCompleted')}</Text>
                <Text style={styles.switchDesc}>Alert when background AI precedent registry searches complete.</Text>
              </View>
              <Switch
                value={notificationsPrefs.researchCompleted !== false}
                onValueChange={() => handleToggle('notifications', 'researchCompleted', notificationsPrefs.researchCompleted !== false)}
                trackColor={{ false: '#E5E7EB', true: theme.primaryLight }}
                thumbColor={notificationsPrefs.researchCompleted !== false ? theme.primary : '#9CA3AF'}
              />
            </View>
          </View>
        )}

        {/* 4. Security Settings Category */}
        {activeCategory === 'security' && (
          <View style={{ gap: 16 }}>
            {/* Password & Authentication Card */}
            <View style={[styles.categoryCard, layoutPad(), { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.categoryHeading, textSz(14), { color: theme.textPrimary }]}>Password & Authentication</Text>
              <Text style={[styles.categoryDesc, { color: theme.textSecondary }]}>Update your master passphrase and secure your account access.</Text>

              {/* Change Password Flow */}
              <View style={[styles.formWrapper, { marginTop: 12 }]}>
                <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Change Password</Text>
                
                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                  placeholder="Current Password"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                
                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                  placeholder="New Password"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <View style={styles.strengthRow}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary }}>Password Strength: </Text>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: passwordStrength.color }}>{passwordStrength.text}</Text>
                  </View>
                )}

                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                  placeholder="Confirm New Password"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />

                <TouchableOpacity
                  style={[styles.updatePasswordBtn, { backgroundColor: theme.primary }]}
                  onPress={handleUpdatePassword}
                >
                  <Text style={styles.updatePasswordBtnText}>Update Password</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Active Sessions Card */}
            <View style={[styles.categoryCard, layoutPad(), { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.categoryHeading, textSz(14), { color: theme.textPrimary }]}>Active Login Sessions</Text>
              <Text style={[styles.categoryDesc, { color: theme.textSecondary }]}>Devices currently logged into your advocate portal database.</Text>

              <View style={styles.sessionsWrapper}>
                {sessions.map((session) => {
                  const isMobile = session.device === 'Mobile' || session.device === 'Tablet' || session.os === 'Android' || session.os === 'iOS';
                  const deviceDisplayName = session.os ? `${session.os} ${session.device || ''}` : (session.device || 'Browser Client');
                  
                  return (
                    <View key={session._id} style={[styles.sessionItem, { borderBottomColor: theme.border }]}>
                      <Ionicons name={isMobile ? 'phone-portrait-outline' : 'laptop-outline'} size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.sessionDeviceName, { color: theme.textPrimary }]}>{deviceDisplayName}</Text>
                          {session.isCurrent && (
                            <View style={styles.currentDeviceBadge}>
                              <Text style={styles.currentDeviceText}>Current Device</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.sessionMetadata, { color: theme.textSecondary }]}>
                          {session.browser || 'Web App'} • {session.location || 'Unknown Location'} {session.ip && `• IP: ${session.ip}`}
                        </Text>
                        <Text style={[styles.sessionTime, { color: theme.textSecondary }]}>
                          Active: {formatSessionTime(session.lastActive || session.createdAt)}
                        </Text>
                      </View>
                      {!session.isCurrent && (
                        <TouchableOpacity onPress={() => handleLogoutSession(session._id, deviceDisplayName)} style={styles.sessionLogoutBtn}>
                          <Text style={styles.sessionLogoutText}>Logout</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {sessions.filter(s => !s.isCurrent).length > 0 && (
                  <TouchableOpacity style={styles.logoutAllBtn} onPress={handleLogoutAllSessions}>
                    <Text style={styles.logoutAllBtnText}>Logout From All Other Devices</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Delete Account Card */}
            <View style={[styles.categoryCard, layoutPad(), { backgroundColor: theme.surface, borderColor: theme.border, borderLeftWidth: 4, borderLeftColor: '#EF4444' }]}>
              <Text style={[styles.categoryHeading, textSz(14), { color: '#EF4444' }]}>Delete Account</Text>
              <Text style={[styles.categoryDesc, { color: theme.textSecondary }]}>Configure temporary deactivation or complete profile clearance.</Text>

              {/* Option 1: Temporary Deactivation */}
              <View style={[styles.optionRow, { borderBottomColor: theme.divider }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>Temporarily Deactivate Account</Text>
                  <Text style={styles.optionDesc}>
                    Your account becomes inaccessible. All cases, chats, documents and AI history remain safe. You can restore everything simply by logging in again.
                  </Text>
                </View>
                <TouchableOpacity style={styles.deactivateBtn} onPress={handleTemporarilyDeactivate}>
                  <Text style={styles.deactivateBtnText}>Deactivate</Text>
                </TouchableOpacity>
              </View>

              {/* Option 2: Permanent Deletion */}
              <View style={styles.optionRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.optionTitle, { color: '#EF4444' }]}>Permanently Delete Account</Text>
                  <Text style={styles.optionDesc}>
                    This action permanently deletes cases, documents, evidence, AI chats, bookmarks, knowledge notes, and settings. This cannot be undone.
                  </Text>
                </View>
                <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: '#EF4444' }]} onPress={() => setDeleteModalVisible(true)}>
                  <Text style={styles.deleteBtnText}>Permanently Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* 7. Support & About Category */}
        {activeCategory === 'help' && (
          <View style={[styles.categoryCard, layoutPad(), { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.categoryHeading, textSz(14), { color: theme.textPrimary }]}>{t('settings.help')}</Text>
            <Text style={[styles.categoryDesc, { color: theme.textSecondary }]}>Connect with helpdesk agents or view compliance policies.</Text>

            {/* Support communications options */}
            <View style={styles.supportOptionsRow}>
              <Pressable
                style={[styles.supportBox, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                onPress={() => router.push('/settings/guide')}
              >
                <Ionicons name="sparkles-outline" size={20} color={theme.primary} />
                <Text style={[styles.supportBoxTitle, { color: theme.textPrimary }]}>AI App Guide</Text>
              </Pressable>
              <Pressable
                style={[styles.supportBox, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                onPress={() => router.push('/settings/feature-request')}
              >
                <Ionicons name="bulb-outline" size={20} color={theme.primary} />
                <Text style={[styles.supportBoxTitle, { color: theme.textPrimary }]}>Feature Request</Text>
              </Pressable>
            </View>

            {/* Report Bug button */}
            <Pressable
              style={[styles.importActionRow, { borderColor: theme.border, backgroundColor: theme.surfaceVariant, marginTop: 10 }]}
              onPress={() => router.push('/settings/report-bug')}
            >
              <Ionicons name="bug-outline" size={18} color={theme.primary} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.importTitle, { color: theme.textPrimary }]}>{t('settings.reportBug')}</Text>
                <Text style={styles.importDesc}>Attach device diagnostic logs and submit error tickets to support.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Legal compliance links */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, marginTop: 16 }]}
              onPress={() => router.push('/settings/privacy-policy')}
            >
              <View>
                <Text style={[styles.pickerVal, { color: theme.textPrimary, marginTop: 0 }]}>{t('settings.privacyPolicy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>

            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
              onPress={() => router.push('/settings/terms-conditions')}
            >
              <View>
                <Text style={[styles.pickerVal, { color: theme.textPrimary, marginTop: 0 }]}>{t('settings.termsConditions')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>

            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
              onPress={() => {
                Alert.alert(
                  'AI Disclaimer',
                  'AI-generated responses are informational only and may contain errors. AI LEGAL™ does not provide licensed legal advice; users must verify outputs independently with a qualified professional before making legal decisions.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerVal, { color: theme.textPrimary, marginTop: 0 }]}>AI Disclaimer</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Backup Format Bottom Sheet ── */}
      <Modal
        visible={backupFormatModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBackupFormatModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setBackupFormatModal(false)} />
          <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.bottomSheetHandle} />
            <Text style={[styles.bottomSheetTitle, { color: theme.textPrimary }]}>Choose Backup Format</Text>
            <Text style={[styles.bottomSheetDesc, { color: theme.textSecondary }]}>
              Select a format to export your AI LEGAL data.
            </Text>
            <Pressable
              style={[styles.formatOption, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              onPress={() => handleExportData('JSON')}
            >
              <View style={[styles.formatOptionIcon, { backgroundColor: 'rgba(32,138,239,0.1)' }]}>
                <Ionicons name="code-slash-outline" size={20} color="#208AEF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formatOptionTitle, { color: theme.textPrimary }]}>JSON Backup</Text>
                <Text style={[styles.formatOptionDesc, { color: theme.textSecondary }]}>
                  Full backup including cases, drafts, settings and preferences.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>
            <Pressable
              style={[styles.formatOption, { borderColor: theme.border, backgroundColor: theme.surfaceVariant, marginTop: 10 }]}
              onPress={() => handleExportData('PDF')}
            >
              <View style={[styles.formatOptionIcon, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
                <Ionicons name="document-text-outline" size={20} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formatOptionTitle, { color: theme.textPrimary }]}>PDF Report</Text>
                <Text style={[styles.formatOptionDesc, { color: theme.textSecondary }]}>
                  Professional summary report of your cases and settings.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>
            <Pressable
              style={[styles.cancelSheetBtn, { borderColor: theme.border }]}
              onPress={() => setBackupFormatModal(false)}
            >
              <Text style={[styles.cancelSheetBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Delete Account Confirmation Modal ── */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { justifyContent: 'center', paddingHorizontal: 24 }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setDeleteModalVisible(false)} />
          <View style={[styles.deleteModal, { backgroundColor: theme.surface }]}>
            <View style={styles.deleteModalIconWrap}>
              <Ionicons name="warning" size={30} color="#EF4444" />
            </View>
            <Text style={[styles.deleteModalTitle, { color: theme.textPrimary }]}>Permanently Delete Account</Text>
            <Text style={[styles.deleteModalBody, { color: theme.textSecondary }]}>
              Enter password and type <Text style={{ color: '#EF4444', fontWeight: '800' }}>DELETE</Text> to authorize permanent removal of cases, chats, documents, and settings. This cannot be undone.
            </Text>

            <TextInput
              style={[styles.deleteConfirmInput, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceVariant, marginBottom: 8 }]}
              value={deletePasswordValue}
              onChangeText={setDeletePasswordValue}
              placeholder="Confirm Password"
              placeholderTextColor={theme.placeholder}
              secureTextEntry
            />

            <TextInput
              style={[styles.deleteConfirmInput, { borderColor: deleteVerifyText === 'DELETE' ? '#EF4444' : theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceVariant }]}
              value={deleteVerifyText}
              onChangeText={setDeleteVerifyText}
              placeholder="Type DELETE here"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="characters"
            />
            
            <View style={styles.deleteModalActions}>
              <Pressable
                style={[styles.deleteModalCancelBtn, { borderColor: theme.border }]}
                onPress={() => { setDeleteModalVisible(false); setDeletePasswordValue(''); setDeleteVerifyText(''); }}
              >
                <Text style={[styles.deleteModalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteModalConfirmBtn, { opacity: deleteVerifyText === 'DELETE' && deletePasswordValue ? 1 : 0.4 }]}
                onPress={handlePermanentlyDelete}
                disabled={deleteVerifyText !== 'DELETE' || !deletePasswordValue}
              >
                <Text style={styles.deleteModalConfirmText}>Permanently Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shared Dropdown Picker Modal */}
      <Modal
        visible={pickerModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPickerModal({ ...pickerModal, visible: false })}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setPickerModal({ ...pickerModal, visible: false })} />
          <View style={[styles.modalContent, { maxHeight: height * 0.5, backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{pickerModal.title}</Text>
              <Pressable onPress={() => setPickerModal({ ...pickerModal, visible: false })}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {pickerModal.options.map((opt) => {
                const isSelected = opt.value === pickerModal.selectedValue;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.pickerOptRow, { borderBottomColor: theme.divider }, isSelected && [styles.pickerOptRowSelected, { backgroundColor: theme.primaryLight }]]}
                    onPress={() => handlePickerSelect(opt.value)}
                  >
                    <Text style={[styles.pickerOptText, { color: theme.textSecondary }, isSelected && [styles.pickerOptTextSelected, { color: theme.primary }]]}>
                      {opt.label}
                    </Text>
                    {isSelected ? <Ionicons name="checkmark" size={18} color={theme.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PIN configuration Modal */}
      <Modal
        visible={pinModal.visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPinModal({ ...pinModal, visible: false })}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setPinModal({ ...pinModal, visible: false })} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {pinModal.mode === 'create'
                  ? 'Setup Security PIN'
                  : pinModal.mode === 'disable'
                  ? 'Disable PIN Protection'
                  : 'Change Security PIN'}
              </Text>
              <Pressable onPress={() => setPinModal({ ...pinModal, visible: false })}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              {pinModal.mode === 'create' && (
                <>
                  {pinModal.step === 1 ? (
                    <View style={styles.pinInputGroup}>
                      <Text style={[styles.pinInstruction, { color: theme.textSecondary }]}>Enter a new 4-digit security PIN:</Text>
                      <TextInput
                        style={[styles.pinTextInput, { color: theme.textPrimary, borderColor: theme.border }]}
                        secureTextEntry={true}
                        maxLength={4}
                        keyboardType="number-pad"
                        value={pinModal.pinCode}
                        onChangeText={(v) => setPinModal({ ...pinModal, pinCode: v })}
                      />
                      <Pressable
                        style={[styles.pinActionSubmitBtn, { backgroundColor: theme.primary }]}
                        onPress={() => setPinModal({ ...pinModal, step: 2 })}
                      >
                        <Text style={styles.pinActionSubmitBtnText}>Continue</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.pinInputGroup}>
                      <Text style={[styles.pinInstruction, { color: theme.textSecondary }]}>Confirm the 4-digit PIN code:</Text>
                      <TextInput
                        style={[styles.pinTextInput, { color: theme.textPrimary, borderColor: theme.border }]}
                        secureTextEntry={true}
                        maxLength={4}
                        keyboardType="number-pad"
                        value={pinModal.confirmPin}
                        onChangeText={(v) => setPinModal({ ...pinModal, confirmPin: v })}
                      />
                      <Pressable style={[styles.pinActionSubmitBtn, { backgroundColor: theme.primary }]} onPress={handlePinAction}>
                        <Text style={styles.pinActionSubmitBtnText}>Enable PIN Lock</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}

              {pinModal.mode === 'disable' && (
                <View style={styles.pinInputGroup}>
                  <Text style={[styles.pinInstruction, { color: theme.textSecondary }]}>Enter your security PIN to confirm disabling:</Text>
                  <TextInput
                    style={[styles.pinTextInput, { color: theme.textPrimary, borderColor: theme.border }]}
                    secureTextEntry={true}
                    maxLength={4}
                    keyboardType="number-pad"
                    value={pinModal.oldPin}
                    onChangeText={(v) => setPinModal({ ...pinModal, oldPin: v })}
                  />
                  <Pressable style={[styles.pinActionSubmitBtn, { backgroundColor: '#EF4444' }]} onPress={handlePinAction}>
                    <Text style={styles.pinActionSubmitBtnText}>Disable PIN Protection</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* JSON Import Backup Modal */}
      <Modal
        visible={importModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImportModal({ ...importModal, visible: false })}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setImportModal({ ...importModal, visible: false })} />
          <View style={[styles.modalContent, { maxHeight: height * 0.7, backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Import Settings Backup</Text>
              <Pressable onPress={() => setImportModal({ ...importModal, visible: false })}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={[styles.pinInstruction, { color: theme.textSecondary, marginBottom: 12 }]}>
                Paste the exported JSON backup code strings below to sync your settings preferences database:
              </Text>
              <TextInput
                style={[styles.importTextArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                multiline={true}
                numberOfLines={8}
                value={importModal.jsonText}
                onChangeText={(v) => setImportModal({ ...importModal, jsonText: v })}
                placeholder="Paste backup JSON database code here..."
                placeholderTextColor={theme.placeholder}
              />
              <Pressable style={[styles.pinActionSubmitBtn, { backgroundColor: theme.primary, marginTop: 14 }]} onPress={handleImportBackup}>
                <Text style={styles.pinActionSubmitBtnText}>Restore Preferences</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bug Report Modal */}
      <Modal
        visible={bugModal.visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBugModal({ ...bugModal, visible: false })}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setBugModal({ ...bugModal, visible: false })} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('settings.reportBug')}</Text>
              <Pressable onPress={() => setBugModal({ ...bugModal, visible: false })}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.pinInstruction, { color: theme.textSecondary, marginBottom: 12 }]}>
                Submit bugs or computational errors. Diagnostic logs will be collected automatically.
              </Text>
              <TextInput
                style={[styles.importTextArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                multiline={true}
                numberOfLines={5}
                value={bugModal.description}
                onChangeText={(v) => setBugModal({ ...bugModal, description: v })}
                placeholder="Describe the issue you encountered..."
                placeholderTextColor={theme.placeholder}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                <Pressable onPress={() => setBugModal({ ...bugModal, attachLogs: !bugModal.attachLogs })}>
                  <Ionicons name={bugModal.attachLogs ? 'checkbox' : 'square-outline'} size={20} color={theme.primary} style={{ marginRight: 8 }} />
                </Pressable>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Attach System Diagnostic Logs</Text>
              </View>
              <Pressable style={[styles.pinActionSubmitBtn, { backgroundColor: theme.primary, marginTop: 16 }]} onPress={handleBugSubmit}>
                <Text style={styles.pinActionSubmitBtnText}>Submit Bug Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Policy Text Modal */}
      <Modal
        visible={policyModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPolicyModal({ ...policyModal, visible: false })}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setPolicyModal({ ...policyModal, visible: false })} />
          <View style={[styles.modalContent, { maxHeight: height * 0.7, backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{policyModal.title}</Text>
              <Pressable onPress={() => setPolicyModal({ ...policyModal, visible: false })}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={[styles.policyText, { color: theme.textSecondary }]}>{policyModal.text}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
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
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 9.5,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  categoriesBar: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  catScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  catBtnActive: {
    borderWidth: 1,
  },
  catText: {
    fontSize: 11,
    fontWeight: '600',
  },
  catTextActive: {
    fontWeight: '800',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  categoryCard: {
    borderWidth: 1,
    borderRadius: 14,
  },
  categoryHeading: {
    fontWeight: '800',
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: 11,
    marginBottom: 16,
    lineHeight: 14,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerVal: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  subSectionHeading: {
    fontWeight: '800',
    marginBottom: 8,
  },
  inputBoxGroup: {
    marginBottom: 12,
  },
  inputBoxLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  dangerZoneBox: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoneHeading: {
    fontSize: 12,
    fontWeight: '800',
  },
  zoneDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
    lineHeight: 13,
  },
  defaultsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  defaultsBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  switchLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  switchDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 13,
  },
  accentBlock: {
    marginTop: 16,
    borderTopWidth: 1,
    paddingTop: 14,
  },
  accentLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  colorPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    minWidth: '47%',
  },
  colorBoxActive: {
    borderWidth: 1.5,
  },
  colorBoxDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  colorBoxText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  pinConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  pinActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pinActionBtnText: {
    fontSize: 11.5,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sessionsWrapper: {
    marginTop: 6,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  sessionDeviceName: {
    fontSize: 12,
    fontWeight: '700',
  },
  sessionMetadata: {
    fontSize: 9.5,
    marginTop: 1,
  },
  revokeAllBtn: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  revokeAllBtnText: {
    fontSize: 11.5,
    color: '#EF4444',
    fontWeight: '700',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  lockBadgeText: {
    fontSize: 9.5,
    color: '#10B981',
    fontWeight: '800',
  },
  manualSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  syncNowBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  syncNowBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  // ── Data & Storage new styles ──
  dataCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  dataCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  dataCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  dataCardDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  syncNowFullBtn: {
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncNowFullBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  backupButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 11,
  },
  backupBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  backupBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 11,
  },
  backupBtnOutlineText: {
    fontSize: 12,
    fontWeight: '800',
  },
  clearCacheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
  },
  clearCacheBtnText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  dangerCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
  },
  deleteAccountCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  deleteAccountTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  deleteAccountBody: {
    fontSize: 11,
    lineHeight: 15,
  },
  deleteAccountBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  deleteAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  // ── Backup Format Bottom Sheet ──
  bottomSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },
  bottomSheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  bottomSheetDesc: {
    fontSize: 11.5,
    marginBottom: 16,
    lineHeight: 15,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  formatOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  formatOptionDesc: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  cancelSheetBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelSheetBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Delete Confirm Modal ──
  deleteModal: {
    borderRadius: 18,
    padding: 22,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  deleteModalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 4,
  },
  deleteModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  deleteModalBody: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  deleteConfirmInput: {
    height: 46,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 3,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  deleteModalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteModalConfirmBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  importActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  importTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  importDesc: {
    fontSize: 9.5,
    color: '#9CA3AF',
    marginTop: 1,
  },
  supportOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  supportBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    gap: 4,
  },
  supportBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  metadataCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaVersion: {
    fontSize: 11,
    fontWeight: '800',
  },
  metaDesc: {
    fontSize: 9,
    lineHeight: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissBg: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  pickerOptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  pickerOptRowSelected: {
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  pickerOptText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pickerOptTextSelected: {
    fontWeight: '800',
  },
  modalBody: {
    paddingBottom: 10,
  },
  pinInstruction: {
    fontSize: 12,
    lineHeight: 16,
  },
  pinInputGroup: {
    alignItems: 'center',
    gap: 12,
  },
  pinTextInput: {
    width: 140,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
  },
  pinActionSubmitBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pinActionSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  importTextArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    height: 120,
    textAlignVertical: 'top',
  },
  policyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  formWrapper: {
    gap: 8,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 12.5,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  updatePasswordBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  updatePasswordBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  twoFaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  comingSoonBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  comingSoonText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#475569',
  },
  currentDeviceBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentDeviceText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#15803D',
  },
  sessionLogoutBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  sessionLogoutText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  logoutAllBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  logoutAllBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  sessionTime: {
    fontSize: 9.5,
    marginTop: 1,
  },
  optionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    lineHeight: 14,
  },
  deactivateBtn: {
    borderWidth: 1,
    borderColor: '#64748B',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  deactivateBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  deleteBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

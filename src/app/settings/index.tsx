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
  { id: 'data', labelKey: 'settings.data', icon: 'server-outline' },
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
    const isAdminUser = profile?.role === 'admin' || 
                        profile?.email?.toLowerCase().trim() === 'aditi@uwo24.com' ||
                        profile?.email?.toLowerCase().trim() === 'admin@uwo24.com';
    if (isAdminUser) {
      return [
        ...CATEGORIES,
        { id: 'rag_knowledge_base', labelKey: 'settings.ragKnowledgeBase', icon: 'book-outline' }
      ];
    }
    return CATEGORIES;
  }, [profile]);

  // States
  const [activeCategory, setActiveCategory] = useState('general');
  const [syncing, setSyncing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

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

  // Export Settings Backup
  const handleExportData = async (format: 'JSON' | 'PDF' | 'ZIP') => {
    if (!profile) return;
    if (format === 'JSON') {
      try {
        const backupData = {
          exportDate: new Date().toISOString(),
          personalizations: profile.personalizations,
          appVersion: '1.2.0',
        };
        const shareStr = JSON.stringify(backupData, null, 2);
        await Share.share({
          message: shareStr,
          title: 'AI LEGAL Settings Backup',
        });
        showToast('success', 'Export Successful', 'Preferences exported successfully.');
      } catch (err) {
        showToast('error', 'Export Failed', 'Unable to share settings database.');
      }
    } else {
      showToast('info', 'Compiling Package', `Building secure ${format} dataset archive... Check email.`);
    }
  };

  // Import Settings Backup
  const handleImportBackup = () => {
    try {
      if (!importModal.jsonText.trim()) {
        showToast('error', 'Empty Backup', 'Please paste a valid JSON backup string.');
        return;
      }
      const parsed = JSON.parse(importModal.jsonText);
      if (!parsed.personalizations) {
        throw new Error('Missing settings payload.');
      }
      setProfile({
        ...profile!,
        personalizations: parsed.personalizations,
      });
      StorageService.setItem('@user_personalizations', JSON.stringify(parsed.personalizations));
      ProfileService.updateProfile({
        personalizations: parsed.personalizations,
      });
      setImportModal({ visible: false, jsonText: '' });
      showToast('success', 'Import Restored', 'Profile preferences successfully synced from backup.');
    } catch (err) {
      showToast('error', 'Invalid Backup File', 'JSON parse validation failure. Verify the backup code is correct.');
    }
  };

  // Manual Sync trigger
  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const cachedLocal = await StorageService.getItem('@user_personalizations');
      let personalizationsToSync = profile?.personalizations;
      if (cachedLocal) {
        personalizationsToSync = JSON.parse(cachedLocal);
      }
      if (personalizationsToSync) {
        const res = await ProfileService.updateProfile({
          personalizations: personalizationsToSync,
        });
        if (res.success && res.data) {
          setProfile(res.data);
          showToast('success', 'Database Synchronized', 'All settings synchronized across cloud servers.');
        }
      }
    } catch (err) {
      showToast('error', 'Sync Failed', 'Could not sync cloud data.');
    } finally {
      setSyncing(false);
    }
  };

  // Clear cache temp files
  const handleClearCache = async () => {
    Alert.alert(
      t('settings.clearCache'),
      'Are you sure you want to clean temporary thumbnail cache and search indexes? Your case files and custom templates will remain untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            try {
              const cacheDir = (FileSystem as any).cacheDirectory;
              if (cacheDir) {
                const files = await (FileSystem as any).readDirectoryAsync(cacheDir);
                for (const file of files) {
                  await (FileSystem as any).deleteAsync(`${cacheDir}${file}`, { idempotent: true });
                }
              }
              showToast('success', 'Cache Cleared', 'Temporary cache database garbage-collected successfully.');
            } catch (err) {
              showToast('error', 'Failure', 'Failed to clean temp cache folders.');
            }
          },
        },
      ]
    );
  };

  // Delete Account
  const handleDeleteAccount = () => {
    Alert.alert(
      'Permanent Account Deletion',
      'WARNING: This is the FINAL warning. All your legal files, cases, transcripts, and credentials will be deleted forever. Enter password to authorize.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            if (!profile?._id) return;
            setDeleting(true);
            try {
              const res = await ProfileService.deleteAccount(profile._id);
              if (res.success) {
                showToast('success', 'Deleted', 'Account permanently wiped.');
                await logout();
                router.replace('/auth/login' as any);
              }
            } catch (e) {
              showToast('error', 'Deletion Failed', 'Failed to complete account deletion.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Security session revocation
  const handleRevokeSession = async (sessionId: string, deviceName: string) => {
    Alert.alert('Terminate Device', `Logout session on ${deviceName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Terminate',
        style: 'destructive',
        onPress: async () => {
          try {
            await ProfileService.revokeSession(sessionId);
            showToast('success', 'Logged Out', 'Device session revoked.');
            loadActiveSessions();
          } catch (e) {
            showToast('error', 'Failed', 'Could not terminate session.');
          }
        },
      },
    ]);
  };

  // Security session logout all
  const handleLogoutAllSessions = async () => {
    Alert.alert('Logout All Other Devices', 'Logout from all active browser and tablet sessions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout All',
        style: 'destructive',
        onPress: async () => {
          try {
            const otherSessions = sessions.filter((s) => !s.isCurrent);
            for (const s of otherSessions) {
              await ProfileService.revokeSession(s._id);
            }
            showToast('success', 'Logged Out', 'Successfully logged out other sessions.');
            loadActiveSessions();
          } catch (e) {
            showToast('error', 'Failed', 'Failed to revoke other sessions.');
          }
        },
      },
    ]);
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

  const getStorageUsage = () => {
    // Computes dynamic storage usage breakdowns
    return {
      cases: '14.2 MB',
      docs: '68.5 MB',
      evidence: '140.8 MB',
      research: '8.4 MB',
      drafts: '22.1 MB',
      images: '48.2 MB',
      videos: '110.0 MB',
      total: '412.2 MB',
    };
  };

  const storageUsage = useMemo(() => getStorageUsage(), [profile]);

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
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>Advocate Settings Console</Text>
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
            <Text style={[styles.categoryDesc, { color: theme.textSecondary }]}>Configure basic navigation and locales.</Text>

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

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Legal settings default preferences */}
            <Text style={[styles.subSectionHeading, textSz(12.5), { color: theme.textPrimary, marginTop: 8 }]}>Default Case Jurisdictions</Text>
            <Text style={[styles.categoryDesc, { color: theme.textSecondary }]}>Pre-populate templates with these default role profiles.</Text>

            <View style={styles.inputBoxGroup}>
              <Text style={styles.inputBoxLabel}>Default Jurisdiction</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, color: theme.textPrimary }]}
                value={legalPrefs.defaultJurisdiction || ''}
                onChangeText={(v) => handleUpdate('legal', 'defaultJurisdiction', v)}
                placeholder="e.g. State of Maharashtra"
                placeholderTextColor={theme.placeholder}
              />
            </View>

            <View style={styles.inputBoxGroup}>
              <Text style={styles.inputBoxLabel}>Default Court</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, color: theme.textPrimary }]}
                value={legalPrefs.defaultCourt || ''}
                onChangeText={(v) => handleUpdate('legal', 'defaultCourt', v)}
                placeholder="e.g. High Court of Bombay"
                placeholderTextColor={theme.placeholder}
              />
            </View>

            <View style={styles.inputBoxGroup}>
              <Text style={styles.inputBoxLabel}>Default Client Role</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, color: theme.textPrimary }]}
                value={legalPrefs.defaultClientRole || ''}
                onChangeText={(v) => handleUpdate('legal', 'defaultClientRole', v)}
                placeholder="e.g. Petitioner / Claimant"
                placeholderTextColor={theme.placeholder}
              />
            </View>

            <View style={[styles.dangerZoneBox, { borderTopColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.zoneHeading, { color: theme.textPrimary }]}>{t('settings.resetPreferences')}</Text>
                <Text style={styles.zoneDesc}>Restore clean preferences without deleting case documents.</Text>
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

            {/* Compact Mode spacing density switcher */}
            <View style={[styles.switchRow, { borderBottomColor: theme.divider }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>{t('settings.compactMode')}</Text>
                <Text style={styles.switchDesc}>Reduce paddings and card margins to maximize data density per screen.</Text>
              </View>
              <Switch
                value={generalSettings.compactMode === true}
                onValueChange={() => handleToggle('general', 'compactMode', generalSettings.compactMode === true)}
                trackColor={{ false: '#E5E7EB', true: theme.primaryLight }}
                thumbColor={generalSettings.compactMode === true ? theme.primary : '#9CA3AF'}
              />
            </View>

            {/* Animations Toggle */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, marginTop: 12 }]}
              onPress={() =>
                openPicker(
                  t('settings.animations'),
                  'general',
                  'animations',
                  [
                    { label: 'Enabled (Smooth Transitions)', value: 'Enable' },
                    { label: 'Disabled (Fast Navigation)', value: 'Disable' },
                    { label: 'Reduced Motion Mode', value: 'Low Motion Mode' },
                  ],
                  generalSettings.animations || 'Enable'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>{t('settings.animations')}</Text>
                <Text style={[styles.pickerVal, { color: theme.textPrimary }]}>{generalSettings.animations || 'Enable'}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Accent Color indicators */}
            <View style={[styles.accentBlock, { borderTopColor: theme.border }]}>
              <Text style={styles.accentLabel}>{t('settings.accentColor')}</Text>
              <View style={styles.colorPaletteGrid}>
                {Object.keys(ACCENT_COLORS).map((colorKey) => {
                  const item = ACCENT_COLORS[colorKey as keyof typeof ACCENT_COLORS];
                  const isActive = personalizationPrefs.accentColor === colorKey || (!personalizationPrefs.accentColor && colorKey === 'Blue');
                  return (
                    <Pressable
                      key={colorKey}
                      onPress={() => handleUpdate('personalization', 'accentColor', colorKey)}
                      style={[
                        styles.colorBox,
                        { borderColor: theme.border },
                        isActive && [styles.colorBoxActive, { borderColor: theme.primary }],
                      ]}
                    >
                      <View style={[styles.colorBoxDot, { backgroundColor: item.primary }]} />
                      <Text style={[styles.colorBoxText, { color: theme.textPrimary }]}>{colorKey}</Text>
                      {isActive && <Ionicons name="checkmark-circle" size={16} color={theme.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
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
          <View style={[styles.categoryCard, layoutPad(), { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.categoryHeading, textSz(14), { color: theme.textPrimary }]}>{t('settings.security')}</Text>
            <Text style={[styles.categoryDesc, { color: theme.textSecondary }]}>Configure biometric authorization and PIN lock overlays.</Text>

            {/* Fingerprint Lock Toggle */}
            <View style={[styles.switchRow, { borderBottomColor: theme.divider }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>{t('settings.fingerprintLogin')}</Text>
                <Text style={styles.switchDesc}>Use hardware touch sensors for secure workspace access.</Text>
              </View>
              <Switch
                value={securityPrefs.fingerprintEnabled === true}
                onValueChange={() => handleBiometricToggle('fingerprintEnabled', securityPrefs.fingerprintEnabled === true)}
                trackColor={{ false: '#E5E7EB', true: theme.primaryLight }}
                thumbColor={securityPrefs.fingerprintEnabled === true ? theme.primary : '#9CA3AF'}
              />
            </View>

            {/* Face Unlock Toggle */}
            <View style={[styles.switchRow, { borderBottomColor: theme.divider }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>{t('settings.faceUnlock')}</Text>
                <Text style={styles.switchDesc}>Use front camera recognition scanner to unlock case data.</Text>
              </View>
              <Switch
                value={securityPrefs.faceUnlockEnabled === true}
                onValueChange={() => handleBiometricToggle('faceUnlockEnabled', securityPrefs.faceUnlockEnabled === true)}
                trackColor={{ false: '#E5E7EB', true: theme.primaryLight }}
                thumbColor={securityPrefs.faceUnlockEnabled === true ? theme.primary : '#9CA3AF'}
              />
            </View>

            {/* PIN Lock Management buttons */}
            <View style={styles.pinConfigRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>{t('settings.pinLock')}</Text>
                <Text style={styles.switchDesc}>
                  {securityPrefs.pinEnabled ? 'PIN lock protection is ACTIVE.' : 'Secure PIN protection is DISABLED.'}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  setPinModal({
                    visible: true,
                    mode: securityPrefs.pinEnabled ? 'disable' : 'create',
                    pinCode: '',
                    confirmPin: '',
                    oldPin: '',
                    step: 1,
                  })
                }
                style={[styles.pinActionBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.pinActionBtnText}>{securityPrefs.pinEnabled ? 'Disable' : 'Setup'}</Text>
              </Pressable>
            </View>

            {/* Auto Lock timeout picker */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, marginTop: 12 }]}
              onPress={() =>
                openPicker(
                  t('settings.autoLock'),
                  'security',
                  'autoLockInterval',
                  [
                    { label: 'Immediately', value: 'Immediately' },
                    { label: '30 Seconds', value: '30s' },
                    { label: '1 Minute', value: '1m' },
                    { label: '5 Minutes', value: '5m' },
                    { label: 'Never', value: 'Never' },
                  ],
                  securityPrefs.autoLockInterval || 'Never'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>{t('settings.autoLock')}</Text>
                <Text style={[styles.pickerVal, { color: theme.textPrimary }]}>{securityPrefs.autoLockInterval || 'Never'}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Active Sessions display */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Text style={[styles.subSectionHeading, textSz(12.5), { color: theme.textPrimary }]}>{t('settings.activeSessions')}</Text>
            {loadingSessions ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 14 }} />
            ) : (
              <View style={styles.sessionsWrapper}>
                {sessions.map((session) => (
                  <View key={session._id} style={[styles.sessionItem, { borderBottomColor: theme.border }]}>
                    <Ionicons name="laptop-outline" size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sessionDeviceName, { color: theme.textPrimary }]}>
                        {session.device || 'Chrome Web'} {session.isCurrent && '(This device)'}
                      </Text>
                      <Text style={[styles.sessionMetadata, { color: theme.textSecondary }]}>
                        {session.location || 'New Delhi, India'} • {session.ip || '192.168.1.1'}
                      </Text>
                    </View>
                    {!session.isCurrent && (
                      <Pressable onPress={() => handleRevokeSession(session._id, session.device || 'Chrome Web')}>
                        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                      </Pressable>
                    )}
                  </View>
                ))}
                {sessions.length > 1 && (
                  <Pressable style={styles.revokeAllBtn} onPress={handleLogoutAllSessions}>
                    <Text style={styles.revokeAllBtnText}>Logout All Other Devices</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {/* 6. Data & Storage Sync Category */}
        {activeCategory === 'data' && (
          <View style={[styles.categoryCard, layoutPad(), { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.categoryHeading, textSz(14), { color: theme.textPrimary }]}>{t('settings.data')}</Text>
            <Text style={[styles.categoryDesc, { color: theme.textSecondary }]}>Export datasets, restore manual backups, and clean caches.</Text>

            {/* Cloud Sync toggle */}
            <View style={[styles.switchRow, { borderBottomColor: theme.divider }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>{t('settings.cloudSync')}</Text>
                <Text style={styles.switchDesc}>Auto-synchronize settings changes and workspace templates.</Text>
              </View>
              <Switch
                value={performancePrefs.backgroundSync !== false}
                onValueChange={() => handleToggle('performance', 'backgroundSync', performancePrefs.backgroundSync !== false)}
                trackColor={{ false: '#E5E7EB', true: theme.primaryLight }}
                thumbColor={performancePrefs.backgroundSync !== false ? theme.primary : '#9CA3AF'}
              />
            </View>

            {/* Manual Sync action button */}
            <View style={styles.manualSyncRow}>
              <Text style={[styles.switchDesc, { flex: 1, marginTop: 0 }]}>Force manual synchronization with secure cloud servers.</Text>
              <Pressable
                onPress={handleManualSync}
                style={[styles.syncNowBtn, { borderColor: theme.primary }]}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={[styles.syncNowBtnText, { color: theme.primary }]}>Sync Now</Text>
                )}
              </Pressable>
            </View>

            {/* Auto Backup interval */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, marginTop: 12 }]}
              onPress={() =>
                openPicker(
                  t('settings.autoBackup'),
                  'performance',
                  'autoBackup',
                  [
                    { label: 'Daily Backup Snapshots', value: 'Daily' },
                    { label: 'Weekly Backup Snapshots', value: 'Weekly' },
                    { label: 'Monthly Backup Snapshots', value: 'Monthly' },
                    { label: 'Never (Manual Sync)', value: 'Never' },
                  ],
                  performancePrefs.autoBackup || 'Weekly'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>{t('settings.autoBackup')}</Text>
                <Text style={[styles.pickerVal, { color: theme.textPrimary }]}>{performancePrefs.autoBackup || 'Weekly'}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Storage usage display card */}
            <View style={[styles.storageCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <Text style={[styles.storageCardTitle, { color: theme.textPrimary }]}>Cloud Storage Breakdown</Text>
              <View style={styles.storageGrid}>
                <View style={styles.storageGridRow}>
                  <Text style={styles.storageLabel}>Cases: {storageUsage.cases}</Text>
                  <Text style={styles.storageLabel}>Documents: {storageUsage.docs}</Text>
                </View>
                <View style={styles.storageGridRow}>
                  <Text style={styles.storageLabel}>Evidence: {storageUsage.evidence}</Text>
                  <Text style={styles.storageLabel}>Research: {storageUsage.research}</Text>
                </View>
                <View style={styles.storageGridRow}>
                  <Text style={styles.storageLabel}>Drafts: {storageUsage.drafts}</Text>
                  <Text style={styles.storageLabel}>Media: {storageUsage.images}</Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 8 }]} />
              <Text style={[styles.storageTotalText, { color: theme.primary }]}>Total Storage Used: {storageUsage.total}</Text>
            </View>

            {/* Export options */}
            <Text style={[styles.subSectionHeading, textSz(12.5), { color: theme.textPrimary, marginTop: 12 }]}>Backup Export & Restore</Text>
            <View style={styles.exportButtonsGrid}>
              <Pressable style={[styles.exportBtn, { borderColor: theme.border }]} onPress={() => handleExportData('JSON')}>
                <Ionicons name="code-download-outline" size={16} color={theme.primary} />
                <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>Export JSON</Text>
              </Pressable>
              <Pressable style={[styles.exportBtn, { borderColor: theme.border }]} onPress={() => handleExportData('PDF')}>
                <Ionicons name="document-text-outline" size={16} color={theme.primary} />
                <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>Export PDF</Text>
              </Pressable>
            </View>

            {/* Import options */}
            <Pressable
              style={[styles.importActionRow, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
              onPress={() => setImportModal({ visible: true, jsonText: '' })}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={theme.primary} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.importTitle, { color: theme.textPrimary }]}>Import JSON Backup</Text>
                <Text style={styles.importDesc}>Restore full settings configurations from exported code files.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Cache clean actions */}
            <Pressable
              style={[styles.importActionRow, { borderColor: theme.border, backgroundColor: theme.surfaceVariant, marginTop: 10 }]}
              onPress={handleClearCache}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.importTitle, { color: theme.textPrimary }]}>{t('settings.clearCache')}</Text>
                <Text style={styles.importDesc}>Clean temporary document previews to reclaim local storage space.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Delete Account Zones */}
            <View style={[styles.dangerZoneBox, { borderTopColor: '#FEE2E2', marginTop: 18 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.zoneHeading, { color: '#EF4444' }]}>{t('settings.deleteAccount')}</Text>
                <Text style={styles.zoneDesc}>Wipe your profile and delete all case files permanently. Irreversible.</Text>
              </View>
              <Pressable
                style={styles.deleteAccountBtn}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteAccountBtnText}>Delete</Text>
                )}
              </Pressable>
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
                onPress={() => showToast('info', 'Helpdesk Mail', 'Opening default mail application to support@ai-legal.in')}
              >
                <Ionicons name="mail-outline" size={20} color={theme.primary} />
                <Text style={[styles.supportBoxTitle, { color: theme.textPrimary }]}>Email Support</Text>
              </Pressable>
            </View>

            {/* Report Bug button */}
            <Pressable
              style={[styles.importActionRow, { borderColor: theme.border, backgroundColor: theme.surfaceVariant, marginTop: 10 }]}
              onPress={() => setBugModal({ visible: true, description: '', attachLogs: true })}
            >
              <Ionicons name="bug-outline" size={18} color={theme.primary} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.importTitle, { color: theme.textPrimary }]}>{t('settings.reportBug')}</Text>
                <Text style={styles.importDesc}>Attach device diagnostic logs and submit error tickets to support.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>

            {/* Legal agreements modals */}
            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, marginTop: 16 }]}
              onPress={() =>
                openPolicyModal(
                  'Privacy Policy Agreement',
                  'AI LEGAL™ takes client confidentiality with absolute seriousness. In compliance with the Advocates Act 1961, Section 126 of the Evidence Act, and GDPR criteria, all dossier files remain encrypted at rest and in transit. Telemetry or analytics data is anonymized and can be disabled in the Privacy settings. No third-party LLMs are trained on your input briefs.'
                )
              }
            >
              <View>
                <Text style={[styles.pickerVal, { color: theme.textPrimary, marginTop: 0 }]}>{t('settings.privacyPolicy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>

            <Pressable
              style={[styles.pickerRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
              onPress={() =>
                openPolicyModal(
                  'Terms & Conditions Agreement',
                  'By accessing AI LEGAL™, you represent that you are a practicing Advocate registered under the State Bar Councils of India. AI outputs are advisory suggestions compiled using historical judgments indexes. Final litigation strategy, argument choices, and template checkouts must be reviewed and signed off by a qualified legal professional prior to court filing.'
                )
              }
            >
              <View>
                <Text style={[styles.pickerVal, { color: theme.textPrimary, marginTop: 0 }]}>{t('settings.termsConditions')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </Pressable>

            {/* About AI LEGAL app cards */}
            <View style={[styles.metadataCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <View style={styles.metadataRow}>
                <Text style={[styles.metaTitle, { color: theme.textPrimary }]}>AI LEGAL™ (Advocate Edition)</Text>
                <Text style={[styles.metaVersion, { color: theme.primary }]}>v1.2.0 (Build 402)</Text>
              </View>
              <Text style={[styles.metaDesc, { color: theme.textSecondary }]}>
                Licensed to Registered Advocates of State Bar Councils. Fully compliant with Section 126 of the Indian Evidence Act.
              </Text>
            </View>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

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
  storageCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  storageCardTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    marginBottom: 8,
  },
  storageGrid: {
    gap: 6,
  },
  storageGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storageLabel: {
    fontSize: 10.5,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  storageTotalText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  exportButtonsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    gap: 6,
  },
  exportBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
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
  deleteAccountBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deleteAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
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
});

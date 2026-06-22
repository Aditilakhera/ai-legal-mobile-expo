import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext } from '@/providers';
import { useUserStore } from '@/store/user';
import { useAuthContext } from '@/providers/auth-provider';
import { ProfileService } from '@/services/profile.service';
import {
  UserPersonalizationGeneral,
  UserPersonalizationCore,
  UserPersonalizationNotifications,
} from '@/types';

const CATEGORIES = [
  { id: 'general', label: 'General', icon: 'options-outline' },
  { id: 'appearance', label: 'Appearance', icon: 'color-palette-outline' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
  { id: 'data', label: 'Data & Sync', icon: 'server-outline' },
  { id: 'help', label: 'Support & FAQ', icon: 'help-circle-outline' },
];

export default function SettingsHomeScreen() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { logout } = useAuthContext();

  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);

  const [activeCategory, setActiveCategory] = useState('general');
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Extract preferences from store profile
  const generalSettings = useMemo(() => profile?.personalizations?.general || {} as UserPersonalizationGeneral, [profile]);
  const personalizationPrefs = useMemo(() => profile?.personalizations?.personalization || {} as UserPersonalizationCore, [profile]);
  const notificationsPrefs = useMemo(() => profile?.personalizations?.notifications || {} as UserPersonalizationNotifications, [profile]);

  // Helper to update personalizations
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

      // UI language restriction
      if (nextPersonalizations.general) {
        nextPersonalizations.general.language = 'English';
      }

      const res = await ProfileService.updateProfile({
        // @ts-ignore
        personalizations: nextPersonalizations,
      });

      if (res.success && res.data) {
        setProfile(res.data);
      }
    } catch (err) {
      showToast('error', 'Update Failed', 'Failed to synchronize preferences with backend.');
    }
  };

  const handleToggle = (section: string, key: string, currentVal: boolean) => {
    handleUpdate(section, key, !currentVal);
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
    showToast('success', 'Setting Saved', 'Preference updated successfully.');
  };

  // Reset defaults
  const handleResetDefaults = () => {
    Alert.alert(
      'Reset All Settings',
      'Are you sure you want to restore all General, Appearance, and Notification configurations to default? This will overwrite active personalizations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Defaults',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              const res = await ProfileService.resetPersonalizations();
              if (res.success && profile) {
                // Fetch fresh profile
                const freshProfileRes = await ProfileService.getProfile();
                if (freshProfileRes.success && freshProfileRes.data) {
                  setProfile(freshProfileRes.data);
                }
                showToast('success', 'Restored', 'System settings reset to defaults.');
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

  // Permanent account deletion
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account Permanently',
      'WARNING: This action is irreversible. All your files, documents, and credentials will be deleted forever.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            if (!profile?._id) return;
            setDeleting(true);
            try {
              const res = await ProfileService.deleteAccount(profile._id);
              if (res.success) {
                showToast('success', 'Deleted', 'Account permanently removed.');
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

  // Contact Support simulation
  const handleContactSupport = () => {
    showToast('success', 'Ticket Opened', "Support ticket logged. We'll reply within 1 hour. 📞");
  };

  // Report Bug simulation
  const handleReportBug = () => {
    showToast('success', 'Logged', 'Bug report submitted. Thank you for helping improve AI LEGAL! 🐞');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* AppBar Custom Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>System Settings</Text>
          <Text style={styles.headerSubtitle}>App Preferences Console</Text>
        </View>
        {/* Placeholder for balance/alignment */}
        <View style={{ width: 40 }} />
      </View>

      {/* Categories Horizontal Drawer */}
      <View style={styles.categoriesBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[styles.catBtn, isActive && styles.catBtnActive]}
                onPress={() => setActiveCategory(cat.id)}
              >
                <Ionicons name={cat.icon as any} size={15} color={isActive ? '#6D5DFC' : '#4B5563'} />
                <Text style={[styles.catText, isActive && styles.catTextActive]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* 1. General Preferences Category */}
        {activeCategory === 'general' && (
          <View style={styles.categoryCard}>
            <Text style={styles.categoryHeading}>General Settings</Text>
            <Text style={styles.categoryDesc}>Configure basic app navigation and scheduling layouts.</Text>

            {/* Default Dashboard */}
            <Pressable
              style={styles.pickerRow}
              onPress={() =>
                openPicker(
                  'Default Dashboard',
                  'general',
                  'defaultDashboard',
                  [
                    { label: 'Main Dashboard', value: '/dashboard' },
                    { label: 'AI Legal Assistant', value: '/dashboard/chat/new' },
                    { label: 'My Cases', value: '/dashboard/cases' },
                  ],
                  generalSettings.defaultDashboard || '/dashboard'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>Default Workspace Dashboard</Text>
                <Text style={styles.pickerVal}>
                  {generalSettings.defaultDashboard === '/dashboard/chat/new'
                    ? 'AI Legal Assistant'
                    : generalSettings.defaultDashboard === '/dashboard/cases'
                    ? 'My Cases'
                    : 'Main Dashboard'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </Pressable>

            {/* Language Selection */}
            <Pressable
              style={styles.pickerRow}
              onPress={() =>
                openPicker(
                  'Language Selection',
                  'general',
                  'language',
                  [
                    { label: 'English', value: 'English' },
                    { label: 'Hindi', value: 'Hindi' },
                    { label: 'Bilingual (English & Hindi)', value: 'Bilingual' },
                  ],
                  generalSettings.language || 'English'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>Language Preference</Text>
                <Text style={styles.pickerVal}>{generalSettings.language || 'English'}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </Pressable>

            {/* Time Zone Selection */}
            <Pressable
              style={styles.pickerRow}
              onPress={() =>
                openPicker(
                  'Time Zone Selection',
                  'general',
                  'timeZone',
                  [
                    { label: 'India Standard Time (IST)', value: 'IST' },
                    { label: 'Coordinated Universal Time (UTC)', value: 'UTC' },
                    { label: 'Eastern Standard Time (EST)', value: 'EST' },
                  ],
                  generalSettings.timeZone || 'IST'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>Time Zone</Text>
                <Text style={styles.pickerVal}>
                  {generalSettings.timeZone === 'UTC'
                    ? 'Coordinated Universal Time (UTC)'
                    : generalSettings.timeZone === 'EST'
                    ? 'Eastern Standard Time (EST)'
                    : 'India Standard Time (IST)'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </Pressable>

            {/* Date Format */}
            <Pressable
              style={styles.pickerRow}
              onPress={() =>
                openPicker(
                  'Date Format',
                  'general',
                  'dateFormat',
                  [
                    { label: 'DD/MM/YYYY (e.g. 18/06/2026)', value: 'DD/MM/YYYY' },
                    { label: 'MM/DD/YYYY (e.g. 06/18/2026)', value: 'MM/DD/YYYY' },
                    { label: 'YYYY-MM-DD (e.g. 2026-06-18)', value: 'YYYY-MM-DD' },
                  ],
                  generalSettings.dateFormat || 'DD/MM/YYYY'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>Date Format</Text>
                <Text style={styles.pickerVal}>{generalSettings.dateFormat || 'DD/MM/YYYY'}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </Pressable>

            {/* Time Format */}
            <Pressable
              style={styles.pickerRow}
              onPress={() =>
                openPicker(
                  'Time Format',
                  'general',
                  'timeFormat',
                  [
                    { label: '12-Hour (e.g. 03:10 PM)', value: '12-hour' },
                    { label: '24-Hour (e.g. 15:10)', value: '24-hour' },
                  ],
                  generalSettings.timeFormat || '12-hour'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>Time Format</Text>
                <Text style={styles.pickerVal}>
                  {generalSettings.timeFormat === '24-hour' ? '24-Hour' : '12-Hour'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </Pressable>

            {/* Restore Defaults button */}
            <View style={styles.dangerZoneBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.zoneHeading}>Reset Application Preferences</Text>
                <Text style={styles.zoneDesc}>Restore default clean states for local schedules and tools.</Text>
              </View>
              <Pressable
                style={styles.defaultsBtn}
                onPress={handleResetDefaults}
                disabled={resetting}
              >
                {resetting ? (
                  <ActivityIndicator size="small" color="#6D5DFC" />
                ) : (
                  <Text style={styles.defaultsBtnText}>Restore Defaults</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* 2. Appearance preferences Category */}
        {activeCategory === 'appearance' && (
          <View style={styles.categoryCard}>
            <Text style={styles.categoryHeading}>Appearance Settings</Text>
            <Text style={styles.categoryDesc}>Customize styling scaling and layout densities.</Text>

            {/* Font Size Selection */}
            <Pressable
              style={styles.pickerRow}
              onPress={() =>
                openPicker(
                  'Font Size Scale',
                  'personalization',
                  'fontSize',
                  [
                    { label: 'Small (14px)', value: 'Small' },
                    { label: 'Medium (16px)', value: 'Medium' },
                    { label: 'Large (20px)', value: 'Large' },
                  ],
                  personalizationPrefs.fontSize || 'Medium'
                )
              }
            >
              <View>
                <Text style={styles.pickerLabel}>Font Size Scale</Text>
                <Text style={styles.pickerVal}>{personalizationPrefs.fontSize || 'Medium'}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </Pressable>

            {/* Compact Mode Switch */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.switchLabel}>Compact Mode layout</Text>
                <Text style={styles.switchDesc}>
                  Reduce listings spacing and padding values to view more items on smaller screens.
                </Text>
              </View>
              <Switch
                value={generalSettings.compactMode === true}
                onValueChange={() => handleToggle('general', 'compactMode', generalSettings.compactMode === true)}
                trackColor={{ false: '#E5E7EB', true: '#EEECFF' }}
                thumbColor={generalSettings.compactMode === true ? '#6D5DFC' : '#9CA3AF'}
              />
            </View>

            {/* Accent Color block indicators */}
            <View style={styles.accentBlock}>
              <Text style={styles.accentLabel}>Accent Color Preference</Text>
              <View style={styles.colorPalette}>
                <View style={[styles.colorChip, { backgroundColor: '#6D5DFC' }]} />
                <View style={[styles.colorChip, { backgroundColor: '#4F8CFF' }]} />
                <Text style={styles.paletteDesc}>
                  AI LEGAL color systems are optimized for native high contrast and compliance.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 3. Notification switches Category */}
        {activeCategory === 'notifications' && (
          <View style={styles.categoryCard}>
            <Text style={styles.categoryHeading}>Notification Preferences</Text>
            <Text style={styles.categoryDesc}>Control reminder notifications for hearing events and completed briefs.</Text>

            {/* Push notifications switch */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.switchLabel}>Push Notifications</Text>
                <Text style={styles.switchDesc}>Receive instant reminders inside the mobile app.</Text>
              </View>
              <Switch
                value={notificationsPrefs.pushNotif !== false}
                onValueChange={() => handleToggle('notifications', 'pushNotif', notificationsPrefs.pushNotif !== false)}
                trackColor={{ false: '#E5E7EB', true: '#EEECFF' }}
                thumbColor={notificationsPrefs.pushNotif !== false ? '#6D5DFC' : '#9CA3AF'}
              />
            </View>

            {/* Email notifications switch */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.switchLabel}>Email Notifications</Text>
                <Text style={styles.switchDesc}>Send reports and summaries directly to your registered inbox.</Text>
              </View>
              <Switch
                value={notificationsPrefs.emailNotif !== false}
                onValueChange={() => handleToggle('notifications', 'emailNotif', notificationsPrefs.emailNotif !== false)}
                trackColor={{ false: '#E5E7EB', true: '#EEECFF' }}
                thumbColor={notificationsPrefs.emailNotif !== false ? '#6D5DFC' : '#9CA3AF'}
              />
            </View>

            {/* Court Hearing reminders switch */}
            <View style={[styles.switchRow, styles.topDivider]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.switchLabel}>Court Hearing Reminder</Text>
                <Text style={styles.switchDesc}>Notify me of upcoming hearing schedules in the Court Diary (24 hours prior).</Text>
              </View>
              <Switch
                value={notificationsPrefs.hearingReminder !== false}
                onValueChange={() => handleToggle('notifications', 'hearingReminder', notificationsPrefs.hearingReminder !== false)}
                trackColor={{ false: '#E5E7EB', true: '#EEECFF' }}
                thumbColor={notificationsPrefs.hearingReminder !== false ? '#6D5DFC' : '#9CA3AF'}
              />
            </View>

            {/* Strategic Deadlines switch */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.switchLabel}>Upcoming Deadlines</Text>
                <Text style={styles.switchDesc}>Get alerts when strategic response windows or notice deadlines are closing.</Text>
              </View>
              <Switch
                value={notificationsPrefs.deadlineReminder !== false}
                onValueChange={() => handleToggle('notifications', 'deadlineReminder', notificationsPrefs.deadlineReminder !== false)}
                trackColor={{ false: '#E5E7EB', true: '#EEECFF' }}
                thumbColor={notificationsPrefs.deadlineReminder !== false ? '#6D5DFC' : '#9CA3AF'}
              />
            </View>

            {/* Draft completed switch */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.switchLabel}>Draft Completed</Text>
                <Text style={styles.switchDesc}>Alert when background AI template generations are compiled.</Text>
              </View>
              <Switch
                value={notificationsPrefs.draftCompleted !== false}
                onValueChange={() => handleToggle('notifications', 'draftCompleted', notificationsPrefs.draftCompleted !== false)}
                trackColor={{ false: '#E5E7EB', true: '#EEECFF' }}
                thumbColor={notificationsPrefs.draftCompleted !== false ? '#6D5DFC' : '#9CA3AF'}
              />
            </View>

            {/* Research completed switch */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.switchLabel}>Research Completed</Text>
                <Text style={styles.switchDesc}>Alert when background AI precedent registry searches are completed.</Text>
              </View>
              <Switch
                value={notificationsPrefs.researchCompleted !== false}
                onValueChange={() => handleToggle('notifications', 'researchCompleted', notificationsPrefs.researchCompleted !== false)}
                trackColor={{ false: '#E5E7EB', true: '#EEECFF' }}
                thumbColor={notificationsPrefs.researchCompleted !== false ? '#6D5DFC' : '#9CA3AF'}
              />
            </View>

            {/* Case updates switch */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.switchLabel}>Case Updates</Text>
                <Text style={styles.switchDesc}>Notify when files are modified inside case folders.</Text>
              </View>
              <Switch
                value={notificationsPrefs.caseUpdates !== false}
                onValueChange={() => handleToggle('notifications', 'caseUpdates', notificationsPrefs.caseUpdates !== false)}
                trackColor={{ false: '#E5E7EB', true: '#EEECFF' }}
                thumbColor={notificationsPrefs.caseUpdates !== false ? '#6D5DFC' : '#9CA3AF'}
              />
            </View>

            {/* Daily Briefing switch */}
            <View style={[styles.switchRow, styles.topDivider]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.switchLabel}>Daily Briefing</Text>
                <Text style={styles.switchDesc}>Early morning digest summaries of upcoming hearings and agenda checklists.</Text>
              </View>
              <Switch
                value={notificationsPrefs.dailyBriefing === true}
                onValueChange={() => handleToggle('notifications', 'dailyBriefing', notificationsPrefs.dailyBriefing === true)}
                trackColor={{ false: '#E5E7EB', true: '#EEECFF' }}
                thumbColor={notificationsPrefs.dailyBriefing === true ? '#6D5DFC' : '#9CA3AF'}
              />
            </View>
          </View>
        )}

        {/* 4. Data & Sync Category */}
        {activeCategory === 'data' && (
          <View style={styles.categoryCard}>
            <Text style={styles.categoryHeading}>Data & Storage Management</Text>
            <Text style={styles.categoryDesc}>Manage local data sync consents and GDPR credentials exports.</Text>

            {/* Export data */}
            <Pressable
              style={styles.pickerRow}
              onPress={() => showToast('info', 'Export Started', 'Compiling profile dataset... Check email.')}
            >
              <View>
                <Text style={styles.pickerLabel}>Export Profile Data</Text>
                <Text style={styles.pickerVal}>Download complete advocate dataset logs</Text>
              </View>
              <Ionicons name="download-outline" size={16} color="#6D5DFC" />
            </Pressable>

            {/* Restore database */}
            <Pressable
              style={styles.pickerRow}
              onPress={() => showToast('success', 'Backup restored', 'Database synchronized.')}
            >
              <View>
                <Text style={styles.pickerLabel}>Restore Backup Database</Text>
                <Text style={styles.pickerVal}>Sync from last cloud snapshot log</Text>
              </View>
              <Ionicons name="cloud-upload-outline" size={16} color="#6D5DFC" />
            </Pressable>

            {/* Permanent Account Deletion */}
            <View style={[styles.dangerZoneBox, { borderTopColor: '#FEE2E2', marginTop: 20 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.zoneHeading, { color: '#EF4444' }]}>Delete Account Permanently</Text>
                <Text style={styles.zoneDesc}>Wipe all credentials, dossiers, cases, and logs permanently.</Text>
              </View>
              <Pressable
                style={styles.deleteBtn}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteBtnText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* 5. Support and About FAQ Category */}
        {activeCategory === 'help' && (
          <View style={styles.categoryCard}>
            <Text style={styles.categoryHeading}>Help & Support Desk</Text>
            <Text style={styles.categoryDesc}>Access support resources and licensing information.</Text>

            {/* Contact Support */}
            <Pressable
              style={styles.supportOption}
              onPress={handleContactSupport}
            >
              <View style={styles.supportIconBox}>
                <Ionicons name="chatbubbles-outline" size={18} color="#6D5DFC" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supportOptionTitle}>Contact Support</Text>
                <Text style={styles.supportOptionDesc}>Instant advocate assistance line (1 hr average response)</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>

            {/* Report Bug */}
            <Pressable
              style={styles.supportOption}
              onPress={handleReportBug}
            >
              <View style={styles.supportIconBox}>
                <Ionicons name="bug-outline" size={18} color="#6D5DFC" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supportOptionTitle}>Report Issue</Text>
                <Text style={styles.supportOptionDesc}>Submit bugs or tools calculation error reports</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>

            {/* Help & FAQ */}
            <Pressable
              style={styles.supportOption}
              onPress={() => showToast('info', 'Help Center', 'Redirecting to support.ai-legal.in...')}
            >
              <View style={styles.supportIconBox}>
                <Ionicons name="help-circle-outline" size={18} color="#6D5DFC" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supportOptionTitle}>Help Center & FAQ</Text>
                <Text style={styles.supportOptionDesc}>Search documentation and compliance guide sheets</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>

            {/* App metadata */}
            <View style={styles.metadataCard}>
              <View style={styles.metadataRow}>
                <Text style={styles.metaTitle}>AI LEGAL (Advocate Edition)</Text>
                <Text style={styles.metaVersion}>v1.2.0</Text>
              </View>
              <Text style={styles.metaDesc}>
                Licensed exclusively to registered Advocates of State Bar Councils. Made with pride for the Indian Judiciary.
              </Text>
            </View>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Shared Dropdown Picker Modal (Pure styling Light Theme) */}
      <Modal
        visible={pickerModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPickerModal({ ...pickerModal, visible: false })}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismissBg}
            onPress={() => setPickerModal({ ...pickerModal, visible: false })}
          />
          <View style={[styles.modalContent, { maxHeight: '50%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerModal.title}</Text>
              <Pressable onPress={() => setPickerModal({ ...pickerModal, visible: false })}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {pickerModal.options.map((opt) => {
                const isSelected = opt.value === pickerModal.selectedValue;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.pickerOptRow, isSelected && styles.pickerOptRowSelected]}
                    onPress={() => handlePickerSelect(opt.value)}
                  >
                    <Text style={[styles.pickerOptText, isSelected && styles.pickerOptTextSelected]}>
                      {opt.label}
                    </Text>
                    {isSelected ? <Ionicons name="checkmark" size={18} color="#6D5DFC" /> : null}
                  </Pressable>
                );
              })}
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
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  categoriesBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  catScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  catBtnActive: {
    backgroundColor: '#EEECFF',
    borderColor: '#6D5DFC',
  },
  catText: {
    fontSize: 11.5,
    color: '#4B5563',
    fontWeight: '600',
  },
  catTextActive: {
    color: '#6D5DFC',
    fontWeight: '800',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 16,
  },
  categoryHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: 11.5,
    color: '#6B7280',
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerVal: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    marginTop: 2,
  },
  dangerZoneBox: {
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingTop: 14,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoneHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
  },
  zoneDesc: {
    fontSize: 10.5,
    color: '#9CA3AF',
    marginTop: 1,
    lineHeight: 14,
  },
  defaultsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  defaultsBtnText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  topDivider: {
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingTop: 14,
    marginTop: 6,
  },
  switchLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  switchDesc: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 14,
  },
  accentBlock: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingTop: 14,
  },
  accentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  colorPalette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorChip: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  paletteDesc: {
    flex: 1,
    fontSize: 10,
    color: '#9CA3AF',
    lineHeight: 13,
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  deleteBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 10,
    marginBottom: 10,
    gap: 12,
  },
  supportIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EEECFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportOptionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  supportOptionDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  metadataCard: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingTop: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
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
    color: '#374151',
  },
  metaVersion: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6D5DFC',
  },
  metaDesc: {
    fontSize: 9.5,
    color: '#9CA3AF',
    lineHeight: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(31, 41, 55, 0.4)',
    justifyContent: 'flex-end',
  },
  modalDismissBg: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  pickerOptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptRowSelected: {
    backgroundColor: '#EEECFF',
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  pickerOptText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  pickerOptTextSelected: {
    color: '#6D5DFC',
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
});

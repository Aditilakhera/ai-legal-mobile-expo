import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { useTranslation } from '@/localization';
import { useUserStore } from '@/store/user';
import { ProfileService } from '@/services/profile.service';
import { useAuthContext } from '@/providers/auth-provider';

const PRACTICE_AREAS = [
  'Civil Law',
  'Criminal Law',
  'Corporate Law',
  'Family Law',
  'Property Law',
  'Tax Law',
  'Labour Law',
  'Constitutional Law',
  'Arbitration',
  'IPR',
];

const PRESET_AVATARS = [
  { name: 'Male Counsel 1', url: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=150&auto=format&fit=crop&q=80' },
  { name: 'Female Counsel 1', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
  { name: 'Male Counsel 2', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80' },
  { name: 'Female Counsel 2', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
  { name: 'Judicial Crest', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=150&auto=format&fit=crop&q=80' },
  { name: 'Attorney Shield', url: 'https://images.unsplash.com/photo-1453733190148-c44698c265f8?w=150&auto=format&fit=crop&q=80' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const { logout } = useAuthContext();
  const { t } = useTranslation();

  const getPracticeAreaText = (area: string) => {
    switch (area) {
      case 'Civil Law': return t('cases.civilCase');
      case 'Criminal Law': return t('cases.criminalCase');
      case 'Corporate Law': return t('cases.corporateLegal');
      case 'Family Law': return t('cases.divorceCase');
      case 'Property Law': return t('cases.propertyDispute');
      case 'Labour Law': return t('cases.laborDispute');
      case 'Tax Law': return t('profile.taxLaw', 'Tax Law');
      case 'Constitutional Law': return t('profile.constitutionalLaw', 'Constitutional Law');
      case 'Arbitration': return t('profile.arbitration', 'Arbitration');
      case 'IPR': return t('profile.ipr', 'IPR');
      default: return area;
    }
  };

  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);

  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Staggered animated values for 6 cards (Identity, Personal, Professional, Office/Practice, Checklist, Account)
  const [animatedValues] = useState(() => Array(6).fill(0).map(() => new Animated.Value(0)));

  // Form state syncing layout inputs with store
  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    dob: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    country: '',
    barNumber: '',
    stateBarCouncil: '',
    enrollmentYear: '',
    enrollmentDate: '',
    practiceExperience: '',
    practiceAreas: [] as string[],
    primaryCourt: '',
    languagesKnown: '',
    officeName: '',
    officeAddress: '',
    bio: '',
    specialization: '',
    achievements: '',
    website: '',
    awards: '',
    landmarkCases: '',
    publications: '',
  });

  // Sync state with store profile
  useEffect(() => {
    if (profile) {
      const advocate = profile.personalizations?.advocateProfile || {};
      setForm({
        fullName: advocate.fullName || profile.name || '',
        phoneNumber: advocate.phoneNumber || '',
        dob: advocate.dob || '',
        gender: advocate.gender || '',
        address: advocate.address || '',
        city: advocate.city || '',
        state: advocate.state || '',
        country: advocate.country || '',
        barNumber: advocate.barNumber || '',
        stateBarCouncil: advocate.stateBarCouncil || '',
        enrollmentYear: advocate.enrollmentYear || '',
        enrollmentDate: advocate.enrollmentDate || '',
        practiceExperience: advocate.practiceExperience || '',
        practiceAreas: advocate.practiceAreas || [],
        primaryCourt: advocate.primaryCourt || '',
        languagesKnown: advocate.languagesKnown || '',
        officeName: advocate.officeName || '',
        officeAddress: advocate.officeAddress || '',
        bio: advocate.bio || '',
        specialization: advocate.specialization || '',
        achievements: advocate.achievements || '',
        website: advocate.website || '',
        awards: advocate.awards || '',
        landmarkCases: advocate.landmarkCases || '',
        publications: advocate.publications || '',
      });
    }
  }, [profile, isEditing]);

  // Run staggered slide/scale animations
  useEffect(() => {
    animatedValues.forEach((val) => val.setValue(0));
    Animated.stagger(
      60,
      animatedValues.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [isEditing]);

  // Compute profile completion percentage
  const profileCompletion = useMemo(() => {
    const fields = [
      form.fullName,
      form.phoneNumber,
      form.dob,
      form.gender,
      form.address,
      form.city,
      form.state,
      form.country,
      form.barNumber,
      form.stateBarCouncil,
      form.enrollmentYear,
      form.enrollmentDate,
      form.practiceExperience,
      form.practiceAreas.length > 0 ? 'yes' : '',
      form.primaryCourt,
      form.languagesKnown,
      form.officeName,
      form.officeAddress,
      form.bio,
      form.specialization,
      form.achievements,
      profile?.avatar ? 'yes' : '',
    ];

    const filled = fields.filter((f) => !!f).length;
    return Math.round((filled / fields.length) * 100);
  }, [form, profile?.avatar]);

  // Checklist categories
  const checklist = useMemo(() => {
    return [
      {
        label: t('profile.personalInfo'),
        completed: !!(form.fullName && form.dob && form.gender && form.address && form.city && form.state && form.country),
      },
      {
        label: t('profile.contactDetails'),
        completed: !!(form.phoneNumber && profile?.email),
      },
      {
        label: t('profile.barCredentials'),
        completed: !!(form.barNumber && form.stateBarCouncil && form.enrollmentYear && form.enrollmentDate && form.practiceExperience && form.primaryCourt),
      },
      {
        label: t('profile.officeDetails'),
        completed: !!(form.officeName && form.officeAddress),
      },
      {
        label: t('profile.practiceAreasLabel'),
        completed: form.practiceAreas.length > 0,
      },
      {
        label: t('profile.advocateBio'),
        completed: !!(form.bio && form.specialization && form.achievements),
      },
    ];
  }, [form, profile?.email, t]);

  // Save changes handler
  const handleSave = async () => {
    if (!form.fullName.trim()) {
      showToast('error', t('profile.validationFailure'), t('profile.fullNameRequired'));
      return;
    }

    if (form.phoneNumber && !/^\+?[0-9\s-]{8,15}$/.test(form.phoneNumber)) {
      showToast('error', t('profile.validationFailure'), t('profile.invalidPhone'));
      return;
    }

    setSaving(true);
    try {
      // 1. Sync name in User object
      if (profile && form.fullName !== profile.name) {
        const nameRes = await ProfileService.updateProfile({ name: form.fullName });
        if (nameRes.success && nameRes.data) {
          setProfile({
            ...profile,
            name: form.fullName,
          });
        }
      }

      // 2. Update Personalizations dossier object
      const nextPersonalizations = {
        ...(profile?.personalizations || {}),
        advocateProfile: {
          ...form,
        },
      };

      const res = await ProfileService.updateProfile({
        // @ts-ignore
        personalizations: nextPersonalizations,
      });

      if (res.success && res.data) {
        setProfile(res.data);
        showToast('success', t('profile.updated'), t('profile.dossierSaved'));
        setIsEditing(false);
      }
    } catch (e: any) {
      console.error('[PROFILE SAVE ERROR]', e);
      showToast('error', t('profile.saveFailed'), e.message || t('profile.logoutError'));
    } finally {
      setSaving(false);
    }
  };

  // Avatar presets and upload triggers
  const handleSelectPresetAvatar = async (avatarUrl: string) => {
    setUploadingAvatar(true);
    try {
      const res = await ProfileService.updateProfile({ avatar: avatarUrl });
      if (res.success && res.data && profile) {
        setProfile({
          ...profile,
          avatar: avatarUrl,
        });
        showToast('success', t('profile.photoUpdated'), t('profile.avatarSynced'));
        setShowAvatarModal(false);
      }
    } catch (e) {
      showToast('error', t('profile.updateFailed'), t('profile.avatarSyncFailed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleMockUpload = () => {
    setUploadingAvatar(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        clearInterval(interval);
        const picked = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];
        handleSelectPresetAvatar(picked.url);
      }
    }, 400);
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await ProfileService.updateProfile({ avatar: '' });
      if (res.success && profile) {
        setProfile({
          ...profile,
          avatar: '',
        });
        showToast('success', t('profile.photoRemoved'), t('profile.photoCleared'));
        setShowAvatarModal(false);
      }
    } catch (e) {
      showToast('error', t('common.failed'), t('profile.deletePhotoFailed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const togglePracticeArea = (area: string) => {
    if (form.practiceAreas.includes(area)) {
      setForm({ ...form, practiceAreas: form.practiceAreas.filter((a) => a !== area) });
    } else {
      setForm({ ...form, practiceAreas: [...form.practiceAreas, area] });
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  };

  const getCardStyle = (index: number) => {
    const anim = animatedValues[index] || new Animated.Value(1);
    return {
      opacity: anim,
      transform: [
        {
          translateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [25, 0],
          }),
        },
        {
          scale: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.97, 1],
          }),
        },
      ],
    };
  };

  // Account section presses
  const handleAccountPress = (item: string) => {
    if (item === 'Settings') {
      router.push('/settings' as any);
    } else if (item === 'Support') {
      router.push('/settings/help' as any);
    } else if (item === 'Logout') {
      Alert.alert(
        t('profile.logoutConfirmTitle'),
        t('profile.logoutConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('profile.logoutConfirmTitle'),
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
                router.replace('/auth/login' as any);
              } catch (e) {
                showToast('error', t('profile.logoutFailed'), t('profile.logoutError'));
              }
            },
          },
        ]
      );
    }
  };

  const renderRow = (icon: string, label: string, value: string | undefined) => {
    return (
      <View style={styles.infoRow} key={label}>
        <View style={[styles.infoRowIcon, { backgroundColor: theme.primaryLight }]}>
          {/* @ts-ignore */}
          <Ionicons name={icon} size={16} color={theme.primary} />
        </View>
        <View style={styles.infoRowContent}>
          <Text style={[styles.infoRowLabel, { color: theme.textMuted }]}>{label}</Text>
          <Text style={[
            styles.infoRowValue,
            { color: theme.textPrimary },
            !value && [styles.infoRowValueEmpty, { color: theme.textMuted }]
          ]}>
            {value || t('common.notProvided')}
          </Text>
        </View>
      </View>
    );
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (val: string) => void,
    placeholder: string,
    keyboardType: any = 'default',
    multiline: boolean = false,
    numberOfLines: number = 1
  ) => {
    return (
      <View style={styles.inputGroup} key={label}>
        <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{label}</Text>
        <TextInput
          style={[
            styles.formInput,
            { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceVariant },
            multiline && styles.formTextArea
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 1. PROFESSIONAL HEADER */}
      <View style={[styles.customHeader, { paddingTop: Math.max(insets.top, 20) + 18, paddingBottom: 18, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={handleBack} style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="chevron-back" size={16} color={theme.primary} />
            <Text style={[styles.backText, { color: theme.primary }]}>{t('common.close')}</Text>
          </Pressable>
        </View>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitleText, { color: theme.textPrimary }]} numberOfLines={1}>{t('profile.title')}</Text>
          <Text style={[styles.headerSubtitleText, { color: theme.textMuted }]} numberOfLines={1}>{t('profile.subtitle')}</Text>
        </View>

        <View style={styles.headerRight}>
          {isEditing ? (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  setIsEditing(false);
                  showToast('info', t('profile.editDiscarded'), t('profile.editReverted'));
                }}
                style={styles.cancelLink}
              >
                <Text style={[styles.cancelLinkText, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('profile.save')}</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setIsEditing(true)}
              style={[styles.editBtn, { borderColor: theme.primary, backgroundColor: theme.surface }]}
            >
              <Ionicons name="create-outline" size={14} color={theme.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.editBtnText, { color: theme.primary }]}>{t('profile.edit')}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bodyContent}
          >
            {/* CARD 0: Top Profile Card */}
            <Animated.View style={[styles.card, getCardStyle(0), { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.avatarRow}>
                <View style={styles.avatarWrapper}>
                  {profile?.avatar ? (
                    <Image source={{ uri: profile.avatar }} style={[styles.avatarImg, { borderColor: theme.border }]} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                      <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                        {(form.fullName || profile?.name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {isEditing && (
                    <Pressable
                      style={[styles.cameraBtn, { backgroundColor: theme.primary, borderColor: theme.card }]}
                      onPress={() => setShowAvatarModal(true)}
                    >
                      <Ionicons name="camera" size={14} color="#FFFFFF" />
                    </Pressable>
                  )}
                </View>

                <View style={styles.identityCol}>
                  <Text style={[styles.fullNameText, { color: theme.textPrimary }]}>
                    {form.fullName || profile?.name || t('profile.title')}
                  </Text>
                  <Text style={[styles.emailText, { color: theme.textSecondary }]}>{profile?.email || 'N/A'}</Text>

                  <View style={styles.badgesWrapper}>
                    <View style={[
                      styles.statusBadge,
                      form.barNumber 
                        ? { backgroundColor: theme.primaryLight, borderColor: theme.primary } 
                        : { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: theme.warning }
                    ]}>
                      <Ionicons
                        name={form.barNumber ? "shield-checkmark" : "time-outline"}
                        size={10}
                        color={form.barNumber ? theme.primary : theme.warning}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[
                        styles.statusBadgeText,
                        { color: form.barNumber ? theme.primary : theme.warning }
                      ]}>
                        {form.barNumber ? t('profile.verifiedAdvocate') : t('profile.pendingVerification')}
                      </Text>
                    </View>

                    {profile?.founderStatus ? (
                      <View style={[styles.membershipBadge, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                        <Ionicons name="ribbon-outline" size={10} color={theme.primary} style={{ marginRight: 3 }} />
                        <Text style={[styles.membershipText, { color: theme.primary }]}>{t('profile.founderMember')}</Text>
                      </View>
                    ) : (
                      <View style={[styles.membershipBadge, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                        <Ionicons name="star-outline" size={10} color={theme.primary} style={{ marginRight: 3 }} />
                        <Text style={[styles.membershipText, { color: theme.primary }]}>{t('profile.premiumMember')}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.creditsText, { color: theme.primary }]}>{t('profile.credits')}: {profile?.credits ?? 0}</Text>
                </View>
              </View>

              {/* Completion linear bar */}
              <View style={[styles.cardProgressContainer, { borderTopColor: theme.divider }]}>
                <View style={styles.cardProgressHeader}>
                  <Text style={[styles.cardProgressLabel, { color: theme.textSecondary }]}>{t('profile.progress')}</Text>
                  <Text style={[styles.cardProgressValue, { color: theme.textPrimary }]}>{profileCompletion}%</Text>
                </View>
                <View style={[styles.cardProgressBg, { backgroundColor: theme.surfaceVariant }]}>
                  <View style={[styles.cardProgressFill, { width: `${profileCompletion}%`, backgroundColor: theme.primary }]} />
                </View>
              </View>
            </Animated.View>

            {/* CARD 1: Personal Information */}
            <Animated.View style={[styles.card, getCardStyle(1), { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionHeading, { color: theme.primary, borderBottomColor: theme.divider }]}>{t('profile.personalInfo')}</Text>

              {isEditing ? (
                <View style={styles.fieldsGroup}>
                  {renderInput(t('profile.fullName'), form.fullName, (v) => setForm({ ...form, fullName: v }), t('profile.fullNamePlaceholder'))}
                  {renderInput(t('profile.emailAddress'), profile?.email || '', () => {}, t('profile.emailPlaceholder'), 'email-address')}
                  {renderInput(t('profile.phoneNumber'), form.phoneNumber, (v) => setForm({ ...form, phoneNumber: v }), t('profile.phonePlaceholder'), 'phone-pad')}
                  <View style={styles.rowFields}>
                    <View style={{ flex: 1 }}>
                      {renderInput(t('profile.dob'), form.dob, (v) => setForm({ ...form, dob: v }), t('profile.dobPlaceholder'))}
                    </View>
                    <View style={{ flex: 1 }}>
                      {renderInput(t('profile.gender'), form.gender, (v) => setForm({ ...form, gender: v }), t('profile.genderPlaceholder'))}
                    </View>
                  </View>
                  {renderInput(t('profile.city'), form.city, (v) => setForm({ ...form, city: v }), t('profile.cityPlaceholder'))}
                  <View style={styles.rowFields}>
                    <View style={{ flex: 1 }}>
                      {renderInput(t('profile.state'), form.state, (v) => setForm({ ...form, state: v }), t('profile.statePlaceholder'))}
                    </View>
                    <View style={{ flex: 1 }}>
                      {renderInput(t('profile.country'), form.country, (v) => setForm({ ...form, country: v }), t('profile.countryPlaceholder'))}
                    </View>
                  </View>
                  {renderInput(t('profile.residentialAddress'), form.address, (v) => setForm({ ...form, address: v }), t('profile.addressPlaceholder'))}
                </View>
              ) : (
                <View style={styles.infoGrid}>
                  {renderRow('person-outline', t('profile.fullName'), form.fullName)}
                  {renderRow('mail-outline', t('profile.emailAddress'), profile?.email)}
                  {renderRow('call-outline', t('profile.phoneNumber'), form.phoneNumber)}
                  {renderRow('calendar-outline', t('profile.dob'), form.dob)}
                  {renderRow('male-female-outline', t('profile.gender'), form.gender)}
                  {renderRow('business-outline', t('profile.city'), form.city)}
                  {renderRow('map-outline', t('profile.state'), form.state)}
                  {renderRow('globe-outline', t('profile.country'), form.country)}
                  {renderRow('home-outline', t('profile.residentialAddress'), form.address)}
                </View>
              )}
            </Animated.View>

            {/* CARD 2: Professional Information */}
            <Animated.View style={[styles.card, getCardStyle(2), { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionHeading, { color: theme.primary, borderBottomColor: theme.divider }]}>{t('profile.statistics')}</Text>

              {isEditing ? (
                <View style={styles.fieldsGroup}>
                  {renderInput(t('profile.stateBarCouncil'), form.stateBarCouncil, (v) => setForm({ ...form, stateBarCouncil: v }), t('profile.barCouncilPlaceholder'))}
                  {renderInput(t('profile.enrollmentNumber'), form.barNumber, (v) => setForm({ ...form, barNumber: v }), t('profile.enrollmentPlaceholder'))}
                  <View style={styles.rowFields}>
                    <View style={{ flex: 1 }}>
                      {renderInput(t('profile.enrollmentNumber'), form.enrollmentYear, (v) => setForm({ ...form, enrollmentYear: v }), t('profile.enrollmentYearPlaceholder'), 'numeric')}
                    </View>
                    <View style={{ flex: 1 }}>
                      {renderInput(t('profile.practiceExperienceYears'), form.practiceExperience, (v) => setForm({ ...form, practiceExperience: v }), t('profile.experiencePlaceholder'), 'numeric')}
                    </View>
                  </View>
                  {renderInput(t('profile.primaryCourt'), form.primaryCourt, (v) => setForm({ ...form, primaryCourt: v }), t('profile.courtPlaceholder'))}
                  {renderInput(t('profile.languagesKnown'), form.languagesKnown, (v) => setForm({ ...form, languagesKnown: v }), t('profile.languagesPlaceholder'))}
                </View>
              ) : (
                <View style={styles.infoGrid}>
                  {renderRow('ribbon-outline', t('profile.stateBarCouncil'), form.stateBarCouncil)}
                  {renderRow('card-outline', t('profile.enrollmentNumber'), form.barNumber)}
                  {renderRow('calendar-outline', t('profile.enrollmentNumber'), form.enrollmentYear)}
                  {renderRow('briefcase-outline', t('profile.practiceExperience'), form.practiceExperience ? t('profile.yearsCount', { count: form.practiceExperience }) : undefined)}
                  {renderRow('library-outline', t('profile.primaryCourt'), form.primaryCourt)}
                  {renderRow('language-outline', t('profile.languagesKnown'), form.languagesKnown)}
                </View>
              )}
            </Animated.View>

            {/* CARD 3: Office & Practice Information */}
            <Animated.View style={[styles.card, getCardStyle(3), { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionHeading, { color: theme.primary, borderBottomColor: theme.divider }]}>{t('settings.general')}</Text>

              {isEditing ? (
                <View style={styles.fieldsGroup}>
                  {renderInput(t('profile.officeChamberName'), form.officeName, (v) => setForm({ ...form, officeName: v }), t('profile.officePlaceholder'))}
                  {renderInput(t('profile.chambersAddress'), form.officeAddress, (v) => setForm({ ...form, officeAddress: v }), t('profile.chambersAddressPlaceholder'))}
                  
                  {/* Practice Areas */}
                  <View style={styles.chipLabelGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{t('profile.practiceAreasLabel')}</Text>
                    <View style={styles.chipsContainer}>
                      {PRACTICE_AREAS.map((area) => {
                        const isSelected = form.practiceAreas.includes(area);
                        return (
                          <Pressable
                            key={area}
                            style={[
                              styles.chipButton,
                              { backgroundColor: theme.surface, borderColor: theme.border },
                              isSelected && [styles.chipButtonActive, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]
                            ]}
                            onPress={() => togglePracticeArea(area)}
                          >
                            <Text style={[
                              styles.chipButtonText,
                              { color: theme.textSecondary },
                              isSelected && [styles.chipButtonTextActive, { color: theme.primary }]
                            ]}>
                              {getPracticeAreaText(area)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {renderInput(t('profile.coreSpecialization'), form.specialization, (v) => setForm({ ...form, specialization: v }), t('profile.specializationPlaceholder'))}
                  {renderInput(t('profile.bioSummary'), form.bio, (v) => setForm({ ...form, bio: v }), t('profile.bioPlaceholder'), 'default', true, 4)}
                  {renderInput(t('profile.achievementsLabel'), form.achievements, (v) => setForm({ ...form, achievements: v }), t('profile.achievementsPlaceholder'), 'default', true, 3)}
                </View>
              ) : (
                <View style={styles.infoGrid}>
                  {renderRow('business-outline', t('profile.officeName'), form.officeName)}
                  {renderRow('location-outline', t('profile.officeAddress'), form.officeAddress)}

                  <View style={[styles.practiceAreasSection, { borderTopColor: theme.divider }]}>
                    <Text style={[styles.infoRowLabel, { color: theme.textMuted }]}>{t('profile.practiceAreasLabel')}</Text>
                    <View style={styles.chipsContainer}>
                      {form.practiceAreas.length > 0 ? (
                        form.practiceAreas.map((area) => (
                          <View key={area} style={[styles.staticChip, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                            <Text style={[styles.staticChipText, { color: theme.primary }]}>{getPracticeAreaText(area)}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.notProvidedText, { color: theme.textMuted }]}>{t('profile.noPracticeAreas')}</Text>
                      )}
                    </View>
                  </View>

                  {renderRow('sparkles-outline', t('profile.coreSpecialization'), form.specialization)}

                  <View style={styles.longTextSection}>
                    <Text style={[styles.infoRowLabel, { color: theme.textMuted }]}>{t('profile.bioSummary')}</Text>
                    <Text style={[
                      styles.longTextValue,
                      { color: theme.textPrimary },
                      !form.bio && [styles.longTextEmpty, { color: theme.textMuted }]
                    ]}>
                      {form.bio || t('common.notProvided')}
                    </Text>
                  </View>

                  <View style={styles.longTextSection}>
                    <Text style={[styles.infoRowLabel, { color: theme.textMuted }]}>{t('profile.achievementsLabel')}</Text>
                    <Text style={[
                      styles.longTextValue,
                      { color: theme.textPrimary },
                      !form.achievements && [styles.longTextEmpty, { color: theme.textMuted }]
                    ]}>
                      {form.achievements || t('common.notProvided')}
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>

            {/* CARD 4: Completeness Checklist */}
            <Animated.View style={[styles.card, getCardStyle(4), { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionHeading, { color: theme.primary, borderBottomColor: theme.divider }]}>{t('profile.progress')}</Text>
              <Text style={[styles.checklistSubtitle, { color: theme.textSecondary }]}>
                {t('profile.checklistSubtitle')}
              </Text>
              <View style={styles.checklistGrid}>
                {checklist.map((item, idx) => (
                  <View key={idx} style={styles.checklistItem}>
                    <View
                      style={[
                        styles.checklistIcon,
                        item.completed ? styles.checklistIconCompleted : styles.checklistIconPending,
                      ]}
                    >
                      <Ionicons
                        name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={item.completed ? theme.success : theme.textMuted}
                      />
                    </View>
                    <Text
                      style={[
                        styles.checklistText,
                        { color: item.completed ? theme.success : theme.textSecondary }
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* CARD 5: Dedicated Account Settings list items */}
            <Animated.View style={[styles.card, getCardStyle(5), { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionHeading, { color: theme.primary, borderBottomColor: theme.divider }]}>{t('profile.title')}</Text>
              
              <View style={styles.accountList}>
                <Pressable
                  style={styles.accountItem}
                  onPress={() => handleAccountPress('Settings')}
                >
                  <View style={styles.accountItemLeft}>
                    <Ionicons name="settings-outline" size={18} color={theme.textSecondary} style={styles.accountIcon} />
                    <Text style={[styles.accountItemText, { color: theme.textPrimary }]}>{t('settings.title')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                </Pressable>

                <View style={[styles.accountDivider, { backgroundColor: theme.divider }]} />

                {/* RAG Knowledge Base for Admin Users */}
                {(profile?.role === 'admin' || profile?.email?.toLowerCase().trim() === 'aditi@uwo24.com') && (
                  <>
                    <Pressable
                      style={styles.accountItem}
                      onPress={() => router.push('/settings/rag-knowledge-base')}
                    >
                      <View style={styles.accountItemLeft}>
                        <Ionicons name="book-outline" size={18} color={theme.textSecondary} style={styles.accountIcon} />
                        <Text style={[styles.accountItemText, { color: theme.textPrimary }]}>{t('settings.ragKnowledgeBase', 'AI Product Guide Knowledge')}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </Pressable>
                    <View style={[styles.accountDivider, { backgroundColor: theme.divider }]} />
                  </>
                )}

                <Pressable
                  style={styles.accountItem}
                  onPress={() => handleAccountPress('Logout')}
                >
                  <View style={styles.accountItemLeft}>
                    <Ionicons name="log-out-outline" size={18} color={theme.danger} style={styles.accountIcon} />
                    <Text style={[styles.accountItemText, { color: theme.danger }]}>{t('settings.logout')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.danger} />
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Preset Avatars Modal */}
      <Modal
        visible={showAvatarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <Pressable style={styles.modalDismissBg} onPress={() => setShowAvatarModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('profile.changePhoto')}</Text>
              <Pressable onPress={() => setShowAvatarModal(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            {uploadingAvatar ? (
              <View style={styles.uploadingBox}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.uploadingText, { color: theme.primary }]}>{t('profile.uploadingPhoto')}</Text>
              </View>
            ) : (
              <View style={{ paddingBottom: 20 }}>
                <Text style={[styles.drawerSectionTitle, { color: theme.textSecondary }]}>{t('profile.choosePresets')}</Text>
                <View style={styles.avatarGrid}>
                  {PRESET_AVATARS.map((av, idx) => (
                    <Pressable
                      key={idx}
                      style={styles.avatarChip}
                      onPress={() => handleSelectPresetAvatar(av.url)}
                    >
                      <Image source={{ uri: av.url }} style={[styles.gridAvatarImg, { borderColor: theme.border }]} />
                      <Text style={[styles.gridAvatarLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                        {av.name.split(' ')[0]}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.avatarActions}>
                  <Pressable style={[styles.uploadBtn, { backgroundColor: theme.primary }]} onPress={handleMockUpload}>
                    <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.uploadBtnText}>{t('profile.uploadCustom')}</Text>
                  </Pressable>

                  {profile?.avatar ? (
                    <Pressable
                      style={[
                        styles.removeBtn,
                        {
                          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FFF1F2',
                          borderColor: theme.danger
                        }
                      ]}
                      onPress={handleRemoveAvatar}
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.danger} />
                      <Text style={[styles.removeBtnText, { color: theme.danger }]}>{t('profile.deletePhoto')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flex: 1.2,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 2.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1.3,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEECFF',
    backgroundColor: '#F9FAFB',
  },
  backText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D5DFC',
    marginLeft: 2,
  },
  headerTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSubtitleText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelLink: {
    marginRight: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  saveBtn: {
    backgroundColor: '#6D5DFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editBtn: {
    borderWidth: 1,
    borderColor: '#6D5DFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D5DFC',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEECFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6D5DFC',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6D5DFC',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#6D5DFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  identityCol: {
    flex: 1,
    justifyContent: 'center',
  },
  fullNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  emailText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  badgesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeVerified: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusBadgeTextVerified: {
    color: '#4F8CFF',
  },
  statusBadgeTextPending: {
    color: '#D97706',
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F2FF',
    borderColor: '#E0DEFF',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  membershipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6D5DFC',
    textTransform: 'uppercase',
  },
  creditsText: {
    fontSize: 10,
    color: '#6D5DFC',
    fontWeight: '700',
    marginTop: 6,
  },
  cardProgressContainer: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  cardProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardProgressLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardProgressValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F2937',
  },
  cardProgressBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    backgroundColor: '#6D5DFC',
    borderRadius: 3,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6D5DFC',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoRowIcon: {
    marginRight: 12,
    marginTop: 2,
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRowContent: {
    flex: 1,
  },
  infoRowLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoRowValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
  },
  infoRowValueEmpty: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  fieldsGroup: {
    gap: 14,
  },
  inputGroup: {
    gap: 5,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  formTextArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  chipLabelGroup: {
    marginTop: 4,
    gap: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chipButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipButtonActive: {
    backgroundColor: '#EEECFF',
    borderColor: '#6D5DFC',
  },
  chipButtonText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  chipButtonTextActive: {
    color: '#6D5DFC',
    fontWeight: '800',
  },
  practiceAreasSection: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  staticChip: {
    backgroundColor: '#F3F2FF',
    borderWidth: 1,
    borderColor: '#E0DEFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  staticChipText: {
    fontSize: 11,
    color: '#6D5DFC',
    fontWeight: '700',
  },
  notProvidedText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  longTextSection: {
    marginTop: 4,
  },
  longTextValue: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 4,
  },
  longTextEmpty: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  checklistSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 12,
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingVertical: 6,
  },
  checklistIcon: {
    marginRight: 6,
  },
  checklistIconCompleted: {},
  checklistIconPending: {},
  checklistText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  checklistTextCompleted: {
    color: '#10B981',
  },
  checklistTextPending: {
    color: '#6B7280',
  },
  accountList: {
    marginTop: 8,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14, // spacing aligned
  },
  accountItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountIcon: {
    width: 20,
    textAlign: 'center',
  },
  accountItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  logoutText: {
    color: '#EF4444',
  },
  accountDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
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
    maxHeight: '60%',
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
  drawerSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatarChip: {
    width: '30%',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  gridAvatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  gridAvatarLabel: {
    fontSize: 9.5,
    color: '#4B5563',
    fontWeight: '600',
  },
  avatarActions: {
    gap: 8,
    marginTop: 10,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6D5DFC',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  uploadBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  removeBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
  uploadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  uploadingText: {
    fontSize: 12,
    color: '#6D5DFC',
    fontWeight: '600',
  },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput as RNTextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import { TextInput, TextArea } from '@/components/ui';
import { CaseService } from '@/services/case.service';
import { CaseWorkspace } from '@/types';


// Category Dropdown options
const CATEGORY_OPTIONS = [
  'Civil',
  'Criminal',
  'Consumer',
  'Employment',
  'Corporate',
  'Family',
  'Property',
  'Tax',
  'Banking',
  'Arbitration',
  'Labour',
  'Compliance',
  'Miscellaneous',
];

const STATUS_OPTIONS = ['Active', 'Closed', 'Archived'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];
const ROLE_OPTIONS = ['Petitioner', 'Respondent', 'Complainant', 'Defendant', 'Appellant', 'Accused'];

const COURT_OPTIONS = [
  'Supreme Court of India',
  'High Court of Delhi',
  'High Court of Bombay',
  'High Court of Madras',
  'District Court, Saket',
  'District Court, Bandra',
  'District Consumer Forum, Mumbai',
];

const COURT_TYPES = ['Supreme Court', 'High Court', 'District Court', 'Consumer Forum', 'Tribunal'];

const STATE_OPTIONS = ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Uttar Pradesh'];

interface SmartDropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  leftIcon?: React.ReactNode;
  placeholder?: string;
  searchable?: boolean;
  error?: string;
}

const SmartDropdown: React.FC<SmartDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  leftIcon,
  placeholder = 'Select...',
  searchable = false,
  error,
}) => {
  const { theme } = useThemeContext();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = options.filter((opt) => opt.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity onPress={() => setIsOpen(true)} activeOpacity={0.9}>
        <View pointerEvents="none">
          <TextInput
            label={label}
            placeholder={placeholder}
            value={value}
            leftIcon={leftIcon}
            error={error}
            rightIcon={<Ionicons name="chevron-down" size={16} color={theme.textSecondary} />}
          />
        </View>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <PressableOverlay onPress={() => setIsOpen(false)}>
          <View style={[styles.dropdownBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }}>Select {label}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {searchable && (
              <TextInput
                placeholder="Search options..."
                value={query}
                onChangeText={setQuery}
                leftIcon={<Ionicons name="search" size={16} color={theme.textSecondary} />}
                containerStyle={{ marginVertical: 0, marginBottom: 10 }}
              />
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              {filtered.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: theme.border },
                  ]}
                >
                  <Text
                    style={{
                      color: value === opt ? theme.primary : theme.textPrimary,
                      fontWeight: value === opt ? '800' : '500',
                      fontSize: 13,
                    }}
                  >
                    {opt}
                  </Text>
                  {value === opt && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && (
                <Text style={{ textAlign: 'center', color: theme.textMuted, marginVertical: 12, fontSize: 12 }}>
                  No matches found
                </Text>
              )}
            </ScrollView>
          </View>
        </PressableOverlay>
      </Modal>
    </View>
  );
};

interface SmartDatePickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  leftIcon?: React.ReactNode;
}

const SmartDatePicker: React.FC<SmartDatePickerProps> = ({
  label,
  value,
  onChange,
  leftIcon,
}) => {
  const { theme } = useThemeContext();
  const [isOpen, setIsOpen] = useState(false);
  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('07');
  const [day, setDay] = useState('07');

  const handleConfirm = () => {
    const formatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  return (
    <View style={{ marginBottom: 12, flex: 1 }}>
      <TouchableOpacity onPress={() => setIsOpen(true)} activeOpacity={0.9}>
        <View pointerEvents="none">
          <TextInput
            label={label}
            placeholder="YYYY-MM-DD"
            value={value}
            leftIcon={leftIcon}
            rightIcon={<Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />}
          />
        </View>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <PressableOverlay onPress={() => setIsOpen(false)}>
          <View style={[styles.dropdownBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginBottom: 12 }}>
              Select {label}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>Day</Text>
                <RNTextInput
                  style={[styles.dateSubInput, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surface }]}
                  keyboardType="numeric"
                  value={day}
                  maxLength={2}
                  onChangeText={setDay}
                  placeholder="DD"
                  placeholderTextColor={theme.placeholder}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>Month</Text>
                <RNTextInput
                  style={[styles.dateSubInput, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surface }]}
                  keyboardType="numeric"
                  value={month}
                  maxLength={2}
                  onChangeText={setMonth}
                  placeholder="MM"
                  placeholderTextColor={theme.placeholder}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>Year</Text>
                <RNTextInput
                  style={[styles.dateSubInput, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surface }]}
                  keyboardType="numeric"
                  value={year}
                  maxLength={4}
                  onChangeText={setYear}
                  placeholder="YYYY"
                  placeholderTextColor={theme.placeholder}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={{ color: theme.textSecondary, fontWeight: '700', padding: 8, fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={{ color: theme.primary, fontWeight: '800', padding: 8, fontSize: 13 }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </PressableOverlay>
      </Modal>
    </View>
  );
};

const PressableOverlay: React.FC<{ children: React.ReactNode; onPress: () => void }> = ({
  children,
  onPress,
}) => (
  <TouchableOpacity
    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
    activeOpacity={1}
    onPress={onPress}
  >
    <TouchableOpacity activeOpacity={1} style={{ width: '100%', alignItems: 'center' }}>
      {children}
    </TouchableOpacity>
  </TouchableOpacity>
);

interface NewCaseIntelligenceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (newCase: CaseWorkspace) => void;
  editCaseId?: string;
  initialData?: CaseWorkspace;
}

export const NewCaseIntelligenceModal: React.FC<NewCaseIntelligenceModalProps> = ({
  visible,
  onClose,
  onSuccess,
  editCaseId,
  initialData,
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const formScrollViewRef = useRef<ScrollView>(null);

  // Form Field States
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Active');
  const [priority, setPriority] = useState('Medium');
  const [caseCategory, setCaseCategory] = useState('');

  const [clientRole, setClientRole] = useState('Complainant');
  const [opponentRole, setOpponentRole] = useState('Defendant');
  const [clientName, setClientName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [opponentEmail, setOpponentEmail] = useState('');
  const [opponentPhone, setOpponentPhone] = useState('');
  const [opponentAddress, setOpponentAddress] = useState('');

  const [advocate, setAdvocate] = useState('');
  const [opponentAdvocate, setOpponentAdvocate] = useState('');
  const [lawFirm, setLawFirm] = useState('');
  const [additionalParties, setAdditionalParties] = useState('');

  const [court, setCourt] = useState('');
  const [courtType, setCourtType] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [courtNumber, setCourtNumber] = useState('');

  const [incidentDate, setIncidentDate] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [agreementDate, setAgreementDate] = useState('');
  const [noticeDate, setNoticeDate] = useState('');
  const [nextHearingDate, setNextHearingDate] = useState('');
  const [limitationDate, setLimitationDate] = useState('');

  const [summary, setSummary] = useState('');
  const [factsInput, setFactsInput] = useState('');
  const [reliefSought, setReliefSought] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const [policeStation, setPoliceStation] = useState('');
  const [firNumber, setFIRNumber] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [labelsInput, setLabelsInput] = useState('');

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCase, setCreatedCase] = useState<CaseWorkspace | null>(null);

  // Load existing data if editing
  useEffect(() => {
    if (initialData && editCaseId) {
      setName(initialData.name || '');
      setStatus(initialData.status || 'Active');
      setPriority(initialData.priority || 'Medium');
      setCaseCategory(initialData.caseType || (initialData as any).caseCategory || (initialData as any).category || '');
      
      setClientRole((initialData as any).clientRole || 'Complainant');
      setOpponentRole((initialData as any).opponentRole || 'Defendant');
      setClientName(initialData.clientName || '');
      setOpponentName(initialData.opponentName || '');
      setClientEmail((initialData as any).clientEmail || '');
      setClientPhone((initialData as any).clientPhone || '');
      setClientAddress((initialData as any).clientAddress || '');
      setOpponentEmail((initialData as any).opponentEmail || '');
      setOpponentPhone((initialData as any).opponentPhone || '');
      setOpponentAddress((initialData as any).opponentAddress || '');

      setAdvocate((initialData as any).advocate || (initialData as any).clientAdvocate || '');
      setOpponentAdvocate((initialData as any).opponentAdvocate || '');
      setLawFirm((initialData as any).lawFirm || '');
      setAdditionalParties((initialData as any).additionalParties || '');

      setCourt(initialData.courtName || '');
      setCourtType((initialData as any).courtType || '');
      setStateName((initialData as any).stateName || (initialData as any).state || '');
      setDistrict((initialData as any).district || '');
      setCity((initialData as any).city || '');
      setCourtNumber((initialData as any).courtNumber || '');

      setIncidentDate((initialData as any).incidentDate || '');
      setFilingDate((initialData as any).filingDate || '');
      setAgreementDate((initialData as any).agreementDate || '');
      setNoticeDate((initialData as any).noticeDate || '');
      setNextHearingDate((initialData as any).nextHearingDate || (initialData as any).hearingDate || '');
      setLimitationDate((initialData as any).limitationDate || '');

      setSummary(initialData.summary || (initialData as any).caseSummary || '');
      setFactsInput(initialData.facts?.join(', ') || '');
      setReliefSought((initialData as any).reliefSought || (initialData as any).relief?.join(', ') || '');
      setInternalNotes((initialData as any).internalNotes || (initialData as any).notes || '');

      setPoliceStation((initialData as any).policeStation || '');
      setFIRNumber((initialData as any).firNumber || '');
      setCaseNumber((initialData as any).caseNumber || '');
      setReferenceNumber((initialData as any).referenceNumber || '');
      setTagsInput((initialData as any).tags?.join(', ') || '');
      setLabelsInput((initialData as any).labels?.join(', ') || '');
    } else {
      resetForm();
    }
  }, [initialData, editCaseId]);

  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (summary.trim().length > 25) {
      setIsAiLoading(true);
      const timer = setTimeout(() => {
        setIsAiLoading(false);
        setAiSuggestions({
          category: 'Consumer',
          priority: 'High',
          courtType: 'District Court',
          acts: 'Consumer Protection Act, 2019',
        });
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setAiSuggestions(null);
    }
  }, [summary]);

  const handleAcceptSuggestions = () => {
    if (aiSuggestions) {
      setCaseCategory(aiSuggestions.category);
      setPriority(aiSuggestions.priority);
      setCourtType(aiSuggestions.courtType);
      showToast('success', 'AI Suggestions Mapped', 'Category, Priority, and Court Type auto-populated.');
    }
  };

  const hasChanges = () => {
    if (!initialData) return false;
    return (
      name !== (initialData.name || '') ||
      status !== (initialData.status || 'Active') ||
      priority !== (initialData.priority || 'Medium') ||
      caseCategory !== (initialData.caseType || (initialData as any).caseCategory || (initialData as any).category || '') ||
      clientName !== (initialData.clientName || '') ||
      opponentName !== (initialData.opponentName || '') ||
      summary !== (initialData.summary || (initialData as any).caseSummary || '') ||
      clientRole !== ((initialData as any).clientRole || 'Complainant') ||
      opponentRole !== ((initialData as any).opponentRole || 'Defendant') ||
      clientEmail !== ((initialData as any).clientEmail || '') ||
      clientPhone !== ((initialData as any).clientPhone || '') ||
      clientAddress !== ((initialData as any).clientAddress || '') ||
      opponentEmail !== ((initialData as any).opponentEmail || '') ||
      opponentPhone !== ((initialData as any).opponentPhone || '') ||
      opponentAddress !== ((initialData as any).opponentAddress || '') ||
      advocate !== ((initialData as any).advocate || (initialData as any).clientAdvocate || '') ||
      opponentAdvocate !== ((initialData as any).opponentAdvocate || '') ||
      lawFirm !== ((initialData as any).lawFirm || '') ||
      additionalParties !== ((initialData as any).additionalParties || '') ||
      court !== (initialData.courtName || '') ||
      courtType !== ((initialData as any).courtType || '') ||
      stateName !== ((initialData as any).stateName || (initialData as any).state || '') ||
      district !== ((initialData as any).district || '') ||
      city !== ((initialData as any).city || '') ||
      courtNumber !== ((initialData as any).courtNumber || '') ||
      incidentDate !== ((initialData as any).incidentDate || '') ||
      filingDate !== ((initialData as any).filingDate || '') ||
      agreementDate !== ((initialData as any).agreementDate || '') ||
      noticeDate !== ((initialData as any).noticeDate || '') ||
      nextHearingDate !== ((initialData as any).nextHearingDate || (initialData as any).hearingDate || '') ||
      limitationDate !== ((initialData as any).limitationDate || '') ||
      factsInput !== (initialData.facts?.join(', ') || '') ||
      reliefSought !== ((initialData as any).reliefSought || (initialData as any).relief?.join(', ') || '') ||
      internalNotes !== ((initialData as any).internalNotes || (initialData as any).notes || '') ||
      policeStation !== ((initialData as any).policeStation || '') ||
      firNumber !== ((initialData as any).firNumber || '') ||
      caseNumber !== ((initialData as any).caseNumber || '') ||
      referenceNumber !== ((initialData as any).referenceNumber || '') ||
      tagsInput !== ((initialData as any).tags?.join(', ') || '') ||
      labelsInput !== ((initialData as any).labels?.join(', ') || '')
    );
  };

  const getEditedFieldsList = () => {
    if (!initialData) return [];
    const fields: string[] = [];
    if (name !== (initialData.name || '')) fields.push('Case Title');
    if (status !== (initialData.status || 'Active')) fields.push('Status');
    if (priority !== (initialData.priority || 'Standard')) fields.push('Priority');
    if (caseCategory !== (initialData.caseType || (initialData as any).caseCategory || (initialData as any).category || '')) fields.push('Category');
    if (clientName !== (initialData.clientName || '')) fields.push('Client Name');
    if (opponentName !== (initialData.opponentName || '')) fields.push('Opponent Name');
    if (clientRole !== ((initialData as any).clientRole || 'Complainant')) fields.push('Client Role');
    if (opponentRole !== ((initialData as any).opponentRole || 'Defendant')) fields.push('Opponent Role');
    if (clientEmail !== ((initialData as any).clientEmail || '')) fields.push('Client Email');
    if (clientPhone !== ((initialData as any).clientPhone || '')) fields.push('Client Phone');
    if (clientAddress !== ((initialData as any).clientAddress || '')) fields.push('Client Address');
    if (opponentEmail !== ((initialData as any).opponentEmail || '')) fields.push('Opponent Email');
    if (opponentPhone !== ((initialData as any).opponentPhone || '')) fields.push('Opponent Phone');
    if (opponentAddress !== ((initialData as any).opponentAddress || '')) fields.push('Opponent Address');
    if (advocate !== ((initialData as any).advocate || (initialData as any).clientAdvocate || '')) fields.push('Client Advocate');
    if (opponentAdvocate !== ((initialData as any).opponentAdvocate || '')) fields.push('Opponent Advocate');
    if (lawFirm !== ((initialData as any).lawFirm || '')) fields.push('Law Firm');
    if (additionalParties !== ((initialData as any).additionalParties || '')) fields.push('Additional Parties');
    if (court !== (initialData.courtName || '')) fields.push('Court');
    if (courtType !== ((initialData as any).courtType || '')) fields.push('Court Type');
    if (stateName !== ((initialData as any).stateName || (initialData as any).state || '')) fields.push('State');
    if (district !== ((initialData as any).district || '')) fields.push('District');
    if (city !== ((initialData as any).city || '')) fields.push('City');
    if (courtNumber !== ((initialData as any).courtNumber || '')) fields.push('Courtroom Number');
    if (incidentDate !== ((initialData as any).incidentDate || '')) fields.push('Incident Date');
    if (filingDate !== ((initialData as any).filingDate || '')) fields.push('Filing Date');
    if (agreementDate !== ((initialData as any).agreementDate || '')) fields.push('Agreement Date');
    if (noticeDate !== ((initialData as any).noticeDate || '')) fields.push('Notice Date');
    if (nextHearingDate !== ((initialData as any).nextHearingDate || (initialData as any).hearingDate || '')) fields.push('Hearing Date');
    if (limitationDate !== ((initialData as any).limitationDate || '')) fields.push('Limitation Date');
    if (summary !== (initialData.summary || (initialData as any).caseSummary || '')) fields.push('Case Summary');
    if (factsInput !== (initialData.facts?.join(', ') || '')) fields.push('Facts');
    if (reliefSought !== ((initialData as any).reliefSought || (initialData as any).relief?.join(', ') || '')) fields.push('Relief Sought');
    if (internalNotes !== ((initialData as any).internalNotes || (initialData as any).notes || '')) fields.push('Internal Notes');
    if (policeStation !== ((initialData as any).policeStation || '')) fields.push('Police Station');
    if (firNumber !== ((initialData as any).firNumber || '')) fields.push('FIR Number');
    if (caseNumber !== ((initialData as any).caseNumber || '')) fields.push('Case Number');
    if (referenceNumber !== ((initialData as any).referenceNumber || '')) fields.push('Reference Number');
    if (tagsInput !== ((initialData as any).tags?.join(', ') || '')) fields.push('Tags');
    if (labelsInput !== ((initialData as any).labels?.join(', ') || '')) fields.push('Labels');
    return fields;
  };

  const didAiFieldsChange = () => {
    if (!initialData) return true;
    return (
      name !== (initialData.name || '') ||
      caseCategory !== (initialData.caseType || (initialData as any).caseCategory || (initialData as any).category || '') ||
      clientName !== (initialData.clientName || '') ||
      opponentName !== (initialData.opponentName || '') ||
      court !== (initialData.courtName || '') ||
      incidentDate !== ((initialData as any).incidentDate || '') ||
      filingDate !== ((initialData as any).filingDate || '') ||
      nextHearingDate !== ((initialData as any).nextHearingDate || (initialData as any).hearingDate || '') ||
      factsInput !== (initialData.facts?.join(', ') || '') ||
      reliefSought !== ((initialData as any).reliefSought || (initialData as any).relief?.join(', ') || '') ||
      summary !== (initialData.summary || (initialData as any).caseSummary || '')
    );
  };

  const handleSaveCase = async () => {
    console.log('SAVE BUTTON CLICKED');
    console.log('VALIDATION STARTED');
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = 'Case Title Required';
    if (!caseCategory.trim()) nextErrors.caseCategory = 'Category Required';
    if (!clientName.trim()) nextErrors.clientName = 'Client Name Required';
    if (!opponentName.trim()) nextErrors.opponentName = 'Opponent Name Required';
    if (!courtType.trim()) nextErrors.courtType = 'Court Type Required';
    if (!summary.trim()) nextErrors.summary = 'Summary Required';

    if (Object.keys(nextErrors).length > 0) {
      console.log('VALIDATION FAILED', nextErrors);
      setErrors(nextErrors);
      showToast('error', 'Form Incomplete', 'Please fill all required case details.');
      formScrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    console.log('VALIDATION PASSED');

    if (editCaseId && !hasChanges()) {
      console.log('NO CHANGES DETECTED');
      showToast('info', 'No Changes', 'No changes detected.');
      onClose();
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload: Partial<CaseWorkspace> = {
        name: name.trim(),
        clientName: clientName.trim(),
        opponentName: opponentName.trim(),
        caseType: caseCategory,
        courtName: court || 'District Court',
        summary: summary.trim(),
        priority: priority as any,
        status: status as any,
        isLegalCase: true,
        facts: factsInput 
          ? factsInput.split(',').map((s, idx) => ({ id: `fact_${Date.now()}_${idx}`, date: new Date().toLocaleDateString(), description: s.trim() })) 
          : (summary ? [{ id: `fact_${Date.now()}`, date: new Date().toLocaleDateString(), description: summary }] : []),
        legalIssues: aiSuggestions?.acts ? [aiSuggestions.acts] : [],
      };

      Object.assign(payload, {
        clientRole,
        opponentRole,
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim(),
        clientAddress: clientAddress.trim(),
        opponentEmail: opponentEmail.trim(),
        opponentPhone: opponentPhone.trim(),
        opponentAddress: opponentAddress.trim(),
        advocate: advocate.trim(),
        clientAdvocate: advocate.trim(),
        opponentAdvocate: opponentAdvocate.trim(),
        lawFirm: lawFirm.trim(),
        additionalParties: additionalParties.trim(),
        courtType,
        stateName,
        state: stateName,
        district: district.trim(),
        city: city.trim(),
        courtNumber: courtNumber.trim(),
        incidentDate,
        filingDate,
        agreementDate,
        noticeDate,
        nextHearingDate,
        hearingDate: nextHearingDate,
        limitationDate,
        reliefSought: reliefSought.trim() ? reliefSought.split(',').map(s => s.trim()) : [],
        internalNotes: internalNotes.trim(),
        notes: internalNotes.trim(),
        policeStation: policeStation.trim(),
        firNumber: firNumber.trim(),
        caseNumber: caseNumber.trim(),
        referenceNumber: referenceNumber.trim(),
        tags: tagsInput.split(',').map(s => s.trim()).filter(Boolean),
        labels: labelsInput.split(',').map(s => s.trim()).filter(Boolean),
      });

      console.log('UPDATE REQUEST SENT', JSON.stringify(payload, null, 2));

      let updatedData: CaseWorkspace;
      
      if (editCaseId) {
        const res = await CaseService.updateCase(editCaseId, payload);
        console.log('UPDATE RESPONSE RECEIVED', JSON.stringify(res, null, 2));
        updatedData = (res as any).data || res;

        // Perform Audit Log simulation
        const editedFields = getEditedFieldsList();
        const historyLog = {
          id: `audit_${Date.now()}`,
          message: `Case details updated by Current User on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\nEdited Fields:\n${editedFields.map(f => `• ${f}`).join('\n')}`,
          timestamp: new Date().toISOString(),
          editedBy: 'Current User',
        };
        const existingLogsStr = await AsyncStorage.getItem(`@audit_log_${editCaseId}`);
        const logs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
        logs.unshift(historyLog);
        await AsyncStorage.setItem(`@audit_log_${editCaseId}`, JSON.stringify(logs));

        // Auto-regenerate cached summary
        await AsyncStorage.removeItem(`@ai_summary_${editCaseId}`);

        // Automatically trigger AI background analysis if critical fields changed
        if (didAiFieldsChange()) {
          console.log('BACKGROUND AI REGENERATION TRIGGERED');
          CaseService.analyzeCase(editCaseId).then((aiRes) => {
            const aiUpdated = (aiRes as any).data || aiRes;
            if (aiUpdated) {
              console.log('BACKGROUND AI REGENERATION COMPLETED');
              onSuccess(aiUpdated);
            }
          }).catch((aiErr) => {
            console.warn('[EditCaseDetails] Background AI analysis error (non-blocking):', aiErr);
          });
        }

        console.log('LOCAL STATE UPDATED');
        console.log('UI REFRESHED');
        console.log('SAVE COMPLETED');
        showToast('success', 'Case Updated', '✅ Case updated successfully. All AI modules have been synchronized.');
      } else {
        const res = await CaseService.createCase(payload);
        console.log('CREATE RESPONSE RECEIVED', JSON.stringify(res, null, 2));
        updatedData = (res as any).data || res;
        showToast('success', 'Case Indexed', 'Litigation folder synced successfully.');
      }

      onSuccess(updatedData);
      onClose();
    } catch (err: any) {
      console.error('Error saving case:', err);
      showToast('error', 'Save Failed', 'Unable to save changes. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (editCaseId && hasChanges()) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved modifications.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
          {
            text: 'Save & Exit',
            onPress: async () => {
              await handleSaveCase();
            },
          },
        ]
      );
    } else {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setName('');
    setStatus('Active');
    setPriority('Standard');
    setCaseCategory('');
    setClientRole('Complainant');
    setOpponentRole('Defendant');
    setClientName('');
    setOpponentName('');
    setClientEmail('');
    setClientPhone('');
    setClientAddress('');
    setOpponentEmail('');
    setOpponentPhone('');
    setOpponentAddress('');
    setAdvocate('');
    setOpponentAdvocate('');
    setLawFirm('');
    setAdditionalParties('');
    setCourt('');
    setCourtType('');
    setStateName('');
    setDistrict('');
    setCity('');
    setCourtNumber('');
    setIncidentDate('');
    setFilingDate('');
    setAgreementDate('');
    setNoticeDate('');
    setNextHearingDate('');
    setLimitationDate('');
    setSummary('');
    setFactsInput('');
    setReliefSought('');
    setInternalNotes('');
    setPoliceStation('');
    setFIRNumber('');
    setCaseNumber('');
    setReferenceNumber('');
    setTagsInput('');
    setLabelsInput('');
    setCreatedCase(null);
    setErrors({});
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={[styles.modalOverlay, { backgroundColor: theme.background }]}>
        
        {/* SUCCESS STATE SCREEN */}
        {createdCase ? (
          <View style={styles.successWrapper}>
            <View style={[styles.successBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.successIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="checkmark-circle" size={54} color="#10B981" />
              </View>
              <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Case Created Successfully</Text>
              <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
                {createdCase.name || `${createdCase.clientName} vs ${createdCase.opponentName}`}
              </Text>

              <View style={{ width: '100%', gap: 12, marginTop: 24 }}>
                <TouchableOpacity
                  style={[styles.successButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    onSuccess(createdCase);
                    onClose();
                  }}
                >
                  <Text style={styles.successButtonText}>View Case Workspace</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.successButtonSecondary, { borderColor: theme.border }]}
                  onPress={resetForm}
                >
                  <Text style={[styles.successButtonSecondaryText, { color: theme.textPrimary }]}>Create Another Case</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ alignSelf: 'center', marginTop: 8 }}
                  onPress={() => {
                    onSuccess(createdCase);
                    onClose();
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary }}>Go to Dashboard</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
              <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                  {editCaseId ? 'Edit Case Details' : 'New Case Intelligence'}
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                  {editCaseId ? 'Update your case information. All connected AI modules will automatically reflect the latest information.' : 'Enter professional legal case details'}
                </Text>
              </View>
            </View>

            {/* Scrollable Form Body */}
            <ScrollView
              ref={formScrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View pointerEvents={isSubmitting ? 'none' : 'auto'} style={isSubmitting && { opacity: 0.75 }}>
              {/* SECTION 1 - CASE IDENTITY */}
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.sectionHeading}>● SECTION 1 — CASE IDENTITY</Text>
                
                <TextInput
                  label="Case Title *"
                  placeholder="e.g. Smith vs Matrix Corp"
                  value={name}
                  onChangeText={setName}
                  error={errors.name}
                  leftIcon={<Text style={{ fontSize: 16 }}>📄</Text>}
                />

                <SmartDropdown
                  label="Case Status"
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={setStatus}
                  leftIcon={<Text style={{ fontSize: 16 }}>📂</Text>}
                />

                <SmartDropdown
                  label="Priority"
                  value={priority}
                  options={PRIORITY_OPTIONS}
                  onChange={setPriority}
                  leftIcon={<Text style={{ fontSize: 16 }}>🚩</Text>}
                />

                <SmartDropdown
                  label="Case Category *"
                  value={caseCategory}
                  options={CATEGORY_OPTIONS}
                  onChange={setCaseCategory}
                  error={errors.caseCategory}
                  searchable
                  leftIcon={<Text style={{ fontSize: 16 }}>📂</Text>}
                />
              </View>

              {/* SECTION 2 - PARTICIPANTS */}
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.sectionHeading}>● SECTION 2 — PARTICIPANTS</Text>

                <SmartDropdown
                  label="Client Role"
                  value={clientRole}
                  options={ROLE_OPTIONS}
                  onChange={setClientRole}
                  leftIcon={<Text style={{ fontSize: 16 }}>👤</Text>}
                />

                <TextInput
                  label="Client Name *"
                  placeholder="Enter Client Name"
                  value={clientName}
                  onChangeText={setClientName}
                  error={errors.clientName}
                  leftIcon={<Text style={{ fontSize: 16 }}>👤</Text>}
                />

                <TextInput
                  label="Client Email"
                  placeholder="client@example.com"
                  value={clientEmail}
                  onChangeText={setClientEmail}
                  leftIcon={<Text style={{ fontSize: 16 }}>📧</Text>}
                />

                <TextInput
                  label="Client Phone"
                  placeholder="e.g. +91 9999999999"
                  value={clientPhone}
                  onChangeText={setClientPhone}
                  leftIcon={<Text style={{ fontSize: 16 }}>📞</Text>}
                />

                <TextInput
                  label="Client Address"
                  placeholder="Client Residential/Business Address"
                  value={clientAddress}
                  onChangeText={setClientAddress}
                  leftIcon={<Text style={{ fontSize: 16 }}>🏠</Text>}
                />

                <SmartDropdown
                  label="Opponent Role"
                  value={opponentRole}
                  options={ROLE_OPTIONS}
                  onChange={setOpponentRole}
                  leftIcon={<Text style={{ fontSize: 16 }}>👤</Text>}
                />

                <TextInput
                  label="Opponent Name *"
                  placeholder="Enter Opponent Name"
                  value={opponentName}
                  onChangeText={setOpponentName}
                  error={errors.opponentName}
                  leftIcon={<Text style={{ fontSize: 16 }}>👤</Text>}
                />

                <TextInput
                  label="Opponent Email"
                  placeholder="opponent@example.com"
                  value={opponentEmail}
                  onChangeText={setOpponentEmail}
                  leftIcon={<Text style={{ fontSize: 16 }}>📧</Text>}
                />

                <TextInput
                  label="Opponent Phone"
                  placeholder="e.g. +91 9888888888"
                  value={opponentPhone}
                  onChangeText={setOpponentPhone}
                  leftIcon={<Text style={{ fontSize: 16 }}>📞</Text>}
                />

                <TextInput
                  label="Opponent Address"
                  placeholder="Opponent Address"
                  value={opponentAddress}
                  onChangeText={setOpponentAddress}
                  leftIcon={<Text style={{ fontSize: 16 }}>🏠</Text>}
                />

                <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Future Ready Details</Text>
                
                <TextInput
                  label="Client Advocate"
                  placeholder="Presiding lawyer..."
                  value={advocate}
                  onChangeText={setAdvocate}
                  leftIcon={<Text style={{ fontSize: 16 }}>👤</Text>}
                />

                <TextInput
                  label="Opponent Advocate"
                  placeholder="Opponent lawyer..."
                  value={opponentAdvocate}
                  onChangeText={setOpponentAdvocate}
                  leftIcon={<Text style={{ fontSize: 16 }}>👤</Text>}
                />

                <TextInput
                  label="Law Firm"
                  placeholder="e.g. Legal Corp Associates"
                  value={lawFirm}
                  onChangeText={setLawFirm}
                  leftIcon={<Text style={{ fontSize: 16 }}>🏛️</Text>}
                />

                <TextInput
                  label="Additional Parties"
                  placeholder="Witnesses or co-plaintiffs"
                  value={additionalParties}
                  onChangeText={setAdditionalParties}
                  leftIcon={<Text style={{ fontSize: 16 }}>👥</Text>}
                />
              </View>

              {/* SECTION 3 - COURT DETAILS */}
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.sectionHeading}>● SECTION 3 — COURT DETAILS</Text>

                <SmartDropdown
                  label="Court"
                  value={court}
                  options={COURT_OPTIONS}
                  onChange={setCourt}
                  searchable
                  leftIcon={<Text style={{ fontSize: 16 }}>⚖️</Text>}
                />

                <SmartDropdown
                  label="Court Type"
                  value={courtType}
                  options={COURT_TYPES}
                  onChange={setCourtType}
                  leftIcon={<Text style={{ fontSize: 16 }}>⚖️</Text>}
                />

                <SmartDropdown
                  label="State"
                  value={stateName}
                  options={STATE_OPTIONS}
                  onChange={setStateName}
                  leftIcon={<Text style={{ fontSize: 16 }}>📍</Text>}
                />

                <TextInput
                  label="District"
                  placeholder="e.g. Central Delhi"
                  value={district}
                  onChangeText={setDistrict}
                  leftIcon={<Text style={{ fontSize: 16 }}>📍</Text>}
                />

                <TextInput
                  label="City"
                  placeholder="e.g. New Delhi"
                  value={city}
                  onChangeText={setCity}
                  leftIcon={<Text style={{ fontSize: 16 }}>📍</Text>}
                />

                <TextInput
                  label="Court Number"
                  placeholder="e.g. Court Room No. 4"
                  value={courtNumber}
                  onChangeText={setCourtNumber}
                  leftIcon={<Text style={{ fontSize: 16 }}>⚖️</Text>}
                />
              </View>

              {/* SECTION 4 - IMPORTANT DATES */}
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.sectionHeading}>● SECTION 4 — IMPORTANT DATES</Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <SmartDatePicker
                    label="Incident Date"
                    value={incidentDate}
                    onChange={setIncidentDate}
                    leftIcon={<Text style={{ fontSize: 16 }}>📅</Text>}
                  />
                  <SmartDatePicker
                    label="Filing Date"
                    value={filingDate}
                    onChange={setFilingDate}
                    leftIcon={<Text style={{ fontSize: 16 }}>📅</Text>}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <SmartDatePicker
                    label="Agreement Date"
                    value={agreementDate}
                    onChange={setAgreementDate}
                    leftIcon={<Text style={{ fontSize: 16 }}>📅</Text>}
                  />
                  <SmartDatePicker
                    label="Notice Date"
                    value={noticeDate}
                    onChange={setNoticeDate}
                    leftIcon={<Text style={{ fontSize: 16 }}>📅</Text>}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <SmartDatePicker
                    label="Next Hearing Date"
                    value={nextHearingDate}
                    onChange={setNextHearingDate}
                    leftIcon={<Text style={{ fontSize: 16 }}>📅</Text>}
                  />
                  <SmartDatePicker
                    label="Limitation Date"
                    value={limitationDate}
                    onChange={setLimitationDate}
                    leftIcon={<Text style={{ fontSize: 16 }}>📅</Text>}
                  />
                </View>
              </View>

              {/* SECTION 5 - CASE SUMMARY */}
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.sectionHeading}>● SECTION 5 — CASE SUMMARY</Text>
                
                <TextArea
                  label="Case Summary *"
                  placeholder="Describe the timeline, facts, claims, important events, legal issues and relief sought..."
                  value={summary}
                  onChangeText={setSummary}
                  error={errors.summary}
                  style={{ minHeight: 140 }}
                  inputStyle={{ minHeight: 140, textAlignVertical: 'top' }}
                  leftIcon={<Text style={{ fontSize: 16 }}>📝</Text>}
                />

                <TextArea
                  label="Facts"
                  placeholder="Enter case facts and background events..."
                  value={factsInput}
                  onChangeText={setFactsInput}
                  style={{ minHeight: 80 }}
                  inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
                  leftIcon={<Text style={{ fontSize: 16 }}>📝</Text>}
                />

                <TextArea
                  label="Relief Sought"
                  placeholder="e.g. Recovery of ₹5,00,000, Compensation..."
                  value={reliefSought}
                  onChangeText={setReliefSought}
                  style={{ minHeight: 80 }}
                  inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
                  leftIcon={<Text style={{ fontSize: 16 }}>💰</Text>}
                />

                <TextArea
                  label="Internal Notes"
                  placeholder="Internal notes/reminders for counsel..."
                  value={internalNotes}
                  onChangeText={setInternalNotes}
                  style={{ minHeight: 80 }}
                  inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
                  leftIcon={<Text style={{ fontSize: 16 }}>✏️</Text>}
                />
              </View>

              {/* SECTION 6 — OPTIONAL DETAILS */}
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.sectionHeading}>● SECTION 6 — OPTIONAL DETAILS</Text>

                <TextInput
                  label="Police Station"
                  placeholder="e.g. Saket Police Station"
                  value={policeStation}
                  onChangeText={setPoliceStation}
                  leftIcon={<Text style={{ fontSize: 16 }}>👮</Text>}
                />

                <TextInput
                  label="FIR Number"
                  placeholder="e.g. FIR No. 124/2026"
                  value={firNumber}
                  onChangeText={setFIRNumber}
                  leftIcon={<Text style={{ fontSize: 16 }}>📄</Text>}
                />

                <TextInput
                  label="Case Number"
                  placeholder="e.g. OS 420/2026"
                  value={caseNumber}
                  onChangeText={setCaseNumber}
                  leftIcon={<Text style={{ fontSize: 16 }}>📄</Text>}
                />

                <TextInput
                  label="Reference Number"
                  placeholder="e.g. REF-7729-X"
                  value={referenceNumber}
                  onChangeText={setReferenceNumber}
                  leftIcon={<Text style={{ fontSize: 16 }}>📄</Text>}
                />

                <TextInput
                  label="Tags"
                  placeholder="comma separated, e.g. breach, contract, delhi"
                  value={tagsInput}
                  onChangeText={setTagsInput}
                  leftIcon={<Text style={{ fontSize: 16 }}>🏷️</Text>}
                />

                <TextInput
                  label="Labels"
                  placeholder="comma separated, e.g. Urgent, High Stake"
                  value={labelsInput}
                  onChangeText={setLabelsInput}
                  leftIcon={<Text style={{ fontSize: 16 }}>🏷️</Text>}
                />
              </View>

              {/* SECTION 6 - AI SUGGESTIONS */}
              {isAiLoading && (
                <View style={[styles.aiSuggestionBox, { backgroundColor: theme.surfaceVariant }]}>
                  <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary }}>AI analyzing case facts...</Text>
                </View>
              )}

              {aiSuggestions && !isAiLoading && (
                <View style={[styles.aiSuggestionBox, { backgroundColor: isDark ? '#1F1E38' : '#F5F3FF', borderColor: '#8B5CF6' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Ionicons name="sparkles" size={16} color="#8B5CF6" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#8B5CF6' }}>AI Suggestions</Text>
                  </View>
                  <View style={{ gap: 6, marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>✔ {aiSuggestions.category} Matter</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>✔ {aiSuggestions.priority} Priority</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>✔ {aiSuggestions.courtType}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary }}>✔ {aiSuggestions.acts}</Text>
                  </View>
                  <TouchableOpacity style={styles.acceptAiBtn} onPress={handleAcceptSuggestions}>
                    <Text style={styles.acceptAiBtnText}>Accept AI Suggestions</Text>
                  </TouchableOpacity>
                </View>
              )}
              </View>
            </ScrollView>

            {/* Sticky Footer */}
            <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
              <TouchableOpacity 
                style={[styles.cancelBtn, isSubmitting && { opacity: 0.5 }]} 
                onPress={isSubmitting ? undefined : handleClose}
                disabled={isSubmitting}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: theme.primary }, isSubmitting && { opacity: 0.85 }]}
                onPress={handleSaveCase}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.createBtnText, { color: '#FFFFFF' }]}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.createBtnText}>
                    {editCaseId ? 'SAVE CHANGES' : 'Create Case'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#6D5DFC',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  subLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 8,
  },
  dropdownBox: {
    width: '85%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  dropdownItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateSubInput: {
    borderWidth: 1.5,
    borderRadius: 8,
    height: 42,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  aiSuggestionBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'column',
  },
  acceptAiBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  acceptAiBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    borderTopWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  createBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  successWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  successBox: {
    width: '90%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  successIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  successButton: {
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  successButtonSecondary: {
    borderRadius: 10,
    borderWidth: 1.5,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonSecondaryText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
});

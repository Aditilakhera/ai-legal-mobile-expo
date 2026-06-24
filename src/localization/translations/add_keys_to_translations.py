import re
import os

languages = {
    'english.ts': """    hidePrepChecklist: 'Hide Prep Checklist',
    showPrepChecklist: 'Show Prep Checklist',
    prepChecklistTitle: '📋 Preparation Checklist',
    documentsNeeded: 'Documents Needed',
    noDocumentsSpecified: 'No documents specified.',
    evidenceLedger: 'Evidence Ledger',
    noEvidenceSpecified: 'No evidence specified.',
    witnessPrep: 'Witness Preparation',
    noWitnessesSpecified: 'No witnesses specified.',
    complianceChecklist: 'Compliance Checklist',
    aiAnalyzingMaterials: 'AI is analyzing court materials...',
    addNotes: 'Add Notes',
    uploadOrder: 'Upload Order',
    aiOrderSummaryHeader: '✨ AI Order Directive Summary',
    nextHearingDateDiary: '⏭️ Next Hearing Date Diary',
    room: 'Room',
    general: 'General',""",
    
    'hindi.ts': """    hidePrepChecklist: 'तैयारी चेकलिस्ट छुपाएं',
    showPrepChecklist: 'तैयारी चेकलिस्ट दिखाएं',
    prepChecklistTitle: '📋 तैयारी चेकलिस्ट',
    documentsNeeded: 'आवश्यक दस्तावेज',
    noDocumentsSpecified: 'कोई दस्तावेज निर्दिष्ट नहीं है।',
    evidenceLedger: 'साक्ष्य बही (Evidence Ledger)',
    noEvidenceSpecified: 'कोई साक्ष्य निर्दिष्ट नहीं है।',
    witnessPrep: 'गवाह की तैयारी',
    noWitnessesSpecified: 'कोई गवाह निर्दिष्ट नहीं है।',
    complianceChecklist: 'अनुपालन चेकलिस्ट',
    aiAnalyzingMaterials: 'एआई अदालत सामग्री का विश्लेषण कर रहा है...',
    addNotes: 'नोट्स जोड़ें',
    uploadOrder: 'आदेश अपलोड करें',
    aiOrderSummaryHeader: '✨ एआई आदेश निर्देश सारांश',
    nextHearingDateDiary: '⏭️ अगली सुनवाई की तारीख डायरी',
    room: 'कमरा (Room)',
    general: 'सामान्य (General)',""",
    
    'gujarati.ts': """    hidePrepChecklist: 'તૈયારી ચેકલિસ્ટ છુપાવો',
    showPrepChecklist: 'તૈયારી ચેકલિસ્ટ બતાવો',
    prepChecklistTitle: '📋 તૈયારી ચેકલિસ્ટ',
    documentsNeeded: 'જરૂરી દસ્તાવેજો',
    noDocumentsSpecified: 'કોઈ દસ્તાવેજો ઉલ્લેખિત નથી.',
    evidenceLedger: 'પુરાવા ચોપડો (Evidence Ledger)',
    noEvidenceSpecified: 'કોઈ પુરાવા ઉલ્લેખિત નથી.',
    witnessPrep: 'સાક્ષી તૈયારી',
    noWitnessesSpecified: 'કોઈ સાક્ષીઓ ઉલ્લેખિત નથી.',
    complianceChecklist: 'પાલન ચેકલિસ્ટ',
    aiAnalyzingMaterials: 'એઆઈ કોર્ટ સામગ્રીનું વિશ્લેષણ કરી રહ્યું છે...',
    addNotes: 'નોંધ ઉમેરો',
    uploadOrder: 'આદેશ અપલોડ કરો',
    aiOrderSummaryHeader: '✨ એઆઈ ઓર્ડર નિર્દેશ સારાંશ',
    nextHearingDateDiary: '⏭️ આગામી સુનાવણી તારીખ ડાયરી',
    room: 'રૂમ (Room)',
    general: 'સામાન્ય (General)',""",
    
    'marathi.ts': """    hidePrepChecklist: 'तयारी चेकलिस्ट लपवा',
    showPrepChecklist: 'तयारी चेकलिस्ट दाखवा',
    prepChecklistTitle: '📋 तयारी चेकलिस्ट',
    documentsNeeded: 'आवश्यक कागदपत्रे',
    noDocumentsSpecified: 'कोणतीही कागदपत्रे निर्दिष्ट नाहीत.',
    evidenceLedger: 'पुरावा वही (Evidence Ledger)',
    noEvidenceSpecified: 'कोणताही पुरावा निर्दिष्ट नाही.',
    witnessPrep: 'साक्षीदारांची तयारी',
    noWitnessesSpecified: 'कोणताही साक्षीदार निर्दिष्ट नाही.',
    complianceChecklist: 'अनुपालन चेकलिस्ट',
    aiAnalyzingMaterials: 'एआय न्यायालयीन साहित्याचे विश्लेषण करत आहे...',
    addNotes: 'टीपा जोडा',
    uploadOrder: 'आदेश अपलोड करा',
    aiOrderSummaryHeader: '✨ एआय आदेश निर्देश सारांश',
    nextHearingDateDiary: '⏭️ पुढील सुनावणीची तारीख डायरी',
    room: 'खोली (Room)',
    general: 'सामान्य (General)',""",
    
    'tamil.ts': """    hidePrepChecklist: 'தயாரிப்பு சரிபார்ப்புப் பட்டியலை மறைக்கவும்',
    showPrepChecklist: 'தயாரிப்பு சரிபார்ப்புப் பட்டியலைக் காட்டவும்',
    prepChecklistTitle: '📋 தயாரிப்பு சரிபார்ப்புப் பட்டியல்',
    documentsNeeded: 'தேவையான ஆவணங்கள்',
    noDocumentsSpecified: 'ஆவணங்கள் எதுவும் குறிப்பிடப்படவில்லை.',
    evidenceLedger: 'சான்றுப் புத்தகம் (Evidence Ledger)',
    noEvidenceSpecified: 'சான்றுகள் எதுவும் குறிப்பிடப்படவில்லை.',
    witnessPrep: 'சாட்சி தயாரிப்பு',
    noWitnessesSpecified: 'சாட்சிகள் யாரும் குறிப்பிடப்படவில்லை.',
    complianceChecklist: 'இணக்கச் சரிபார்ப்புப் பட்டியல்',
    aiAnalyzingMaterials: 'AI நீதிமன்ற ஆவணங்களை பகுப்பாய்வு செய்கிறது...',
    addNotes: 'குறிப்புகளைச் சேர்',
    uploadOrder: 'ஆணையைப் பதிவேற்றவும்',
    aiOrderSummaryHeader: '✨ AI ஆணை வழிமுறை சுருக்கம்',
    nextHearingDateDiary: '⏭️ அடுத்த விசாரணை தேதி நாட்குறிப்பு',
    room: 'அறை (Room)',
    general: 'பொதுவான (General)',"""
}

base_path = r'c:\Users\USER\Desktop\AI_LEGAL_APP\Ai_legal_mobile\src\localization\translations'

for filename, keys in languages.items():
    file_path = os.path.join(base_path, filename)
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Check if hidePrepChecklist is already in the file
    if 'hidePrepChecklist' in content:
        print(f"Keys already present in {filename}. Skipping.")
        continue
        
    # We want to replace "defaultTitle: '...'," with the title plus the new keys
    # Let's find "defaultTitle: '...'," or defaultTitle: "...",
    pattern = r'(defaultTitle:\s*[\'"][^\'"]+[\'"],?)'
    match = re.search(pattern, content)
    if match:
        original = match.group(1)
        replacement = original + "\n" + keys
        content = content.replace(original, replacement)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Successfully added keys to {filename}")
    else:
        print(f"Could not find defaultTitle in {filename}!")

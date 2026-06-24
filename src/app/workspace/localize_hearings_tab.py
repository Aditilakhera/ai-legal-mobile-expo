import os

files = [
    r'c:\Users\USER\Desktop\AI_LEGAL_APP\Ai_legal_mobile\src\app\workspace\[id].tsx',
    r'c:\Users\USER\Desktop\AI_LEGAL_APP\Ai_legal_mobile\src\app\(tabs)\cases\[id].tsx'
]

replacements = [
    (
        "{t('hearings.courtroom') || 'Room'}: {nextHearing.courtroom || 'N/A'} • {nextHearing.purpose || 'General'}",
        "{t('hearings.courtroom') || t('hearings.room') || 'Room'}: {nextHearing.courtroom || 'N/A'} • {nextHearing.purpose || t('hearings.general') || 'General'}"
    ),
    (
        '{isChecklistExpanded ? "Hide Prep Checklist" : "Show Prep Checklist"}',
        "{isChecklistExpanded ? t('hearings.hidePrepChecklist') : t('hearings.showPrepChecklist')}"
    ),
    (
        '<Text style={styles.checklistSectionTitle}>📋 Preparation Checklist</Text>',
        "<Text style={styles.checklistSectionTitle}>{t('hearings.prepChecklistTitle')}</Text>"
    ),
    (
        '<Text style={styles.checklistCategoryTitle}>Documents Needed</Text>',
        "<Text style={styles.checklistCategoryTitle}>{t('hearings.documentsNeeded')}</Text>"
    ),
    (
        '<Text style={styles.checklistEmptyText}>No documents specified.</Text>',
        "<Text style={styles.checklistEmptyText}>{t('hearings.noDocumentsSpecified')}</Text>"
    ),
    (
        '<Text style={styles.checklistCategoryTitle}>Evidence Ledger</Text>',
        "<Text style={styles.checklistCategoryTitle}>{t('hearings.evidenceLedger')}</Text>"
    ),
    (
        '<Text style={styles.checklistEmptyText}>No evidence specified.</Text>',
        "<Text style={styles.checklistEmptyText}>{t('hearings.noEvidenceSpecified')}</Text>"
    ),
    (
        '<Text style={styles.checklistCategoryTitle}>Witness Preparation</Text>',
        "<Text style={styles.checklistCategoryTitle}>{t('hearings.witnessPrep')}</Text>"
    ),
    (
        '<Text style={styles.checklistEmptyText}>No witnesses specified.</Text>',
        "<Text style={styles.checklistEmptyText}>{t('hearings.noWitnessesSpecified')}</Text>"
    ),
    (
        '<Text style={styles.checklistCategoryTitle}>Compliance Checklist</Text>',
        "<Text style={styles.checklistCategoryTitle}>{t('hearings.complianceChecklist')}</Text>"
    ),
    (
        'AI is analyzing court materials...',
        "{t('hearings.aiAnalyzingMaterials')}"
    ),
    (
        '<Text style={styles.cardActionBtnText}>Add Notes</Text>',
        "<Text style={styles.cardActionBtnText}>{t('hearings.addNotes')}</Text>"
    ),
    (
        '<Text style={styles.cardActionBtnTextFilled}>Upload Order</Text>',
        "<Text style={styles.cardActionBtnTextFilled}>{t('hearings.uploadOrder')}</Text>"
    )
]

for file_path in files:
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue
        
    try:
        with open(file_path, 'r', encoding='utf-16') as f:
            content = f.read()
        encoding = 'utf-16'
    except Exception:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        encoding = 'utf-8'
        
    original_len = len(content)
    replaced_count = 0
    
    for target, replacement in replacements:
        if target in content:
            content = content.replace(target, replacement)
            replaced_count += 1
            
    if replaced_count > 0:
        with open(file_path, 'w', encoding=encoding) as f:
            f.write(content)
        print(f"Successfully updated {os.path.basename(file_path)} with {replaced_count} translations (encoding: {encoding})")
    else:
        print(f"No replacements matched in {os.path.basename(file_path)}")

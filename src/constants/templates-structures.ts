import { TemplateMetadata } from './templates-data';

export interface TemplateStructure {
  documentTitle: string; // The uppercase title (e.g. "LEGAL NOTICE", "DEMAND NOTICE")
  sectionOrder: string[]; // List of section names in order
  sectionContent: Record<string, string>; // Placeholder-based content template for each section
  mandatorySections: string[];
  optionalSections?: string[];
  formattingRules?: {
    align?: Record<string, 'left' | 'center' | 'right' | 'justify'>; // e.g. { 'title': 'center' }
    bold?: string[]; // list of sections/keys that should be bolded
    italic?: string[];
    underline?: string[];
    uppercase?: string[];
  };
  numberingStyle?: Record<string, 'none' | 'arabic' | 'alphabet' | 'bullet'>; // e.g. { 'facts': 'arabic', 'grounds': 'alphabet' }
  signatureLayout?: 'left' | 'right' | 'split' | 'double_witness' | 'notary_deponent'; // Layout for signature block
  header?: string; // Header text to print on top (e.g. "BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION")
  footer?: string; // Footer text
}

export const FIELD_FALLBACKS: Record<string, string> = {
  // Parties
  senderName: 'Suresh Mehta',
  senderAddress: 'Sector 12, Dwarka, New Delhi',
  receiverName: 'Tata Energy Ltd',
  receiverAddress: '45, Industrial Area, Noida, U.P.',
  petitionerName: 'Suresh Mehta',
  petitionerAddress: 'Sector 12, Dwarka, New Delhi',
  respondentName: 'Tata Energy Ltd',
  respondentAddress: '45, Industrial Area, Noida, U.P.',
  complainantName: 'Suresh Mehta',
  complainantAddress: 'Sector 12, Dwarka, New Delhi',
  accusedName: 'Amit Verma',
  employerName: 'LexCorp Tech Private Limited',
  employeeName: 'Rohan Das',
  landlordName: 'Ramesh Kumar',
  landlordAddress: 'Flat 101, Sector 15, Dwarka, New Delhi',
  tenantName: 'Vikram Aditya',
  tenantAddress: 'H-12, Sector 2, Rohini, New Delhi',
  transferorName: 'Rajendra Prasad',
  transfereeName: 'Vikram Aditya',
  party1: 'ABC Solutions Pvt Ltd',
  party2: 'XYZ Enterprises',
  principalName: 'Devendra Singh',
  attorneyName: 'Rajendra Singh',
  relationship: 'Brother',
  
  // Case info
  courtName: 'District Consumer Disputes Redressal Forum, Mumbai',
  caseNumber: 'Suit No. 124 of 2026',
  policeStation: 'Saket Police Station',
  incidentDate: '2026-06-14',
  incidentTime: '4:30 PM',
  incidentLocation: 'Saket, New Delhi',
  purchaseDate: '2026-06-10',
  joiningDate: '2026-07-15',
  startDate: '2026-07-01',
  effectiveDate: '2026-07-08',
  agreementDate: '2026-06-14',
  
  // Financials
  monthlyRent: '28,000',
  securityDeposit: '56,000',
  loanAmount: '25,00,000',
  considerationAmount: '55,00,000',
  compensation: '5,50,000',
  interestRate: '9.5% p.a.',
  
  // Specific details
  propertyAddress: 'Flat No. 504, Windsor Heights, Saket, New Delhi',
  propertyDescription: 'Flat No. 504, Windsor Heights, Saket, New Delhi',
  subject: 'Notice for recovery of outstanding dues and breach of agreement.',
  facts: 'Unilateral increase in retrospective service charges without prior consensus or notification.',
  caseDetails: 'Unilateral increase in retrospective service charges without prior consensus or notification.',
  incidentDescription: 'Unilateral increase in retrospective service charges without prior consensus or notification.',
  complaintDetails: 'The product malfunctioned within 3 days and seller refused replacement under warranty terms.',
  grievance: 'The product malfunctioned within 3 days and seller refused replacement under warranty terms.',
  purpose: 'Verification of identity and declaration of facts.',
  declarations: 'That the deponent is a citizen of India and is the plaintiff in the recovery suit.\nThat the facts mentioned in the petition are true and no material facts have been concealed.',
  grounds: 'The unilateral alteration of tariff terms violates Section 12 of the Electricity Act.\nThe actions constitute a direct breach of contract and promissory estoppel doctrine.',
  reliefRequested: 'Restore original tariff slabs and refund excess charges.',
  reliefSought: 'Restore original tariff slabs and refund excess charges.',
  compliancePeriod: '15 Days',
  noticePeriod: '15 days',
  terminationTerms: '30 days written notice',
  jobTitle: 'Senior Software Engineer',
  powers: 'To manage property, represent in legal suits, and sign deeds.',
  validity: 'Revocable at will',
  revocation: 'Revocable by principal return',
  verificationPlace: 'New Delhi',
};

export const TEMPLATE_STRUCTURES: Record<string, TemplateStructure> = {
  // 1. Legal Notice
  legalNotice: {
    documentTitle: 'LEGAL NOTICE',
    sectionOrder: ['TO', 'FROM', 'SUBJECT', 'BACKGROUND', 'FACTS', 'LEGAL_DEMAND', 'NOTICE', 'TIME_LIMIT', 'SIGNATURE'],
    mandatorySections: ['TO', 'SUBJECT', 'BACKGROUND', 'FACTS', 'NOTICE', 'TIME_LIMIT', 'SIGNATURE'],
    optionalSections: ['FROM', 'LEGAL_DEMAND'],
    sectionContent: {
      TO: 'To,\n{{receiverName}}\n{{receiverAddress}}',
      FROM: 'From,\n{{senderName}}\n{{senderAddress}}',
      SUBJECT: 'SUBJECT: {{subject}}',
      BACKGROUND: 'Sir/Madam,\n\nUnder instructions from and on behalf of my client {{senderName}}, I hereby serve you with this Legal Notice:',
      FACTS: '1. That my client and you entered into business transactions.\n2. That the facts of the matter are: {{facts}}',
      LEGAL_DEMAND: 'A. That the actions constitute a direct breach of contract terms.\nB. The grounds are: {{grounds}}',
      NOTICE: 'Therefore, I hereby call upon you to comply with the following demands: {{reliefRequested}}',
      TIME_LIMIT: 'You are hereby given a period of {{compliancePeriod}} from the receipt of this notice to comply with the terms, failing which civil and criminal proceedings will be initiated.',
      SIGNATURE: 'Regards,\n\nAdv. Suresh Mehta\nCounsel for {{senderName}}'
    },
    formattingRules: {
      bold: ['SUBJECT'],
      uppercase: ['SUBJECT']
    },
    signatureLayout: 'right'
  },

  // 2. Demand Notice
  demandNotice: {
    documentTitle: 'DEMAND NOTICE',
    sectionOrder: ['TO', 'SUBJECT', 'TRANSACTION_DETAILS', 'DEFAULT', 'OUTSTANDING_AMOUNT', 'DEMAND', 'PAYMENT_DEADLINE', 'LEGAL_CONSEQUENCES', 'SIGNATURE'],
    mandatorySections: ['TO', 'SUBJECT', 'DEFAULT', 'OUTSTANDING_AMOUNT', 'DEMAND', 'PAYMENT_DEADLINE', 'LEGAL_CONSEQUENCES', 'SIGNATURE'],
    sectionContent: {
      TO: 'To,\n{{respondentName}}\n{{respondentAddress}}',
      SUBJECT: 'SUBJECT: Demand Notice for Recovery of Outstanding Dues',
      TRANSACTION_DETAILS: '1. That the parties entered into transaction terms on {{agreementDate}}.\n2. That materials/services were rendered according to mutual agreement terms.',
      DEFAULT: 'That you have failed to clear the balance amount and are in default of your payment obligations.',
      OUTSTANDING_AMOUNT: 'The total outstanding amount is INR {{loanAmount}} plus interest calculated at {{interestRate}}.',
      DEMAND: 'We hereby demand the immediate repayment of the default amount to clear the outstanding balances.',
      PAYMENT_DEADLINE: 'The payment must be cleared within {{noticePeriod}} from the receipt of this demand notice.',
      LEGAL_CONSEQUENCES: 'Failure to comply will result in the immediate initiation of legal claims under civil and criminal laws at Saket Courts, Delhi.',
      SIGNATURE: 'Regards,\n\nAdv. Suresh Mehta\nCounsel for Claimant'
    },
    signatureLayout: 'right'
  },

  // 3. Recovery Notice
  recoveryNotice: {
    documentTitle: 'RECOVERY NOTICE',
    sectionOrder: ['TO', 'SUBJECT', 'TRANSACTION_DETAILS', 'DEFAULT', 'OUTSTANDING_AMOUNT', 'DEMAND', 'PAYMENT_DEADLINE', 'LEGAL_CONSEQUENCES', 'SIGNATURE'],
    mandatorySections: ['TO', 'SUBJECT', 'DEFAULT', 'OUTSTANDING_AMOUNT', 'DEMAND', 'PAYMENT_DEADLINE', 'LEGAL_CONSEQUENCES', 'SIGNATURE'],
    sectionContent: {
      TO: 'To,\n{{respondentName}}\n{{respondentAddress}}',
      SUBJECT: 'SUBJECT: Notice for Recovery of Outstanding Dues',
      TRANSACTION_DETAILS: '1. That a loan was disbursed to you on the terms established in the loan agreement.\n2. That the loan tenure and repayment schedule was mutually agreed upon.',
      DEFAULT: 'That you have defaulted on monthly installments starting from the scheduled payment logs.',
      OUTSTANDING_AMOUNT: 'The outstanding balance is INR {{loanAmount}} as on date.',
      DEMAND: 'Immediate repayment of the outstanding loan balance is hereby demanded.',
      PAYMENT_DEADLINE: 'Within 7 working days from the date of this recovery notice.',
      LEGAL_CONSEQUENCES: 'Failing which, we will proceed with summary recovery suits and mortgage foreclosure actions.',
      SIGNATURE: 'Regards,\n\nAdv. Suresh Mehta\nCounsel for Creditor'
    },
    signatureLayout: 'right'
  },

  // 4. Show Cause Notice
  showCauseNotice: {
    documentTitle: 'SHOW CAUSE NOTICE',
    sectionOrder: ['TO', 'SUBJECT', 'BACKGROUND', 'DEFAULT', 'EXPLANATION', 'DEADLINE', 'SIGNATURE'],
    mandatorySections: ['TO', 'SUBJECT', 'BACKGROUND', 'DEFAULT', 'EXPLANATION', 'DEADLINE', 'SIGNATURE'],
    sectionContent: {
      TO: 'To,\n{{receiverName}}\n{{receiverAddress}}',
      SUBJECT: 'SUBJECT: Show Cause Notice for disciplinary action/default',
      BACKGROUND: 'It has been brought to the notice of the management that you have committed violations.',
      DEFAULT: 'The facts of default: {{facts}}',
      EXPLANATION: 'You are hereby directed to show cause as to why appropriate disciplinary action should not be initiated against you.',
      DEADLINE: 'Submit your written response within {{compliancePeriod}} from the receipt of this notice.',
      SIGNATURE: 'For LexCorp Tech Private Limited\n\nAuthorized Signatory'
    },
    signatureLayout: 'left'
  },

  // 5. Eviction Notice
  evictionNotice: {
    documentTitle: 'EVICTION NOTICE',
    sectionOrder: ['TO', 'SUBJECT', 'PROPERTY_DETAILS', 'DEFAULT', 'TERM', 'TERMINATION', 'SIGNATURE'],
    mandatorySections: ['TO', 'SUBJECT', 'PROPERTY_DETAILS', 'DEFAULT', 'TERM', 'TERMINATION', 'SIGNATURE'],
    sectionContent: {
      TO: 'To,\n{{tenantName}}\n{{tenantAddress}}',
      SUBJECT: 'SUBJECT: Notice of Eviction and Termination of Tenancy',
      PROPERTY_DETAILS: 'The leased premises: {{propertyAddress}}',
      DEFAULT: 'You are in violation of tenancy rules due to non-payment of rent/unauthorized use: {{facts}}',
      TERM: 'Your tenancy lease agreement stands terminated.',
      TERMINATION: 'You are directed to vacate the premises and handover peaceful possession within {{compliancePeriod}}.',
      SIGNATURE: 'Lessor: {{landlordName}}'
    },
    signatureLayout: 'left'
  },

  // 6. Employment Agreement
  employmentAgreement: {
    documentTitle: 'EMPLOYMENT AGREEMENT',
    sectionOrder: ['PARTIES', 'RECITALS', 'APPOINTMENT', 'JOB_ROLE', 'SALARY', 'WORK_HOURS', 'BENEFITS', 'LEAVE_POLICY', 'CONFIDENTIALITY', 'TERMINATION', 'DISPUTE_RESOLUTION', 'SIGNATURES'],
    mandatorySections: ['PARTIES', 'APPOINTMENT', 'JOB_ROLE', 'SALARY', 'TERMINATION', 'SIGNATURES'],
    optionalSections: ['RECITALS', 'WORK_HOURS', 'BENEFITS', 'LEAVE_POLICY', 'CONFIDENTIALITY', 'DISPUTE_RESOLUTION'],
    sectionContent: {
      PARTIES: 'This Employment Agreement (the "Agreement") is entered into between:\n\nEmployer: {{employerName}}\nEmployee: {{employeeName}}',
      RECITALS: 'WHEREAS the Employer desires to hire the services of the Employee, and the Employee agrees to provide job duties under these conditions.',
      APPOINTMENT: 'The Employee is appointed as {{jobTitle}} starting {{joiningDate}}.',
      JOB_ROLE: 'The Employee shall design modules, deploy platforms, and perform standard software development tasks.',
      SALARY: 'The compensation is INR {{compensation}} CTC per annum, payable in monthly intervals.',
      WORK_HOURS: 'Working hours are standard corporate timings: 9:00 AM to 6:00 PM, Monday to Friday.',
      BENEFITS: 'Medical health policies, insurance options, and standard training benefits apply.',
      LEAVE_POLICY: '24 annual paid leaves plus statutory national holidays.',
      CONFIDENTIALITY: 'The Employee agrees to keep all corporate proprietary software code and trade secrets confidential.',
      TERMINATION: 'Either party may terminate the agreement with a notice period of {{terminationTerms}}.',
      DISPUTE_RESOLUTION: 'Any disputes arising under this agreement will be settled through arbitration under New Delhi jurisdiction.',
      SIGNATURES: 'For Employer: _________________\nDevendra Singh (Director)\n\nEmployee: _________________\n{{employeeName}}'
    },
    signatureLayout: 'split'
  },

  // 7. Rent Agreement
  rentAgreement: {
    documentTitle: 'RENT AGREEMENT',
    sectionOrder: ['LESSOR', 'LESSEE', 'PROPERTY_DETAILS', 'RENT', 'SECURITY_DEPOSIT', 'TERM', 'MAINTENANCE', 'RESTRICTIONS', 'DEFAULT', 'TERMINATION', 'SIGNATURES'],
    mandatorySections: ['LESSOR', 'LESSEE', 'PROPERTY_DETAILS', 'RENT', 'SECURITY_DEPOSIT', 'TERM', 'SIGNATURES'],
    optionalSections: ['MAINTENANCE', 'RESTRICTIONS', 'DEFAULT', 'TERMINATION'],
    sectionContent: {
      LESSOR: 'LESSOR (Landlord):\n{{landlordName}}, residing at {{landlordAddress}}',
      LESSEE: 'LESSEE (Tenant):\n{{tenantName}}, residing at {{tenantAddress}}',
      PROPERTY_DETAILS: 'PROPERTY DETAILS:\nThe leased premises is flat/plot: {{propertyAddress}}',
      RENT: 'RENT:\nThe monthly rent is INR {{monthlyRent}} payable before the 5th day of each calendar month.',
      SECURITY_DEPOSIT: 'SECURITY DEPOSIT:\nThe tenant has deposited INR {{securityDeposit}} which is refundable upon lease vacation.',
      TERM: 'LEASE TERM:\nThe lease is for a period of {{duration}} starting from {{startDate}}.',
      MAINTENANCE: 'MAINTENANCE:\nLessor handles major structural repairs; Lessee pays standard electricity and society maintenance charges.',
      RESTRICTIONS: 'RESTRICTIONS:\nNo commercial usage or sub-letting of the premises is permitted.',
      DEFAULT: 'DEFAULT:\nNon-payment of rent for two consecutive months triggers lease expiration.',
      TERMINATION: 'TERMINATION:\nThe agreement can be terminated by either party with a written notice period of {{noticePeriod}}.',
      SIGNATURES: 'Lessor: _________________\n{{landlordName}}\n\nLessee: _________________\n{{tenantName}}\n\nWitnesses:\n1. _________________\n2. _________________'
    },
    signatureLayout: 'split'
  },

  // 8. Affidavit
  affidavit: {
    documentTitle: 'AFFIDAVIT',
    sectionOrder: ['TITLE', 'DEPONENT_DETAILS', 'SOLEMN_AFFIRMATION', 'STATEMENTS', 'VERIFICATION', 'DEPONENT_SIGNATURE', 'NOTARY'],
    mandatorySections: ['TITLE', 'DEPONENT_DETAILS', 'SOLEMN_AFFIRMATION', 'STATEMENTS', 'VERIFICATION', 'DEPONENT_SIGNATURE', 'NOTARY'],
    sectionContent: {
      TITLE: 'BEFORE THE NOTARY PUBLIC / OATH COMMISSIONER',
      DEPONENT_DETAILS: 'I, {{deponentName}}, residing at {{deponentAddress}}, son/spouse of {{guardianName}}, do hereby solemnly state on oath:',
      SOLEMN_AFFIRMATION: 'I do hereby solemnly affirm and declare as under:',
      STATEMENTS: '{{declarations}}',
      VERIFICATION: 'Verified at {{verificationPlace}} that the contents of this affidavit are true and correct to the best of my knowledge.',
      DEPONENT_SIGNATURE: 'DEPONENT: _________________\n{{deponentName}}',
      NOTARY: 'Sworn and signed before me this day.\n\nNOTARY PUBLIC'
    },
    signatureLayout: 'notary_deponent'
  },

  // 9. Written Statement
  writtenStatement: {
    documentTitle: 'WRITTEN STATEMENT',
    sectionOrder: ['COURT_TITLE', 'CASE_DETAILS', 'PRELIMINARY_OBJECTIONS', 'PARA_WISE_REPLY', 'ADDITIONAL_SUBMISSIONS', 'PRAYER', 'VERIFICATION', 'SIGNATURE'],
    mandatorySections: ['COURT_TITLE', 'CASE_DETAILS', 'PARA_WISE_REPLY', 'PRAYER', 'VERIFICATION', 'SIGNATURE'],
    optionalSections: ['PRELIMINARY_OBJECTIONS', 'ADDITIONAL_SUBMISSIONS'],
    sectionContent: {
      COURT_TITLE: 'IN THE COURT OF {{courtName}}',
      CASE_DETAILS: 'Suit No: {{caseNumber}}\n\nPlaintiff: {{petitioner}}\nVersus\nDefendant: {{respondent}}',
      PRELIMINARY_OBJECTIONS: '1. That the suit is not maintainable under the Code of Civil Procedure.\n2. That the plaintiff has no cause of action against the defendant.',
      PARA_WISE_REPLY: 'The Defendant replies paragraph-wise as under:\n1. Denied that the defendant committed any breach. The facts are: {{facts}}',
      ADDITIONAL_SUBMISSIONS: 'That the defendant has acted in full compliance with industry standards and contract laws.',
      PRAYER: 'Therefore, the Defendant prays that this Honorable Court dismiss the plaintiff\'s suit with exemplary costs.',
      VERIFICATION: 'Verified at {{verificationPlace}} that the contents are true and correct.',
      SIGNATURE: 'Defendant: _________________\nThrough Counsel: Advocate'
    },
    signatureLayout: 'right'
  },

  // 10. Plaint
  plaint: {
    documentTitle: 'PLAINT',
    sectionOrder: ['COURT_TITLE', 'CASE_DETAILS', 'FACTS_OF_CASE', 'LEGAL_GROUNDS', 'JURISDICTION_CLAUSE', 'PRAYER', 'VERIFICATION', 'SIGNATURE'],
    mandatorySections: ['COURT_TITLE', 'CASE_DETAILS', 'FACTS_OF_CASE', 'LEGAL_GROUNDS', 'PRAYER', 'VERIFICATION', 'SIGNATURE'],
    sectionContent: {
      COURT_TITLE: 'IN THE COURT OF {{courtName}}',
      CASE_DETAILS: 'Suit / Case No: [To be assigned]\n\nPlaintiff: {{petitionerName}}\nVersus\nDefendant: {{respondentName}}',
      FACTS_OF_CASE: 'The Plaintiff begs to submit the facts as under:\n1. That the Plaintiff and Defendant entered into an agreement.\n2. The dispute facts: {{caseDetails}}',
      LEGAL_GROUNDS: 'A. The Defendant violated terms of agreement and contract laws.\nB. The violations are: {{grounds}}',
      JURISDICTION_CLAUSE: 'The cause of action arose within the territorial limits of this court, which has jurisdiction to try this suit.',
      PRAYER: 'Therefore, the Plaintiff prays that this Court decree in favor of Plaintiff directing recovery of INR {{reliefSought}}.',
      VERIFICATION: 'Verified at {{verificationPlace}} that the facts are true and correct.',
      SIGNATURE: 'Plaintiff: _________________\nThrough Counsel: Advocate'
    },
    signatureLayout: 'right'
  },

  // 11. Bail Application
  bailApplication: {
    documentTitle: 'BAIL APPLICATION',
    sectionOrder: ['COURT', 'CASE_DETAILS', 'FACTS', 'GROUNDS_FOR_BAIL', 'UNDERTAKINGS', 'PRAYER', 'SIGNATURE'],
    mandatorySections: ['COURT', 'CASE_DETAILS', 'FACTS', 'GROUNDS_FOR_BAIL', 'UNDERTAKINGS', 'PRAYER', 'SIGNATURE'],
    sectionContent: {
      COURT: 'IN THE COURT OF THE SESSIONS JUDGE, {{courtName}}',
      CASE_DETAILS: 'FIR No: {{caseNumber}}\nU/S: 420 IPC\nPolice Station: {{policeStation}}\n\nIn the matter of:\nState vs. {{complainantName}}',
      FACTS: 'APPLICATION ON BEHALF OF ACCUSED FOR GRANT OF BAIL\n\nMost Respectfully Showeth:\n1. That the accused was arrested on allegations which are civil disputes: {{incidentDescription}}',
      GROUNDS_FOR_BAIL: 'A. The accused has deep roots in society and is a respectable citizen.\nB. No custodial interrogation is required as all documents are in custody.',
      UNDERTAKINGS: 'The accused undertakes to join trial inquiries and not influence witnesses.',
      PRAYER: 'It is therefore prayed that this Court grant bail directions and release the accused.',
      SIGNATURE: 'Accused: _________________\nThrough Counsel: Advocate'
    },
    signatureLayout: 'right'
  },

  // 12. NDA
  nda: {
    documentTitle: 'NON-DISCLOSURE AGREEMENT',
    sectionOrder: ['PARTIES', 'RECITALS', 'CONFIDENTIALITY', 'TERM', 'DISPUTE_RESOLUTION', 'SIGNATURES'],
    mandatorySections: ['PARTIES', 'CONFIDENTIALITY', 'TERM', 'SIGNATURES'],
    sectionContent: {
      PARTIES: 'This Non-Disclosure Agreement (the "Agreement") is signed between:\n\nDisclosing Party: {{party1}}\nReceiving Party: {{party2}}',
      RECITALS: 'WHEREAS the Disclosing Party has proprietary data and wishes to restrict disclosure during evaluations.',
      CONFIDENTIALITY: 'Receiving party agrees to maintain strict confidentiality and not share technical records with competitors.',
      TERM: 'Effective for {{duration}} from the date of execution.',
      DISPUTE_RESOLUTION: 'Arbitration under the Arbitration Act at {{jurisdiction}}.',
      SIGNATURES: 'Disclosing Party: _________________\n\nReceiving Party: _________________'
    },
    signatureLayout: 'split'
  },

  // 13. Power of Attorney
  powerOfAttorney: {
    documentTitle: 'POWER OF ATTORNEY',
    sectionOrder: ['PARTIES', 'RECITALS', 'PROPERTY_DETAILS', 'POWERS', 'VALIDITY', 'REVOCATION', 'SIGNATURES'],
    mandatorySections: ['PARTIES', 'POWERS', 'VALIDITY', 'SIGNATURES'],
    sectionContent: {
      PARTIES: 'I, {{principalName}}, residing at {{petitionerAddress}}, hereby appoint:\n\nAttorney: {{attorneyName}}, relationship: {{relationship}}, residing at {{respondentAddress}}',
      RECITALS: 'WHEREAS I am unable to personally manage my affairs due to absence, I hereby depute my attorney.',
      PROPERTY_DETAILS: 'Property details: {{propertyDescription}}',
      POWERS: 'My Attorney is granted power to: {{powers}}',
      VALIDITY: 'This Power of Attorney is {{validity}}.',
      REVOCATION: 'Conditions of revocation: {{revocation}}',
      SIGNATURES: 'Principal: _________________\n\nAttorney: _________________'
    },
    signatureLayout: 'split'
  },

  // 14. Consumer Complaint
  consumerComplaint: {
    documentTitle: 'CONSUMER COMPLAINT',
    sectionOrder: ['COURT_TITLE', 'CASE_DETAILS', 'FACTS', 'LEGAL_GROUNDS', 'PRAYER', 'VERIFICATION', 'SIGNATURE'],
    mandatorySections: ['COURT_TITLE', 'CASE_DETAILS', 'FACTS', 'LEGAL_GROUNDS', 'PRAYER', 'VERIFICATION', 'SIGNATURE'],
    sectionContent: {
      COURT_TITLE: 'BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION AT {{courtName}}',
      CASE_DETAILS: 'Complaint Case No: [To be assigned]\n\nComplainant: {{complainantName}}\nVersus\nOpposite Party: {{oppositeParty}}',
      FACTS: '1. That the Complainant purchased {{productService}} on {{purchaseDate}} under Invoice {{invoiceNumber}}.\n2. The defect details: {{complaintDetails}}',
      LEGAL_GROUNDS: 'A. Refusal of service constitute deficiency under Consumer Protection Act.\nB. The opposite party is liable for damages.',
      PRAYER: 'The Complainant prays that the Opposite Party refund INR {{compensation}} plus pay costs for harassment.',
      VERIFICATION: 'Verified at {{verificationPlace}} that the facts are true.',
      SIGNATURE: 'Complainant: _________________'
    },
    signatureLayout: 'left'
  },

  // 15. Divorce Petition
  divorcePetition: {
    documentTitle: 'DIVORCE PETITION',
    sectionOrder: ['COURT_TITLE', 'CASE_DETAILS', 'FACTS', 'PRAYER', 'VERIFICATION', 'SIGNATURE'],
    mandatorySections: ['COURT_TITLE', 'CASE_DETAILS', 'FACTS', 'PRAYER', 'VERIFICATION', 'SIGNATURE'],
    sectionContent: {
      COURT_TITLE: 'BEFORE THE HONORABLE FAMILY COURT, {{courtName}}',
      CASE_DETAILS: 'Petition Case No: [To be assigned]\n\nPetitioner: {{petitionerName}}\nVersus\nRespondent: {{respondentName}}',
      FACTS: '1. That the parties were married on {{marriageDate}} at {{marriagePlace}}.\n2. That marital compatibility is disrupted and parties live separately: {{facts}}',
      PRAYER: 'Therefore, the Petitioner prays for decree of dissolution of marriage.',
      VERIFICATION: 'Verified at {{verificationPlace}} that the contents are true.',
      SIGNATURE: 'Petitioner: _________________\nThrough Counsel: Advocate'
    },
    signatureLayout: 'right'
  }
};

/**
 * Builds a dynamic fallback structure for any template that is not explicitly registered in TEMPLATE_STRUCTURES.
 * This dynamically adapts to the template's category and fields.
 */
export function getFallbackStructure(template: TemplateMetadata): TemplateStructure {
  const category = template.category;
  const uppercaseTitle = template.title.toUpperCase();
  
  if (category === 'Affidavits') {
    return {
      documentTitle: uppercaseTitle,
      sectionOrder: ['TITLE', 'DEPONENT_DETAILS', 'SOLEMN_AFFIRMATION', 'STATEMENTS', 'VERIFICATION', 'DEPONENT_SIGNATURE'],
      mandatorySections: ['TITLE', 'DEPONENT_DETAILS', 'STATEMENTS', 'VERIFICATION', 'DEPONENT_SIGNATURE'],
      sectionContent: {
        TITLE: 'BEFORE THE NOTARY PUBLIC',
        DEPONENT_DETAILS: 'I, {{deponentName}}, residing at {{deponentAddress}}, do hereby solemnly state on oath:',
        SOLEMN_AFFIRMATION: 'I do hereby solemnly affirm and declare as under:',
        STATEMENTS: '{{declarations}}',
        VERIFICATION: 'Verified at {{verificationPlace}} that the contents of this affidavit are true.',
        DEPONENT_SIGNATURE: 'DEPONENT: _________________'
      },
      signatureLayout: 'notary_deponent'
    };
  }
  
  if (category === 'Civil' || category === 'Criminal' || category === 'Court Pleadings') {
    const isCriminal = category === 'Criminal';
    return {
      documentTitle: uppercaseTitle,
      sectionOrder: ['COURT_TITLE', 'CASE_DETAILS', 'FACTS', 'LEGAL_GROUNDS', 'PRAYER', 'VERIFICATION', 'SIGNATURE'],
      mandatorySections: ['COURT_TITLE', 'CASE_DETAILS', 'FACTS', 'PRAYER', 'VERIFICATION', 'SIGNATURE'],
      sectionContent: {
        COURT_TITLE: 'IN THE COURT OF {{courtName}}',
        CASE_DETAILS: `Case No: [To be assigned]\n\n${isCriminal ? 'Complainant' : 'Plaintiff'}: {{petitionerName}} / {{complainantName}}\nVersus\n${isCriminal ? 'Accused' : 'Respondent'}: {{respondentName}} / {{accusedName}}`,
        FACTS: 'FACTS OF THE MATTER:\n{{caseDetails}} / {{incidentDescription}}',
        LEGAL_GROUNDS: 'LEGAL GROUNDS:\n{{grounds}} / {{reliefRequested}}',
        PRAYER: 'PRAYER:\nTherefore, the petitioner prays that this Honorable Court grant appropriate relief.',
        VERIFICATION: 'VERIFICATION:\nVerified at {{verificationPlace}} that the contents are true and correct.',
        SIGNATURE: 'Petitioner / Complainant: _________________\nThrough Counsel: Advocate'
      },
      signatureLayout: 'right'
    };
  }

  if (category === 'Contracts' || category === 'Employment' || category === 'Property' || category === 'Banking' || category === 'Corporate') {
    return {
      documentTitle: uppercaseTitle,
      sectionOrder: ['PARTIES', 'RECITALS', 'TERMS', 'TERMINATION', 'SIGNATURES'],
      mandatorySections: ['PARTIES', 'TERMS', 'SIGNATURES'],
      sectionContent: {
        PARTIES: 'This Agreement is entered into between:\n\nParty A: {{landlordName}} / {{employerName}} / {{transferorName}} / {{companyName}} / {{party1}}\nParty B: {{tenantName}} / {{employeeName}} / {{transfereeName}} / {{oppositeParty}} / {{party2}}',
        RECITALS: 'WHEREAS the parties desire to enter into this agreement under the terms established herein.',
        TERMS: 'TERMS AND CONDITIONS:\n{{keyTerms}} / {{agenda}} / {{purpose}} / {{details}}',
        TERMINATION: 'TERMINATION:\nThis agreement can be terminated by either party according to mutual terms.',
        SIGNATURES: 'First Party Signature: _________________\n\nSecond Party Signature: _________________'
      },
      signatureLayout: 'split'
    };
  }

  // default general layout
  return {
    documentTitle: uppercaseTitle,
    sectionOrder: ['PARTIES', 'DETAILS', 'SIGNATURE'],
    mandatorySections: ['PARTIES', 'DETAILS', 'SIGNATURE'],
    sectionContent: {
      PARTIES: 'Parties Involved: {{parties}} / {{senderName}} vs {{receiverName}}',
      DETAILS: 'DETAILS OF THE MATTER:\n{{details}} / {{facts}}',
      SIGNATURE: 'Signature: _________________'
    },
    signatureLayout: 'left'
  };
}

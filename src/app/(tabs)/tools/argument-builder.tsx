import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Keyboard,
  Clipboard,
  Share,
  Animated,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MarkdownRenderer } from '@/components/ui/documents';
import { useToastContext, useThemeContext } from '@/providers';
import { useAuthGuard } from '@/navigation/guards';
import { streamAIResponse } from '@/api/client';
import { ChatService } from '@/services/chat.service';
import { Shadows, Radius, Spacing } from '@/theme';
import { ChatMessage, ChatAttachment, CaseWorkspace } from '@/types';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
import { useChat } from '@/hooks/use-chat';
import { useChatStore } from '@/store/chat';
import { useSpeechRecognition, SpeechLanguage } from '@/hooks/use-speech-recognition';
import { CaseSelectionModal } from '@/components/ui/legal/CaseSelectionModal';
import { CaseService } from '@/services/case.service';

const { width, height } = Dimensions.get('window');

// 12 Structured Sections for Court Preparation Workspace (Step 3)
interface PrepSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  content: string;
  confidence: number; // 0 to 100
  why: string;
}

// 6 Court Preparation Intelligence tools (Step 4)
interface IntelligenceTool {
  id: string;
  title: string;
  icon: string;
  content: string;
  description: string;
}

const getSectionsForStyle = (style: string): PrepSection[] => {
  const getExecSummary = (s: string) => {
    switch(s) {
      case 'Courtroom Style':
        return `• Complainant respectfully submits that the case stands on solid statutory ground under Section 138.\n• Cheque signatures are admitted, automatically shifting the burden of proof to the accused under Section 139.\n• Statutory notice delivered on 14th May 2026 was ignored; no defense has been raised within the 15-day limitation period.`;
      case 'Formal':
        return `• Memorandum in support of the Complainant's statutory claim under the Negotiable Instruments Act, 1881.\n• Signatures on the subject instrument are admitted, triggering the operation of Section 139 presumptions.\n• Notice was served in compliance with due process on 14th May 2026, and no reply was registered.`;
      case 'Judge Friendly':
        return `• Straightforward Section 138 case for bounced cheque (INR 5,00,000).\n• Accused admits signature on the cheque.\n• Accused failed to reply to the demand notice. Presumption under Section 139 remains fully unrebutted.`;
      case 'Senior Counsel Style':
        return `• The defense is a legal impossibility; once signatures are admitted, the statutory presumption is absolute.\n• The accused's complete failure to reply to the legal notice demonstrates a total lack of any bonafide defense.\n• The Complainant seeks immediate conviction and directions for 20% interim compensation under Section 143A.`;
      case 'Aggressive Litigation':
        return `• Accused is guilty of deliberate default on a commercial obligation of INR 5,00,000.\n• Silence after receiving the notice is an admission of guilt. The defense has zero documentary evidence to rebut liability.\n• Stop-payment instructions are a transparent cover-up for insolvency. Complainant demands maximum criminal penalties.`;
      case 'Neutral':
        return `• Dispute concerning dishonour of Cheque No. 445210 for INR 5,00,000 due to insufficient funds.\n• Demand notice served on 14th May 2026. No payment or reply received within 15 days.\n• Compliance with Section 138 requirements is documented by postal records.`;
      case 'Concise':
        return `• Cheque: Bounced due to insufficient funds (INR 5,00,000).\n• Notice: Served 14 May 2026; no reply/payment received.\n• Presumption: Active under Sec 139 NI Act. Accused signature is admitted.`;
      case 'Detailed':
        return `• The Complainant Apex Logistics Corp seeks conviction of accused Nitin Kumar under Section 138 NI Act.\n• The dispute arose from invoices for commercial credit. Cheque No. 445210 issued in discharge of this debt bounced on 30th April 2026.\n• Notice delivered on 14th May 2026 was ignored. Under Section 139, the presumption of a legally enforceable debt holds absolute, as established in Rangappa v. Sri Mohan.`;
      case 'Plain English':
        return `• We are prosecuting a bounced cheque case. The customer gave us a Rs. 5,00,000 cheque that bounced due to low funds.\n• We sent a legal letter, but they did not reply or pay within the 15-day limit.\n• Because they signed the cheque, the law assumes they owe us the money unless they prove otherwise.`;
      case 'Hindi Legal Drafting':
        return `• शिकायतकर्ता आदरपूर्वक प्रस्तुत करता है कि मामला धारा 138 के तहत पूर्णतः स्थापित है।\n• चेक पर हस्ताक्षर स्वीकृत हैं, जिससे धारा 139 के तहत साबित करने का भार स्वतः आरोपी पर स्थानांतरित हो जाता है।\n• 14 मई 2026 को भेजे गए कानूनी नोटिस का 15 दिनों की सीमा के भीतर आरोपी द्वारा कोई जवाब नहीं दिया गया है।`;
      default:
        return `• Matter listed for tomorrow's hearing for admission/interim orders.\n• Primary focus remains establishing the statutory presumption under Section 139 of the Negotiable Instruments Act.`;
    }
  };

  const getCaseOverview = (s: string) => {
    switch(s) {
      case 'Plain English':
        return `• Complainant: Apex Logistics Corp\n• Accused: Nitin Kumar\n• Issue: Bounced cheque of Rs 5,00,000. Notice delivered on May 14, 2026. No payment made.`;
      case 'Hindi Legal Drafting':
        return `• शिकायतकर्ता: एपेक्स लॉजिस्टिक्स कॉर्प\n• आरोपी: नितिन कुमार (प्रोपराइटर)\n• विवाद: चेक नंबर 445210 राशि रु. 5,00,000 'अपर्याप्त निधि' के कारण बाउंस हुआ। नोटिस दिनांक 12 मई 2026 को भेजा गया।`;
      case 'Concise':
        return `• Apex Logistics Corp v. Nitin Kumar (Proprietor)\n• Cheque No: 445210 (INR 5,00,000)\n• Reason: Funds Insufficient\n• Status: Demand notice unpaid.`;
      default:
        return `• **Complainant**: Apex Logistics Corp\n• **Accused**: Nitin Kumar (Proprietor)\n• **Dispute**: Cheque No. 445210 for INR 5,00,000 bounced with reason "Funds Insufficient". Notice sent on 12th May 2026, received on 14th May 2026. No payment received.`;
    }
  };

  const getMaterialFacts = (s: string) => {
    switch(s) {
      case 'Plain English':
        return `1. Complainant gave credit services to the accused.\n2. Accused gave a cheque for Rs. 5,00,000 to clear the bill.\n3. Cheque bounced on April 30.\n4. Notice delivered on May 14. Accused did not reply.`;
      case 'Hindi Legal Drafting':
        return `1. शिकायतकर्ता ने आरोपी को लॉजिस्टिक्स सेवाओं के लिए व्यावसायिक ऋण प्रदान किया था।\n2. इस दायित्व के भुगतान के लिए आरोपी ने दिनांक 28 अप्रैल 2026 का चेक जारी किया।\n3. बैंक ने 30 अप्रैल 2026 को अपर्याप्त निधि के कारण चेक वापस कर दिया।\n4. मांग नोटिस 14 मई 2026 को सफलतापूर्वक प्राप्त कराया गया।`;
      default:
        return `1. Complainant advanced short-term commercial credit to the accused for logistics services.\n2. In discharge of this liability, the accused issued Cheque No. 445210 dated 28th April 2026.\n3. The bank returned the cheque dishonoured on 30th April 2026.\n4. Statutory Demand Notice served successfully on 14th May 2026.`;
    }
  };

  const getChronology = (s: string) => {
    switch(s) {
      case 'Hindi Legal Drafting':
        return `📅 **28 अप्रैल 2026**: नितिन कुमार द्वारा चेक जारी किया गया।\n📅 **30 अप्रैल 2026**: बैंक द्वारा चेक अनादरित लौटाया गया।\n📅 **12 मई 2026**: कानूनी नोटिस भेजा गया।\n📅 **14 मई 2026**: आरोपी को नोटिस प्राप्त हुआ।\n📅 **10 जून 2026**: शिकायत दर्ज कराई गई।`;
      default:
        return `📅 **28 Apr 2026**: Cheque issued by Nitin Kumar.\n📅 **30 Apr 2026**: Cheque presented & returned unpaid.\n📅 **12 May 2026**: Legal Notice dispatched via Registered Post.\n📅 **14 May 2026**: Notice delivered to accused address.\n📅 **29 May 2026**: Limitation period for payment expired.\n📅 **10 Jun 2026**: Complaint filed before Magistrate.`;
    }
  };

  const getLegalIssues = (s: string) => {
    switch(s) {
      case 'Plain English':
        return `1. Was the cheque issued for a real debt?\n2. Did the accused prove they do not owe the money?\n3. Do minor typing errors in credit invoices change the case?`;
      case 'Hindi Legal Drafting':
        return `1. क्या चेक वैध ऋण या दायित्व के भुगतान में जारी किया गया था?\n2. क्या आरोपी धारा 139 के तहत वैधानिक अनुमान को सफलतापूर्वक खंडित करने में सक्षम रहा है?\n3. क्या क्रेडिट चालान में मामूली विसंगतियाँ धारा 138 की कार्यवाही को अमान्य करती हैं?`;
      default:
        return `1. Whether the cheque was issued in discharge of a legally enforceable debt or liability?\n2. Whether the accused has successfully rebutted the statutory presumption under Section 139?\n3. Whether minor discrepancies in credit invoices invalidate the NI Act proceedings?`;
    }
  };

  const getApplicableLaws = (s: string) => {
    switch(s) {
      case 'Hindi Legal Drafting':
        return `• **धारा 138, एनआई एक्ट**: अपर्याप्त निधि के लिए चेक बाउंस होना।\n• **धारा 139, एनआई एक्ट**: चेक धारक के पक्ष में वैधानिक अनुमान।\n• **धारा 27, सामान्य खंड अधिनियम**: डाक द्वारा नोटिस तामील का अनुमान।`;
      default:
        return `• **Section 138, NI Act**: Dishonour of cheque for insufficiency of funds.\n• **Section 139, NI Act**: Presumption in favour of holder of cheque.\n• **Section 118, NI Act**: Presumptions as to negotiable instruments.\n• **Section 27, General Clauses Act**: Presumption of service via post.`;
    }
  };

  const getJudgments = (s: string) => {
    switch(s) {
      case 'Hindi Legal Drafting':
        return `• **रंगप्पा बनाम श्री मोहन (2010) 11 SCC 441**\n*सिद्धांत*: धारा 139 के तहत अनुमान में कानूनी रूप से लागू होने योग्य ऋण का अस्तित्व शामिल है।\n• **सम्पैली सत्यनारायण राव बनाम इसरो (2016)**\n*सिद्धांत*: सुरक्षा चेक भी धारा 138 के अंतर्गत दायित्व आकर्षित करता है।`;
      default:
        return `• **Rangappa v. Sri Mohan (2010) 11 SCC 441**\n*Ratio*: Presumption mandated by Section 139 includes the existence of a legally enforceable debt.\n• **Sampelly Satyanarayana Rao v. ISRO (2016)**\n*Ratio*: Dishonour of a security cheque issued against credit facilities attracts Section 138 liability once the debt matures.`;
    }
  };

  const getWrittenArgs = (s: string) => {
    switch(s) {
      case 'Courtroom Style':
        return `• Complainant submits that signatures are admitted, invoking Section 139's statutory presumption.\n• No stop-payment or theft report was filed. The security cheque argument must fail in law.\n• Accused has failed to place any positive evidence to rebut the debt.`;
      case 'Plain English':
        return `• The customer admits they signed the cheque, so they must prove they don't owe the money.\n• They never filed a police report claiming the cheque was stolen or lost.\n• Without proof, the customer must be held responsible under the law.`;
      case 'Hindi Legal Drafting':
        return `• आरोपी ने चेक पर हस्ताक्षर स्वीकार किए हैं; धारा 139 का अनुमान लागू होता है।\n• चोरी या खोने की कोई पुलिस शिकायत दर्ज नहीं कराई गई है। सुरक्षा चेक का तर्क अमान्य है।\n• आरोपी ऋण के अस्तित्व का खंडन करने के लिए कोई सकारात्मक सबूत पेश करने में विफल रहा है।`;
      default:
        return `• Accused does not dispute signatures on the cheque; execution is admitted.\n• Once signatures are admitted, court must draw Section 139 presumption.\n• The defense of "stolen cheque" or "misplaced security" is unsupported by any police complaint or stop-payment instruction.`;
    }
  };

  const getCounterArgs = (s: string) => {
    switch(s) {
      case 'Hindi Legal Drafting':
        return `• **बचाव पक्ष का तर्क**: चेक केवल सुरक्षा के रूप में जारी किया गया था, कोई वास्तविक ऋण देय नहीं था।\n• **बचाव पक्ष का तर्क**: आरोपी का पता बदलने के कारण कानूनी नोटिस कभी तामील नहीं हुआ।`;
      default:
        return `• **Defense claim**: Cheque was issued purely as security, and there was no actual outstanding debt.\n• **Defense claim**: The notice was never served on the accused as they relocated.`;
    }
  };

  const getRebuttals = (s: string) => {
    switch(s) {
      case 'Hindi Legal Drafting':
        return `• **सुरक्षा चेक बचाव का उत्तर**: सम्पैली निर्णय का संदर्भ लें। परिपक्व ऋण सुरक्षा चेक पर भी दायित्व आकर्षित करता है।\n• **नोटिस तामील बचाव का उत्तर**: डाक रसीद और ट्रैक रिपोर्ट पेश करें। धारा 27 का लाभ लें।`;
      default:
        return `• **To Security Cheque Defense**: Cite *Sampelly*. The debt became due when goods were delivered under invoice. Security cheques are not immune.\n• **To Service Defense**: Produce postal receipt & tracking report showing "Delivered". Cite Section 27 of the General Clauses Act.`;
    }
  };

  const getEvidenceMapping = (s: string) => {
    switch(s) {
      case 'Hindi Legal Drafting':
        return `• **दस्तावेज**: मूल चेक संख्या 445210 (प्रदर्श P-1, पृष्ठ 12)\n• **दस्तावेज**: बैंक रिटर्न मेमो दिनांक 30 अप्रैल (प्रदर्श P-2, पृष्ठ 14)\n• **दस्तावेज**: डाक रसीद और ट्रैकिंग रिपोर्ट (प्रदर्श P-3, पृष्ठ 15)`;
      default:
        return `• **Argument**: Execution and delivery of cheque\n  - *Evidence*: Original Cheque No. 445210 (Exhibit P-1, Page 12)\n• **Argument**: Dishonour confirmation\n  - *Evidence*: Bank Return Memo dated 30th April (Exhibit P-2, Page 14)\n• **Argument**: Demand and Post Service\n  - *Evidence*: Consignment Receipt & Postal Tracking (Exhibit P-3, Page 15)`;
    }
  };

  const getPrayer = (s: string) => {
    switch(s) {
      case 'Hindi Legal Drafting':
        return `शिकायतकर्ता आदरपूर्वक प्रार्थना करता है कि:\n1. आरोपी को धारा 138 के तहत दोषी ठहराया जाए और सजा दी जाए।\n2. आरोपी को चेक राशि का दोगुना (रु. 10,00,000) मुआवजा देने का निर्देश दिया जाए।`;
      default:
        return `Complainant prays that this Hon'ble Court be pleased to:\n1. Summon, try and convict the Accused under Section 138 of NI Act.\n2. Direct the Accused to pay double the cheque amount (INR 10,00,000) as fine/compensation to the Complainant.`;
    }
  };

  return [
    {
      id: 'exec-summary',
      title: '1. Executive Summary',
      icon: 'briefcase-outline',
      description: 'Short hearing brief and primary highlights.',
      content: getExecSummary(style),
      confidence: 95,
      why: 'Required to grab the Judge\'s attention in the first 10 seconds.',
    },
    {
      id: 'case-overview',
      title: '2. Case Overview',
      icon: 'eye-outline',
      description: 'High-level dispute summary and parties involved.',
      content: getCaseOverview(style),
      confidence: 90,
      why: 'Ensures the court has the correct facts and parties registered instantly.',
    },
    {
      id: 'material-facts',
      title: '3. Material Facts',
      icon: 'list-circle-outline',
      description: 'Chronological summary of critical case facts.',
      content: getMaterialFacts(style),
      confidence: 88,
      why: 'Establishes clear cause of action matching statutory timelines.',
    },
    {
      id: 'chronology',
      title: '4. Chronology of Events',
      icon: 'calendar-outline',
      description: 'Visual event sequence mapping.',
      content: getChronology(style),
      confidence: 94,
      why: 'Essential to prove the suit is filed within the strict statutory period.',
    },
    {
      id: 'legal-issues',
      title: '5. Legal Issues',
      icon: 'help-circle-outline',
      description: 'Core questions placed before the court.',
      content: getLegalIssues(style),
      confidence: 85,
      why: 'Frames the battlefield. Forces the defense to answer specific queries.',
    },
    {
      id: 'applicable-laws',
      title: '6. Applicable Laws',
      icon: 'book-outline',
      description: 'Acts, Sections, and Procedural Codes.',
      content: getApplicableLaws(style),
      confidence: 92,
      why: 'Forms the statutory foundation of the prosecution strategy.',
    },
    {
      id: 'judgments',
      title: '7. Relevant Judgments',
      icon: 'ribbon-outline',
      description: 'Landmark binding Supreme Court & High Court rulings.',
      content: getJudgments(style),
      confidence: 91,
      why: 'Blocks opposing attempts to raise standard security cheque defenses.',
    },
    {
      id: 'written-args',
      title: '8. Written Arguments',
      icon: 'document-text-outline',
      description: 'Formal written arguments, authorities, and logic.',
      content: getWrittenArgs(style),
      confidence: 87,
      why: 'Provides a copy-pasteable brief to submit directly to the bench.',
    },
    {
      id: 'counter-args',
      title: '9. Counter Arguments',
      icon: 'shield-outline',
      description: 'Predicted arguments from opposing counsel.',
      content: getCounterArgs(style),
      confidence: 80,
      why: 'Prevents courtroom surprises by anticipating opposing counsel maneuvers.',
    },
    {
      id: 'rebuttals',
      title: '10. Rebuttal Strategy',
      icon: 'reload-circle-outline',
      description: 'Ready-to-use responses to block counter arguments.',
      content: getRebuttals(style),
      confidence: 89,
      why: 'Gives the litigator immediate legal weaponry during oral replies.',
    },
    {
      id: 'evidence-mapping',
      title: '11. Evidence Mapping',
      icon: 'attach-outline',
      description: 'Correlating arguments to document pages and exhibits.',
      content: getEvidenceMapping(style),
      confidence: 94,
      why: 'The absolute hallmark of an experienced litigator: clean references to the file.',
    },
    {
      id: 'prayer',
      title: '12. Relief / Prayer',
      icon: 'gift-outline',
      description: 'Drafted final prayer for relief.',
      content: getPrayer(style),
      confidence: 96,
      why: 'Ensures the court passes orders granting the exact remedy sought.',
    },
  ];
};

const getUniqueIntelContent = (tabId: string, style: string, activeCase: any): string => {
  const caseName = activeCase?.name || 'Complainant Case';
  
  switch (tabId) {
    case 'oral-notes':
      return `### Courtroom Oral Arguments Speaking Draft\n\n**1. Opening Statement:**\n"My Lord, I represent the Complainant in this matter. This is a clear case of commercial default under Section 138 of the Negotiable Instruments Act. The accused issued Cheque Exhibit P-1 to discharge a legally enforceable debt, which was returned dishonoured."\n\n**2. Core Facts to Emphasize:**\n- Complainant supplied goods to the accused.\n- Cheque was presented on due date but returned with bank memo "Funds Insufficient".\n- Demand Notice was sent within 15 days, and signatures on the cheque are admitted by the defense.\n\n**3. Relevant Statutory Provisions:**\n- Section 138, NI Act: Establishes criminal liability for cheque bounce.\n- Section 139, NI Act: Mandates the presumption of a legally enforceable debt.\n\n**4. Binding Precedents:**\n- *Rangappa v. Sri Mohan (2010)*: Section 139 presumption is mandatory and shifts the burden of proof to the accused.\n\n**5. Sequence of Submissions:**\n- Introduce ledger and delivery invoice copies.\n- Demonstrate signature admission by the defense.\n- Point out failure of the defense to send a reply to the statutory notice.\n\n**6. Closing Prayer:**\n"Therefore, My Lord, we pray that the accused be convicted and ordered to pay double the cheque amount as compensation."`;
    case 'judge-questions':
      return `### Anticipated Bench Inquiries & Live Answers\n\n#### Q1: Where is the original cheque?\n- **Suggested Answer**: The original cheque is filed as Exhibit P-2 in the main evidence folder.\n- **Supporting Evidence**: Cheque No. 482910 drawn on HDFC Bank.\n- **Relevant Section**: Sec 138 & 142(1), NI Act 1881.\n- **AI Confidence Level**: 99%\n\n#### Q2: Is there a written agreement or invoice to show the underlying contract?\n- **Suggested Answer**: Yes, My Lord, the commercial transaction is backed by invoices and signed delivery challans, marked collectively as Exhibit P-5.\n- **Supporting Evidence**: Invoice Nos. INV-2026-89 and signed delivery challans.\n- **Relevant Section**: Sec 139 presumption of debt.\n- **AI Confidence Level**: 95%\n\n#### Q3: Was the statutory demand notice served within the 30-day legal window?\n- **Suggested Answer**: Yes, My Lord. The bank return memo is dated 5th May, and the notice was sent via speed post on 12th May.\n- **Supporting Evidence**: Speed Post Receipt & Tracking Report Exhibit P-3.\n- **Relevant Section**: Sec 138 proviso (b).\n- **AI Confidence Level**: 98%`;
    case 'opponent-strat':
      return `### Opposing Counsel Defense & Counter Strategy\n\n#### 1. Claim Cheque was Only Issued for "Security"\n- **Defense Stance**: They will argue that the cheque was given as security during sign-up and does not represent a current liability.\n- **Strength Score**: Strong (40% likelihood)\n- **Counter Strategy**: Cite *Sampelly Satyanarayana Rao* and *Rangappa* to establish that security cheques are enforceable once the underlying debt matures.\n\n#### 2. Procedural Delay Tactics & Service Denial\n- **Defense Stance**: The accused will claim they never received the demand notice.\n- **Strength Score**: Moderate (20% likelihood)\n- **Counter Strategy**: Rely on Section 27 of General Clauses Act and postal tracking reports showing "Item Delivered" at their registered business address.\n\n#### 3. Objections to Accounting Ledgers\n- **Defense Stance**: Objections to ledger entries without Sec 65B certificate.\n- **Strength Score**: High (70% likelihood)\n- **Counter Strategy**: Keep the certified bank statement ready under the Bankers\' Books Evidence Act, which does not require a separate 65B certificate.`;
    case 'weakness-analysis':
      return `### Case Vulnerability Audit & Actionable Advice\n\n#### 1. Lack of a Formal Bilateral Loan Agreement\n- **Description**: There is no separate written loan agreement signed by both parties.\n- **Risk Level**: High\n- **Actionable Advice**: Rely heavily on the signed invoices, delivery challans, and subsequent ledger entries showing part-payment.\n\n#### 2. Service of Notice Tracking Issues\n- **Description**: The speed post tracking slip shows "Service status: Out for Delivery" but lacks the final signed delivery slip.\n- **Risk Level**: Moderate\n- **Actionable Advice**: File a formal letter from the Postmaster confirming delivery, or rely on deemed service under Sec 27 General Clauses Act.\n\n#### 3. Minor Discrepancy in Invoice Dates\n- **Description**: Invoice date is 2 days prior to the goods dispatch entry.\n- **Risk Level**: Low\n- **Actionable Advice**: Clarify that goods preparation occurred on the invoice date, and dispatch occurred after packaging was verified.`;
    case 'winning-strat':
      return `### Complete Litigation Roadmap & Trial Strategy\n\n#### 1. Primary Arguments\n- Admission of signature shifts the burden of proof to the accused under Section 139.\n- The defense failed to reply to the demand notice, which raises an adverse inference.\n\n#### 2. Evidence Presentation Sequence\n- **Step 1**: Present original cheque and return memo (Exhibit P-1, P-2).\n- **Step 2**: Present invoices and delivery challans (Exhibit P-5).\n- **Step 3**: Introduce bank ledger statement.\n\n#### 3. Cross-Examination Focus\n- Question the accused on why they did not issue a "Stop Payment" instruction to their bank if the cheque was indeed misplaced or misused.\n\n#### 4. Interim Compensation Claim\n- File an application under Section 143A of the NI Act immediately on the next date of hearing to claim 20% of the cheque amount as interim compensation.\n\n**Settlement Probability**: 65%\n**Win Probability**: 88%`;
    case 'hearing-checklist':
      return `### Essential Tomorrow Court Hearing Checklist\n\n- [x] **Required Documents**: Copy of the Complaint, Vakalatnama, Court Fee receipt.\n- [ ] **Original Evidence**: Original Cheque (Exhibit P-1) and Bank Return Memo (Exhibit P-2).\n- [ ] **Affidavits**: Complainant's Evidence Affidavit (affixed with notary seal).\n- [x] **Case Law**: Hard copies of *Rangappa v. Sri Mohan* and *Bir Singh* judgments.\n- [x] **Court Copies**: 2 sets of certified copies of the complaints for court logs.\n- [ ] **Identity Documents**: Original Complainant ID Card (Aadhaar/PAN).\n- [ ] **Pending Tasks**: Verify courtroom number on the cause list at 9:30 AM.`;
    default:
      return '';
  }
};

const getStructuredIntelContent = (tabId: string) => {
  switch (tabId) {
    case 'oral-notes':
      return {
        sections: [
          { type: 'section_title', title: 'Courtroom Oral Arguments Speaking Draft' },
          {
            type: 'key_value_cards',
            cards: [
              { title: '1. Opening Statement', description: 'My Lord, I represent the Complainant in this matter. This is a clear case of commercial default under Section 138 of the Negotiable Instruments Act. The accused issued Cheque Exhibit P-1 to discharge a legally enforceable debt, which was returned dishonoured.' },
              { title: '2. Core Facts to Emphasize', description: '• Complainant supplied goods to the accused.\n• Cheque was presented on due date but returned with bank memo "Funds Insufficient".\n• Demand Notice was sent within 15 days, and signatures on the cheque are admitted by the defense.' },
              { title: '3. Relevant Statutory Provisions', description: '• Section 138, NI Act: Establishes criminal liability for cheque bounce.\n• Section 139, NI Act: Mandates the presumption of a legally enforceable debt.' },
              { title: '4. Binding Precedents', description: '• Rangappa v. Sri Mohan (2010): Section 139 presumption is mandatory and shifts the burden of proof to the accused.' },
              { title: '5. Sequence of Submissions', description: '• Introduce ledger and delivery invoice copies.\n• Demonstrate signature admission by the defense.\n• Point out failure of the defense to send a reply to the statutory notice.' },
              { title: '6. Closing Prayer', description: 'Therefore, My Lord, we pray that the accused be convicted and ordered to pay double the cheque amount as compensation.' }
            ]
          }
        ]
      };
    case 'judge-questions':
      return {
        sections: [
          { type: 'section_title', title: 'Anticipated Bench Inquiries & Live Answers' },
          {
            type: 'key_value_cards',
            cards: [
              { title: 'Q1: Where is the original cheque?', answer: 'The original cheque is filed as Exhibit P-2 in the main evidence folder.', evidence: 'Cheque No. 482910 drawn on HDFC Bank.', section: 'Sec 138 & 142(1), NI Act 1881.', confidence: '99%' },
              { title: 'Q2: Is there a written agreement or invoice to show the underlying contract?', answer: 'Yes, My Lord, the commercial transaction is backed by invoices and signed delivery challans, marked collectively as Exhibit P-5.', evidence: 'Invoice Nos. INV-2026-89 and signed delivery challans.', section: 'Sec 139 presumption of debt.', confidence: '95%' },
              { title: 'Q3: Was the statutory demand notice served within the 30-day legal window?', answer: 'Yes, My Lord. The bank return memo is dated 5th May, and the notice was sent via speed post on 12th May.', evidence: 'Speed Post Receipt & Tracking Report Exhibit P-3.', section: 'Sec 138 proviso (b).', confidence: '98%' }
            ]
          }
        ]
      };
    case 'opponent-strat':
      return {
        sections: [
          { type: 'section_title', title: 'Opposing Counsel Defense & Counter Strategy' },
          {
            type: 'key_value_cards',
            cards: [
              { title: '1. Claim Cheque was Only Issued for "Security"', position: 'They will argue that the cheque was given as security during sign-up and does not represent a current liability.', strength: 'Strong', likelihood: '40%', counter: 'Cite Sampelly Satyanarayana Rao and Rangappa to establish that security cheques are enforceable once the underlying debt matures.' },
              { title: '2. Procedural Delay Tactics & Service Denial', position: 'The accused will claim they never received the demand notice.', strength: 'Moderate', likelihood: '20%', counter: 'Rely on Section 27 of General Clauses Act and postal tracking reports showing "Item Delivered" at their registered business address.' },
              { title: '3. Objections to Accounting Ledgers', position: 'Objections to ledger entries without Sec 65B certificate.', strength: 'High', likelihood: '70%', counter: 'Keep the certified bank statement ready under the Bankers\' Books Evidence Act, which does not require a separate 65B certificate.' }
            ]
          }
        ]
      };
    case 'weakness-analysis':
      return {
        sections: [
          { type: 'section_title', title: 'Case Vulnerability Audit & Actionable Advice' },
          {
            type: 'key_value_cards',
            cards: [
              { title: '1. Lack of a Formal Bilateral Loan Agreement', description: 'There is no separate written loan agreement signed by both parties.', riskLevel: 'High', advice: 'Rely heavily on the signed invoices, delivery challans, and subsequent ledger entries showing part-payment.' },
              { title: '2. Service of Notice Tracking Issues', description: 'The speed post tracking slip shows "Service status: Out for Delivery" but lacks the final signed delivery slip.', riskLevel: 'Moderate', advice: 'File a formal letter from the Postmaster confirming delivery, or rely on deemed service under Sec 27 General Clauses Act.' },
              { title: '3. Minor Discrepancies in Invoice Dates', description: 'Invoice date is 2 days prior to the goods dispatch entry.', riskLevel: 'Low', advice: 'Clarify that goods preparation occurred on the invoice date, and dispatch occurred after packaging was verified.' }
            ]
          }
        ]
      };
    case 'winning-strat':
      return {
        sections: [
          { type: 'section_title', title: 'Complete Litigation Roadmap & Trial Strategy' },
          {
            type: 'key_value_cards',
            cards: [
              { title: '1. Primary Arguments', description: '• Admission of signature shifts the burden of proof to the accused under Section 139.\n• The defense failed to reply to the demand notice, which raises an adverse inference.' },
              { title: '2. Evidence Presentation Sequence', description: '• Step 1: Present original cheque and return memo (Exhibit P-1, P-2).\n• Step 2: Present invoices and delivery challans (Exhibit P-5).\n• Step 3: Introduce bank ledger statement.' },
              { title: '3. Cross-Examination Focus', description: 'Question the accused on why they did not issue a "Stop Payment" instruction to their bank if the cheque was indeed misplaced or misused.' },
              { title: '4. Interim Compensation Claim', description: 'File an application under Section 143A of the NI Act immediately on the next date of hearing to claim 20% of the cheque amount as interim compensation.' },
              { title: 'Litigation Probabilities', description: '• Settlement Probability: 65%\n• Win Probability: 88%' }
            ]
          }
        ]
      };
    case 'hearing-checklist':
      return {
        sections: [
          { type: 'section_title', title: 'Essential Tomorrow Court Hearing Checklist' },
          {
            type: 'bullet_list',
            items: [
              '✔ Required Documents: Copy of the Complaint, Vakalatnama, Court Fee receipt.',
              '☐ Original Evidence: Original Cheque (Exhibit P-1) and Bank Return Memo (Exhibit P-2).',
              '☐ Affidavits: Complainant\'s Evidence Affidavit (affixed with notary seal).',
              '✔ Case Law: Hard copies of Rangappa v. Sri Mohan and Bir Singh judgments.',
              '✔ Court Copies: 2 sets of certified copies of the complaints for court logs.',
              '☐ Identity Documents: Original Complainant ID Card (Aadhaar/PAN).',
              '☐ Pending Tasks: Verify courtroom number on the cause list at 9:30 AM.'
            ]
          }
        ]
      };
    default:
      return null;
  }
};

const getIntelligenceDataForStyle = (style: string): IntelligenceTool[] => {
  const getOralNotes = (s: string) => {
    switch (s) {
      case 'Plain English':
        return `"Your Honour, we filed this cheque bounce complaint under Section 138. The customer signed the cheque. Under the Rangappa case, the court must assume they owe the money. They did not prove otherwise, so they should be punished."`;
      case 'Hindi Legal Drafting':
        return `"महोदय, शिकायतकर्ता ने धारा 138 के तहत यह शिकायत दर्ज की है। चेक पर आरोपी के हस्ताक्षर स्वीकृत हैं। रंगप्पा बनाम श्री मोहन मामले के तहत, ऋण का वैधानिक अनुमान तुरंत लागू होता है। आरोपी इसे खंडित करने में विफल रहा है, अतः उसे दंडित किया जाना चाहिए।"`;
      case 'Concise':
        return `"Complainant case under Sec 138 NI Act. Signatures admitted. Sec 139 presumption active (ref: Rangappa). Burden shifts to defense. No rebuttal evidence. Request conviction."`;
      default:
        return `"My Lord, the complainant has filed this complaint under Section 138. The signatures on the cheque are admitted. Under the landmark judgment of Rangappa v. Sri Mohan, the presumption of a legally enforceable debt is triggered immediately. The burden is entirely on the accused to rebut this with cogent evidence, which they have completely failed to do. I respectfully submit that the accused be convicted."`;
    }
  };

  const getJudgeQuestions = (s: string) => {
    switch (s) {
      case 'Hindi Legal Drafting':
        return `**प्रश्न**: "काउंसिल, ऋण का मुख्य आधार दिखाने वाला अनुबंध कहाँ है?"\n\n**उत्तर**: "महोदय, लेनदेन बही खातों और चालान से प्रमाणित है जो प्रदर्श P-5 के रूप में संलग्न हैं। चूंकि हस्ताक्षर स्वीकृत हैं, धारा 139 के तहत ऋण माना जाएगा।"`;
      default:
        return `**Question**: "Counsel, where is the written loan agreement or invoice to show the underlying contract?"\n\n**Suggested Answer**: "My Lord, the transaction is backed by commercial ledger accounts and invoices for services delivered, which are annexed as Exhibit P-5. Furthermore, since cheque signatures are admitted, the debt is presumed under Section 139 NI Act."`;
    }
  };

  const getOpponentStrat = (s: string) => {
    return `• They will attempt to exploit minor invoice date gaps to claim the debt was not due on 28th April.\n• They will focus on cross-examining complainant\'s witness on the specific accounting terms of the credit facility.`;
  };

  const getWeaknessAnalysis = (s: string) => {
    return `• **Vulnerability**: Lack of separate signed promissory note.\n  - *Risk Level*: Moderate\n  - *Improvement*: Rely on the signed delivery challans and invoices signed by their warehouse manager.`;
  };

  const getWinningStrat = (s: string) => {
    return `• **Primary**: Pin down the accused in cross-examination on their failure to stop payment or file a police complaint for the supposedly "misplaced" cheque.\n• **Alternative**: Push for immediate 20% interim compensation under Section 143A of NI Act at the hearing.`;
  };

  const getHearingChecklist = (s: string) => {
    return `□ Original Cheque (Exhibit P-1) wrapped in secure envelope\n□ Bank Return Memo (Exhibit P-2)\n□ Certified copy of Ledger Statement\n□ Printed copies of *Rangappa* and *Sampelly* judgments\n□ Witness identification proof`;
  };

  return [
    {
      id: 'oral-notes',
      title: 'Oral Submission Notes',
      icon: 'mic-outline',
      description: 'Concise courtroom speaking notes.',
      content: getOralNotes(style),
    },
    {
      id: 'judge-questions',
      title: 'Likely Judge Questions',
      icon: 'help-buoy-outline',
      description: 'Anticipate tough queries from the bench.',
      content: getJudgeQuestions(style),
    },
    {
      id: 'opponent-strat',
      title: 'Opponent Strategy',
      icon: 'skull-outline',
      description: 'Opposition\'s primary target points.',
      content: getOpponentStrat(style),
    },
    {
      id: 'weakness-analysis',
      title: 'Weakness Analysis',
      icon: 'trending-down-outline',
      description: 'Audit of case vulnerabilities.',
      content: getWeaknessAnalysis(style),
    },
    {
      id: 'winning-strat',
      title: 'Winning Strategy',
      icon: 'trophy-outline',
      description: 'Step-by-step path to victory.',
      content: getWinningStrat(style),
    },
    {
      id: 'hearing-checklist',
      title: 'Hearing Checklist',
      icon: 'checkbox-outline',
      description: 'Must-have items for tomorrow.',
      content: getHearingChecklist(style),
    },
  ];
};

export default function ArgumentBuilderScreen() {
  useAuthGuard();
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();

  // Workflow steps:
  // 1. 'source' - Choose source
  // 2. 'analyzing' - Loading/AI Extraction
  // 3. 'workspace' - Case Intelligence Dashboard + 12 Sections + Prep Intelligence
  const [workspaceStep, setWorkspaceStep] = useState<'source' | 'analyzing' | 'workspace'>('source');
  
  // Active selected source option
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Case Selection & Context States
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeCaseDetails, setActiveCaseDetails] = useState<CaseWorkspace | null>(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [caseSummariesMap, setCaseSummariesMap] = useState<Record<string, string>>({});
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // AI Refinement Panel Mode (Step 5)
  const [refinementMode, setRefinementMode] = useState<string>('Courtroom Style');
  const [isRefinementOpen, setIsRefinementOpen] = useState(false);

  // Search filter query inside Workspace
  const [workspaceSearch, setWorkspaceSearch] = useState('');

  // Section Expansion state tracking
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'exec-summary': true, // Auto-expand first one
  });

  // Active Intelligence Tool tab (Step 4)
  const [activeIntelligenceTab, setActiveIntelligenceTab] = useState<string>('oral-notes');
  const [intelCache, setIntelCache] = useState<Record<string, string>>({
    'oral-notes': `### Courtroom Oral Arguments Speaking Draft\n\n**1. Opening Statement:**\n"My Lord, I represent the Complainant in this matter. This is a clear case of commercial default under Section 138 of the Negotiable Instruments Act. The accused issued Cheque Exhibit P-1 to discharge a legally enforceable debt, which was returned dishonoured."\n\n**2. Core Facts to Emphasize:**\n- Complainant supplied goods to the accused.\n- Cheque was presented on due date but returned with bank memo "Funds Insufficient".\n- Demand Notice was sent within 15 days, and signatures on the cheque are admitted by the defense.\n\n**3. Relevant Statutory Provisions:**\n- Section 138, NI Act: Establishes criminal liability for cheque bounce.\n- Section 139, NI Act: Mandates the presumption of a legally enforceable debt.\n\n**4. Binding Precedents:**\n- *Rangappa v. Sri Mohan (2010)*: Section 139 presumption is mandatory and shifts the burden of proof to the accused.\n\n**5. Sequence of Submissions:**\n- Introduce ledger and delivery invoice copies.\n- Demonstrate signature admission by the defense.\n- Point out failure of the defense to send a reply to the statutory notice.\n\n**6. Closing Prayer:**\n"Therefore, My Lord, we pray that the accused be convicted and ordered to pay double the cheque amount as compensation."`
  });
  const [intelLoadingTab, setIntelLoadingTab] = useState<string | null>(null);

  // Generation status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Actual generated data for the sections (Step 3)
  const [sectionsData, setSectionsData] = useState<PrepSection[]>([]);

  // Actual generated data for premium intelligence tools (Step 4)
  const [intelligenceData, setIntelligenceData] = useState<IntelligenceTool[]>([]);

  // AI Copilot states
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const copilotScrollRef = useRef<ScrollView>(null);
  const [isCopilotHistoryOpen, setIsCopilotHistoryOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isSuggestionsSheetOpen, setIsSuggestionsSheetOpen] = useState(false);

  // Smart scrolling states/refs (Step 11)
  const autoScrollEnabled = useRef(true);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);

  // useChat integration for persistent, real-time streaming conversations
  const {
    sessions,
    activeSessionId,
    activeSession,
    sending: isAiThinking,
    error: chatError,
    setActiveSessionId,
    fetchSessions,
    fetchSessionDetails,
    startNewSession,
    deleteChatSession,
    renameChatSession,
    dispatchMessageStream,
    cancelMessageStream,
  } = useChat('legal_argument_builder');

  // Animated dots for thinking indicator (Step 12)
  const [thinkingDotCount, setThinkingDotCount] = useState(1);
  useEffect(() => {
    let interval: any;
    if (isAiThinking) {
      interval = setInterval(() => {
        setThinkingDotCount((prev) => (prev % 3) + 1);
      }, 500);
    } else {
      setThinkingDotCount(1);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAiThinking]);

  const getThinkingDotsText = () => {
    if (thinkingDotCount === 1) return '●  ○  ○';
    if (thinkingDotCount === 2) return '○  ●  ○';
    return '○  ○  ●';
  };

  // Check if the latest message is a model message that is empty (thinking state) (Step 12)
  const isLatestMessageEmptyModel = useMemo(() => {
    if (!activeSession || !activeSession.messages || activeSession.messages.length === 0) {
      return false;
    }
    const latest = activeSession.messages[activeSession.messages.length - 1];
    return latest.role === 'model' && !latest.content.trim();
  }, [activeSession?.messages]);

  // Inline suggestion chip expansion states (Step 6)
  const [expandedSuggestions, setExpandedSuggestions] = useState<Record<string, boolean>>({});

  // Cross-platform custom Rename Dialog states (Objective 4)
  const [renameSessionId, setRenameSessionId] = useState<string>('');
  const [renameInput, setRenameInput] = useState<string>('');

  const toggleExpandSuggestions = (msgId: string) => {
    setExpandedSuggestions(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Helper to shorten long suggestion labels to 1-3 words (Step 3)
  const shortenSuggestion = (label: string) => {
    const cleaned = label.replace(/[⚖️🔥🎯⚠️🧠💣🧑‍⚖️🚀📚✓]/g, '').trim();
    const lower = cleaned.toLowerCase();
    if (lower.includes('cross') && (lower.includes('question') || lower.includes('exam') || lower.includes('respondent'))) return 'Cross Questions';
    if (lower.includes('affidavit') && (lower.includes('draft') || lower.includes('support'))) return 'Draft Affidavit';
    if (lower.includes('witness') && (lower.includes('list') || lower.includes('prepare') || lower.includes('testimony'))) return 'Witness List';
    if (lower.includes('evidence') && (lower.includes('summarize') || lower.includes('summary') || lower.includes('key'))) return 'Evidence Summary';
    if (lower.includes('oral') || lower.includes('final argument') || lower.includes('closing submission') || lower.includes('courtroom speaking')) return 'Final Arguments';
    if (lower.includes('opponent') && lower.includes('argument')) return 'Predict Opponent';
    if (lower.includes('judge') && lower.includes('question')) return 'Judge Questions';
    if (lower.includes('relevant') && (lower.includes('judgment') || lower.includes('precedent'))) return 'Find Judgments';
    if (lower.includes('settlement') || lower.includes('negotiation')) return 'Settlement Strategy';
    if (lower.includes('weakness') && lower.includes('case')) return 'Case Weaknesses';
    if (lower.includes('rebuttal') && lower.includes('argument')) return 'Rebuttal Arguments';
    if (lower.includes('bail') && lower.includes('argument')) return 'Bail Arguments';
    if (lower.includes('timeline') && lower.includes('analysis')) return 'Timeline Analysis';

    // Fallback: If it's longer than 3 words, slice to first 3 words
    const words = cleaned.split(/\s+/);
    if (words.length > 3) {
      return words.slice(0, 3).join(' ') + '...';
    }
    return cleaned;
  };

  // Voice speech-to-text recognition setup
  const [selectedLanguage, setSelectedLanguage] = useState<SpeechLanguage>('en');
  const {
    isRecording,
    isTranscribing,
    partialText,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useSpeechRecognition((transcribedText) => {
    if (transcribedText) {
      setChatInput(transcribedText);
    }
  });

  // Sync real-time speech preview to chat input
  useEffect(() => {
    if (isRecording && partialText) {
      setChatInput(partialText);
    }
  }, [partialText, isRecording]);

  // Load chat sessions when Copilot modal opens
  useEffect(() => {
    if (isAiAssistantOpen) {
      fetchSessions();
    }
  }, [isAiAssistantOpen]);

  // Overall Case Metrics (Step 2)
  const [caseMetrics, setCaseMetrics] = useState({
    strengthScore: 78,
    riskLevel: 'Moderate',
    evidenceStrength: 'Strong',
    applicableActs: 'NI Act 1881, CrPC 1973',
    relevantSections: 'Sec 138, Sec 139, Sec 141',
    keyLegalIssues: 'Legally enforceable debt presumption shifts burden to accused.',
    missingInfo: 'Original post receipt and loan agreement documents.',
    deadlines: 'Filing rejoinder before 20th July 2026',
    confidenceScore: 92,
  });

  // ==========================================
  // CASE INTAKE WIZARD STATES (Step 1-6 Redesign)
  // ==========================================
  const [showIntakeWizard, setShowIntakeWizard] = useState(false);
  const [intakeMethod, setIntakeMethod] = useState<'none' | 'manual' | 'voice' | 'ai-guided'>('none');
  const [intakeStep, setIntakeStep] = useState(1);
  
  // Section 1: Basic Info
  const [caseTitle, setCaseTitle] = useState('');
  const [courtNameInput, setCourtNameInput] = useState('');
  const [caseTypeInput, setCaseTypeInput] = useState('');
  const [role, setRole] = useState<'Petitioner' | 'Respondent' | 'Plaintiff' | 'Defendant' | 'Complainant' | 'Accused'>('Petitioner');

  // Section 2: Parties
  const [petitionerName, setPetitionerName] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [advocateName, setAdvocateName] = useState('');

  // Section 3: Case Facts
  const [caseFactsText, setCaseFactsText] = useState('');

  // Section 4: Important Dates
  const [agreementDate, setAgreementDate] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [noticeDate, setNoticeDate] = useState('');
  const [firDate, setFirDate] = useState('');
  const [causeOfActionDate, setCauseOfActionDate] = useState('');
  const [hearingDate, setHearingDate] = useState('');

  // Section 5: Evidence Types Checkbox mapping
  const [selectedEvidences, setSelectedEvidences] = useState<Record<string, boolean>>({
    Agreement: false,
    Emails: false,
    WhatsAppChats: false,
    Photographs: false,
    Videos: false,
    Audio: false,
    BankStatements: false,
    Witnesses: false,
    MedicalRecords: false,
    Other: false,
  });

  // Section 6: Relief Requested
  const [selectedReliefs, setSelectedReliefs] = useState<Record<string, boolean>>({
    Recovery: false,
    Compensation: false,
    Bail: false,
    Divorce: false,
    Injunction: false,
    SpecificPerformance: false,
  });
  const [customRelief, setCustomRelief] = useState('');

  // Voice Dictation Simulation States
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const micAnimValue = useRef(new Animated.Value(1)).current;

  // AI Guided Interview States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewAnswerInput, setInterviewAnswerInput] = useState('');
  const [interviewHistory, setInterviewHistory] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([]);

  const interviewQuestions = [
    { key: 'title', text: "Welcome to the AI Guided Case Interview. Let's start with the basics. What is the title or name of this case?" },
    { key: 'what_happened', text: "Describe what happened. What is the core dispute or incident?" },
    { key: 'when_did_it_happen', text: "When did this event or issue arise? Please specify any key dates." },
    { key: 'parties', text: "Who are the primary parties involved? Please state their names and roles." },
    { key: 'agreement', text: "Was there a written contract or agreement signed between the parties?" },
    { key: 'evidence', text: "What evidence is currently in your possession (emails, WhatsApp logs, bank records)?" },
    { key: 'payments', text: "Were there any payments or financial transactions associated with this claim?" },
    { key: 'notice', text: "Have you dispatched or received a formal statutory legal notice?" },
    { key: 'jurisdiction', text: "Which court has jurisdiction over this matter?" },
    { key: 'relief', text: "What specific outcome or relief are you seeking from the court?" }
  ];

  // Attachment Handler
  const {
    attachments,
    setAttachments,
    isBottomSheetVisible,
    isCameraVisible,
    isUploading,
    showAttachmentOptions,
    hideAttachmentOptions,
    hideCamera,
    handleRemoveAttachment,
    clearAttachments,
    handleSelectOption,
    handleCameraConfirm,
    uploadPendingAttachments,
  } = useAttachmentHandler();

  // Load case details on active case change
  const fetchActiveCaseDetails = async (caseId: string) => {
    try {
      const res = await CaseService.getCaseDetails(caseId);
      const details = (res as any).data || res;
      if (details) {
        setActiveCaseDetails(details);
      }
    } catch (err) {
      console.warn('Failed to load active case details:', err);
    }
  };

  const fetchAllCaseSummaries = async () => {
    try {
      const res = await CaseService.listCases();
      const list = Array.isArray(res) ? res : (res?.data || []);
      const mapping: Record<string, string> = {};
      list.forEach((c: any) => {
        mapping[c._id] = c.name;
      });
      setCaseSummariesMap(mapping);
    } catch (err) {
      console.warn('Failed to load case summaries list:', err);
    }
  };

  // Auto-scroll scrollview to bottom when messages or typing states update (ChatGPT-like)
  useEffect(() => {
    if (isAiAssistantOpen) {
      if (autoScrollEnabled.current) {
        setTimeout(() => {
          copilotScrollRef.current?.scrollToEnd({ animated: true });
        }, 150);
      } else {
        if (isAiThinking) {
          setShowScrollToLatest(true);
        }
      }
    }
  }, [activeSession?.messages, isAiAssistantOpen, isAiThinking]);

  // Hide scroll-to-latest button when generation stops
  useEffect(() => {
    if (!isAiThinking) {
      setShowScrollToLatest(false);
    }
  }, [isAiThinking]);

  // Scroll handler to monitor user manual drag (Step 11)
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 150;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    const isScrollable = contentSize.height > layoutMeasurement.height;

    if (isAtBottom) {
      autoScrollEnabled.current = true;
      setShowScrollToLatest(false);
    } else if (isScrollable) {
      setShowScrollToLatest(true);
    }
  };

  // Fired ONLY when user manually starts a drag scroll action (Step 11 & 12)
  const handleScrollBeginDrag = () => {
    autoScrollEnabled.current = false;
    if (isAiThinking) {
      setShowScrollToLatest(true);
    }
  };

  // Real conversational message submission with case context awareness
  const handleSendChat = async (textOverride?: string) => {
    const textToSend = textOverride || chatInput;
    if (!textToSend.trim()) return;

    setChatInput('');
    Keyboard.dismiss();

    try {
      await dispatchMessageStream(
        textToSend.trim(),
        'legal_argument_builder',
        attachments,
        undefined,
        activeCaseId || undefined
      );
      clearAttachments();
    } catch (err) {
      console.warn('[COPILOT SEND ERROR] Send message failed:', err);
    }
  };

  // Start a new conversational session for Copilot
  const handleNewChat = () => {
    const newSessionId = startNewSession('New Chat', 'legal_argument_builder');
    showToast('success', 'New Chat Started', 'Cleared workspace for a new strategy query.');
  };

  // Export current conversation history as clean legal notes via native Share
  const handleExportChat = () => {
    if (!activeSession || !activeSession.messages || activeSession.messages.length === 0) {
      showToast('error', 'No Messages', 'There is no conversation to export.');
      return;
    }
    const formattedMessages = activeSession.messages
      .map((m) => {
        const senderLabel = m.role === 'user' ? 'Lawyer' : 'Copilot';
        return `[${senderLabel}]:\n${m.content}\n`;
      })
      .join('\n────────────────────────\n\n');
    const exportText = `Court Prep Copilot Conversation: ${activeSession.title || 'Untitled Chat'}\n\n${formattedMessages}`;
    
    Share.share({
      message: exportText,
      title: activeSession.title || 'Copilot Chat Export',
    })
      .then((res) => {
        if (res.action === Share.sharedAction) {
          showToast('success', 'Chat Exported', 'Conversation successfully shared/exported.');
        }
      })
      .catch((err) => {
        console.warn('[EXPORT ERROR] Share failed:', err);
      });
  };

  // Rename conversational session (Objective 4)
  const handleRenameSession = (id: string, currentTitle: string) => {
    setRenameSessionId(id);
    setRenameInput(currentTitle);
  };

  // Delete chat session permanently (Objective 4)
  const handleDeleteSession = (id: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to permanently delete this chat?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteChatSession(id);
            showToast('success', 'Chat Deleted', 'Conversation deleted.');
            if (id === activeSessionId) {
              startNewSession('New Chat', 'legal_argument_builder');
            }
          },
        },
      ]
    );
  };

  // Clear conversation history log locally
  const handleClearConversation = () => {
    if (activeSessionId) {
      useChatStore.getState().updateSession(activeSessionId, { messages: [] });
      showToast('success', 'Conversation Cleared', 'Active chat history cleared.');
    }
  };

  // Helper to parse follow-up next action suggestions from AI text (Step 9)
  const parseFollowUpSuggestions = (text: string) => {
    if (!text) return { cleanedText: '', suggestions: [], disclaimer: '' };

    let disclaimer = '';
    let mainText = text;

    // Detect and extract Legal Disclaimer (Step 6)
    const disclaimerRegex = /(⚖️\s+Legal\s+Disclaimer|Legal\s+Disclaimer):?/i;
    const disclaimerMatch = mainText.match(disclaimerRegex);
    if (disclaimerMatch && disclaimerMatch.index !== undefined) {
      const beforeDisclaimer = mainText.substring(0, disclaimerMatch.index);
      const lastNewline = beforeDisclaimer.lastIndexOf('\n');
      const startIndex = lastNewline !== -1 ? lastNewline : 0;
      
      const rawDisclaimer = mainText.substring(startIndex).trim();
      disclaimer = rawDisclaimer
        .replace(/^[-*•\s]*/, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .trim();

      mainText = mainText.substring(0, startIndex).trim();
    }

    // Now parse Suggestions from the remaining text
    const suggestionsRegex = /(?:Suggested\s+Next\s+Actions|Suggested\s+Actions|Next\s+Actions):?/i;
    const suggestionsMatch = mainText.match(suggestionsRegex);
    if (!suggestionsMatch || suggestionsMatch.index === undefined) {
      return { cleanedText: mainText, suggestions: [], disclaimer };
    }

    const matchIndex = suggestionsMatch.index;
    const cleanedText = mainText.substring(0, matchIndex).trim();
    const suggestionsPart = mainText.substring(matchIndex + suggestionsMatch[0].length);

    const lines = suggestionsPart.split('\n');
    const suggestions: string[] = [];
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const suggestionText = trimmed
          .replace(/^[•\-*]\s*/, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .trim();
        if (suggestionText) {
          suggestions.push(suggestionText);
        }
      }
    });

    return { cleanedText, suggestions, disclaimer };
  };

  useEffect(() => {
    if (activeCaseId) {
      fetchActiveCaseDetails(activeCaseId);
    } else {
      setActiveCaseDetails(null);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchAllCaseSummaries();
  }, [sessionId]);

  // Draft Autosave and Loading Logic
  useEffect(() => {
    if (showIntakeWizard) {
      loadSavedDraft();
    }
  }, [showIntakeWizard]);

  // Auto-save form inputs whenever they change
  useEffect(() => {
    if (showIntakeWizard && intakeMethod !== 'none') {
      saveIntakeDraft();
    }
  }, [
    caseTitle,
    courtNameInput,
    caseTypeInput,
    role,
    petitionerName,
    respondentName,
    advocateName,
    caseFactsText,
    agreementDate,
    incidentDate,
    noticeDate,
    firDate,
    causeOfActionDate,
    hearingDate,
    selectedEvidences,
    selectedReliefs,
    customRelief,
    voiceText,
    interviewHistory,
  ]);

  const saveIntakeDraft = async () => {
    try {
      const draft = {
        intakeMethod,
        intakeStep,
        caseTitle,
        courtNameInput,
        caseTypeInput,
        role,
        petitionerName,
        respondentName,
        advocateName,
        caseFactsText,
        agreementDate,
        incidentDate,
        noticeDate,
        firDate,
        causeOfActionDate,
        hearingDate,
        selectedEvidences,
        selectedReliefs,
        customRelief,
        voiceText,
        interviewHistory,
      };
      await AsyncStorage.setItem('courtprep_intake_draft', JSON.stringify(draft));
    } catch (e) {
      console.warn('Draft auto-save failed:', e);
    }
  };

  const loadSavedDraft = async () => {
    try {
      const saved = await AsyncStorage.getItem('courtprep_intake_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.caseTitle || draft.voiceText || draft.interviewHistory?.length > 0) {
          showToast('info', 'Draft Restored', 'Resumed your last session.');
          setIntakeMethod(draft.intakeMethod || 'none');
          setIntakeStep(draft.intakeStep || 1);
          setCaseTitle(draft.caseTitle || '');
          setCourtNameInput(draft.courtNameInput || '');
          setCaseTypeInput(draft.caseTypeInput || '');
          setRole(draft.role || 'Petitioner');
          setPetitionerName(draft.petitionerName || '');
          setRespondentName(draft.respondentName || '');
          setAdvocateName(draft.advocateName || '');
          setCaseFactsText(draft.caseFactsText || '');
          setAgreementDate(draft.agreementDate || '');
          setIncidentDate(draft.incidentDate || '');
          setNoticeDate(draft.noticeDate || '');
          setFirDate(draft.firDate || '');
          setCauseOfActionDate(draft.causeOfActionDate || '');
          setHearingDate(draft.hearingDate || '');
          setSelectedEvidences(draft.selectedEvidences || {});
          setSelectedReliefs(draft.selectedReliefs || {});
          setCustomRelief(draft.customRelief || '');
          setVoiceText(draft.voiceText || '');
          setInterviewHistory(draft.interviewHistory || []);
          setCurrentQuestionIndex(draft.interviewHistory ? Math.floor(draft.interviewHistory.length / 2) : 0);
        }
      }
    } catch (e) {
      console.warn('Draft loading failed:', e);
    }
  };

  const clearIntakeDraft = async () => {
    try {
      await AsyncStorage.removeItem('courtprep_intake_draft');
      setCaseTitle('');
      setCourtNameInput('');
      setCaseTypeInput('');
      setRole('Petitioner');
      setPetitionerName('');
      setRespondentName('');
      setAdvocateName('');
      setCaseFactsText('');
      setAgreementDate('');
      setIncidentDate('');
      setNoticeDate('');
      setFirDate('');
      setCauseOfActionDate('');
      setHearingDate('');
      setSelectedEvidences({
        Agreement: false,
        Emails: false,
        WhatsAppChats: false,
        Photographs: false,
        Videos: false,
        Audio: false,
        BankStatements: false,
        Witnesses: false,
        MedicalRecords: false,
        Other: false,
      });
      setSelectedReliefs({
        Recovery: false,
        Compensation: false,
        Bail: false,
        Divorce: false,
        Injunction: false,
        SpecificPerformance: false,
      });
      setCustomRelief('');
      setVoiceText('');
      setInterviewHistory([]);
      setCurrentQuestionIndex(0);
    } catch (e) {
      console.warn('Draft clear failed:', e);
    }
  };

  // Live recording mic pulsing animation
  useEffect(() => {
    if (isVoiceRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micAnimValue, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(micAnimValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      micAnimValue.setValue(1);
    }
  }, [isVoiceRecording]);

  const toggleVoiceRecording = () => {
    if (isVoiceRecording) {
      setIsVoiceRecording(false);
      // Simulate real-time legal facts extraction
      showToast('success', 'Recording Completed', 'Speech converted to legal draft.');
    } else {
      setIsVoiceRecording(true);
      setVoiceText('');
      // Simulate speech conversion in real time
      let transcriptWords = [
        "In", "discharge", "of", "the", "outstanding", "dues", "of", "INR", "five", "lakhs",
        "under", "commercial", "invoices", "dated", "tenth", "March,", "the", "accused", "issued",
        "a", "cheque", "which", "dishonoured", "upon", "presentation", "on", "thirtieth", "April",
        "due", "to", "insufficient", "funds.", "Statutory", "legal", "notice", "was", "sent", "on",
        "twelfth", "May", "but", "accused", "failed", "to", "make", "payment."
      ];
      let currentWordIdx = 0;
      let tempText = "";
      const timer = setInterval(() => {
        if (currentWordIdx < transcriptWords.length) {
          tempText += (currentWordIdx === 0 ? "" : " ") + transcriptWords[currentWordIdx];
          setVoiceText(tempText);
          currentWordIdx++;
        } else {
          clearInterval(timer);
          setIsVoiceRecording(false);
        }
      }, 150);
    }
  };

  const startAIInterview = () => {
    setIntakeMethod('ai-guided');
    setInterviewHistory([{ role: 'ai', text: interviewQuestions[0].text }]);
    setCurrentQuestionIndex(0);
  };

  const handleSendInterviewAnswer = () => {
    if (!interviewAnswerInput.trim()) return;

    const answer = interviewAnswerInput;
    const history = [...interviewHistory, { role: 'user' as const, text: answer }];
    setInterviewHistory(history);
    setInterviewAnswerInput('');

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < interviewQuestions.length) {
      setIsGenerating(true);
      setTimeout(() => {
        setInterviewHistory((prev) => [
          ...prev,
          { role: 'ai', text: interviewQuestions[nextIndex].text },
        ]);
        setCurrentQuestionIndex(nextIndex);
        setIsGenerating(false);
      }, 700);
    } else {
      // Completed interview
      setIsGenerating(true);
      setTimeout(() => {
        setInterviewHistory((prev) => [
          ...prev,
          { role: 'ai', text: "Thank you. I have collected all necessary parameters. Let's analyze and prepare your workspace." },
        ]);
        setIsGenerating(false);
      }, 800);
    }
  };

  const triggerCaseAnalysisFromWizard = () => {
    setShowIntakeWizard(false);
    clearIntakeDraft();
    triggerCaseAnalysis();
  };

  // Load dummy templates based on selected case type
  const loadWorkspaceData = (caseType: string) => {
    setSectionsData(getSectionsForStyle(refinementMode));
    setIntelligenceData(getIntelligenceDataForStyle(refinementMode));
  };

  // Step 1 -> Step 2 Action
  const handleSelectSource = (sourceId: string) => {
    setSelectedSource(sourceId);
    if (sourceId === 'workspace' && !activeCaseId) {
      setIsCaseModalOpen(true);
      return;
    }
    if (sourceId === 'manual') {
      setShowIntakeWizard(true);
      setIntakeMethod('none');
      return;
    }
    triggerCaseAnalysis();
  };

  const triggerCaseAnalysis = () => {
    setWorkspaceStep('analyzing');
    setGenerationProgress(10);
    
    // Simulate premium AI generation and workflow phases
    let progress = 10;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        clearInterval(interval);
        loadWorkspaceData(activeCaseDetails?.caseType || 'NI Act Case');
        setWorkspaceStep('workspace');
        showToast('success', 'Case Workspace Prepared', 'Court Prep dossier successfully generated.');
      } else {
        setGenerationProgress(progress);
      }
    }, 300);
  };

  // Perform Refinement (Step 5)
  const handleRefineWorkspace = (style: string) => {
    setIsRefinementOpen(false);

    const applyStyle = (regenerate: boolean) => {
      setRefinementMode(style);
      showToast('success', 'Argument Style Updated', `Argument style updated to ${style}.`);

      if (regenerate) {
        setIsGenerating(true);
        setTimeout(() => {
          setSectionsData(getSectionsForStyle(style));
          setIntelligenceData(getIntelligenceDataForStyle(style));
          setIsGenerating(false);
          showToast('success', 'Workspace Refined', 'Dossier updated successfully.');
        }, 1000);
      }
    };

    if (sectionsData.length > 0) {
      Alert.alert(
        "Apply new style?",
        "Apply the new style to the current courtroom preparation?",
        [
          {
            text: "Keep Existing",
            onPress: () => applyStyle(false),
            style: "cancel"
          },
          {
            text: "Regenerate",
            onPress: () => applyStyle(true)
          }
        ]
      );
    } else {
      setRefinementMode(style);
      showToast('success', 'Argument Style Updated', `Argument style updated to ${style}.`);
    }
  };

  // Section level operations
  const handleRegenerateSection = (sectionId: string) => {
    showToast('info', 'Regenerating Section', 'Querying AI Court engine...');
    setTimeout(() => {
      const refinedSections = getSectionsForStyle(refinementMode);
      const targetSec = refinedSections.find((s) => s.id === sectionId);
      setSectionsData((prev) =>
        prev.map((sec) => {
          if (sec.id === sectionId && targetSec) {
            return {
              ...sec,
              content: targetSec.content,
              confidence: Math.min(sec.confidence + 2, 99),
            };
          }
          return sec;
        })
      );
      showToast('success', 'Updated', 'Section rewritten.');
    }, 1000);
  };

  const handleCopySection = (content: string) => {
    Clipboard.setString(content);
    showToast('success', 'Copied', 'Section content copied to clipboard.');
  };

  const handleSelectIntelTab = (tabId: string) => {
    setActiveIntelligenceTab(tabId);
    if (!intelCache[tabId]) {
      setIntelLoadingTab(tabId);
      setTimeout(() => {
        const style = refinementMode || 'Courtroom Style';
        const generated = getUniqueIntelContent(tabId, style, activeCaseDetails);
        setIntelCache(prev => ({ ...prev, [tabId]: generated }));
        setIntelLoadingTab(null);
      }, 500);
    }
  };

  const handleRegenerateIntelTab = (tabId: string) => {
    setIntelLoadingTab(tabId);
    setTimeout(() => {
      const style = refinementMode || 'Courtroom Style';
      const generated = getUniqueIntelContent(tabId, style, activeCaseDetails);
      setIntelCache(prev => ({ ...prev, [tabId]: generated }));
      setIntelLoadingTab(null);
      showToast('success', 'Regeneration Complete', 'Refining speech vectors complete.');
    }, 600);
  };

  const renderStructuredResponse = (tabId: string) => {
    const data = getStructuredIntelContent(tabId);
    if (!data) return null;

    return (
      <View style={{ gap: 12 }}>
        {data.sections.map((section: any, sIdx: number) => {
          if (section.type === 'section_title') {
            return (
              <Text key={sIdx} style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }}>
                {section.title}
              </Text>
            );
          }

          if (section.type === 'bullet_list') {
            return (
              <View key={sIdx} style={{ gap: 8 }}>
                {section.items.map((item: string, iIdx: number) => (
                  <View key={iIdx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 13, color: theme.textPrimary, marginRight: 6 }}>•</Text>
                    <Text style={{ fontSize: 13.5, color: theme.textPrimary, flex: 1, lineHeight: 18 }}>{item}</Text>
                  </View>
                ))}
              </View>
            );
          }

          if (section.type === 'key_value_cards') {
            return (
              <View key={sIdx} style={{ gap: 12 }}>
                {section.cards.map((card: any, cIdx: number) => (
                  <View
                    key={cIdx}
                    style={{
                      borderWidth: 1.5,
                      borderColor: theme.border,
                      borderRadius: 12,
                      padding: 12,
                      backgroundColor: theme.surface,
                    }}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#8A5CF5', marginBottom: 8 }}>
                      {card.title}
                    </Text>

                    {card.description && (
                      <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                        {card.description}
                      </Text>
                    )}

                    {card.position && (
                      <View style={{ gap: 4, marginTop: 4 }}>
                        <Text style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Defense Position</Text>
                        <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 18, marginBottom: 8 }}>{card.position}</Text>
                        
                        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
                          <View>
                            <Text style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Strength</Text>
                            <Text style={{ fontSize: 12, color: theme.textPrimary, fontWeight: '700' }}>{card.strength}</Text>
                          </View>
                          <View>
                            <Text style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Likelihood</Text>
                            <Text style={{ fontSize: 12, color: theme.textPrimary, fontWeight: '700' }}>{card.likelihood}</Text>
                          </View>
                        </View>

                        <Text style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Suggested Counter</Text>
                        <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>{card.counter}</Text>
                      </View>
                    )}

                    {card.answer && (
                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Suggested Answer</Text>
                        <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 18, marginBottom: 6 }}>{card.answer}</Text>
                        
                        <Text style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Supporting Evidence</Text>
                        <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 18, marginBottom: 6 }}>{card.evidence}</Text>

                        <View style={{ flexDirection: 'row', gap: 16 }}>
                          <View>
                            <Text style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Relevant Section</Text>
                            <Text style={{ fontSize: 12, color: theme.textPrimary, fontWeight: '700' }}>{card.section}</Text>
                          </View>
                          <View>
                            <Text style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Confidence</Text>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '700' }}>{card.confidence}</Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {card.riskLevel && (
                      <View style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: card.riskLevel === 'High' ? '#EF4444' : '#F59E0B' }}>
                            Risk Level: {card.riskLevel}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>AI Recommendation</Text>
                        <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>{card.advice}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            );
          }

          return null;
        })}
      </View>
    );
  };

  const renderPrepSectionContent = (content: string) => {
    if (!content) return null;

    const cleanMarkdown = (text: string) => {
      return text
        .replace(/\*\*\*+/g, '') // remove triple asterisks
        .replace(/\*\*([^*]+)\*\*/g, '$1') // remove bold asterisks
        .replace(/\*([^*]+)\*/g, '$1') // remove single asterisks
        .replace(/__+/g, '') // remove underscores
        .replace(/_+/g, '')
        .replace(/#+/g, '') // remove hashtags
        .replace(/`+/g, '') // remove backticks
        .replace(/^>+/g, '') // remove blockquotes
        .trim();
    };

    const lines = content.split('\n');
    return (
      <View style={{ gap: 8, paddingVertical: 4 }}>
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          // 1. Check if it is a key-value pair like: **Key**: Value
          const kvMatch = trimmed.match(/^[\-\*•]?\s*\*\*([^*:]+)\*\*:\s*(.*)$/);
          if (kvMatch) {
            const key = kvMatch[1].trim();
            const val = kvMatch[2].trim();
            return (
              <View
                key={idx}
                style={{
                  borderWidth: 1.5,
                  borderColor: theme.border,
                  borderRadius: 10,
                  padding: 10,
                  backgroundColor: theme.surface,
                  marginVertical: 2,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A5CF5', textTransform: 'uppercase', marginBottom: 2 }}>
                  {key}
                </Text>
                <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 18 }}>
                  {cleanMarkdown(val)}
                </Text>
              </View>
            );
          }

          // 2. Check if it is a timeline event like: 📅 **Date**: Event or **Date**: Event
          const dateMatch = trimmed.match(/^(📅)?\s*\*\*([^*]+)\*\*:\s*(.*)$/);
          if (dateMatch) {
            const dateStr = dateMatch[2].trim();
            const eventStr = dateMatch[3].trim();
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4 }}>
                <View style={{ width: 16, alignItems: 'center', marginTop: 3 }}>
                  <Ionicons name="calendar-outline" size={14} color="#8A5CF5" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A5CF5', marginBottom: 2 }}>
                    {dateStr}
                  </Text>
                  <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 18 }}>
                    {cleanMarkdown(eventStr)}
                  </Text>
                </View>
              </View>
            );
          }

          // 3. Check if it is a bullet point: •, *, -
          if (trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.startsWith('-')) {
            const textOnly = trimmed.replace(/^[\-\*•]\s*/, '');
            const parts = textOnly.split('**');
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 4 }}>
                <Text style={{ fontSize: 13, color: theme.textPrimary, marginRight: 6, marginTop: 1 }}>•</Text>
                <Text style={{ fontSize: 13.5, color: theme.textPrimary, flex: 1, lineHeight: 18 }}>
                  {parts.map((part, pIdx) => {
                    const isBold = pIdx % 2 === 1;
                    return (
                      <Text key={pIdx} style={isBold ? { fontWeight: '700', color: theme.textPrimary } : undefined}>
                        {cleanMarkdown(part)}
                      </Text>
                    );
                  })}
                </Text>
              </View>
            );
          }

          // 4. Check if it is a numbered list item: 1. or 1)
          const numMatch = trimmed.match(/^(\d+)[\.\)]\s*(.*)$/);
          if (numMatch) {
            const num = numMatch[1];
            const textOnly = numMatch[2];
            const parts = textOnly.split('**');
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#8A5CF5', marginRight: 6, marginTop: 1 }}>{num}.</Text>
                <Text style={{ fontSize: 13.5, color: theme.textPrimary, flex: 1, lineHeight: 18 }}>
                  {parts.map((part, pIdx) => {
                    const isBold = pIdx % 2 === 1;
                    return (
                      <Text key={pIdx} style={isBold ? { fontWeight: '700', color: theme.textPrimary } : undefined}>
                        {cleanMarkdown(part)}
                      </Text>
                    );
                  })}
                </Text>
              </View>
            );
          }

          // 5. Normal text with potential inline bold tags
          const parts = trimmed.split('**');
          return (
            <Text key={idx} style={{ fontSize: 13.5, color: theme.textPrimary, lineHeight: 19, marginVertical: 2 }}>
              {parts.map((part, pIdx) => {
                const isBold = pIdx % 2 === 1;
                return (
                  <Text key={pIdx} style={isBold ? { fontWeight: '700', color: theme.textPrimary } : undefined}>
                    {cleanMarkdown(part)}
                  </Text>
                );
              })}
            </Text>
          );
        })}
      </View>
    );
  };

  // Export functions (Step 6)
  const handleExport = (format: string) => {
    showToast('success', 'Export Commenced', `Dossier exported to ${format} successfully.`);
  };

  const handleLaunchMockCourt = () => {
    showToast('info', 'Launching Simulator', 'Booting AI Moot Court simulation room...');
    router.push({
      pathname: '/tools/mock-courtroom',
      params: { caseId: activeCaseId || 'current' }
    });
  };

  // Toggle sections collapse
  const toggleSection = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredSections = useMemo(() => {
    if (!workspaceSearch.trim()) return sectionsData;
    return sectionsData.filter(
      (s) =>
        s.title.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
        s.content.toLowerCase().includes(workspaceSearch.toLowerCase())
    );
  }, [sectionsData, workspaceSearch]);

  const activeIntelContent = useMemo(() => {
    return intelligenceData.find((d) => d.id === activeIntelligenceTab);
  }, [intelligenceData, activeIntelligenceTab]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* 1. Header Bar */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Court Prep Workspace</Text>
          <Text style={styles.headerSubtitle}>Hearing Intelligence Platform</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={() => setIsAiAssistantOpen(true)} style={[styles.headerBtn, { marginRight: 8 }]}>
            <Ionicons name="sparkles" size={22} color="#8A5CF5" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsHistoryOpen(true)} style={styles.headerBtn}>
            <Ionicons name="time-outline" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* CASE INTAKE WIZARD OVERLAY VIEW */}
      {showIntakeWizard ? (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.wizardHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => { setShowIntakeWizard(false); clearIntakeDraft(); }} style={styles.wizardBackBtn}>
              <Ionicons name="close-outline" size={26} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.wizardTitle, { color: theme.textPrimary }]}>Manual Facts Entry</Text>
              <Text style={styles.wizardSubtitle}>Create a complete legal case using structured facts and AI assistance.</Text>
            </View>
            <TouchableOpacity onPress={clearIntakeDraft} style={styles.clearDraftBtn}>
              <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Reset</Text>
            </TouchableOpacity>
          </View>

          {intakeMethod === 'none' && (
            <ScrollView contentContainerStyle={styles.wizardScroll}>
              <Text style={[styles.wizardSectionHeading, { color: theme.textPrimary, textAlign: 'center', marginBottom: 20 }]}>
                Choose how you want to enter your case
              </Text>

              <View style={styles.wizardMethodGrid}>
                {/* Method 1: AI Guided (Recommended) */}
                <TouchableOpacity
                  style={[styles.wizardMethodCard, { borderColor: '#8A5CF5', backgroundColor: theme.card }]}
                  onPress={startAIInterview}
                >
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                  </View>
                  <View style={[styles.wizardMethodIconCircle, { backgroundColor: 'rgba(138, 92, 245, 0.15)' }]}>
                    <Ionicons name="chatbubbles-outline" size={28} color="#8A5CF5" />
                  </View>
                  <Text style={[styles.wizardMethodTitle, { color: theme.textPrimary }]}>🤖 AI Guided Interview</Text>
                  <Text style={[styles.wizardMethodDesc, { color: theme.textSecondary }]}>
                    Answer single-question legal queries dynamically. AI compiles facts chronologically.
                  </Text>
                </TouchableOpacity>

                {/* Method 2: Write Manually */}
                <TouchableOpacity
                  style={[styles.wizardMethodCard, { borderColor: theme.border, backgroundColor: theme.card }]}
                  onPress={() => { setIntakeMethod('manual'); setIntakeStep(1); }}
                >
                  <View style={[styles.wizardMethodIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Ionicons name="create-outline" size={28} color="#10B981" />
                  </View>
                  <Text style={[styles.wizardMethodTitle, { color: theme.textPrimary }]}>✍ Write Manually</Text>
                  <Text style={[styles.wizardMethodDesc, { color: theme.textSecondary }]}>
                    Fill structured legal forms directly. Recommended for experienced litigators.
                  </Text>
                </TouchableOpacity>

                {/* Method 3: Voice Dictation */}
                <TouchableOpacity
                  style={[styles.wizardMethodCard, { borderColor: theme.border, backgroundColor: theme.card }]}
                  onPress={() => setIntakeMethod('voice')}
                >
                  <View style={[styles.wizardMethodIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Ionicons name="mic-outline" size={28} color="#EF4444" />
                  </View>
                  <Text style={[styles.wizardMethodTitle, { color: theme.textPrimary }]}>🎤 Voice Dictation</Text>
                  <Text style={[styles.wizardMethodDesc, { color: theme.textSecondary }]}>
                    Narrate the case timeline directly. Speech gets transcribed into structured legal folders.
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* METHOD A: WRITE MANUALLY STEP BUILDER */}
          {intakeMethod === 'manual' && (
            <View style={{ flex: 1 }}>
              {/* Steps Progress Indicator */}
              <View style={styles.wizardProgressContainer}>
                {[1, 2, 3, 4, 5, 6].map((st) => (
                  <View
                    key={st}
                    style={[
                      styles.wizardProgressBarDot,
                      intakeStep >= st ? { backgroundColor: '#10B981' } : { backgroundColor: theme.border },
                    ]}
                  />
                ))}
              </View>

              <ScrollView contentContainerStyle={styles.wizardScroll}>
                {intakeStep === 1 && (
                  <View style={styles.wizardStepForm}>
                    <Text style={[styles.wizardFormHeaderTitle, { color: theme.textPrimary }]}>Section 1: Basic Information</Text>
                    
                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Case Title</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="E.g., Apex Logistics vs Nitin Kumar"
                      placeholderTextColor={theme.placeholder}
                      value={caseTitle}
                      onChangeText={setCaseTitle}
                    />

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Court Name</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="E.g., Court of Metropolitan Magistrate, Delhi"
                      placeholderTextColor={theme.placeholder}
                      value={courtNameInput}
                      onChangeText={setCourtNameInput}
                    />

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Case Type</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="E.g., Cheque Dishonour Suit (Sec 138)"
                      placeholderTextColor={theme.placeholder}
                      value={caseTypeInput}
                      onChangeText={setCaseTypeInput}
                    />

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Your Role</Text>
                    <View style={styles.wizardRoleGrid}>
                      {['Petitioner', 'Respondent', 'Plaintiff', 'Defendant', 'Complainant', 'Accused'].map((rl) => (
                        <TouchableOpacity
                          key={rl}
                          style={[
                            styles.roleSelectBtn,
                            role === rl && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                            { borderColor: theme.border }
                          ]}
                          onPress={() => setRole(rl as any)}
                        >
                          <Text style={[styles.roleSelectText, role === rl && { color: '#FFFFFF' }, { color: theme.textSecondary }]}>{rl}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {intakeStep === 2 && (
                  <View style={styles.wizardStepForm}>
                    <Text style={[styles.wizardFormHeaderTitle, { color: theme.textPrimary }]}>Section 2: Parties Details</Text>

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Petitioner / Complainant Name</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="E.g., Apex Logistics Corporation"
                      placeholderTextColor={theme.placeholder}
                      value={petitionerName}
                      onChangeText={setPetitionerName}
                    />

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Respondent / Accused Name</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="E.g., Nitin Kumar"
                      placeholderTextColor={theme.placeholder}
                      value={respondentName}
                      onChangeText={setRespondentName}
                    />

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Lead Advocate Name</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Adv. Sharma & Associates"
                      placeholderTextColor={theme.placeholder}
                      value={advocateName}
                      onChangeText={setAdvocateName}
                    />
                  </View>
                )}

                {intakeStep === 3 && (
                  <View style={styles.wizardStepForm}>
                    <Text style={[styles.wizardFormHeaderTitle, { color: theme.textPrimary }]}>Section 3: Case Facts</Text>
                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Dispute Description</Text>
                    <TextInput
                      style={[styles.wizardFactsEditor, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                      placeholder="Describe your case in detail..."
                      placeholderTextColor={theme.placeholder}
                      multiline
                      numberOfLines={10}
                      value={caseFactsText}
                      onChangeText={setCaseFactsText}
                    />

                    {/* Facts Quick Utility bar */}
                    <View style={styles.wizardFactsUtilityBar}>
                      <TouchableOpacity style={[styles.utilityActionBtn, { borderColor: theme.border }]} onPress={() => showToast('info', 'Mic active', 'Voice note transcription initialized.')}>
                        <Ionicons name="mic" size={16} color="#EF4444" />
                        <Text style={[styles.utilityActionBtnText, { color: theme.textPrimary }]}>Voice</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.utilityActionBtn, { borderColor: theme.border }]} onPress={showAttachmentOptions}>
                        <Ionicons name="document-attach" size={16} color="#3B82F6" />
                        <Text style={[styles.utilityActionBtnText, { color: theme.textPrimary }]}>Attach Docs</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.utilityActionBtn, { borderColor: theme.border }]} onPress={showAttachmentOptions}>
                        <Ionicons name="image" size={16} color="#10B981" />
                        <Text style={[styles.utilityActionBtnText, { color: theme.textPrimary }]}>Attach Images</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {intakeStep === 4 && (
                  <View style={styles.wizardStepForm}>
                    <Text style={[styles.wizardFormHeaderTitle, { color: theme.textPrimary }]}>Section 4: Important Dates</Text>

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Agreement Date</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={theme.placeholder}
                      value={agreementDate}
                      onChangeText={setAgreementDate}
                    />

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Incident Date</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={theme.placeholder}
                      value={incidentDate}
                      onChangeText={setIncidentDate}
                    />

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Notice Date</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={theme.placeholder}
                      value={noticeDate}
                      onChangeText={setNoticeDate}
                    />

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>FIR Date</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={theme.placeholder}
                      value={firDate}
                      onChangeText={setFirDate}
                    />

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Cause of Action Arisen Date</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={theme.placeholder}
                      value={causeOfActionDate}
                      onChangeText={setCauseOfActionDate}
                    />

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary }]}>Hearing Date</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={theme.placeholder}
                      value={hearingDate}
                      onChangeText={setHearingDate}
                    />
                  </View>
                )}

                {intakeStep === 5 && (
                  <View style={styles.wizardStepForm}>
                    <Text style={[styles.wizardFormHeaderTitle, { color: theme.textPrimary }]}>Section 5: Evidence Classification</Text>
                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary, marginBottom: 12 }]}>
                      Select all evidence types currently available:
                    </Text>

                    <View style={styles.evidenceGrid}>
                      {Object.keys(selectedEvidences).map((ev) => (
                        <TouchableOpacity
                          key={ev}
                          style={[
                            styles.evidenceCheckboxRow,
                            { borderColor: theme.border, backgroundColor: theme.surface },
                            selectedEvidences[ev] && { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.08)' },
                          ]}
                          onPress={() => setSelectedEvidences((prev) => ({ ...prev, [ev]: !prev[ev] }))}
                        >
                          <Ionicons
                            name={selectedEvidences[ev] ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={selectedEvidences[ev] ? '#10B981' : theme.textSecondary}
                          />
                          <Text style={[styles.evidenceLabel, { color: theme.textPrimary }]}>{ev}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {intakeStep === 6 && (
                  <View style={styles.wizardStepForm}>
                    <Text style={[styles.wizardFormHeaderTitle, { color: theme.textPrimary }]}>Section 6: Relief Requested</Text>
                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary, marginBottom: 12 }]}>
                      Select primary relief options sought:
                    </Text>

                    <View style={styles.evidenceGrid}>
                      {[
                        { id: 'Recovery', label: 'Financial Recovery' },
                        { id: 'Compensation', label: 'Compensation / Damages' },
                        { id: 'Bail', label: 'Bail / Anticipatory Bail' },
                        { id: 'Divorce', label: 'Divorce / Matrimonial Relief' },
                        { id: 'Injunction', label: 'Permanent Injunction' },
                        { id: 'SpecificPerformance', label: 'Specific Performance' }
                      ].map((rel) => (
                        <TouchableOpacity
                          key={rel.id}
                          style={[
                            styles.evidenceCheckboxRow,
                            { borderColor: theme.border, backgroundColor: theme.surface },
                            selectedReliefs[rel.id] && { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.08)' },
                          ]}
                          onPress={() => setSelectedReliefs((prev) => ({ ...prev, [rel.id]: !prev[rel.id] }))}
                        >
                          <Ionicons
                            name={selectedReliefs[rel.id] ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={selectedReliefs[rel.id] ? '#3B82F6' : theme.textSecondary}
                          />
                          <Text style={[styles.evidenceLabel, { color: theme.textPrimary }]}>{rel.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.wizardInputLabel, { color: theme.textSecondary, marginTop: 20 }]}>Custom Relief / Additional Prayers</Text>
                    <TextInput
                      style={[styles.wizardTextInputField, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="State any specific relief or order requests..."
                      placeholderTextColor={theme.placeholder}
                      value={customRelief}
                      onChangeText={setCustomRelief}
                    />
                  </View>
                )}
              </ScrollView>

              {/* Form Navigation Controls */}
              <View style={[styles.wizardFooterControls, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
                {intakeStep > 1 ? (
                  <TouchableOpacity style={[styles.navigationBtn, { borderColor: theme.border }]} onPress={() => setIntakeStep((prev) => prev - 1)}>
                    <Ionicons name="arrow-back" size={16} color={theme.textPrimary} style={{ marginRight: 6 }} />
                    <Text style={[styles.navigationBtnText, { color: theme.textPrimary }]}>Previous</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.navigationBtn, { borderColor: theme.border }]} onPress={() => setIntakeMethod('none')}>
                    <Text style={[styles.navigationBtnText, { color: theme.textPrimary }]}>Dashboard</Text>
                  </TouchableOpacity>
                )}

                {intakeStep < 6 ? (
                  <TouchableOpacity style={styles.navigationBtnActive} onPress={() => setIntakeStep((prev) => prev + 1)}>
                    <Text style={styles.navigationBtnActiveText}>Next Step</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.navigationBtnActive, { backgroundColor: '#10B981' }]} onPress={triggerCaseAnalysisFromWizard}>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.navigationBtnActiveText}>Analyze with AI</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* METHOD B: VOICE DICTATION WORKFLOW */}
          {intakeMethod === 'voice' && (
            <View style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.wizardScroll}>
                <Text style={[styles.wizardFormHeaderTitle, { color: theme.textPrimary, textAlign: 'center', marginBottom: 6 }]}>
                  Narrate Your Case Facts
                </Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginBottom: 30 }}>
                  Speak details naturally. Our legal speech parser maps names, invoices, dates, and causes of action automatically.
                </Text>

                {/* Pulser Mic Interface */}
                <View style={styles.micInterfaceContainer}>
                  <Animated.View
                    style={[
                      styles.micPulsingRing,
                      {
                        transform: [{ scale: micAnimValue }],
                        opacity: isVoiceRecording ? 0.4 : 0.1,
                        backgroundColor: '#EF4444',
                      },
                    ]}
                  />
                  <TouchableOpacity
                    style={[styles.micRecordCircle, { backgroundColor: isVoiceRecording ? '#EF4444' : '#E2E8F0' }]}
                    onPress={toggleVoiceRecording}
                  >
                    <Ionicons name={isVoiceRecording ? 'stop' : 'mic'} size={38} color={isVoiceRecording ? '#FFFFFF' : '#475569'} />
                  </TouchableOpacity>
                  <Text style={[styles.recordingStatusLabel, { color: theme.textPrimary }]}>
                    {isVoiceRecording ? 'Listening & Transcribing...' : 'Tap Mic to Start Dictating'}
                  </Text>
                </View>

                {/* Transcription output box */}
                <View style={[styles.transcriptionCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                  <Text style={[styles.transcriptionHeading, { color: theme.textSecondary }]}>Live Transcription</Text>
                  <TextInput
                    style={[styles.transcriptionEditorText, { color: theme.textPrimary }]}
                    multiline
                    value={voiceText}
                    onChangeText={setVoiceText}
                    placeholder="Transcription text will display here in real time. Feel free to edit after dictation completes..."
                    placeholderTextColor={theme.placeholder}
                  />
                </View>
              </ScrollView>

              <View style={[styles.wizardFooterControls, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
                <TouchableOpacity style={[styles.navigationBtn, { borderColor: theme.border }]} onPress={() => setIntakeMethod('none')}>
                  <Text style={[styles.navigationBtnText, { color: theme.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.navigationBtnActive, { backgroundColor: '#10B981' }, !voiceText && { opacity: 0.5 }]}
                  disabled={!voiceText}
                  onPress={triggerCaseAnalysisFromWizard}
                >
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.navigationBtnActiveText}>Analyze with AI</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* METHOD C: AI GUIDED INTERVIEW WORKFLOW */}
          {intakeMethod === 'ai-guided' && (
            <View style={{ flex: 1 }}>
              {/* Progress counter */}
              <View style={styles.wizardProgressRow}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A5CF5' }}>
                  CASE DOSSIER INTAKE PROGRESS
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textSecondary }}>
                  Question {currentQuestionIndex + 1} of {interviewQuestions.length}
                </Text>
              </View>
              <View style={[styles.interviewProgressBarBg, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.interviewProgressBarFill,
                    {
                      width: `${((currentQuestionIndex + 1) / interviewQuestions.length) * 100}%`,
                      backgroundColor: '#8A5CF5',
                    },
                  ]}
                />
              </View>

              {/* Chat styled list */}
              <ScrollView
                style={{ flex: 1, padding: 16 }}
                contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
                ref={(ref) => ref?.scrollToEnd({ animated: true })}
              >
                {interviewHistory.map((chat, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.chatBubbleRow,
                      chat.role === 'user' ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
                    ]}
                  >
                    {chat.role === 'ai' && (
                      <View style={styles.chatAvatar}>
                        <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                      </View>
                    )}
                    <View
                      style={[
                        styles.chatBubble,
                        chat.role === 'user'
                          ? { backgroundColor: '#8A5CF5', borderBottomRightRadius: 2 }
                          : { backgroundColor: theme.surface, borderBottomLeftRadius: 2, borderColor: theme.border, borderWidth: 1 },
                      ]}
                    >
                      <Text style={[styles.chatBubbleText, chat.role === 'user' ? { color: '#FFFFFF' } : { color: theme.textPrimary }]}>
                        {chat.text}
                      </Text>
                    </View>
                  </View>
                ))}

                {isGenerating && (
                  <View style={styles.chatBubbleRow}>
                    <View style={styles.chatAvatar}>
                      <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                    </View>
                    <View style={[styles.chatBubble, { backgroundColor: theme.surface, borderBottomLeftRadius: 2 }]}>
                      <ActivityIndicator size="small" color="#8A5CF5" />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Answer input Composer */}
              <View style={[styles.interviewComposerContainer, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
                <TextInput
                  style={[styles.interviewInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                  placeholder="Type your response here..."
                  placeholderTextColor={theme.placeholder}
                  value={interviewAnswerInput}
                  onChangeText={setInterviewAnswerInput}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.interviewSendBtn,
                    !interviewAnswerInput.trim() && { opacity: 0.5 },
                  ]}
                  disabled={!interviewAnswerInput.trim()}
                  onPress={handleSendInterviewAnswer}
                >
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {currentQuestionIndex + 1 === interviewQuestions.length && (
                <View style={[styles.wizardFooterControls, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
                  <TouchableOpacity style={[styles.navigationBtn, { borderColor: theme.border }]} onPress={() => setIntakeMethod('none')}>
                    <Text style={[styles.navigationBtnText, { color: theme.textPrimary }]}>Exit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.navigationBtnActive, { backgroundColor: '#10B981' }]}
                    onPress={triggerCaseAnalysisFromWizard}
                  >
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.navigationBtnActiveText}>Compile & Analyze</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      ) : (
        // RENDER DEFAULT WORKSPACE SCREENS
        <React.Fragment>
          {workspaceStep === 'source' && (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* STEP 1: CHOOSE SOURCE */}
              <Text style={[styles.welcomeMainTitle, { color: theme.textPrimary }]}>Hearing Preparation Setup</Text>
              <Text style={[styles.welcomeSubText, { color: theme.textSecondary }]}>
                Select a case source. AI will analyze documents, extract facts, build timelines, research precedents, and prepare your hearing workspace.
              </Text>

              <View style={styles.sourceGrid}>
                {/* Card 1: Case Workspace */}
                <TouchableOpacity
                  style={[
                    styles.sourceCard,
                    { borderColor: theme.border, backgroundColor: theme.card },
                  ]}
                  onPress={() => handleSelectSource('workspace')}
                >
                  <View style={[styles.sourceIconWrapper, { backgroundColor: 'rgba(138, 92, 245, 0.12)' }]}>
                    <Ionicons name="folder-open-outline" size={22} color="#8A5CF5" />
                  </View>
                  <Text style={[styles.sourceCardTitle, { color: theme.textPrimary }]}>Case Workspace</Text>
                  <Text style={[styles.sourceCardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                    Import an existing case with documents, evidence, timelines, and AI analysis.
                  </Text>
                  {activeCaseDetails && (
                    <View style={styles.activeCaseBadge}>
                      <Text style={styles.activeCaseBadgeText} numberOfLines={1}>
                        Active: {activeCaseDetails.name}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.sourceCardBtn, { backgroundColor: '#8A5CF5' }]}>
                    <Text style={styles.sourceCardBtnText}>Select Workspace</Text>
                  </View>
                </TouchableOpacity>

                {/* Card 2: Upload Documents */}
                <TouchableOpacity
                  style={[
                    styles.sourceCard,
                    { borderColor: theme.border, backgroundColor: theme.card },
                  ]}
                  onPress={showAttachmentOptions}
                >
                  <View style={[styles.sourceIconWrapper, { backgroundColor: 'rgba(138, 92, 245, 0.12)' }]}>
                    <Ionicons name="cloud-upload-outline" size={22} color="#8A5CF5" />
                  </View>
                  <Text style={[styles.sourceCardTitle, { color: theme.textPrimary }]}>Upload Legal Documents</Text>
                  <Text style={[styles.sourceCardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                    Extract parties, timeline, and facts from PDF, Word or images.
                  </Text>
                  {attachments.length > 0 && (
                    <View style={[styles.activeCaseBadge, { backgroundColor: 'rgba(138, 92, 245, 0.15)' }]}>
                      <Text style={[styles.activeCaseBadgeText, { color: '#8A5CF5' }]}>
                        {attachments.length} file(s) attached
                      </Text>
                    </View>
                  )}
                  <View style={[styles.sourceCardBtn, { backgroundColor: '#8A5CF5' }]}>
                    <Text style={styles.sourceCardBtnText}>Upload Documents</Text>
                  </View>
                </TouchableOpacity>

                {/* Card 3: Manual Entry */}
                <TouchableOpacity
                  style={[
                    styles.sourceCard,
                    { borderColor: theme.border, backgroundColor: theme.card },
                  ]}
                  onPress={() => handleSelectSource('manual')}
                >
                  <View style={[styles.sourceIconWrapper, { backgroundColor: 'rgba(138, 92, 245, 0.12)' }]}>
                    <Ionicons name="create-outline" size={22} color="#8A5CF5" />
                  </View>
                  <Text style={[styles.sourceCardTitle, { color: theme.textPrimary }]}>Manual Entry</Text>
                  <Text style={[styles.sourceCardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                    Launch Intake Wizard: Write details, dictate, or run an AI interview.
                  </Text>
                  <View style={[styles.sourceCardBtn, { backgroundColor: '#8A5CF5' }]}>
                    <Text style={styles.sourceCardBtnText}>Enter Facts</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {attachments.length > 0 && (
                <View style={styles.attachmentsListWrapper}>
                  <Text style={[styles.attachmentsHeading, { color: theme.textPrimary }]}>Attached Files</Text>
                  {attachments.map((file) => (
                    <View key={file.name} style={[styles.attachmentRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Ionicons name="document-text" size={20} color="#EF4444" />
                      <Text style={[styles.attachmentNameText, { color: theme.textPrimary }]} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveAttachment(file.name)}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.generateButton} onPress={triggerCaseAnalysis}>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.generateButtonText}>Initialize Court preparation</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}

          {workspaceStep === 'analyzing' && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color="#EF4444" />
              <Text style={[styles.analyzingText, { color: theme.textPrimary }]}>Analyzing Case Folders...</Text>
              <Text style={[styles.analyzingSubtext, { color: theme.textSecondary }]}>
                AI is mapping evidence, building timeline, extracting legal issues and identifying applicable laws.
              </Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${generationProgress}%` }]} />
              </View>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 8 }}>{generationProgress}% Compiled</Text>
            </View>
          )}

          {workspaceStep === 'workspace' && (
            <View style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.workspaceScroll} showsVerticalScrollIndicator={false}>
                {/* STEP 2: CASE INTELLIGENCE DASHBOARD */}
                <View style={[styles.dashboardCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.dashboardHeader}>
                    <Ionicons name="bar-chart-outline" size={20} color="#EF4444" />
                    <Text style={[styles.dashboardTitle, { color: theme.textPrimary }]}>Case Intelligence Dashboard</Text>
                  </View>

                  <View style={styles.dashboardMetricsGrid}>
                    <View style={[styles.metricBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={styles.metricLabel}>Strength Score</Text>
                      <Text style={[styles.metricValue, { color: '#10B981' }]}>{caseMetrics.strengthScore}%</Text>
                    </View>

                    <View style={[styles.metricBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={styles.metricLabel}>Risk Level</Text>
                      <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{caseMetrics.riskLevel}</Text>
                    </View>

                    <View style={[styles.metricBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={styles.metricLabel}>Evidence Strength</Text>
                      <Text style={[styles.metricValue, { color: '#10B981' }]}>{caseMetrics.evidenceStrength}</Text>
                    </View>

                    <View style={[styles.metricBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={styles.metricLabel}>Confidence</Text>
                      <Text style={[styles.metricValue, { color: theme.primary }]}>{caseMetrics.confidenceScore}%</Text>
                    </View>
                  </View>

                  {/* Extra details (Acts, sections, deadlines) */}
                  <View style={styles.dashboardDetailsRow}>
                    <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Applicable Acts:</Text>
                    <Text style={[styles.detailsValue, { color: theme.textPrimary }]}>{caseMetrics.applicableActs}</Text>
                  </View>
                  <View style={styles.dashboardDetailsRow}>
                    <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Key Issue:</Text>
                    <Text style={[styles.detailsValue, { color: theme.textPrimary }]} numberOfLines={1}>
                      {caseMetrics.keyLegalIssues}
                    </Text>
                  </View>
                  <View style={styles.dashboardDetailsRow}>
                    <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Missing Info:</Text>
                    <Text style={[styles.detailsValue, { color: '#EF4444' }]} numberOfLines={1}>
                      {caseMetrics.missingInfo}
                    </Text>
                  </View>
                </View>

                {/* SEARCH COMPRESSED */}
                <View style={[styles.searchBar, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                  <Ionicons name="search-outline" size={16} color={theme.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.textPrimary }]}
                    placeholder="Search Court Preparation Dossier..."
                    placeholderTextColor={theme.placeholder}
                    value={workspaceSearch}
                    onChangeText={setWorkspaceSearch}
                  />
                </View>

                {/* STEP 3: COURT PREPARATION WORKSPACE (12 SECTIONS) */}
                <Text style={[styles.workspaceSubheading, { color: theme.textPrimary }]}>Case Folder & Sections</Text>
                
                {filteredSections.map((sec) => {
                  const isExpanded = expandedSections[sec.id];
                  return (
                    <View key={sec.id} style={[styles.sectionContainer, { borderColor: theme.border, backgroundColor: theme.card }]}>
                      <TouchableOpacity
                        style={styles.sectionHeader}
                        onPress={() => toggleSection(sec.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.sectionHeaderLeft}>
                          <Ionicons name={sec.icon as any} size={20} color="#EF4444" style={{ marginRight: 10 }} />
                          <View>
                            <Text style={[styles.sectionTitleText, { color: theme.textPrimary }]}>{sec.title}</Text>
                            <Text style={[styles.sectionDescText, { color: theme.textSecondary }]}>{sec.description}</Text>
                          </View>
                        </View>
                        <View style={styles.sectionHeaderRight}>
                          <View style={[styles.confidencePill, { backgroundColor: sec.confidence > 90 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                            <Text style={[styles.confidencePillText, { color: sec.confidence > 90 ? '#10B981' : '#F59E0B' }]}>
                              {sec.confidence}% Conf
                            </Text>
                          </View>
                          <Ionicons
                            name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                            size={18}
                            color={theme.textMuted}
                          />
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={[styles.sectionBody, { borderTopColor: theme.border }]}>
                          {renderPrepSectionContent(sec.content)}

                          <View style={[styles.whyCallout, { backgroundColor: theme.surface }]}>
                            <Text style={[styles.whyTitle, { color: theme.textSecondary }]}>💡 Explain Why</Text>
                            <Text style={[styles.whyContent, { color: theme.textSecondary }]}>{sec.why}</Text>
                          </View>

                          {/* Section Action Row */}
                          <View style={styles.sectionActionsRow}>
                            <TouchableOpacity style={[styles.sectionActionButton, { borderColor: theme.border }]} onPress={() => handleRegenerateSection(sec.id)}>
                              <Ionicons name="sync-outline" size={14} color={theme.textSecondary} />
                              <Text style={[styles.sectionActionText, { color: theme.textSecondary }]}>Rewrite</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.sectionActionButton, { borderColor: theme.border }]} onPress={() => handleCopySection(sec.content)}>
                              <Ionicons name="copy-outline" size={14} color={theme.textSecondary} />
                              <Text style={[styles.sectionActionText, { color: theme.textSecondary }]}>Copy</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.sectionActionButton, { borderColor: theme.border }]}
                              onPress={() => {
                                showToast('info', 'Editor Open', 'Section layout unlocked.');
                              }}
                            >
                              <Ionicons name="create-outline" size={14} color={theme.textSecondary} />
                              <Text style={[styles.sectionActionText, { color: theme.textSecondary }]}>Edit</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* STEP 4: COURT PREPARATION INTELLIGENCE (PREMIUM PANEL) */}
                <View style={[styles.intelligenceContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.intelligenceHeader}>
                    <Ionicons name="bulb" size={22} color="#EF4444" />
                    <Text style={[styles.intelligenceTitle, { color: theme.textPrimary }]}>Hearing Intelligence Tools</Text>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.intelligenceTabsScroll}
                  >
                    {intelligenceData.map((tab) => {
                      const isActive = activeIntelligenceTab === tab.id;
                      return (
                        <TouchableOpacity
                          key={tab.id}
                          style={[
                            styles.intelligenceTab,
                            isActive
                              ? { backgroundColor: '#8A5CF5', borderColor: '#8A5CF5' }
                              : { backgroundColor: '#FFFFFF', borderColor: '#8A5CF5', borderWidth: 1.5 },
                          ]}
                          onPress={() => handleSelectIntelTab(tab.id)}
                        >
                          <Ionicons
                            name={tab.icon as any}
                            size={14}
                            color={isActive ? '#FFFFFF' : '#8A5CF5'}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              styles.intelligenceTabText,
                              { color: isActive ? '#FFFFFF' : '#8A5CF5', fontWeight: '700' },
                            ]}
                          >
                            {tab.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {intelLoadingTab === activeIntelligenceTab ? (
                    <View style={{ padding: 36, alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator size="small" color="#8A5CF5" />
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 10, fontWeight: '600' }}>
                        AI synthesizing intelligence report...
                      </Text>
                    </View>
                  ) : activeIntelContent ? (
                    <View style={[styles.intelligenceContentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={[styles.intelDescription, { color: theme.textSecondary, marginBottom: 12, fontSize: 12, fontStyle: 'italic' }]}>
                        {activeIntelContent.description}
                      </Text>
                      
                      {renderStructuredResponse(activeIntelligenceTab)}

                      {/* Actions for intel tab */}
                      <View style={[styles.intelActionsRow, { flexWrap: 'wrap', gap: 10, marginTop: 14 }]}>
                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => handleCopySection(JSON.stringify(getStructuredIntelContent(activeIntelligenceTab)))}
                        >
                          <Ionicons name="copy-outline" size={14} color="#8A5CF5" style={{ marginRight: 4 }} />
                          <Text style={[styles.intelActionBtnText, { color: '#8A5CF5' }]}>Copy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => handleRegenerateIntelTab(activeIntelligenceTab)}
                        >
                          <Ionicons name="refresh-outline" size={14} color="#8A5CF5" style={{ marginRight: 4 }} />
                          <Text style={[styles.intelActionBtnText, { color: '#8A5CF5' }]}>Regenerate</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => showToast('success', 'Saved to Case', 'Report pinned to case assets folder.')}
                        >
                          <Ionicons name="save-outline" size={14} color="#8A5CF5" style={{ marginRight: 4 }} />
                          <Text style={[styles.intelActionBtnText, { color: '#8A5CF5' }]}>Save to Case</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => handleExport('PDF')}
                        >
                          <Ionicons name="document-outline" size={14} color="#8A5CF5" style={{ marginRight: 4 }} />
                          <Text style={[styles.intelActionBtnText, { color: '#8A5CF5' }]}>Export PDF</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => showToast('success', 'Shared', 'Pre-analysis briefing shared with client.')}
                        >
                          <Ionicons name="share-social-outline" size={14} color="#8A5CF5" style={{ marginRight: 4 }} />
                          <Text style={[styles.intelActionBtnText, { color: '#8A5CF5' }]}>Share</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => showToast('success', 'Pinned', 'Successfully pinned to active workspace notes.')}
                        >
                          <Ionicons name="pin-outline" size={14} color="#8A5CF5" style={{ marginRight: 4 }} />
                          <Text style={[styles.intelActionBtnText, { color: '#8A5CF5' }]}>Pin to Notes</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* STEP 7: MOCK COURTROOM INTEGRATION */}
                <View style={[styles.mockCourtCard, { borderColor: '#8A5CF5' }]}>
                  <View style={styles.mockCourtHeader}>
                    <Ionicons name="people" size={24} color="#8A5CF5" />
                    <Text style={styles.mockCourtTitle}>Practice in Mock Courtroom</Text>
                  </View>
                  <Text style={styles.mockCourtDesc}>
                    Ready for the trial? Launch our AI Courtroom simulation. Practice oral advocacy against AI Judges, opposing counsel, and receive immediate scoring.
                  </Text>
                  <TouchableOpacity style={styles.mockCourtBtn} onPress={handleLaunchMockCourt}>
                    <Text style={styles.mockCourtBtnText}>Launch Simulation Room</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* STEP 6: EXPORT BAR */}
                <View style={[styles.exportBar, { borderTopColor: theme.border }]}>
                  <Text style={[styles.exportTitle, { color: theme.textSecondary }]}>Export Folder</Text>
                  <View style={styles.exportButtonsGrid}>
                    <TouchableOpacity style={[styles.exportBtn, { borderColor: theme.border }]} onPress={() => handleExport('PDF')}>
                      <Ionicons name="document-outline" size={16} color="#EF4444" />
                      <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.exportBtn, { borderColor: theme.border }]} onPress={() => handleExport('DOCX')}>
                      <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
                      <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>Word</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.exportBtn, { borderColor: theme.border }]} onPress={() => handleCopySection(JSON.stringify(sectionsData))}>
                      <Ionicons name="copy-outline" size={16} color="#10B981" />
                      <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>Copy All</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.exportBtn, { borderColor: theme.border }]} onPress={() => handleExport('Share')}>
                      <Ionicons name="share-social-outline" size={16} color="#8A5CF5" />
                      <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>Share</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.exportToolbarFooter}>
                    <TouchableOpacity
                      style={styles.footerUtilityBtn}
                      onPress={() => showToast('success', 'Case Linked', 'Court prep dossier pinned to CaseWorkspace')}
                    >
                      <Ionicons name="link-outline" size={14} color={theme.textSecondary} />
                      <Text style={[styles.footerUtilityBtnText, { color: theme.textSecondary }]}>Link Workspace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.footerUtilityBtn}
                      onPress={() => showToast('info', 'Version History', 'v1.2 (Active)')}
                    >
                      <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                      <Text style={[styles.footerUtilityBtnText, { color: theme.textSecondary }]}>Version History</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ height: 100 }} />
              </ScrollView>


              {/* STEP 5: AI REFINEMENT FLOATING BUTTON */}
              <TouchableOpacity
                style={[styles.floatingRefinementBtn, Shadows.md]}
                onPress={() => setIsRefinementOpen(true)}
              >
                <Text style={styles.floatingRefinementBtnText}>✨ Style: {refinementMode}</Text>
              </TouchableOpacity>
            </View>
          )}
        </React.Fragment>
      )}

      {/* Refinement Modal Selector */}
      <Modal visible={isRefinementOpen} animationType="slide" transparent={true} onRequestClose={() => setIsRefinementOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsRefinementOpen(false)} />
          <View style={[styles.bottomSheetContainer, Shadows.modal, { height: height * 0.75 }]}>
            <View style={styles.bottomSheetDragHandle} />
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>AI Argument Refinement Style</Text>
              <TouchableOpacity onPress={() => setIsRefinementOpen(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {[
                'Courtroom Style',
                'Formal',
                'Judge Friendly',
                'Senior Counsel Style',
                'Aggressive Litigation',
                'Neutral',
                'Concise',
                'Detailed',
                'Plain English',
                'Hindi Legal Drafting',
              ].map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.refinementStyleRow,
                    { borderBottomColor: theme.border },
                    refinementMode === style && { 
                      backgroundColor: isDark ? 'rgba(138, 92, 245, 0.15)' : 'rgba(138, 92, 245, 0.08)',
                      borderLeftWidth: 3,
                      borderLeftColor: '#8A5CF5',
                    },
                  ]}
                  onPress={() => handleRefineWorkspace(style)}
                >
                  <Text
                    style={[
                      styles.refinementStyleText,
                      { color: theme.textPrimary },
                      refinementMode === style && { fontWeight: '800', color: '#8A5CF5' },
                    ]}
                  >
                    {style}
                  </Text>
                  {refinementMode === style && <Ionicons name="checkmark" size={18} color="#8A5CF5" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* AI Copilot Chat Drawer (Full-Screen AI Workspace) */}
      <Modal 
        visible={isAiAssistantOpen} 
        transparent={false} 
        animationType="slide" 
        statusBarTranslucent={true}
        onRequestClose={() => setIsAiAssistantOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Header Wrapper matching status bar background */}
            <View style={{ backgroundColor: theme.surface, paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              {/* Simplified Header */}
              <View style={[styles.copilotHeader, { borderBottomWidth: 0, backgroundColor: 'transparent' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                  <TouchableOpacity onPress={() => setIsAiAssistantOpen(false)} style={styles.copilotBackBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                  </TouchableOpacity>

                  <View style={styles.copilotHeaderTitleContainer}>
                    <Text style={[styles.copilotHeaderTitle, { color: theme.textPrimary }]}>Court Prep Copilot</Text>
                    <Text style={styles.copilotHeaderSubtitle}>Hearing Intelligence Assistant</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity onPress={handleNewChat} style={styles.copilotHeaderIconAction}>
                    <Ionicons name="add" size={24} color="#8A5CF5" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsHeaderMenuOpen(true)} style={styles.copilotHeaderIconAction}>
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Header Menu Dropdown Overlay */}
            {isHeaderMenuOpen && (
              <Modal
                transparent={true}
                visible={isHeaderMenuOpen}
                animationType="fade"
                onRequestClose={() => setIsHeaderMenuOpen(false)}
              >
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsHeaderMenuOpen(false)} />
                <View 
                  style={[
                    styles.menuDropdown, 
                    { 
                      backgroundColor: theme.surface, 
                      borderColor: theme.border,
                      top: insets.top + 56,
                    }
                  ]}
                >
                  <TouchableOpacity 
                    style={[styles.menuItem, { borderBottomColor: theme.border }]} 
                    onPress={() => {
                      setIsHeaderMenuOpen(false);
                      setIsCopilotHistoryOpen(true);
                    }}
                  >
                    <Ionicons name="time-outline" size={16} color={theme.textPrimary} style={{ marginRight: 10 }} />
                    <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>History</Text>
                  </TouchableOpacity>


                  <TouchableOpacity 
                    style={[styles.menuItem, { borderBottomColor: theme.border }]} 
                    onPress={() => {
                      setIsHeaderMenuOpen(false);
                      handleExportChat();
                    }}
                  >
                    <Ionicons name="share-outline" size={16} color={theme.textPrimary} style={{ marginRight: 10 }} />
                    <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Export Chat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.menuItem} 
                    onPress={() => {
                      setIsHeaderMenuOpen(false);
                      handleClearConversation();
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 10 }} />
                    <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Clear Conversation</Text>
                  </TouchableOpacity>
                </View>
              </Modal>
            )}

            {/* Case Workspace context indicator (if synced) */}
            {activeCaseDetails?.name && (
              <View style={[styles.copilotCaseContextBadge, { backgroundColor: theme.surfaceVariant }]}>
                <Ionicons name="folder-open" size={14} color="#8A5CF5" style={{ marginRight: 6 }} />
                <Text style={[styles.copilotCaseContextText, { color: theme.textPrimary }]} numberOfLines={1}>
                  Case: {activeCaseDetails.name}
                </Text>
              </View>
            )}

            {/* Chat dialog Scrollable lists */}
            <ScrollView 
              ref={copilotScrollRef} 
              style={{ flex: 1 }} 
              contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16, paddingTop: 12 }} 
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              onScrollBeginDrag={handleScrollBeginDrag}
              scrollEventThrottle={16}
            >
              {activeSession && activeSession.messages && activeSession.messages.length > 0 ? (
                activeSession.messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  
                  // Skip empty model placeholder bubbles (Step 12)
                  if (!isUser && !msg.content.trim()) {
                    return null;
                  }

                  if (isUser) {
                    return (
                      <View 
                        key={msg.id || idx} 
                        style={[styles.chatBubbleContainer, styles.userBubbleAlign]}
                      >
                        <View style={[styles.chatBubble, styles.userBubble]}>
                          <Text style={styles.userBubbleText}>{msg.content}</Text>
                        </View>
                      </View>
                    );
                  }

                  const { cleanedText, suggestions, disclaimer } = parseFollowUpSuggestions(msg.content);

                  return (
                    <View 
                      key={msg.id || idx} 
                      style={[styles.chatBubbleContainer, styles.aiBubbleAlign, { flexDirection: 'column' }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
                        <View style={styles.aiAvatar}>
                          <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                        </View>
                        <View 
                          style={[
                            styles.chatBubble, 
                            styles.aiBubble, 
                            { backgroundColor: theme.surfaceVariant }
                          ]}
                        >
                          <MarkdownRenderer text={cleanedText} />

                          {/* Disclaimer at the bottom of the AI response (Step 6) */}
                          {disclaimer ? (
                            <View style={styles.disclaimerContainer}>
                              <View style={[styles.disclaimerDivider, { backgroundColor: theme.border }]} />
                              <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
                                ⚖️ {disclaimer}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      {/* Clickable inline action chips (Step 9) */}
                      {suggestions.length > 0 && (
                        <View style={{ marginLeft: 30, marginTop: 12 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Suggested Next Actions
                          </Text>
                          <View style={styles.bubbleSuggestionsContainer}>
                            {suggestions
                              .slice(0, expandedSuggestions[msg.id] ? undefined : 4)
                              .map((suggestion, sIdx) => {
                                const shortened = shortenSuggestion(suggestion);
                                return (
                                  <TouchableOpacity
                                    key={sIdx}
                                    style={[styles.bubbleSuggestionChip, { borderColor: '#8A5CF5', backgroundColor: theme.surface }]}
                                    onPress={() => handleSendChat(suggestion)}
                                    disabled={isAiThinking}
                                  >
                                    <Text style={[styles.bubbleSuggestionText, { color: '#8A5CF5' }]}>✓ {shortened}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            
                            {suggestions.length > 4 && !expandedSuggestions[msg.id] && (
                              <TouchableOpacity
                                style={[styles.bubbleSuggestionChip, { borderColor: '#8A5CF5', backgroundColor: theme.surface, borderStyle: 'dashed' }]}
                                onPress={() => toggleExpandSuggestions(msg.id)}
                              >
                                <Text style={[styles.bubbleSuggestionText, { color: '#8A5CF5' }]}>+ More Suggestions</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                // Minimal empty state & greeting (Step 3 & 4)
                <View style={styles.emptyChatContainer}>
                  {/* Lightweight 2-line greeting */}
                  <View style={styles.lightweightGreetingContainer}>
                    <Text style={[styles.lightweightGreetingTitle, { color: theme.textPrimary }]}>
                      Hi! I'm your Court Prep Copilot.
                    </Text>
                    <Text style={[styles.lightweightGreetingSub, { color: theme.textSecondary }]}>
                      How can I help you prepare for today's hearing?
                    </Text>
                  </View>
                </View>
              )}
              {isAiThinking && isLatestMessageEmptyModel && (
                <View style={styles.thinkingBubbleContainer}>
                  <View style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                  </View>
                  <View style={[styles.chatBubble, styles.aiBubble, { backgroundColor: theme.surfaceVariant, paddingVertical: 8, paddingHorizontal: 12, minWidth: 120, justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#8A5CF5' }}>
                      ⚖️ Thinking  {getThinkingDotsText()}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Attachments preview bar */}
            {attachments.length > 0 && (
              <View style={[styles.copilotAttachmentBar, { borderTopColor: theme.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                  {attachments.map((a, i) => (
                    <View key={i} style={[styles.copilotAttachChip, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                      <Ionicons name="document-attach" size={14} color="#8A5CF5" />
                      <Text style={[styles.copilotAttachLabel, { color: theme.textPrimary }]} numberOfLines={1}>{a.name}</Text>
                      <TouchableOpacity onPress={() => handleRemoveAttachment(a.name)}>
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Floating "Scroll to Latest" Button (Step 11) */}
            {showScrollToLatest && (
              <TouchableOpacity
                style={[styles.floatingScrollBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => {
                  copilotScrollRef.current?.scrollToEnd({ animated: true });
                  autoScrollEnabled.current = true;
                  setShowScrollToLatest(false);
                }}
              >
                <Ionicons name="arrow-down" size={18} color="#8A5CF5" />
              </TouchableOpacity>
            )}

            {/* Chat Composer (ChatGPT Style Rounded Input Area) */}
            <View style={[styles.copilotComposerContainer, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12, paddingTop: 8 }]}>
              {isRecording || isTranscribing ? (
                <View style={styles.recordingWrapper}>
                  {/* Cancel Button */}
                  <TouchableOpacity
                    onPress={cancelRecording}
                    style={styles.voiceControlBtn}
                  >
                    <Ionicons name="close" size={24} color="#EF4444" />
                  </TouchableOpacity>

                  {/* Transcribing Indicator / Duration Waveform */}
                  <View style={styles.waveformContainer}>
                    {isTranscribing ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ActivityIndicator size="small" color="#8A5CF5" />
                        <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Transcribing...</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>
                          {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Listening...</Text>
                        <View style={styles.recordingIndicatorDot} />
                      </View>
                    )}
                  </View>

                  {/* Language switch */}
                  <TouchableOpacity
                    onPress={() => {
                      const nextLang = selectedLanguage === 'en' ? 'hi' : selectedLanguage === 'hi' ? 'hinglish' : 'en';
                      setSelectedLanguage(nextLang);
                      showToast('info', 'Language Changed', `Listening in ${nextLang === 'en' ? 'English' : nextLang === 'hi' ? 'Hindi' : 'Hinglish'}`);
                    }}
                    style={styles.langSelectorBtn}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A5CF5' }}>
                      {selectedLanguage === 'en' ? 'EN' : selectedLanguage === 'hi' ? 'HI' : 'HING'}
                    </Text>
                  </TouchableOpacity>

                  {/* Stop/Send Button */}
                  <TouchableOpacity
                    onPress={stopRecording}
                    style={styles.voiceStopBtn}
                  >
                    <Ionicons name="stop" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
                  {/* Rounded Text Input Field & Inner triggers (Step 1) */}
                  <View style={[styles.composerTextInputContainer, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
                    {/* Attachment button */}
                    <TouchableOpacity 
                      onPress={showAttachmentOptions}
                      style={styles.composerInnerBtn}
                      disabled={isAiThinking}
                    >
                      <Ionicons name="add" size={22} color="#8A5CF5" />
                    </TouchableOpacity>

                    {/* AI Suggestions Sparkles Button */}
                    <TouchableOpacity 
                      onPress={() => setIsSuggestionsSheetOpen(true)}
                      style={styles.composerInnerBtn}
                      disabled={isAiThinking}
                    >
                      <Ionicons name="sparkles" size={18} color="#8A5CF5" />
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.composerTextInput, { color: theme.textPrimary }]}
                      placeholder="Ask about arguments, witnesses..."
                      placeholderTextColor={theme.placeholder}
                      value={chatInput}
                      onChangeText={setChatInput}
                      onSubmitEditing={() => handleSendChat()}
                      editable={!isAiThinking}
                      multiline
                      onContentSizeChange={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      }}
                    />

                    {/* Inner Mic Button */}
                    <TouchableOpacity 
                      onPress={() => startRecording(selectedLanguage)}
                      style={styles.composerInnerMicBtn}
                      disabled={isAiThinking}
                    >
                      <Ionicons name="mic" size={20} color="#6B7280" />
                    </TouchableOpacity>

                    {/* Inner Send / Stop Button (Step 1) */}
                    {isAiThinking ? (
                      <TouchableOpacity 
                        style={[styles.composerInnerSendBtn, { backgroundColor: '#EF4444' }]} 
                        onPress={cancelMessageStream}
                      >
                        <Ionicons name="square" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={[
                          styles.composerInnerSendBtn, 
                          { backgroundColor: '#8A5CF5' },
                          (!chatInput.trim()) && { opacity: 0.5 }
                        ]} 
                        onPress={() => handleSendChat()}
                        disabled={!chatInput.trim()}
                      >
                        <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* AI Suggestions Bottom Sheet */}
      <Modal
        visible={isSuggestionsSheetOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSuggestionsSheetOpen(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsSuggestionsSheetOpen(false)} />
          <View style={[styles.suggestionsSheetContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.suggestionsSheetHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color="#8A5CF5" />
                <Text style={[styles.suggestionsSheetTitle, { color: theme.textPrimary }]}>AI Suggestions</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSuggestionsSheetOpen(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
              {/* Category: Arguments */}
              <Text style={styles.suggestionsCategoryTitle}>Arguments</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {[
                  'Prepare Plaintiff Arguments',
                  'Prepare Defence Arguments',
                  'Rebuttal Strategy'
                ].map((item) => (
                  <TouchableOpacity 
                    key={item} 
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setChatInput(item);
                      setIsSuggestionsSheetOpen(false);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category: Cross Examination */}
              <Text style={styles.suggestionsCategoryTitle}>Cross Examination</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {[
                  'Cross Questions',
                  'Witness Questions',
                  'Contradictions'
                ].map((item) => (
                  <TouchableOpacity 
                    key={item} 
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setChatInput(item);
                      setIsSuggestionsSheetOpen(false);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category: Hearing */}
              <Text style={styles.suggestionsCategoryTitle}>Hearing</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {[
                  'Judge Questions',
                  'Oral Submission',
                  'Final Hearing Notes'
                ].map((item) => (
                  <TouchableOpacity 
                    key={item} 
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setChatInput(item);
                      setIsSuggestionsSheetOpen(false);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category: Analysis */}
              <Text style={styles.suggestionsCategoryTitle}>Analysis</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {[
                  'Weaknesses',
                  'Evidence Review',
                  'Timeline Summary'
                ].map((item) => (
                  <TouchableOpacity 
                    key={item} 
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setChatInput(item);
                      setIsSuggestionsSheetOpen(false);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Copilot History Drawer Overlay */}
      <Modal 
        visible={isCopilotHistoryOpen} 
        animationType="slide" 
        transparent={true} 
        onRequestClose={() => setIsCopilotHistoryOpen(false)}
      >
        <View style={styles.historyDrawerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsCopilotHistoryOpen(false)} />
          <View style={[styles.historyDrawerContainer, { backgroundColor: theme.surface }]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={[styles.historyDrawerHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.historyDrawerTitle, { color: theme.textPrimary }]}>Chat History</Text>
                <TouchableOpacity onPress={() => setIsCopilotHistoryOpen(false)}>
                  <Ionicons name="close" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.historyDrawerList}>
                {sessions.filter(s => s.activeTool === 'legal_argument_builder').length > 0 ? (
                  sessions
                    .filter(s => s.activeTool === 'legal_argument_builder')
                    .sort((a, b) => new Date(b.lastModified || b.createdAt || 0).getTime() - new Date(a.lastModified || a.createdAt || 0).getTime())
                    .map((session) => (
                      <View key={session.sessionId} style={[styles.historySessionItem, activeSessionId === session.sessionId && { backgroundColor: theme.surfaceVariant, borderLeftWidth: 3, borderLeftColor: '#8A5CF5' }]}>
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          onPress={() => {
                            setActiveSessionId(session.sessionId);
                            fetchSessionDetails(session.sessionId);
                            setIsCopilotHistoryOpen(false);
                          }}
                        >
                          <Text style={[styles.historySessionTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                            {session.title || 'Untitled Conversation'}
                          </Text>
                          <Text style={styles.historySessionTime}>
                            {new Date(session.lastModified || session.createdAt || Date.now()).toLocaleString([], {
                              month: 'numeric',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                          <TouchableOpacity onPress={() => handleRenameSession(session.sessionId, session.title || '')}>
                            <Ionicons name="create-outline" size={18} color="#8A5CF5" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteSession(session.sessionId)}>
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                ) : (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <Ionicons name="chatbubbles-outline" size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No chat history found.</Text>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* Custom Rename Dialog Modal (Objective 4) */}
      <Modal visible={!!renameSessionId} transparent={true} animationType="fade" onRequestClose={() => setRenameSessionId('')}>
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>Rename Conversation</Text>
            <TextInput
              style={[styles.dialogInput, { borderColor: theme.border, color: theme.textPrimary }]}
              value={renameInput}
              onChangeText={setRenameInput}
              autoFocus
              placeholder="Enter new title"
              placeholderTextColor={theme.textSecondary}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setRenameSessionId('')} style={styles.dialogCancelBtn}>
                <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (renameSessionId && renameInput.trim()) {
                    renameChatSession(renameSessionId, renameInput.trim());
                    showToast('success', 'Chat Renamed', 'Title updated successfully.');
                    setRenameSessionId('');
                  }
                }}
                style={[styles.dialogConfirmBtn, { backgroundColor: '#8A5CF5' }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Legacy modals preserved */}
      <AttachmentBottomSheet
        visible={isBottomSheetVisible}
        onClose={hideAttachmentOptions}
        onSelectOption={handleSelectOption}
      />

      <CustomCameraModal visible={isCameraVisible} onClose={hideCamera} onConfirm={handleCameraConfirm} />

      <CaseSelectionModal
        visible={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        activeCaseId={activeCaseId}
        onSelectCase={(caseId) => {
          setActiveCaseId(caseId);
          fetchActiveCaseDetails(caseId);
          showToast('success', 'Workspace Synced', 'Case dossier contexts successfully pulled.');
          triggerCaseAnalysis();
        }}
      />

      {/* Sliding Sidebar History Drawer */}
      <Modal visible={isHistoryOpen} animationType="none" transparent={true} onRequestClose={() => setIsHistoryOpen(false)}>
        <View style={styles.drawerOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setIsHistoryOpen(false)} />
          <View style={styles.drawerContainer}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Dossier History</Text>
                <Pressable onPress={() => setIsHistoryOpen(false)}>
                  <Ionicons name="close" size={24} color={theme.textPrimary} />
                </Pressable>
              </View>

              <ScrollView style={styles.drawerList}>
                <TouchableOpacity
                  style={[styles.drawerActionBtn, { backgroundColor: '#EF4444', marginVertical: 12 }]}
                  onPress={() => {
                    setWorkspaceStep('source');
                    setSectionsData([]);
                    setIsHistoryOpen(false);
                  }}
                >
                  <Ionicons name="add-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={[styles.drawerActionBtnText, { color: '#FFFFFF' }]}>New Preparation Folder</Text>
                </TouchableOpacity>

                <Text style={styles.historySectionHeader}>Case Files History</Text>
                {Object.entries(caseSummariesMap).map(([id, name]) => (
                  <TouchableOpacity
                    key={id}
                    style={styles.drawerItem}
                    onPress={() => {
                      setActiveCaseId(id);
                      setIsHistoryOpen(false);
                    }}
                  >
                    <Ionicons name="folder-outline" size={16} color={theme.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={[styles.drawerItemText, { color: theme.textPrimary }]} numberOfLines={1}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    headerBtn: {
      width: 38,
      height: 38,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 19,
    },
    headerTitleContainer: {
      alignItems: 'center',
      flex: 1,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    headerSubtitle: {
      fontSize: 10,
      color: '#94A3B8',
      marginTop: 1,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    headerRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    scrollContent: {
      padding: 14,
    },
    welcomeMainTitle: {
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 4,
      textAlign: 'center',
    },
    welcomeSubText: {
      fontSize: 12,
      lineHeight: 16,
      textAlign: 'center',
      marginBottom: 14,
    },
    sourceGrid: {
      gap: 10,
      marginBottom: 10,
    },
    sourceCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 175,
    },
    sourceIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    sourceCardTitle: {
      fontSize: 14.5,
      fontWeight: '800',
      marginBottom: 2,
    },
    sourceCardDesc: {
      fontSize: 11.5,
      lineHeight: 15,
      textAlign: 'center',
      marginBottom: 10,
      paddingHorizontal: 10,
    },
    sourceCardBtn: {
      width: '100%',
      height: 42,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sourceCardBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    activeCaseBadge: {
      marginTop: 10,
      backgroundColor: '#E6F4FE',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    activeCaseBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#8A5CF5',
    },
    generateButton: {
      backgroundColor: '#EF4444',
      borderRadius: 12,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    generateButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
    attachmentsListWrapper: {
      marginTop: 20,
      gap: 10,
    },
    attachmentsHeading: {
      fontSize: 15,
      fontWeight: '800',
    },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderWidth: 1,
      borderRadius: 12,
    },
    attachmentNameText: {
      flex: 1,
      marginLeft: 10,
      fontSize: 13,
      fontWeight: '700',
    },
    analyzingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    analyzingText: {
      fontSize: 18,
      fontWeight: '800',
      marginTop: 20,
    },
    analyzingSubtext: {
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 20,
    },
    progressBarBg: {
      height: 6,
      width: '80%',
      backgroundColor: '#E2E8F0',
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#EF4444',
    },
    workspaceScroll: {
      padding: 16,
    },
    dashboardCard: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    dashboardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    dashboardTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    dashboardMetricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    metricBox: {
      flex: 1,
      minWidth: '45%',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    metricLabel: {
      fontSize: 10,
      color: '#94A3B8',
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 18,
      fontWeight: '800',
    },
    dashboardDetailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 4,
    },
    detailsLabel: {
      fontSize: 11,
      fontWeight: '600',
    },
    detailsValue: {
      fontSize: 12,
      fontWeight: '700',
      flex: 1,
      textAlign: 'right',
      marginLeft: 10,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 42,
      marginBottom: 20,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 13,
    },
    workspaceSubheading: {
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 12,
    },
    sectionContainer: {
      borderWidth: 1,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sectionTitleText: {
      fontSize: 14,
      fontWeight: '800',
    },
    sectionDescText: {
      fontSize: 11,
      marginTop: 2,
    },
    sectionHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    confidencePill: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    confidencePillText: {
      fontSize: 9,
      fontWeight: '800',
    },
    sectionBody: {
      borderTopWidth: 1,
      padding: 16,
    },
    sectionBodyContent: {
      fontSize: 13,
      lineHeight: 20,
    },
    whyCallout: {
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      borderLeftWidth: 3,
      borderLeftColor: '#94A3B8',
    },
    whyTitle: {
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
    },
    whyContent: {
      fontSize: 11,
      lineHeight: 16,
    },
    sectionActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    sectionActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 6,
    },
    sectionActionText: {
      fontSize: 11,
      fontWeight: '700',
    },
    intelligenceContainer: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginTop: 20,
      marginBottom: 20,
    },
    intelligenceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    intelligenceTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    intelligenceTabsScroll: {
      gap: 8,
      paddingBottom: 10,
    },
    intelligenceTab: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: 'transparent',
    },
    intelligenceTabActive: {
      backgroundColor: '#EF4444',
    },
    intelligenceTabText: {
      fontSize: 12,
      fontWeight: '700',
    },
    intelligenceContentCard: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginTop: 10,
    },
    intelDescription: {
      fontSize: 11,
      fontStyle: 'italic',
      marginBottom: 8,
    },
    intelBody: {
      fontSize: 13,
      lineHeight: 20,
    },
    intelActionsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      paddingTop: 10,
    },
    intelActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    intelActionBtnText: {
      fontSize: 11.5,
      color: '#EF4444',
      fontWeight: '700',
    },
    mockCourtCard: {
      borderWidth: 2,
      borderRadius: 16,
      padding: 20,
      backgroundColor: '#F5F3FF',
      marginBottom: 20,
    },
    mockCourtHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    mockCourtTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#8A5CF5',
    },
    mockCourtDesc: {
      fontSize: 12,
      lineHeight: 18,
      color: '#475569',
      marginBottom: 16,
    },
    mockCourtBtn: {
      backgroundColor: '#8A5CF5',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    mockCourtBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    exportBar: {
      borderTopWidth: 1,
      paddingTop: 16,
      marginTop: 10,
    },
    exportTitle: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    exportButtonsGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    exportBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      gap: 6,
    },
    exportBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
    exportToolbarFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    footerUtilityBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    footerUtilityBtnText: {
      fontSize: 11,
      fontWeight: '600',
    },
    floatingRefinementBtn: {
      position: 'absolute',
      bottom: 24,
      right: 16,
      backgroundColor: '#0F172A',
      borderRadius: 24,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    floatingRefinementBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
      width: '100%',
      height: height * 0.75,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    bottomSheetDragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#E2E8F0',
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      marginBottom: 12,
    },
    bottomSheetTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
    },
    refinementStyleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    refinementStyleText: {
      fontSize: 14,
      fontWeight: '600',
    },
    drawerOverlay: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
    },
    drawerContainer: {
      width: width * 0.8,
      height: '100%',
      backgroundColor: '#FFFFFF',
      borderRightWidth: 1,
      borderRightColor: '#E2E8F0',
      paddingHorizontal: 16,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    drawerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    drawerList: {
      flex: 1,
    },
    drawerActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
    },
    drawerActionBtnText: {
      fontSize: 13,
      fontWeight: '700',
    },
    historySectionHeader: {
      fontSize: 11,
      fontWeight: '800',
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 14,
      marginBottom: 8,
    },
    drawerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    drawerItemText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // ==========================================
    // CASE INTAKE WIZARD NEW STYLES (Phase 5)
    // ==========================================
    wizardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    wizardBackBtn: {
      padding: 4,
    },
    wizardTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    wizardSubtitle: {
      fontSize: 11,
      color: '#64748B',
      marginTop: 2,
    },
    clearDraftBtn: {
      padding: 6,
    },
    wizardScroll: {
      padding: 16,
      paddingBottom: 60,
    },
    wizardSectionHeading: {
      fontSize: 16,
      fontWeight: '800',
      marginTop: 10,
    },
    wizardMethodGrid: {
      gap: 16,
      marginTop: 10,
    },
    wizardMethodCard: {
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 20,
      position: 'relative',
    },
    recommendedBadge: {
      position: 'absolute',
      top: -10,
      right: 16,
      backgroundColor: '#8A5CF5',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    recommendedBadgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    wizardMethodIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    wizardMethodTitle: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 6,
    },
    wizardMethodDesc: {
      fontSize: 12,
      lineHeight: 18,
    },
    wizardProgressContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 6,
      justifyContent: 'center',
    },
    wizardProgressBarDot: {
      flex: 1,
      height: 6,
      borderRadius: 3,
    },
    wizardStepForm: {
      gap: 14,
    },
    wizardFormHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 6,
    },
    wizardInputLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    wizardTextInputField: {
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
    },
    wizardRoleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    roleSelectBtn: {
      borderWidth: 1.5,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    roleSelectText: {
      fontSize: 12,
      fontWeight: '700',
    },
    wizardFactsEditor: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 12,
      fontSize: 13,
      textAlignVertical: 'top',
    },
    wizardFactsUtilityBar: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    utilityActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 6,
    },
    utilityActionBtnText: {
      fontSize: 11,
      fontWeight: '700',
    },
    evidenceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    evidenceCheckboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
      minWidth: '46%',
    },
    evidenceLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    wizardFooterControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
    },
    navigationBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    navigationBtnText: {
      fontSize: 13,
      fontWeight: '800',
    },
    navigationBtnActive: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#EF4444',
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    navigationBtnActiveText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    micInterfaceContainer: {
      alignItems: 'center',
      marginVertical: 30,
      position: 'relative',
    },
    micPulsingRing: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      top: 0,
    },
    micRecordCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    recordingStatusLabel: {
      marginTop: 20,
      fontSize: 13,
      fontWeight: '700',
    },
    transcriptionCard: {
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 16,
      marginTop: 20,
    },
    transcriptionHeading: {
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    transcriptionEditorText: {
      fontSize: 13.5,
      lineHeight: 20,
    },
    wizardProgressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    interviewProgressBarBg: {
      height: 4,
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 2,
      overflow: 'hidden',
    },
    interviewProgressBarFill: {
      height: '100%',
    },
    chatBubbleRow: {
      flexDirection: 'row',
      marginVertical: 4,
      alignItems: 'flex-end',
    },
    chatAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#8A5CF5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 6,
    },
    chatBubble: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxWidth: '100%',
    },
    chatBubbleText: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    },
    interviewComposerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      gap: 8,
    },
    interviewInput: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 13,
      maxHeight: 80,
    },
    interviewSendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#8A5CF5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    floatingAiBtn: {
      position: 'absolute',
      right: 16,
      bottom: 84,
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#8A5CF5',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#8A5CF5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
    chatDrawerContainer: {
      width: '100%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    userBubble: {
      backgroundColor: '#8A5CF5',
      alignSelf: 'flex-end',
    },
    userBubbleText: {
      fontSize: 12.5,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    aiBubble: {
      backgroundColor: 'rgba(138, 92, 245, 0.08)',
      alignSelf: 'flex-start',
    },
    aiBubbleText: {
      fontSize: 12.5,
      fontWeight: '600',
    },
    promptBubbleScroll: {
      maxHeight: 40,
      marginBottom: 10,
    },
    promptBubbleScrollContent: {
      gap: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
    },
    promptBubble: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    promptBubbleText: {
      fontSize: 11,
      fontWeight: '700',
    },
    chatComposer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 44,
      borderRadius: 22,
      paddingHorizontal: 12,
      gap: 8,
    },
    chatComposerInput: {
      flex: 1,
      fontSize: 13,
      paddingVertical: 4,
    },
    chatComposerSendBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copilotHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      height: 56,
      borderBottomWidth: 1,
    },
    copilotBackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    copilotBackBtnText: {
      fontSize: 14,
      fontWeight: '700',
      marginLeft: 4,
    },
    copilotHeaderTitleContainer: {
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    copilotHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    copilotHeaderSubtitle: {
      fontSize: 9,
      color: '#94A3B8',
      marginTop: 1,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    copilotHeaderActionBtn: {
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    copilotCaseContextBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 8,
    },
    copilotCaseContextText: {
      fontSize: 11,
      fontWeight: '700',
      flex: 1,
    },
    chatBubbleContainer: {
      flexDirection: 'row',
      marginVertical: 6,
      alignItems: 'flex-start',
      maxWidth: '92%',
    },
    userBubbleAlign: {
      alignSelf: 'flex-end',
      justifyContent: 'flex-end',
    },
    aiBubbleAlign: {
      alignSelf: 'flex-start',
      justifyContent: 'flex-start',
    },
    aiAvatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#8A5CF5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
      marginTop: 4,
    },
    emptyChatContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
    },
    emptyChatIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(138, 92, 245, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyChatTitle: {
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 4,
    },
    emptyChatSubtitle: {
      fontSize: 12,
      color: '#94A3B8',
      fontWeight: '600',
      marginBottom: 24,
    },
    welcomeBox: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      width: '100%',
      marginBottom: 24,
    },
    welcomeBoxTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 8,
    },
    welcomeBoxSub: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 10,
    },
    welcomeBoxText: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500',
    },
    emptyChatSuggestedTitle: {
      fontSize: 12,
      fontWeight: '700',
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    suggestedChipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      width: '100%',
    },
    suggestedChip: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    suggestedChipText: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    thinkingBubbleContainer: {
      flexDirection: 'row',
      marginVertical: 6,
      alignItems: 'flex-start',
      alignSelf: 'flex-start',
    },
    copilotAttachmentBar: {
      paddingVertical: 8,
      borderTopWidth: 1,
      maxHeight: 46,
    },
    copilotAttachChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      gap: 6,
    },
    copilotAttachLabel: {
      fontSize: 11,
      fontWeight: '700',
      maxWidth: 100,
    },
    copilotComposerContainer: {
      borderTopWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    composerIconBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 18,
    },
    composerTextInput: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      minHeight: 44,
      maxHeight: 120,
      paddingHorizontal: 10,
      paddingVertical: 12,
    },
    composerSendBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordingWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 12,
      height: 48,
    },
    voiceControlBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    waveformContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    langSelectorBtn: {
      borderWidth: 1,
      borderColor: '#8A5CF5',
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    voiceStopBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordingIndicatorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#EF4444',
    },
    historyDrawerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    historyDrawerContainer: {
      height: height * 0.7,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    historyDrawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    historyDrawerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    historyDrawerList: {
      flex: 1,
      marginTop: 10,
    },
    historySessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginVertical: 4,
    },
    historySessionTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 2,
    },
    historySessionTime: {
      fontSize: 10,
      color: '#94A3B8',
      fontWeight: '600',
    },
    copilotHeaderIconAction: {
      padding: 4,
    },
    menuDropdown: {
      position: 'absolute',
      right: 16,
      width: 200,
      borderRadius: 12,
      borderWidth: 1,
      elevation: 5,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      paddingVertical: 4,
      zIndex: 9999,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 0.5,
    },
    menuItemText: {
      fontSize: 13.5,
      fontWeight: '600',
    },
    lightweightGreetingContainer: {
      width: '100%',
      paddingHorizontal: 8,
      marginBottom: 16,
    },
    lightweightGreetingTitle: {
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 24,
      marginBottom: 2,
    },
    lightweightGreetingSub: {
      fontSize: 13,
      fontWeight: '500',
    },
    minimalEmptyStateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 40,
      paddingVertical: 40,
    },
    minimalEmptyStateEmoji: {
      fontSize: 48,
      marginBottom: 16,
    },
    minimalEmptyStateTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
    },
    minimalEmptyStateSubtitle: {
      fontSize: 12.5,
      fontWeight: '500',
    },
    composerTextInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      borderWidth: 1,
      borderRadius: 24,
      paddingLeft: 10,
      paddingRight: 6,
      paddingBottom: 6,
      paddingTop: 6,
      minHeight: 52,
      maxHeight: 140,
    },
    composerInnerBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    composerInnerMicBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    composerInnerSendBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    bottomSheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    suggestionsSheetContainer: {
      height: height * 0.6,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
    },
    suggestionsSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 14,
      borderBottomWidth: 1,
    },
    suggestionsSheetTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    suggestionsCategoryTitle: {
      fontSize: 11,
      color: '#8A5CF5',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 18,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    suggestionsCategoryGroup: {
      gap: 6,
    },
    suggestionsItemBtn: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    suggestionsItemText: {
      fontSize: 13,
      fontWeight: '600',
    },
    bubbleSuggestionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      width: '100%',
    },
    bubbleSuggestionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.2,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
      height: 36,
      marginBottom: 4,
    },
    bubbleSuggestionText: {
      fontSize: 11,
      fontWeight: '700',
    },
    disclaimerContainer: {
      marginTop: 10,
      width: '100%',
    },
    disclaimerDivider: {
      height: 1,
      marginVertical: 8,
      width: '100%',
      opacity: 0.5,
    },
    disclaimerText: {
      fontSize: 10,
      fontStyle: 'italic',
      lineHeight: 14.5,
      opacity: 0.8,
    },
    floatingScrollBtn: {
      position: 'absolute',
      bottom: 80,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      zIndex: 9999,
    },
    dialogOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    dialogContainer: {
      width: '100%',
      maxWidth: 320,
      borderRadius: 16,
      padding: 20,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    dialogTitle: {
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 16,
    },
    dialogInput: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      marginBottom: 20,
    },
    dialogActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    dialogCancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dialogConfirmBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

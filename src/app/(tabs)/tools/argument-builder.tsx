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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToastContext, useThemeContext } from '@/providers';
import { useAuthGuard } from '@/navigation/guards';
import { streamAIResponse } from '@/api/client';
import { ChatService } from '@/services/chat.service';
import { Shadows, Radius, Spacing } from '@/theme';
import { ChatMessage, ChatAttachment, CaseWorkspace } from '@/types';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
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

  // Generation status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Actual generated data for the sections (Step 3)
  const [sectionsData, setSectionsData] = useState<PrepSection[]>([]);

  // Actual generated data for premium intelligence tools (Step 4)
  const [intelligenceData, setIntelligenceData] = useState<IntelligenceTool[]>([]);

  // AI Copilot states
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatReplies, setChatReplies] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: "I am the Court Prep Copilot. Ask me about courtroom prep, cross-examination questions, objections, witness strategies, or final oral arguments. I will reply using your active refinement style.",
    },
  ]);
  const copilotScrollRef = useRef<ScrollView>(null);
  const [sheetSize, setSheetSize] = useState<'collapsed' | 'expanded' | 'full'>('expanded');

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

  useEffect(() => {
    if (isAiAssistantOpen) {
      setTimeout(() => {
        copilotScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatReplies, isAiAssistantOpen]);

  const handleSendChat = (textOverride?: string) => {
    const textToSend = textOverride || chatInput;
    if (!textToSend.trim()) return;

    setChatReplies((prev) => [...prev, { sender: 'user', text: textToSend.trim() }]);
    setChatInput('');
    setIsAiThinking(true);
    Keyboard.dismiss();

    setTimeout(() => {
      setIsAiThinking(false);
      let replyText = "";
      
      const query = textToSend.toLowerCase();
      
      if (query.includes('predict') || query.includes('forecast') || query.includes('win probability')) {
        replyText = "I am the Court Prep Copilot. For case predictions and win probabilities, please use the Litigation Predictor Copilot.";
      } else if (query.includes('contract') || query.includes('clause') || query.includes('agreement review')) {
        replyText = "I am the Court Prep Copilot. For contract clause analysis and agreement reviews, please use the Contract Review Copilot.";
      } else {
        switch (refinementMode) {
          case 'Plain English':
            replyText = "Today's hearing is about the bounced cheque of Rs. 5,00,000. Under the law, because Nitin Kumar signed the cheque, the judge assumes he owes the money. We will ask the judge to convict him and order him to pay Rs. 10,00,000 in compensation.";
            break;
          case 'Aggressive Litigation':
            replyText = "Today's hearing is a critical opportunity to crush the defense's baseless excuses. The accused has admitted his signature, triggering the mandatory presumption of debt under Section 139. His failure to reply to the legal notice within the 15-day window is a fatal omission. We will aggressively demand immediate conviction and maximum double compensation.";
            break;
          case 'Courtroom Style':
            replyText = "My Lord, the hearing scheduled for today concerns the statutory complaint under Section 138 of the NI Act. Given that signature execution is admitted, we respectfully submit that the legal presumption under Section 139 stands fully triggered. The burden of proof rests entirely on the defense, which has failed to present any rebuttal.";
            break;
          case 'Formal':
            replyText = "The hearing scheduled for this date pertains to the formal complaint registered under Section 138 of the Negotiable Instruments Act. Signatures on the instrument being admitted, the statutory presumption under Section 139 is operational. In the absence of a legal notice reply, the respondent stands in default.";
            break;
          case 'Judge Friendly':
            replyText = "Respected Court, today's hearing is a straightforward cheque bounce matter under Section 138. The cheque bounced due to insufficient funds. Signatures are admitted. No reply was sent to our legal notice. We pray for immediate conviction.";
            break;
          case 'Senior Counsel Style':
            replyText = "Today's hearing presents a clear-cut legal scenario. By admitting the signatures, the defense has conceded the core fact, automatically activating the Section 139 presumption. Their complete silence during the statutory notice period leaves them with no viable defense. We will argue for immediate conviction and interim compensation under Section 143A.";
            break;
          case 'Neutral':
            replyText = "The hearing is scheduled to address the complaint under Section 138 NI Act. The cheque of INR 5,00,000 bounced due to insufficient funds. Statutory notice was delivered on 14th May 2026. No reply or payment has been made.";
            break;
          case 'Concise':
            replyText = "• Cheque bounce case under Sec 138.\n• Cheque signatures admitted.\n• Statutory presumption (Sec 139) is active.\n• Defense has failed to reply to notice.\n• Request conviction & compensation.";
            break;
          case 'Detailed':
            replyText = "The hearing listed today is for the prosecution of complaint under Section 138 of the Negotiable Instruments Act. Complainant Apex Logistics Corp holds Cheque No. 445210 for INR 5,00,000 which bounced due to insufficient funds. The statutory demand notice was delivered on 14th May 2026. Under the precedent of Rangappa v. Sri Mohan, the court is mandated to presume a legally enforceable debt since the signatures are admitted. The defense has submitted no rebuttal.";
            break;
          case 'Hindi Legal Drafting':
            replyText = "आज की सुनवाई एनआई एक्ट की धारा 138 के तहत दर्ज शिकायत के संबंध में है। चेक पर हस्ताक्षर आरोपी द्वारा स्वीकार किए गए हैं, जिससे धारा 139 के तहत ऋण का वैधानिक अनुमान पूर्णतः शिकायतकर्ता के पक्ष में लागू होता है। हम आरोपी को दोषी ठहराने और मुआवजे की मांग करेंगे।";
            break;
          default:
            replyText = "My Lord, the complainant has filed this complaint under Section 138. The signatures on the cheque are admitted. The burden is entirely on the accused to rebut this with cogent evidence.";
            break;
        }
      }

      setChatReplies((prev) => [...prev, { sender: 'ai', text: replyText }]);
    }, 800);
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

  // Export functions (Step 6)
  const handleExport = (format: string) => {
    showToast('success', 'Export Commenced', `Dossier exported to ${format} successfully.`);
  };

  // Mock Courtroom Integration (Step 7)
  const handleLaunchMockCourt = () => {
    showToast('info', 'Launching Simulator', 'Booting AI Moot Court simulation room...');
    router.push({
      pathname: '/tools/argument-builder',
      params: { startSimulation: 'true' }
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
                Select your case source. Our AI legal brain will analyze documents, map facts, research precedents, and compile a 12-section court folder instantly.
              </Text>

              <View style={styles.sourceGrid}>
                <TouchableOpacity
                  style={[
                    styles.sourceCard,
                    { borderColor: theme.border, backgroundColor: theme.card },
                  ]}
                  onPress={() => handleSelectSource('workspace')}
                >
                  <View style={[styles.sourceIconWrapper, { backgroundColor: 'rgba(138, 92, 245, 0.15)' }]}>
                    <Ionicons name="folder-open-outline" size={28} color="#8A5CF5" />
                  </View>
                  <Text style={[styles.sourceCardTitle, { color: theme.textPrimary }]}>Case Workspace</Text>
                  <Text style={[styles.sourceCardDesc, { color: theme.textSecondary }]}>
                    Pull context directly from existing case folders and dossiers.
                  </Text>
                  {activeCaseDetails && (
                    <View style={styles.activeCaseBadge}>
                      <Text style={styles.activeCaseBadgeText} numberOfLines={1}>
                        Active: {activeCaseDetails.name}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sourceCard,
                    { borderColor: theme.border, backgroundColor: theme.card },
                  ]}
                  onPress={showAttachmentOptions}
                >
                  <View style={[styles.sourceIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Ionicons name="cloud-upload-outline" size={28} color="#EF4444" />
                  </View>
                  <Text style={[styles.sourceCardTitle, { color: theme.textPrimary }]}>Upload Legal Documents</Text>
                  <Text style={[styles.sourceCardDesc, { color: theme.textSecondary }]}>
                    Extract parties, timeline, and facts from PDF, Word or images.
                  </Text>
                  {attachments.length > 0 && (
                    <View style={[styles.activeCaseBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.activeCaseBadgeText, { color: '#EF4444' }]}>
                        {attachments.length} file(s) attached
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sourceCard,
                    { borderColor: theme.border, backgroundColor: theme.card },
                  ]}
                  onPress={() => handleSelectSource('manual')}
                >
                  <View style={[styles.sourceIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Ionicons name="create-outline" size={28} color="#10B981" />
                  </View>
                  <Text style={[styles.sourceCardTitle, { color: theme.textPrimary }]}>Manual Facts Entry</Text>
                  <Text style={[styles.sourceCardDesc, { color: theme.textSecondary }]}>
                    Launch Intake Wizard: Write details, dictate, or run an AI interview.
                  </Text>
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
                          <Text style={[styles.sectionBodyContent, { color: theme.textPrimary }]}>{sec.content}</Text>

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
                    {intelligenceData.map((tab) => (
                      <TouchableOpacity
                        key={tab.id}
                        style={[
                          styles.intelligenceTab,
                          activeIntelligenceTab === tab.id && [styles.intelligenceTabActive, { backgroundColor: '#EF4444' }],
                        ]}
                        onPress={() => setActiveIntelligenceTab(tab.id)}
                      >
                        <Ionicons
                          name={tab.icon as any}
                          size={14}
                          color={activeIntelligenceTab === tab.id ? '#FFFFFF' : theme.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.intelligenceTabText,
                            { color: activeIntelligenceTab === tab.id ? '#FFFFFF' : theme.textSecondary },
                          ]}
                        >
                          {tab.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {activeIntelContent && (
                    <View style={[styles.intelligenceContentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={[styles.intelDescription, { color: theme.textSecondary }]}>
                        {activeIntelContent.description}
                      </Text>
                      <Text style={[styles.intelBody, { color: theme.textPrimary }]}>{activeIntelContent.content}</Text>

                      {/* Actions for intel tab */}
                      <View style={styles.intelActionsRow}>
                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => handleCopySection(activeIntelContent.content)}
                        >
                          <Ionicons name="copy-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={styles.intelActionBtnText}>Copy Notes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => showToast('success', 'Regenerating', 'Refining speech vectors...')}
                        >
                          <Ionicons name="refresh-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={styles.intelActionBtnText}>Re-analyze</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
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

      {/* AI Copilot Chat Drawer */}
      <Modal visible={isAiAssistantOpen} transparent animationType="slide" onRequestClose={() => setIsAiAssistantOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsAiAssistantOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[
              styles.chatDrawerContainer, 
              { 
                backgroundColor: theme.surface,
                height: sheetSize === 'collapsed' ? 250 : sheetSize === 'full' ? height * 0.9 : height * 0.6 
              }
            ]}
          >
            <View style={{ flex: 1 }}>
              <Pressable 
                onPress={() => {
                  if (sheetSize === 'collapsed') setSheetSize('expanded');
                  else if (sheetSize === 'expanded') setSheetSize('full');
                  else setSheetSize('collapsed');
                }}
              >
                <View style={styles.bottomSheetDragHandle} />
              </Pressable>
              <View style={styles.bottomSheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="sparkles" size={18} color="#8A5CF5" />
                  <Text style={styles.bottomSheetTitle}>Court Prep Copilot</Text>
                </View>
                <TouchableOpacity onPress={() => setIsAiAssistantOpen(false)}>
                  <Ionicons name="close-circle" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Chat dialog Scrollable lists */}
              <ScrollView ref={copilotScrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 14 }} showsVerticalScrollIndicator={false}>
                {chatReplies.map((msg, idx) => (
                  <View key={idx} style={[styles.chatBubble, msg.sender === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: theme.surfaceVariant }]]}>
                    <Text style={msg.sender === 'user' ? styles.userBubbleText : styles.aiBubbleText}>
                      {msg.text}
                    </Text>
                  </View>
                ))}
                {isAiThinking && (
                  <View style={{ alignItems: 'center', marginVertical: 8 }}>
                    <ActivityIndicator size="small" color="#8A5CF5" />
                  </View>
                )}
              </ScrollView>

              {/* Quick Prompts */}
              <View style={styles.promptBubbleScroll}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptBubbleScrollContent}>
                  {['Refine this summary', 'Prepare oral submission', 'Draft witness questions', 'List judge questions', 'Aggressive counter-arguments'].map(prompt => (
                    <TouchableOpacity
                      key={prompt}
                      style={[styles.promptBubble, { borderColor: theme.border, backgroundColor: theme.surface }]}
                      onPress={() => handleSendChat(prompt)}
                      disabled={isAiThinking}
                    >
                      <Text style={[styles.promptBubbleText, { color: '#8A5CF5' }]}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Chat messenger input */}
              <View style={[styles.chatComposer, { backgroundColor: theme.surfaceVariant, marginBottom: Platform.OS === 'ios' ? 24 : 10 }]}>
                <TextInput
                  style={[styles.chatComposerInput, { color: theme.textPrimary }]}
                  placeholder="Ask Court Prep Copilot..."
                  placeholderTextColor={theme.placeholder}
                  value={chatInput}
                  onChangeText={setChatInput}
                  onSubmitEditing={() => handleSendChat()}
                  editable={!isAiThinking}
                />
                <TouchableOpacity 
                  style={[
                    styles.chatComposerSendBtn, 
                    { backgroundColor: '#8A5CF5' },
                    (!chatInput.trim() || isAiThinking) && { opacity: 0.5 }
                  ]} 
                  onPress={() => handleSendChat()}
                  disabled={!chatInput.trim() || isAiThinking}
                >
                  <Ionicons name="send" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
      padding: 20,
    },
    welcomeMainTitle: {
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 10,
      textAlign: 'center',
    },
    welcomeSubText: {
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 24,
    },
    sourceGrid: {
      gap: 16,
      marginBottom: 20,
    },
    sourceCard: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
    },
    sourceIconWrapper: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    sourceCardTitle: {
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 6,
    },
    sourceCardDesc: {
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
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
      maxWidth: '85%',
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
  });
}

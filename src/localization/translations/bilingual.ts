import { english } from './english';
import { hindi } from './hindi';

// Recursively merge English and Hindi dictionaries for Bilingual mode
const mergeBilingual = (en: any, hi: any): any => {
  const result: any = {};
  for (const key in en) {
    if (typeof en[key] === 'object' && en[key] !== null) {
      result[key] = mergeBilingual(en[key], hi[key] || {});
    } else {
      const enVal = en[key];
      const hiVal = hi[key] || enVal;
      
      const lowKey = key.toLowerCase();
      // Description, paragraph, summary, advice, reasons, warning, and note details use Hindi
      const isDesc = 
        lowKey.includes('desc') || 
        lowKey.includes('subtitle') || 
        lowKey.includes('summary') || 
        lowKey.includes('paragraph') || 
        lowKey.includes('reason') || 
        lowKey.includes('advice') || 
        lowKey.includes('warning') || 
        lowKey.includes('note');
      
      // Helper texts, placeholders, and form label/tag inputs use combined "English (Hindi)" formatting
      const isHelper = 
        lowKey.includes('helper') || 
        lowKey.includes('placeholder') || 
        lowKey.includes('label') ||
        lowKey.includes('status') ||
        lowKey.includes('priority') ||
        lowKey.includes('empty');
      
      if (isDesc) {
        result[key] = hiVal;
      } else if (isHelper) {
        if (key === 'placeholder') {
          result[key] = enVal === hiVal ? enVal : `${enVal} / ${hiVal}`;
        } else {
          result[key] = enVal === hiVal ? enVal : `${enVal} (${hiVal})`;
        }
      } else {
        // Main titles, buttons, layout actions use English
        result[key] = enVal;
      }
    }
  }
  return result;
};

export const bilingual = mergeBilingual(english, hindi);
export default bilingual;

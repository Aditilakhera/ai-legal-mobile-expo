/**
 * Sanitizes and formats a phone number for WhatsApp usage.
 * Rules:
 * 1. Remove all spaces.
 * 2. Remove brackets.
 * 3. Remove dashes.
 * 4. Remove leading '+' if required for formatting.
 * 5. If the number contains exactly 10 digits, prepend India's country code (91).
 * 6. If the number already starts with 91 and has 12 digits, use it as-is.
 * 7. If the number already starts with +91, normalize it correctly.
 * 8. Reject invalid numbers (less than 10 digits or malformed) and return null.
 */
export const formatWhatsAppNumber = (phone: string): string | null => {
  if (!phone) return null;

  // Remove spaces, brackets, dashes, and leading '+'
  const sanitized = phone.replace(/[\s()\-+]/g, '');

  // Check if it is numeric
  if (!/^\d+$/.test(sanitized)) {
    return null;
  }

  // If 10 digits, prepend 91
  if (sanitized.length === 10) {
    return '91' + sanitized;
  }

  // If starts with 91 and has 12 digits, keep as-is
  if (sanitized.length === 12 && sanitized.startsWith('91')) {
    return sanitized;
  }

  return null;
};

/**
 * Sanitizes Markdown formatting characters from AI-generated draft messages.
 */
export const cleanMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/#+\s?/g, '')
    .replace(/`/g, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[\-\*+]\s?/gm, '')
    .trim();
};

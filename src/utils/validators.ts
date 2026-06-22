/**
 * AI Legal Mobile - Input Validators
 * Verifies email formulas, passwords, and form schemas.
 */

/**
 * Checks email expression syntax.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Checks password security metrics (min 8 chars, 1 uppercase letter, 1 number).
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasUpperCase && hasNumber;
}

/**
 * Evaluates core case submission fields.
 */
export function validateCaseWorkspace(name: string): { isValid: boolean; error?: string } {
  if (!name.trim()) {
    return { isValid: false, error: 'Case name is required' };
  }
  if (name.length < 3) {
    return { isValid: false, error: 'Case name must be at least 3 characters long' };
  }
  return { isValid: true };
}

/**
 * Email Normalization and Strict Domain Validation for RIT ECE Platform
 * Approved Domain: @ece.ritchennai.edu.in
 */

export const APPROVED_EMAIL_DOMAIN = 'ece.ritchennai.edu.in';

/**
 * Normalizes an email address by trimming whitespace and converting to lowercase.
 * @param {string} email 
 * @returns {string}
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Strictly validates that the email belongs to @ece.ritchennai.edu.in.
 * Rejects substring attacks (e.g., fakeece.ritchennai.edu.in, ece.ritchennai.com, ritchennai.edu.in).
 * @param {string} email 
 * @returns {{ isValid: boolean, normalizedEmail: string, error?: string }}
 */
export function validateCollegeEmail(email) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return { isValid: false, normalizedEmail: '', error: 'Email address is required.' };
  }

  // Must contain exactly one '@' character
  const parts = normalized.split('@');
  if (parts.length !== 2) {
    return { isValid: false, normalizedEmail: normalized, error: 'Invalid email format.' };
  }

  const [localPart, domainPart] = parts;

  // Validate local part (user name)
  if (!localPart || localPart.length === 0) {
    return { isValid: false, normalizedEmail: normalized, error: 'Email username cannot be empty.' };
  }

  // Local part characters check
  if (!/^[a-zA-Z0-9._%+-]+$/.test(localPart)) {
    return { isValid: false, normalizedEmail: normalized, error: 'Email username contains invalid characters.' };
  }

  // Strict domain check: domain must exactly match APPROVED_EMAIL_DOMAIN
  if (domainPart !== APPROVED_EMAIL_DOMAIN) {
    return {
      isValid: false,
      normalizedEmail: normalized,
      error: `Registration restricted: Only email addresses ending with @${APPROVED_EMAIL_DOMAIN} are accepted. Domain '${domainPart}' is prohibited.`,
    };
  }

  return { isValid: true, normalizedEmail: normalized };
}

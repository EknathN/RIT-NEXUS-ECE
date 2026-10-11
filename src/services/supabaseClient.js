import { createClient } from '@supabase/supabase-js';

export const APPROVED_EMAIL_DOMAIN = 'ece.ritchennai.edu.in';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 
                     import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
                     'https://cbburujwqsiftywbagwl.supabase.co';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                          import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                          'sb_publishable_GYhcFKUZnUWjNPJCsBsPZw_JYwnMzyg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Normalizes email by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Validates that an email strictly belongs to @ece.ritchennai.edu.in.
 * Prevents substring exploits (e.g. fakeece.ritchennai.edu.in, ece.ritchennai.com, ritchennai.edu.in).
 */
export function validateCollegeEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { isValid: false, error: 'Email address is required.' };
  }

  const parts = normalized.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Invalid email address format.' };
  }

  const [localPart, domainPart] = parts;
  if (!localPart || localPart.length === 0) {
    return { isValid: false, error: 'Email username cannot be empty.' };
  }

  if (!/^[a-zA-Z0-9._%+-]+$/.test(localPart)) {
    return { isValid: false, error: 'Email username contains invalid characters.' };
  }

  if (domainPart !== APPROVED_EMAIL_DOMAIN) {
    return {
      isValid: false,
      error: `Registration restricted: Only official college email addresses ending with @${APPROVED_EMAIL_DOMAIN} are accepted. Domain '${domainPart}' is not permitted.`,
    };
  }

  return { isValid: true, normalizedEmail: normalized };
}

/**
 * Supabase Registration with strict domain validation & email verification requirement.
 */
export async function signUpWithCollegeEmail({ email, password, full_name, account_type, ...metadata }) {
  const validation = validateCollegeEmail(email);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const normalized = validation.normalizedEmail;

  const { data, error } = await supabase.auth.signUp({
    email: normalized,
    password,
    options: {
      data: {
        full_name,
        role: account_type || 'student',
        department: 'ECE',
        ...metadata,
      },
    },
  });

  if (error) {
    throw error;
  }

  // Check if email confirmation is required
  const isConfirmed = data.user && (data.user.email_confirmed_at != null || data.user.confirmed_at != null);

  return {
    user: data.user,
    session: data.session,
    requiresConfirmation: !isConfirmed,
  };
}

/**
 * Supabase Login with verification check.
 */
export async function signInWithCollegeEmail({ email, password }) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error('Email is required.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error) {
    throw error;
  }

  // Check if user's email has been confirmed
  if (data.user && !data.user.email_confirmed_at && !data.user.confirmed_at) {
    // Sign out unconfirmed session immediately
    await supabase.auth.signOut();
    throw new Error('Please confirm your college email before accessing RIT ECE Nexus. Check your inbox for the Supabase confirmation link.');
  }

  return data;
}

/**
 * Supabase Password Reset.
 */
export async function resetPasswordForCollegeEmail(email) {
  const validation = validateCollegeEmail(email);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const { data, error } = await supabase.auth.resetPasswordForEmail(validation.normalizedEmail, {
    redirectTo: `${window.location.origin}/login`,
  });

  if (error) throw error;
  return data;
}

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import {
  supabase,
  validateCollegeEmail,
  normalizeEmail,
  signUpWithCollegeEmail,
  signInWithCollegeEmail,
  resetPasswordForCollegeEmail,
} from '../services/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(null);

  useEffect(() => {
    // 1. Check local session
    const token = localStorage.getItem('ritece_token');
    if (token) {
      authAPI.getMe()
        .then(userData => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('ritece_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // 2. Listen to Supabase Auth State changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (!session.user.email_confirmed_at && !session.user.confirmed_at) {
          setUnconfirmedEmail(session.user.email);
          await supabase.auth.signOut();
        } else {
          setUnconfirmedEmail(null);
        }
      } else if (event === 'SIGNED_OUT') {
        // handled via logout
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const normalized = normalizeEmail(email);

    // Try Supabase auth first
    try {
      const sbResult = await signInWithCollegeEmail({ email: normalized, password });
      if (sbResult?.user) {
        setUnconfirmedEmail(null);
      }
    } catch (sbErr) {
      // If Supabase specifically flagged unconfirmed email, propagate immediately
      if (sbErr.message && sbErr.message.includes('confirm your college email')) {
        setUnconfirmedEmail(normalized);
        throw sbErr;
      }
      // If error is invalid credentials or network, proceed to check API backend
    }

    // Authenticate with backend API
    const data = await authAPI.login({ email: normalized, password });
    localStorage.setItem('ritece_token', data.token);
    setUser(data.user);
    setUnconfirmedEmail(null);
    return data.user;
  };

  const register = async (userData) => {
    const { email, password, full_name, account_type } = userData;

    // Strict domain check on client
    const validation = validateCollegeEmail(email);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    const normalized = validation.normalizedEmail;

    let requiresConfirmation = false;
    // Register with Supabase
    try {
      const sbResult = await signUpWithCollegeEmail({
        email: normalized,
        password,
        full_name,
        account_type,
        ...userData,
      });
      if (sbResult.requiresConfirmation) {
        requiresConfirmation = true;
        setUnconfirmedEmail(normalized);
      }
    } catch (sbErr) {
      console.warn('Supabase sign up notice:', sbErr.message);
      // If Supabase rejected due to domain or existing user, surface it
      if (sbErr.message && sbErr.message.toLowerCase().includes('permitted')) {
        throw sbErr;
      }
    }

    // Register with backend API
    const data = await authAPI.register({ ...userData, email: normalized });
    if (!requiresConfirmation) {
      localStorage.setItem('ritece_token', data.token);
      setUser(data.user);
    }
    return { user: data.user, requiresConfirmation };
  };

  const resetPassword = async (email) => {
    const validation = validateCollegeEmail(email);
    if (!validation.isValid) throw new Error(validation.error);

    await resetPasswordForCollegeEmail(validation.normalizedEmail);
    await authAPI.forgotPassword({ email: validation.normalizedEmail });
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    localStorage.removeItem('ritece_token');
    setUser(null);
    setUnconfirmedEmail(null);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateUser,
      resetPassword,
      unconfirmedEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

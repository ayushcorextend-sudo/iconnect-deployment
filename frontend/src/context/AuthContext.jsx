import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

/**
 * AuthProvider — single source of truth for Supabase auth state.
 *
 * Lifecycle:
 *  1. On mount: call getSession() once. Await result, populate state,
 *     then set isAuthLoading = false. This is the hard lock.
 *  2. supabase.auth.onAuthStateChange listener is installed immediately
 *     and synchronously updates session/user on SIGNED_IN, SIGNED_OUT,
 *     and TOKEN_REFRESHED events.
 *  3. authRole is set by consumers via setAuthRole after profile resolution.
 */
export function AuthProvider({ children }) {
  const [session, setSession]           = useState(null);
  const [user, setUser]                 = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authRole, setAuthRole]         = useState(null);

  useEffect(() => {
    // ── Step 1: resolve the current session ─────────────────────────
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s ?? null);
        setUser(s?.user ?? null);
      })
      .catch((err) => {
        console.error('[AuthContext] getSession() failed:', err);
      })
      .finally(() => {
        // Strictly unblock the app — regardless of success/failure.
        setIsAuthLoading(false);
      });

    // ── Step 2: live auth state changes ─────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(s ?? null);
          setUser(s?.user ?? null);
        }
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setAuthRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, isAuthLoading, authRole, setAuthRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used within <AuthProvider>');
  return ctx;
}

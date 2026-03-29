import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

/**
 * AuthProvider — single source of truth for Supabase auth state.
 *
 * BUG-J FIX: Previously called getSession() AND installed onAuthStateChange,
 * creating two async paths that could double-update state and cause login flicker.
 *
 * Now: single onAuthStateChange listener only.
 * Supabase fires INITIAL_SESSION as its very first event — this replaces getSession().
 * isAuthLoading stays true until INITIAL_SESSION fires, then is permanently false.
 * SIGNED_OUT delegates to performLogout() for centralized cache cleanup (Phase 1).
 */
export function AuthProvider({ children }) {
  const [session, setSession]             = useState(null);
  const [user, setUser]                   = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authRole, setAuthRole]           = useState(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (event === 'INITIAL_SESSION') {
          // First event — replaces getSession(). Single code path, no race.
          setSession(s ?? null);
          setUser(s?.user ?? null);
          setIsAuthLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(s ?? null);
          setUser(s?.user ?? null);
          return;
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setAuthRole(null);
          // performLogout() already called by the logout trigger — no double-call here.
          // If signOut fired externally (e.g. another tab), clear local state.
          return;
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

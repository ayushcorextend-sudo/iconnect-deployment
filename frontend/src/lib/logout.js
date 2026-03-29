/**
 * logout.js — Centralized logout function.
 *
 * Every logout trigger in the app must call performLogout() from this module.
 * No scattered cleanup. No missed cache.
 *
 * Kills: BUG-C (cross-user cache leak — _dashCache, signedUrl CACHE, dataCache _store,
 *         tenantResolver _cached, trackActivity queue all registered via registerCache())
 *
 * Order of operations:
 *   1. Clear all registered module-level caches (user data must go first)
 *   2. Clear Zustand auth + app stores
 *   3. Sign out from Supabase (invalidates server-side session)
 */
import { supabase } from './supabase';
import { clearAllCaches } from './dbService';

/**
 * Perform a complete, clean logout.
 * Clears all user-specific data before signing out.
 *
 * @returns {Promise<void>}
 */
export async function performLogout() {
  try {
    // Step 1: Clear all registered module-level caches (dashCache, signedUrls, dataCache, etc.)
    clearAllCaches();

    // Step 2: Clear Zustand stores — import lazily to avoid circular dependency risk.
    // useAuthStore and useAppStore are singletons; getState() is safe outside React.
    try {
      const { useAuthStore } = await import('../stores/useAuthStore');
      useAuthStore.getState().clearAuth?.();
    } catch (e) {
      console.warn('[logout] Failed to clear auth store:', e.message);
    }

    try {
      const { useAppStore } = await import('../stores/useAppStore');
      useAppStore.getState().reset?.();
    } catch (e) {
      console.warn('[logout] Failed to clear app store:', e.message);
    }

    // Step 3: Sign out from Supabase (invalidates JWT server-side)
    await supabase.auth.signOut();

  } catch (e) {
    // Never let logout itself fail — user must always be able to log out.
    console.error('[logout] performLogout encountered an error:', e.message);
    // Force signOut even if earlier steps threw
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
  }
}

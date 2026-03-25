/**
 * useTenantStore.js — Zustand store for current tenant context.
 *
 * Holds the resolved tenant data and provides tenant-aware utilities.
 * Wire applyTenantBranding after tenant resolves so CSS vars update live.
 */
import { create } from 'zustand';
import { resolveTenant, applyTenantBranding, clearTenantCache } from '../lib/tenantResolver';

export const useTenantStore = create((set, get) => ({
  tenant:   null,
  loading:  true,
  error:    null,

  /** Load and cache the current tenant. Safe to call multiple times. */
  loadTenant: async () => {
    if (get().tenant) return; // already loaded
    try {
      const tenant = await resolveTenant();
      set({ tenant, loading: false, error: null });
      applyTenantBranding(tenant);
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  /** Switch tenant (for superadmin use) */
  switchTenant: async (tenantId) => {
    clearTenantCache();
    set({ tenant: null, loading: true });
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, slug, name, logo_url, primary_color, secondary_color')
        .eq('id', tenantId)
        .single();
      if (tenant) {
        set({ tenant, loading: false, error: null });
        applyTenantBranding(tenant);
      }
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  /** Reset on logout */
  clearTenant: () => {
    clearTenantCache();
    set({ tenant: null, loading: true, error: null });
  },

  // Derived helpers
  get tenantName()    { return get().tenant?.name || 'iConnect'; },
  get tenantLogoUrl() { return get().tenant?.logo_url || null; },
  get primaryColor()  { return get().tenant?.primary_color || '#4F46E5'; },
}));

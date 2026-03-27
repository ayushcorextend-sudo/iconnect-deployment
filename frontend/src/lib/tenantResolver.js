/**
 * tenantResolver.js — Resolves the current tenant from hostname or JWT claim.
 *
 * Resolution order:
 * 1. JWT custom claim `tenant_id` (set by custom_access_token_hook)
 * 2. Custom domain match from tenants table (for white-label deployments)
 * 3. Subdomain match: `slug.iconnect-med.vercel.app` → slug
 * 4. Default public tenant
 */
import { supabase } from './supabase';
import { registerCache } from './dbService';

const DEFAULT_TENANT = {
  id:              '00000000-0000-0000-0000-000000000001',
  slug:            'default',
  name:            'iConnect',
  logo_url:        null,
  primary_color:   '#4F46E5',
  secondary_color: '#818CF8',
};

// In-memory cache — registered for logout cleanup (BUG-C)
let _cached = null;
registerCache(() => { _cached = null; });

/**
 * Resolve the current tenant.
 * @returns {Promise<typeof DEFAULT_TENANT>}
 */
export async function resolveTenant() {
  if (_cached) return _cached;

  try {
    // 1. Try JWT claim first (fastest — no extra DB call)
    const { data: { session } } = await supabase.auth.getSession();
    const jwtTenantId = session?.user?.user_metadata?.tenant_id
      || session?.access_token
        ? (() => {
            try {
              const payload = JSON.parse(atob(session.access_token.split('.')[1]));
              return payload.tenant_id;
            } catch { return null; }
          })()
        : null;

    if (jwtTenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, slug, name, logo_url, primary_color, secondary_color')
        .eq('id', jwtTenantId)
        .eq('is_active', true)
        .maybeSingle();
      if (tenant) { _cached = tenant; return tenant; }
    }

    // 2. Custom domain match
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && !hostname.includes('vercel.app')) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, slug, name, logo_url, primary_color, secondary_color')
        .eq('custom_domain', hostname)
        .eq('is_active', true)
        .maybeSingle();
      if (tenant) { _cached = tenant; return tenant; }
    }

    // 3. Subdomain match: slug.iconnect-med.vercel.app
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'iconnect-med' && subdomain !== 'localhost' && subdomain !== 'www') {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, slug, name, logo_url, primary_color, secondary_color')
        .eq('slug', subdomain)
        .eq('is_active', true)
        .maybeSingle();
      if (tenant) { _cached = tenant; return tenant; }
    }

  } catch (err) {
    console.warn('[tenantResolver] Resolution failed, using default tenant:', err.message);
  }

  _cached = DEFAULT_TENANT;
  return DEFAULT_TENANT;
}

/** Clear the tenant cache (call on logout or tenant switch) */
export function clearTenantCache() {
  _cached = null;
}

/** Apply tenant branding CSS variables to :root */
export function applyTenantBranding(tenant) {
  if (!tenant) return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary',   tenant.primary_color   || '#4F46E5');
  root.style.setProperty('--color-secondary', tenant.secondary_color || '#818CF8');
}

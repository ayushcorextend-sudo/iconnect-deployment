import { supabase } from './supabase';

/**
 * Log an admin action to the audit_logs table.
 * Silently fails — never crashes the calling UI.
 *
 * @param {string} action     - e.g. 'approve_artifact', 'reject_user', 'update_settings'
 * @param {string} resource   - e.g. 'artifact', 'user', 'settings'
 * @param {string} resourceId - the id of the affected record
 * @param {object} details    - arbitrary extra context (title, name, etc.)
 */
export async function auditLog(action, resource = '', resourceId = '', details = {}) {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return; // not logged in — skip

    await supabase.from('audit_logs').insert([{
      actor_id: user.id,
      actor_email: user.email || '',
      action,
      resource,
      resource_id: String(resourceId),
      details,
    }]);
  } catch (_) {
    // silently ignore — audit logging must never break the UI
  }
}

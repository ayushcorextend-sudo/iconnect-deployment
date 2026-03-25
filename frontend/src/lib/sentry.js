/**
 * sentry.js — Sentry observability initialization for iConnect Office.
 * HIPAA-aware: never sends user email, name, or PHI.
 * Works as no-op stubs when VITE_SENTRY_DSN is not configured.
 */
import * as Sentry from '@sentry/react';

const dsn = import.meta.env?.VITE_SENTRY_DSN || '';
const isDev = import.meta.env?.MODE === 'development';

export let sentryInited = false;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env?.MODE || 'production',
    release: import.meta.env?.VITE_APP_VERSION || 'dev',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: isDev ? 1.0 : 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Strip authorization headers from breadcrumbs (prevent token leakage)
      if (event.breadcrumbs?.values) {
        event.breadcrumbs.values = event.breadcrumbs.values.map(b => {
          if (b.data?.['Authorization'] || b.data?.['authorization']) {
            const sanitized = { ...b, data: { ...b.data } };
            delete sanitized.data['Authorization'];
            delete sanitized.data['authorization'];
            return sanitized;
          }
          return b;
        });
      }
      // Redact user.email (HIPAA)
      if (event.user?.email) {
        event.user = { ...event.user, email: '[redacted]' };
      }
      return event;
    },
  });
  sentryInited = true;
}

/** Capture an exception — no-op if Sentry not initialized */
export function captureException(err, context = {}) {
  if (!sentryInited) return;
  Sentry.captureException(err, { extra: context });
}

/** Capture a message — no-op if Sentry not initialized */
export function captureMessage(msg, level = 'info') {
  if (!sentryInited) return;
  Sentry.captureMessage(msg, level);
}

/** Set user context — only id and role, never email/name (HIPAA) */
export function setUser(id, role) {
  if (!sentryInited) return;
  if (!id) { Sentry.setUser(null); return; }
  Sentry.setUser({ id, role });
}

/** Start a Sentry performance span — returns dummy if not initialized */
export function startSpan(name, op = 'function') {
  if (!sentryInited) return { end: () => {} };
  return Sentry.startInactiveSpan({ name, op });
}

/** Add a breadcrumb — no-op if not initialized */
export function addBreadcrumb(category, message, data = {}) {
  if (!sentryInited) return;
  Sentry.addBreadcrumb({ category, message, data, level: 'info' });
}

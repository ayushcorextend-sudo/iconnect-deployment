/**
 * pushNotifications.js — Web Push API client-side helper.
 *
 * SCOPE OF THIS MODULE (what works out of the box):
 * - Feature detection (supported?)
 * - Permission request
 * - Subscribe to push manager (needs VAPID public key)
 * - Unsubscribe
 * - Send subscription payload to your backend via Supabase edge function
 *
 * WHAT YOU MUST STILL DO SERVER-SIDE (not landed in this session):
 * 1. Generate VAPID keys:
 *      npx web-push generate-vapid-keys
 * 2. Set secrets in Supabase:
 *      npx supabase secrets set VAPID_PUBLIC_KEY=<public>
 *      npx supabase secrets set VAPID_PRIVATE_KEY=<private>
 *      npx supabase secrets set VAPID_SUBJECT=mailto:admin@iconnect-med.com
 * 3. Set VITE_VAPID_PUBLIC_KEY in frontend/.env.local (same as Supabase one)
 * 4. Create DB migration for push_subscriptions table:
 *      user_id uuid, endpoint text, p256dh text, auth text, created_at timestamptz
 *      RLS: user can only read/write their own rows
 * 5. Create edge function `push-subscribe` that accepts {subscription}
 *    and upserts into push_subscriptions
 * 6. Create edge function `push-send` that uses web-push npm library
 *    to dispatch notifications from backend (notifications, broadcasts, etc.)
 * 7. Update public/sw.js (or Workbox custom SW) to handle the `push` event —
 *    see handlePushEvent() below for the client-side handler to embed.
 */

import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/** Feature detection — call before showing any push UI */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Current permission state without prompting: 'default' | 'granted' | 'denied' */
export function getPushPermission() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/** Convert base64 URL-safe VAPID key to Uint8Array for pushManager */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

/**
 * Request permission + subscribe + persist to backend.
 * Returns the PushSubscription or null on failure.
 */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    console.warn('[push] not supported on this device');
    return null;
  }
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[push] VITE_VAPID_PUBLIC_KEY not configured — see pushNotifications.js header');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.ready;

    // Reuse existing subscription if still valid
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Persist to backend (requires `push-subscribe` edge function to be deployed)
    const { error } = await supabase.functions.invoke('push-subscribe', {
      body: { subscription: subscription.toJSON() },
    });
    if (error) {
      console.warn('[push] failed to persist subscription:', error.message);
      // Subscription is still valid locally — backend can be reconciled later
    }

    return subscription;
  } catch (err) {
    console.warn('[push] subscribe failed:', err.message);
    return null;
  }
}

/** Unsubscribe and tell backend to drop the row */
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    await supabase.functions.invoke('push-unsubscribe', {
      body: { endpoint: subscription.endpoint },
    }).catch(() => {});

    return await subscription.unsubscribe();
  } catch (err) {
    console.warn('[push] unsubscribe failed:', err.message);
    return false;
  }
}

/** Check if user currently has an active subscription */
export async function hasActiveSubscription() {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}

/**
 * CLIENT-SIDE PUSH HANDLER — this code must be embedded in your custom SW
 * (or injected via Workbox injectManifest strategy). Copy into sw.js:
 *
 *   self.addEventListener('push', (event) => {
 *     const data = event.data?.json() ?? { title: 'iConnect', body: 'New update' };
 *     const options = {
 *       body: data.body,
 *       icon: '/icons/icon-192.png',
 *       badge: '/icons/icon-192.png',
 *       data: { url: data.url || '/' },
 *       vibrate: [100, 50, 100],
 *       tag: data.tag,
 *       renotify: Boolean(data.tag),
 *     };
 *     event.waitUntil(self.registration.showNotification(data.title, options));
 *   });
 *
 *   self.addEventListener('notificationclick', (event) => {
 *     event.notification.close();
 *     event.waitUntil(
 *       clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
 *         for (const client of list) {
 *           if (client.url.includes(event.notification.data.url)) return client.focus();
 *         }
 *         return clients.openWindow(event.notification.data.url);
 *       })
 *     );
 *   });
 */

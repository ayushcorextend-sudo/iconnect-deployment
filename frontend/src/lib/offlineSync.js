/**
 * offlineSync.js — Bridge between React app and Service Worker background sync.
 *
 * Provides:
 * - queueRequest(tag, url, method, body) — stores a failed request in IndexedDB
 *   and registers a SyncManager event so the SW retries when back online.
 * - onSyncMessage(handler) — listen for SW → client sync-complete messages.
 *
 * The Service Worker picks up queued requests via the 'workbox-background-sync'
 * plugin configured in vite.config.js.
 */

const DB_NAME    = 'iconnect-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending-requests';

/** Open (or create) the IndexedDB queue */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => reject(e.target.error);
  });
}

/**
 * Queue a failed API request for background sync retry.
 * @param {string} tag    - Sync tag (e.g. 'activity-sync', 'quiz-submit')
 * @param {string} url    - Full request URL
 * @param {string} method - HTTP method
 * @param {object} body   - JSON body
 * @param {object} headers - HTTP headers (auth token etc.)
 */
export async function queueRequest(tag, url, method = 'POST', body = {}, headers = {}) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      tag, url, method,
      body:    JSON.stringify(body),
      headers: JSON.stringify(headers),
      queuedAt: new Date().toISOString(),
    });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();

    // Register background sync with the service worker
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register(tag);
    }
  } catch (err) {
    console.warn('[offlineSync] queueRequest failed:', err.message);
  }
}

/** Get all pending requests for a given tag */
export async function getPendingRequests(tag) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const all = await new Promise((res, rej) => {
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = (e) => res(e.target.result);
      req.onerror   = (e) => rej(e.target.error);
    });
    db.close();
    return all.filter(r => r.tag === tag);
  } catch {
    return [];
  }
}

/** Delete a request from the queue after successful retry */
export async function deletePendingRequest(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    db.close();
  } catch { /* silent */ }
}

/** Count all pending requests */
export async function getPendingCount() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const count = await new Promise((res, rej) => {
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = (e) => res(e.target.result);
      req.onerror   = (e) => rej(e.target.error);
    });
    db.close();
    return count;
  } catch {
    return 0;
  }
}

/**
 * Listen for messages from the SW reporting sync completion.
 * @param {Function} handler - Called with { tag, syncedCount }
 * @returns {Function} cleanup function
 */
export function onSyncMessage(handler) {
  if (!('serviceWorker' in navigator)) return () => {};
  const listener = (event) => {
    if (event.data?.type === 'SYNC_COMPLETE') {
      handler(event.data);
    }
  };
  navigator.serviceWorker.addEventListener('message', listener);
  return () => navigator.serviceWorker.removeEventListener('message', listener);
}

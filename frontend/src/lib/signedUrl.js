/**
 * signedUrl.js — Serve all storage content through signed URLs.
 *
 * Why: raw public bucket URLs bypass RLS and allow hotlinking.
 * Signed URLs expire (default: 1 hour) and are user-scoped.
 *
 * MANUAL STEP: In Supabase Dashboard → Storage → each bucket
 *   → Edit → uncheck "Public bucket" to make it private.
 *   Once private, only signed URLs will work.
 */
import { supabase } from './supabase';
import { registerCache } from './dbService';

// In-memory cache: cacheKey → { url, ts }
const CACHE = new Map();
const CACHE_TTL = 50 * 60 * 1000; // 50 min (URLs valid for 60 min)
// BUG-C: clear signed URL cache on logout — URLs are user-scoped and must not leak.
registerCache(() => CACHE.clear());

/**
 * Get a signed URL for a file in Supabase Storage.
 * Results are cached for 50 minutes to avoid re-signing on every render.
 *
 * @param {string} bucket - Supabase storage bucket name
 * @param {string} path   - File path within the bucket
 * @param {number} expiresIn - Seconds until URL expires (default 3600)
 * @returns {Promise<string|null>} Signed URL or null on error
 */
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  if (!bucket || !path) return null;

  const key = `${bucket}/${path}`;
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.url;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error) throw error;

    CACHE.set(key, { url: data.signedUrl, ts: Date.now() });
    return data.signedUrl;
  } catch (e) {
    console.warn('[signedUrl] Failed to sign:', key, e.message);
    return null;
  }
}

/**
 * Convert a raw Supabase storage URL to a signed URL.
 * Extracts bucket and path from the URL pattern:
 *   .../storage/v1/object/public/{bucket}/{path}
 *
 * If the URL is not a Supabase storage URL, it is returned unchanged
 * (e.g., external YouTube/Vimeo URLs, data: URIs).
 *
 * @param {string|null} rawUrl
 * @returns {Promise<string|null>}
 */
export async function signArtifactUrl(rawUrl) {
  if (!rawUrl) return null;

  const match = rawUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
  if (!match) return rawUrl; // Not a storage URL — return as-is

  return getSignedUrl(match[1], decodeURIComponent(match[2]));
}

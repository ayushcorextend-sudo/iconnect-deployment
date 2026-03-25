/**
 * blobManager.js — Manages blob URL lifecycle to prevent memory leaks.
 * All blob URL creation/revocation should go through this module.
 */
const activeBlobs = new Set();

export function createManagedBlobUrl(blob) {
  const url = URL.createObjectURL(blob);
  activeBlobs.add(url);
  return url;
}

export function revokeManagedBlobUrl(url) {
  if (url && activeBlobs.has(url)) {
    URL.revokeObjectURL(url);
    activeBlobs.delete(url);
  }
}

export function revokeAllBlobs() {
  for (const url of activeBlobs) {
    URL.revokeObjectURL(url);
  }
  activeBlobs.clear();
}

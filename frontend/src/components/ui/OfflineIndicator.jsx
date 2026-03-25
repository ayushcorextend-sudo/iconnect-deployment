/**
 * OfflineIndicator.jsx — Animated banner shown when the device is offline.
 *
 * - Mounts a slim top bar when offline
 * - Shows pending sync count when > 0
 * - Disappears automatically when back online
 */
import { useEffect } from 'react';
import { useOfflineStore } from '../../stores/useOfflineStore';
import { onSyncMessage, getPendingCount } from '../../lib/offlineSync';

export default function OfflineIndicator() {
  const { isOnline, pendingCount, setPendingCount, onSyncComplete, initNetworkListeners } = useOfflineStore();

  // Wire up network event listeners once
  useEffect(() => {
    const cleanup = initNetworkListeners();
    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync pending count from IndexedDB on mount and when going back online
  useEffect(() => {
    getPendingCount().then(setPendingCount);
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for service worker sync completion
  useEffect(() => {
    const cleanup = onSyncMessage(({ syncedCount }) => {
      onSyncComplete();
      setPendingCount(c => Math.max(0, c - (syncedCount || 1)));
    });
    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '8px 16px',
        background: isOnline ? '#10B981' : '#EF4444',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        transition: 'background 0.3s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {!isOnline ? (
        <>
          <span>⚠️</span>
          <span>You're offline</span>
          {pendingCount > 0 && (
            <span style={{ opacity: 0.85, fontWeight: 400 }}>
              — {pendingCount} action{pendingCount !== 1 ? 's' : ''} will sync when reconnected
            </span>
          )}
        </>
      ) : (
        <>
          <span>✅</span>
          <span>Back online</span>
          {pendingCount > 0 && (
            <span style={{ opacity: 0.85, fontWeight: 400 }}>
              — syncing {pendingCount} pending action{pendingCount !== 1 ? 's' : ''}…
            </span>
          )}
        </>
      )}
    </div>
  );
}

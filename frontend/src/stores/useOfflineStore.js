/**
 * useOfflineStore.js — Zustand store for offline state + pending sync queue.
 *
 * Tracks:
 * - isOnline: real-time network status
 * - pendingCount: number of requests queued for background sync
 * - lastSyncAt: timestamp of last successful sync
 */
import { create } from 'zustand';

export const useOfflineStore = create((set, get) => ({
  isOnline:     navigator.onLine,
  pendingCount: 0,
  lastSyncAt:   null,
  syncError:    null,

  setOnline:       (isOnline)     => set({ isOnline }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncAt:   (lastSyncAt)   => set({ lastSyncAt }),
  setSyncError:    (syncError)    => set({ syncError }),

  incrementPending: () => set(s => ({ pendingCount: s.pendingCount + 1 })),
  decrementPending: () => set(s => ({ pendingCount: Math.max(0, s.pendingCount - 1) })),

  // Called when SW reports a background sync completed
  onSyncComplete: () => set({ lastSyncAt: new Date().toISOString(), syncError: null }),

  // Initialize network event listeners (call once in App)
  initNetworkListeners: () => {
    const handleOnline  = () => { set({ isOnline: true, syncError: null }); };
    const handleOffline = () => { set({ isOnline: false }); };
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
}));

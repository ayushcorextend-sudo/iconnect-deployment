import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  role:            null,
  userName:        null,
  userId:          null,
  needsProfile:    false,
  pendingUserId:   null,
  pendingEmail:    null,
  pendingMessage:  null,

  setRole:           (role)           => set({ role }),
  setUserName:       (userName)       => set({ userName }),
  setUserId:         (userId)         => set({ userId }),
  setNeedsProfile:   (needsProfile)   => set({ needsProfile }),
  setPendingUserId:  (pendingUserId)  => set({ pendingUserId }),
  setPendingEmail:   (pendingEmail)   => set({ pendingEmail }),
  setPendingMessage: (pendingMessage) => set({ pendingMessage }),

  clearAuth: () => set({
    role: null, userName: null, userId: null,
    needsProfile: false, pendingUserId: null,
    pendingEmail: null, pendingMessage: null,
  }),
}));

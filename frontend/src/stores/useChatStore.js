import { create } from 'zustand';

export const useChatStore = create((set) => ({
  chatBotMode: null, // null | 'chat' | 'doubt'

  setChatBotMode:    (mode)  => set({ chatBotMode: mode }),
  openDoubtBuster:   ()      => set({ chatBotMode: 'doubt' }),
  openChat:          ()      => set({ chatBotMode: 'chat' }),
  closeChat:         ()      => set({ chatBotMode: null }),
}));

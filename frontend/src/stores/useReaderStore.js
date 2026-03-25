import { create } from 'zustand';

export const useReaderStore = create((set) => ({
  currentArtifact: null,  // the artifact being viewed
  fullscreen:      false,
  pageNum:         1,

  openArtifact:  (artifact) => set({ currentArtifact: artifact, pageNum: 1 }),
  closeArtifact: ()         => set({ currentArtifact: null, fullscreen: false, pageNum: 1 }),
  setFullscreen: (v)        => set({ fullscreen: v }),
  setPageNum:    (n)        => set({ pageNum: n }),
}));

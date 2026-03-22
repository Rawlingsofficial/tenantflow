import { create } from 'zustand'

type MixedMode = 'residential' | 'commercial'

interface MixedModeState {
  mode: MixedMode
  setMode: (mode: MixedMode) => void
}

export const useMixedModeStore = create<MixedModeState>((set) => ({
  mode: 'residential',
  setMode: (mode) => set({ mode }),
}))

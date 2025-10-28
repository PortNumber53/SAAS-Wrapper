import { create } from 'zustand'

export type BottomAction = {
  id: string
  label: string
  primary?: boolean
  disabled?: boolean
  onClick?: () => void
}

type UIState = {
  bottomActions: BottomAction[]
  setBottomActions: (actions: BottomAction[]) => void
  clearBottomActions: () => void
}

const useUIStore = create<UIState>((set) => ({
  bottomActions: [],
  setBottomActions: (actions) => set({ bottomActions: actions }),
  clearBottomActions: () => set({ bottomActions: [] }),
}))

export default useUIStore


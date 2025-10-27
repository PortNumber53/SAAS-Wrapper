import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type PublishDraft = {
  ig_user_id: string
  image_url: string
  thumb_url: string
  caption: string
}

type PublishState = {
  currentId: string
  drafts: Record<string, PublishDraft>
  setCurrent: (id: string) => void
  setDraft: (patch: Partial<PublishDraft>) => void
  clearDraft: () => void
}

export const initialDraft: PublishDraft = {
  ig_user_id: '',
  image_url: '',
  thumb_url: '',
  caption: '',
}

export const usePublishStore = create<PublishState>()(
  persist(
    (set) => ({
      currentId: '',
      drafts: {},
      setCurrent: (id) => set((state) => {
        const existing = state.drafts[id] || { ...initialDraft, ig_user_id: id }
        return { currentId: id, drafts: { ...state.drafts, [id]: existing } }
      }),
      setDraft: (patch) => set((state) => {
        const id = state.currentId
        const base = state.drafts[id] || { ...initialDraft, ig_user_id: id }
        return { drafts: { ...state.drafts, [id]: { ...base, ...patch } } }
      }),
      clearDraft: () => set((state) => {
        const id = state.currentId
        if (!id) return state
        const next = { ...state.drafts, [id]: { ...initialDraft, ig_user_id: id } }
        return { drafts: next }
      }),
    }),
    {
      name: 'publish.drafts',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ currentId: s.currentId, drafts: s.drafts }),
    }
  )
)

export default usePublishStore

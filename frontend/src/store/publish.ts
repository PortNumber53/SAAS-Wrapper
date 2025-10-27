import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type PublishDraft = {
  ig_user_id: string
  image_url: string
  thumb_url: string
  caption: string
}

type PublishState = {
  draft: PublishDraft
  setDraft: (patch: Partial<PublishDraft>) => void
  clearDraft: () => void
}

const initialDraft: PublishDraft = {
  ig_user_id: '',
  image_url: '',
  thumb_url: '',
  caption: '',
}

export const usePublishStore = create<PublishState>()(
  persist(
    (set, get) => ({
      draft: initialDraft,
      setDraft: (patch) => set({ draft: { ...get().draft, ...patch } }),
      clearDraft: () => set({ draft: initialDraft }),
    }),
    {
      name: 'publish.draft',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ draft: s.draft }),
    }
  )
)

export default usePublishStore


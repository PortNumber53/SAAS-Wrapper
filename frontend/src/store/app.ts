import { create } from 'zustand'

type Session = { ok: boolean; email?: string; name?: string; picture?: string }
type AgentSettings = { models: string[]; default_model: string }
type GeminiKey = { configured: boolean; last4: string }
type IGAccount = { ig_user_id: string; page_id: string; page_name: string; username: string; token_valid?: boolean; token_expires_at?: number | null; linked?: boolean }

export type AppState = {
  // Session
  session: Session | null
  sessionLoaded: boolean
  loadSession: () => Promise<void>
  resetOnLogout: () => void

  // Agent settings
  agentSettings: AgentSettings
  agentSettingsLoaded: boolean
  loadAgentSettings: () => Promise<void>
  saveAgentSettings: (models: string[], def: string) => Promise<boolean>

  // Gemini key status
  geminiKey: GeminiKey | null
  geminiKeyLoaded: boolean
  loadGeminiKey: () => Promise<void>
  saveGeminiKey: (key: string) => Promise<boolean>
  removeGeminiKey: () => Promise<boolean>

  // IG accounts
  igAccounts: IGAccount[]
  igAccountsLoaded: boolean
  loadIGAccounts: () => Promise<void>

  // Preferences
  prefs: Record<string, unknown>
  prefsLoaded: boolean
  loadPrefs: () => Promise<void>
  savePrefs: (updates: { theme?: string }) => Promise<boolean>
}

export const useAppStore = create<AppState>((set, get) => ({
  session: null,
  sessionLoaded: false,
  async loadSession() {
    try {
      const r = await fetch('/api/auth/session')
      const j = r.ok ? await r.json() : { ok: false }
      set({ session: j, sessionLoaded: true })
    } catch { set({ sessionLoaded: true }) }
  },
  resetOnLogout() {
    set({
      session: { ok: false },
      sessionLoaded: true,
      igAccounts: [],
      igAccountsLoaded: false,
    })
  },

  agentSettings: { models: [], default_model: '' },
  agentSettingsLoaded: false,
  async loadAgentSettings() {
    try {
      const r = await fetch('/api/agents/settings')
      if (!r.ok) { set({ agentSettingsLoaded: true }); return }
      const j = await r.json()
      const models: string[] = Array.isArray(j.models) ? j.models : []
      const def: string = typeof j.default_model === 'string' ? j.default_model : ''
      set({ agentSettings: { models, default_model: def }, agentSettingsLoaded: true })
    } catch { set({ agentSettingsLoaded: true }) }
  },
  async saveAgentSettings(models: string[], def: string) {
    const cleaned = Array.from(new Set(models.map(m => m.trim()).filter(Boolean)))
    const default_model = cleaned.includes(def) ? def : (cleaned[0] || '')
    const res = await fetch('/api/agents/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ models: cleaned, default_model }) })
    if (res.ok) { set({ agentSettings: { models: cleaned, default_model }, agentSettingsLoaded: true }); return true }
    return false
  },

  geminiKey: null,
  geminiKeyLoaded: false,
  async loadGeminiKey() {
    try {
      const r = await fetch('/api/keys/gemini')
      if (!r.ok) { set({ geminiKeyLoaded: true }); return }
      const j = await r.json()
      const configured = !!j.configured
      const last4 = j.last4 || ''
      set({ geminiKey: { configured, last4 }, geminiKeyLoaded: true })
    } catch { set({ geminiKeyLoaded: true }) }
  },
  async saveGeminiKey(key: string) {
    const res = await fetch('/api/keys/gemini', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ api_key: key }) })
    if (res.ok) { await get().loadGeminiKey(); return true }
    return false
  },
  async removeGeminiKey() {
    const res = await fetch('/api/keys/gemini', { method: 'DELETE' })
    if (res.ok) { set({ geminiKey: { configured: false, last4: '' } }); return true }
    return false
  },

  igAccounts: [],
  igAccountsLoaded: false,
  async loadIGAccounts() {
    try {
      const r = await fetch('/api/ig/accounts')
      const j = r.ok ? await r.json() : { ok: false }
      if (j?.ok && Array.isArray(j.accounts)) set({ igAccounts: j.accounts, igAccountsLoaded: true })
      else set({ igAccountsLoaded: true })
    } catch { set({ igAccountsLoaded: true }) }
  },

  prefs: {},
  prefsLoaded: false,
  async loadPrefs() {
    try {
      const r = await fetch('/api/settings')
      const j = r.ok ? await r.json() : { ok: false }
      if (j?.ok && j.settings) set({ prefs: j.settings, prefsLoaded: true })
      else set({ prefsLoaded: true })
    } catch { set({ prefsLoaded: true }) }
  },
  async savePrefs(updates: { theme?: string }) {
    const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(updates) })
    if (res.ok) { await get().loadPrefs(); return true }
    return false
  },
}))

export default useAppStore

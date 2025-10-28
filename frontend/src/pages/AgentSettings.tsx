import { useEffect, useState } from 'react'
import { useToast } from '../components/ToastProvider'
import useAppStore, { type AppState } from '../store/app'
import useUIStore from '../store/ui'

export default function AgentSettingsPage() {
  const toast = useToast()
  const gemini = useAppStore((s: AppState) => s.geminiKey)
  const geminiLoaded = useAppStore((s: AppState) => s.geminiKeyLoaded)
  const loadGeminiKey = useAppStore((s: AppState) => s.loadGeminiKey)
  const saveGemini = useAppStore((s: AppState) => s.saveGeminiKey)
  const removeGemini = useAppStore((s: AppState) => s.removeGeminiKey)
  const [apiKey, setApiKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)

  const agent = useAppStore((s: AppState) => s.agentSettings)
  const agentLoaded = useAppStore((s: AppState) => s.agentSettingsLoaded)
  const loadAgent = useAppStore((s: AppState) => s.loadAgentSettings)
  const saveAgent = useAppStore((s: AppState) => s.saveAgentSettings)
  const [models, setModels] = useState<string[]>(agent.models)
  const [defaultModel, setDefaultModel] = useState<string>(agent.default_model)
  const [savingModels, setSavingModels] = useState(false)
  const [newModel, setNewModel] = useState('')
  const setBottomActions = useUIStore(s => s.setBottomActions)
  const clearBottom = useUIStore(s => s.clearBottomActions)

  useEffect(() => {
    if (!geminiLoaded) loadGeminiKey()
    if (!agentLoaded) loadAgent()
  }, [])
  useEffect(() => { setModels(agent.models); setDefaultModel(agent.default_model) }, [agent.models, agent.default_model])

  const saveKey = async () => {
    const key = apiKey.trim()
    if (!key) { toast.show('Enter an API key', 'error'); return }
    setSavingKey(true)
    try {
      const ok = await saveGemini(key)
      if (!ok) throw new Error('failed')
      toast.show('Gemini key saved', 'success')
      setApiKey('')
      await loadGeminiKey()
    } catch (e: any) {
      toast.show(`Save failed: ${e?.message || 'unknown error'}`, 'error')
    } finally { setSavingKey(false) }
  }

  const removeKey = async () => {
    setSavingKey(true)
    try {
      const ok = await removeGemini()
      if (!ok) throw new Error('failed')
      toast.show('Gemini key removed', 'success')
    } catch (e: any) {
      toast.show(`Remove failed: ${e?.message || 'unknown error'}`, 'error')
    } finally { setSavingKey(false) }
  }

  const saveModels = async () => {
    // de-duplicate and normalize
    const cleaned = models
      .map((m) => m.trim())
      .filter((m) => !!m)
    const deduped = Array.from(new Set(cleaned))
    const def = deduped.includes(defaultModel) ? defaultModel : (deduped[0] || '')
    if (deduped.length !== models.length) setModels(deduped)
    if (def !== defaultModel) setDefaultModel(def)
    setSavingModels(true)
    try {
      const ok = await saveAgent(deduped, def)
      if (!ok) throw new Error('failed')
      toast.show('Agent models saved', 'success')
    } catch (e: any) {
      toast.show(`Save failed: ${e?.message || 'unknown error'}`, 'error')
    } finally { setSavingModels(false) }
  }

  // Wire CTAs to bottom bar for this page
  useEffect(() => {
    const actions = [] as Array<{ id: string; label: string; primary?: boolean; disabled?: boolean; onClick?: () => void }>
    if (!gemini?.configured) {
      const canSaveKey = !!apiKey.trim() && !savingKey
      actions.push({ id: 'save-key', label: savingKey ? 'Saving…' : 'Save', primary: false, disabled: !canSaveKey, onClick: saveKey })
    }
    actions.push({ id: 'save-models', label: savingModels ? 'Saving…' : 'Save Models', primary: true, disabled: !!savingModels, onClick: saveModels })
    setBottomActions(actions)
    return () => { clearBottom() }
  }, [apiKey, savingKey, savingModels, gemini?.configured, models, defaultModel])

  return (
    <section className='card'>
      <h1>AI Agent — Settings</h1>
      <div style={{display:'grid', gap:12}}>
        <div style={{border:'1px solid var(--border)', borderRadius:8, padding:12, background:'var(--surface)'}}>
          <strong>Gemini API Key</strong>
          <div className='read-the-docs'>Used by the Chat Agent.</div>
          {gemini?.configured ? (
            <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
              <div className='read-the-docs'>Configured (…{gemini?.last4 || ''})</div>
              <button className='btn' disabled={savingKey} onClick={removeKey}>Remove</button>
            </div>
          ) : (
            <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
              <input type='password' placeholder='Enter Gemini API Key' value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{flex:1}} />
              {/* Save action moved to fixed bottom toolbar */}
            </div>
          )}
        </div>

        <div style={{border:'1px solid var(--border)', borderRadius:8, padding:12, background:'var(--surface)'}}>
          <strong>Models</strong>
          <div className='read-the-docs'>Control which models appear in Chat Agent and choose a default.</div>
          <div style={{display:'grid', gap:8, marginTop:8}}>
            {models.map((m, i) => (
              <div key={m+String(i)} style={{display:'flex', alignItems:'center', gap:8}}>
                <input value={m} onChange={(e) => {
                  const v = e.target.value.trim()
                  // prevent duplicate names in real-time edits
                  const existsElsewhere = models.some((x, idx) => idx !== i && x.trim() === v)
                  if (existsElsewhere) { toast.show('Model already exists', 'error'); return }
                  setModels(prev => prev.map((x, idx) => idx===i ? v : x))
                }} style={{flex:1}} />
                <input type='radio' name='defaultModel' title='Default' checked={defaultModel===m} onChange={() => setDefaultModel(m)} />
                <button className='btn' onClick={() => {
                  setModels(prev => {
                    const next = prev.filter((_, idx) => idx!==i)
                    // if removed was default, pick next default automatically
                    if (m === defaultModel) setDefaultModel(next[0] || '')
                    return next
                  })
                }}>Remove</button>
              </div>
            ))}
            <div style={{display:'flex', gap:8}}>
              <input placeholder='Add model (e.g., gemini-1.5-flash)' value={newModel} onChange={(e) => setNewModel(e.target.value)} style={{flex:1}} />
              <button className='btn' onClick={() => {
                const v = newModel.trim();
                if (!v) return;
                if (models.some((m) => m.trim() === v)) { toast.show('Model already exists', 'error'); return }
                setModels(prev => [...prev, v]); if (!defaultModel) setDefaultModel(v); setNewModel('')
              }}>Add</button>
            </div>
            {/* Save Models moved to fixed bottom toolbar */}
          </div>
        </div>
      </div>
    </section>
  )
}

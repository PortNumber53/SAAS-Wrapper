import { useEffect, useState } from 'react'
import { useToast } from '../components/ToastProvider'

export default function AgentSettingsPage() {
  const toast = useToast()
  const [configured, setConfigured] = useState(false)
  const [last4, setLast4] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)

  const [models, setModels] = useState<string[]>(['gemini-1.5-flash', 'gemini-1.5-pro'])
  const [defaultModel, setDefaultModel] = useState<string>('gemini-1.5-flash')
  const [savingModels, setSavingModels] = useState(false)
  const [newModel, setNewModel] = useState('')

  const load = async () => {
    // Load key status
    fetch('/api/keys/gemini').then(r => r.ok ? r.json() : { ok: false }).then((j) => {
      if (j?.ok) { setConfigured(!!j.configured); setLast4(j.last4 || '') }
    }).catch(() => {})
    // Load models
    fetch('/api/agents/settings').then(r => r.ok ? r.json() : { ok: false }).then((j) => {
      if (j?.ok) {
        if (Array.isArray(j.models) && j.models.length) setModels(j.models)
        if (typeof j.default_model === 'string') setDefaultModel(j.default_model)
      }
    }).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const saveKey = async () => {
    const key = apiKey.trim()
    if (!key) { toast.show('Enter an API key', 'error'); return }
    setSavingKey(true)
    try {
      const res = await fetch('/api/keys/gemini', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ api_key: key }) })
      if (!res.ok) throw new Error(await res.text())
      toast.show('Gemini key saved', 'success')
      setApiKey('')
      await load()
    } catch (e: any) {
      toast.show(`Save failed: ${e?.message || 'unknown error'}`, 'error')
    } finally { setSavingKey(false) }
  }

  const removeKey = async () => {
    setSavingKey(true)
    try {
      const res = await fetch('/api/keys/gemini', { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      toast.show('Gemini key removed', 'success')
      setLast4(''); setConfigured(false)
    } catch (e: any) {
      toast.show(`Remove failed: ${e?.message || 'unknown error'}`, 'error')
    } finally { setSavingKey(false) }
  }

  const saveModels = async () => {
    setSavingModels(true)
    try {
      const res = await fetch('/api/agents/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ models, default_model: defaultModel }) })
      if (!res.ok) throw new Error(await res.text())
      toast.show('Agent models saved', 'success')
    } catch (e: any) {
      toast.show(`Save failed: ${e?.message || 'unknown error'}`, 'error')
    } finally { setSavingModels(false) }
  }

  return (
    <section className='card'>
      <h1>Magana AI Agent — Settings</h1>
      <div style={{display:'grid', gap:12}}>
        <div style={{border:'1px solid var(--border)', borderRadius:8, padding:12, background:'var(--surface)'}}>
          <strong>Gemini API Key</strong>
          <div className='read-the-docs'>Used by the Chat Agent.</div>
          {configured ? (
            <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
              <div className='read-the-docs'>Configured (…{last4})</div>
              <button className='btn' disabled={savingKey} onClick={removeKey}>Remove</button>
            </div>
          ) : (
            <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
              <input type='password' placeholder='Enter Gemini API Key' value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{flex:1}} />
              <button className='btn primary' disabled={savingKey || !apiKey.trim()} onClick={saveKey}>{savingKey ? 'Saving…' : 'Save'}</button>
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
                  const v = e.target.value
                  setModels(prev => prev.map((x, idx) => idx===i ? v : x))
                }} style={{flex:1}} />
                <input type='radio' name='defaultModel' title='Default' checked={defaultModel===m} onChange={() => setDefaultModel(m)} />
                <button className='btn' onClick={() => setModels(prev => prev.filter((_, idx) => idx!==i))}>Remove</button>
              </div>
            ))}
            <div style={{display:'flex', gap:8}}>
              <input placeholder='Add model (e.g., gemini-1.5-flash)' value={newModel} onChange={(e) => setNewModel(e.target.value)} style={{flex:1}} />
              <button className='btn' onClick={() => { const v = newModel.trim(); if (!v) return; setModels(prev => [...prev, v]); if (!defaultModel) setDefaultModel(v); setNewModel('') }}>Add</button>
            </div>
            <div>
              <button className='btn primary' disabled={savingModels} onClick={saveModels}>{savingModels ? 'Saving…' : 'Save Models'}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


import { useEffect, useState } from 'react'
import { useToast } from '../components/ToastProvider'

export default function KeysPage() {
  const toast = useToast()
  const [configured, setConfigured] = useState(false)
  const [last4, setLast4] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const r = await fetch('/api/keys/gemini')
    if (!r.ok) return
    const j = await r.json() as { ok: boolean; configured?: boolean; last4?: string }
    setConfigured(!!j.configured)
    setLast4(j.last4 || '')
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    const key = apiKey.trim()
    if (!key) { toast.show('Enter an API key', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/keys/gemini', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ api_key: key }) })
      if (!res.ok) throw new Error(await res.text())
      toast.show('Gemini key saved', 'success')
      setApiKey('')
      await load()
    } catch (e: any) {
      toast.show(`Save failed: ${e?.message || 'unknown error'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/keys/gemini', { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      toast.show('Gemini key removed', 'success')
      setLast4('')
      setConfigured(false)
    } catch (e: any) {
      toast.show(`Remove failed: ${e?.message || 'unknown error'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className='card'>
      <h1>API Keys</h1>
      <div style={{display:'grid', gap:12}}>
        <div style={{border:'1px solid var(--border)', borderRadius:8, padding:12, background:'var(--surface)'}}>
          <strong>Gemini</strong>
          <div className='read-the-docs'>Used for the Chat Agent.</div>
          {configured ? (
            <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
              <div className='read-the-docs'>Configured (…{last4})</div>
              <button className='btn' disabled={saving} onClick={remove}>Remove</button>
            </div>
          ) : (
            <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
              <input type='password' placeholder='Enter Gemini API Key' value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{flex:1}} />
              <button className='btn primary' disabled={saving || !apiKey.trim()} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}


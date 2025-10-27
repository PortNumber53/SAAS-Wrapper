import { useEffect, useState } from 'react'
import useAppStore, { type AppState } from '../store/app'

export default function SettingsPage() {
  const session = useAppStore((s: AppState) => s.session)
  const sessionLoaded = useAppStore((s: AppState) => s.sessionLoaded)
  const [theme, setTheme] = useState<string>('system')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!sessionLoaded || !session?.ok) return
    fetch('/api/settings').then(r => r.ok ? r.json() : { ok: false }).then((s) => {
      if (s?.ok && s.settings) {
        if (typeof s.settings.theme === 'string') setTheme(s.settings.theme)
      }
    }).catch(() => {})
  }, [sessionLoaded, session?.ok])

  const onSave = async () => {
    setSaving(true)
    await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ theme }) })
    setSaving(false)
  }

  return (
    <section className='card'>
      <h1>Settings</h1>
      {sessionLoaded && session?.ok ? (
        <div>
          <p>Manage your preferences for <strong>{session.email}</strong>.</p>
          <label>
            <div style={{marginTop:'0.5rem'}}>Theme</div>
            <select value={theme} onChange={e => setTheme(e.target.value)}>
              <option value='system'>System</option>
              <option value='light'>Light</option>
              <option value='dark'>Dark</option>
            </select>
          </label>
          <div style={{marginTop:'0.75rem'}}>
            <button disabled={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      ) : sessionLoaded ? (
        <p>You are not logged in. Please use the Login button in the header.</p>
      ) : (
        <p>Loading…</p>
      )}
    </section>
  )
}

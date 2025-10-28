import { useEffect, useState } from 'react'
import useAppStore, { type AppState } from '../store/app'
import useUIStore from '../store/ui'

export default function ProfilePage() {
  const session = useAppStore((s: AppState) => s.session)
  const sessionLoaded = useAppStore((s: AppState) => s.sessionLoaded)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [picture, setPicture] = useState('')
  const [saving, setSaving] = useState(false)
  const setBottomActions = useUIStore(s => s.setBottomActions)
  const clearBottom = useUIStore(s => s.clearBottomActions)

  useEffect(() => {
    if (!sessionLoaded || !session?.ok) { setLoading(false); return }
    fetch('/api/me').then(r => r.ok ? r.json() : { ok: false }).then((me) => {
      if (me?.ok && me.user) {
        if (me.user.name) setName(String(me.user.name))
        if (me.user.picture) setPicture(String(me.user.picture))
      }
    }).finally(() => setLoading(false))
  }, [sessionLoaded, session?.ok])

  const onSave = async () => {
    setSaving(true)
    await fetch('/api/me', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, picture }) })
    setSaving(false)
  }

  useEffect(() => {
    // Wire Save action into bottom toolbar
    setBottomActions([
      { id: 'save-profile', label: saving ? 'Saving…' : 'Save', primary: true, disabled: !!saving, onClick: onSave },
    ])
    return () => { clearBottom() }
  }, [name, picture, saving])

  return (
    <section className='card'>
      <h1>Profile</h1>
      {loading && <p>Loading your profile…</p>}
      {!loading && session?.ok && (
        <div>
          <p><strong>Email:</strong> {session.email}</p>
          <label>
            <div style={{marginTop: '0.5rem'}}>Name</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder='Your name' />
          </label>
          <label>
            <div style={{marginTop: '0.5rem'}}>Picture URL</div>
            <input value={picture} onChange={e => setPicture(e.target.value)} placeholder='https://…' />
          </label>
          {/* Save moved to fixed bottom toolbar */}
        </div>
      )}
      {!loading && !session?.ok && (
        <p>You are not logged in. Please use the Login button in the header.</p>
      )}
    </section>
  )
}

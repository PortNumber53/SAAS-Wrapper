import { useEffect, useState } from 'react'

type Session = { ok: boolean; email?: string }

export default function SettingsPage() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.ok ? r.json() : Promise.resolve({ ok: false }))
      .then((j: Session) => setSession(j))
      .catch(() => setSession({ ok: false }))
  }, [])

  return (
    <section className='card'>
      <h1>Settings</h1>
      {session?.ok ? (
        <p>Manage your preferences for <strong>{session.email}</strong>. (Coming soon)</p>
      ) : (
        <p>You are not logged in. Please use the Login button in the header.</p>
      )}
    </section>
  )
}


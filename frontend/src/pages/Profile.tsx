import { useEffect, useState } from 'react'

type Session = { ok: boolean; email?: string; name?: string }

export default function ProfilePage() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.ok ? r.json() : Promise.resolve({ ok: false }))
      .then((j: Session) => setSession(j))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className='card'>
      <h1>Profile</h1>
      {loading && <p>Loading your profile…</p>}
      {!loading && session?.ok && (
        <div>
          <p><strong>Email:</strong> {session.email}</p>
          {session.name && <p><strong>Name:</strong> {session.name}</p>}
        </div>
      )}
      {!loading && !session?.ok && (
        <p>You are not logged in. Please use the Login button in the header.</p>
      )}
    </section>
  )
}


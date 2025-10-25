import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type Integration = { provider: string }

const SUPPORTED = [
  { key: 'google', name: 'Google' },
  { key: 'instagram', name: 'Instagram' },
]

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const connected = useMemo(() => new Set(providers.map(p => p.provider)), [providers])

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.ok ? r.json() : { ok: false })
      .then((j: { ok: boolean; providers?: Integration[] }) => {
        if (j?.ok && j.providers) setProviders(j.providers)
      })
      .finally(() => setLoading(false))
  }, [])

  const disconnect = async (provider: string) => {
    await fetch(`/api/integrations/${provider}`, { method: 'DELETE' })
    setProviders(prev => prev.filter(p => p.provider !== provider))
  }

  const connect = async (provider: string) => {
    if (provider === 'google') {
      window.location.href = '/api/auth/google/start'
      return
    }
    if (provider === 'instagram') {
      // Placeholder: backend returns 501 until configured
      const res = await fetch('/api/auth/instagram/start')
      if (!res.ok) alert('Instagram connection not yet configured')
      return
    }
  }

  return (
    <section className='card'>
      <h1>Account Integrations</h1>
      <p>Connect your social accounts to enable additional features.</p>
      {loading && <p>Loading…</p>}
      {!loading && (
        <div style={{display:'grid',gap:'12px'}}>
          {SUPPORTED.map(p => (
            <div key={p.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',border:'1px solid var(--border)',borderRadius:8,padding:'12px',background:'var(--surface)'}}>
              <div>
                <strong>{p.name}</strong>
                <div className='read-the-docs'>Provider: {p.key}</div>
              </div>
              {connected.has(p.key) ? (
                <button className='btn' onClick={() => disconnect(p.key)}>Disconnect</button>
              ) : (
                <button className='btn primary' onClick={() => connect(p.key)}>Connect</button>
              )}
            </div>
          ))}
        </div>
      )}
      <p style={{marginTop:16}}>
        <Link to='/profile'>Back to Profile</Link>
      </p>
    </section>
  )
}


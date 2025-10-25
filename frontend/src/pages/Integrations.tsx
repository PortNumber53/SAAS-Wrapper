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

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (typeof ev.data !== 'object' || !ev.data) return
      if (ev.data.type === 'oauth:instagram' && ev.data.data?.ok) {
        // refresh list
        fetch('/api/integrations').then(r => r.ok ? r.json() : { ok: false }).then((j) => {
          if (j?.ok && j.providers) setProviders(j.providers)
        })
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const connect = async (provider: string) => {
    const w = 480, h = 640
    const y = window.top?.outerHeight ? Math.max(0, ((window.top!.outerHeight - h) / 2) + (window.top!.screenY || 0)) : 0
    const x = window.top?.outerWidth ? Math.max(0, ((window.top!.outerWidth - w) / 2) + (window.top!.screenX || 0)) : 0
    if (provider === 'google') {
      window.open('/api/auth/google/start', '_blank', `popup=yes,width=${w},height=${h},top=${y},left=${x}`)
      return
    }
    if (provider === 'instagram') {
      window.open('/api/auth/instagram/start', '_blank', `popup=yes,width=${w},height=${h},top=${y},left=${x}`)
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

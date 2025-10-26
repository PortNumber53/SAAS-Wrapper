import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'

type Integration = { provider: string }

const SUPPORTED = [
  { key: 'google', name: 'Google' },
  { key: 'instagram', name: 'Instagram' },
  { key: 'iggraph', name: 'Instagram (Business)' },
]

export default function IntegrationsPage() {
  const toast = useToast()
  const [providers, setProviders] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const connected = useMemo(() => new Set(providers.map(p => p.provider)), [providers])
  const [accounts, setAccounts] = useState<Array<{ ig_user_id: string; page_id: string; page_name: string; username: string; token_valid?: boolean; token_expires_at?: number | null; linked?: boolean }>>([])

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.ok ? r.json() : { ok: false })
      .then((j: { ok: boolean; providers?: Integration[] }) => {
        if (j?.ok && j.providers) setProviders(j.providers)
      })
      .finally(() => setLoading(false))
    // Load IG accounts list
    fetch('/api/ig/accounts').then(r => r.ok ? r.json() : { ok: false }).then((j) => {
      if (j?.ok && j.accounts) setAccounts(j.accounts)
    })
  }, [])

  const disconnect = async (provider: string) => {
    const res = await fetch(`/api/integrations/${provider}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.show('Failed to disconnect provider', 'error')
    }
    // Refresh providers and accounts after disconnect
    fetch('/api/integrations').then(r => r.ok ? r.json() : { ok: false }).then((j) => {
      if (j?.ok && j.providers) setProviders(j.providers)
    })
    if (provider === 'iggraph') {
      fetch('/api/ig/accounts').then(r => r.ok ? r.json() : { ok: false }).then((j) => {
        if (j?.ok && j.accounts) setAccounts(j.accounts)
        else setAccounts([])
      })
    }
  }

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (typeof ev.data !== 'object' || !ev.data) return
      if ((ev.data.type === 'oauth:instagram' || ev.data.type === 'oauth:iggraph') && ev.data.data?.ok) {
        // refresh providers and IG accounts
        fetch('/api/integrations').then(r => r.ok ? r.json() : { ok: false }).then((j) => {
          if (j?.ok && j.providers) setProviders(j.providers)
        })
        fetch('/api/ig/accounts').then(r => r.ok ? r.json() : { ok: false }).then((j) => {
          if (j?.ok && j.accounts) setAccounts(j.accounts)
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
    if (provider === 'iggraph') {
      window.open('/api/auth/iggraph/start', '_blank', `popup=yes,width=${w},height=${h},top=${y},left=${x}`)
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
          {SUPPORTED.map(p => {
            const isConnected = p.key === 'iggraph' ? (connected.has('iggraph') || accounts.length > 0) : connected.has(p.key)
            return (
              <div key={p.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',border:'1px solid var(--border)',borderRadius:8,padding:'12px',background:'var(--surface)'}}>
                <div>
                  <strong>{p.name}</strong>
                  <div className='read-the-docs'>Provider: {p.key}</div>
                </div>
                {isConnected ? (
                  <button className='btn' onClick={() => disconnect(p.key)}>Disconnect</button>
                ) : (
                  <button className='btn primary' onClick={() => connect(p.key)}>Connect</button>
                )}
              </div>
            )
          })}
          {accounts.length > 0 && (
            <div style={{border:'1px solid var(--border)',borderRadius:8,padding:'12px',background:'var(--surface)'}}>
              <strong>Instagram Business Accounts</strong>
              <div className='read-the-docs'>Linked IG users for this account.</div>
              <div style={{display:'grid', gap:8, marginTop:8, paddingLeft:16}}>
                {accounts.map(acc => (
                  <div key={acc.ig_user_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div><strong>@{acc.username || acc.ig_user_id}</strong> — {acc.page_name} ({acc.page_id})</div>
                      <div className='read-the-docs'>Token: {acc.token_valid ? 'valid' : 'invalid'} {acc.token_expires_at ? `(exp ${new Date(acc.token_expires_at*1000).toLocaleString()})` : ''}</div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button className='btn' onClick={async () => {
                        const res = await fetch('/api/ig/refresh', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ ig_user_id: acc.ig_user_id }) })
                        if (!res.ok) {
                          const t = await res.text();
                          try { const j = JSON.parse(t); if (j?.error === 'reauthorization_required' || j?.error === 'ig_account_not_linked') {
                            window.open('/api/auth/iggraph/start', '_blank', 'popup=yes,width=480,height=640');
                          } else { toast.show(t, 'error') } } catch { toast.show(t, 'error') }
                        }
                        const j = await fetch('/api/ig/accounts').then(r=>r.json());
                        if (j?.ok && j.accounts) setAccounts(j.accounts)
                      }}>Refresh Token</button>
                      <button className='btn' onClick={async () => {
                        if (!confirm('Unlink this Instagram account?')) return;
                        const res = await fetch(`/api/ig/account/${acc.ig_user_id}`, { method:'DELETE' })
                        if (!res.ok) toast.show(await res.text(), 'error');
                        const j = await fetch('/api/ig/accounts').then(r=>r.json());
                        if (j?.ok && j.accounts) setAccounts(j.accounts); else setAccounts([])
                      }}>Unlink</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Publish form intentionally omitted on Integrations page */}
        </div>
      )}
      <p style={{marginTop:16}}>
        <Link to='/profile'>Back to Profile</Link>
      </p>
    </section>
  )
}

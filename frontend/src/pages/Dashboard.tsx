import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type IGAccount = { ig_user_id: string; page_id: string; page_name: string; username: string; token_valid?: boolean; token_expires_at?: number | null }

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<IGAccount[]>([])
  const [selected, setSelected] = useState<string>('')
  const [imageUrl, setImageUrl] = useState('')
  const [caption, setCaption] = useState('')
  const selectedAccount = useMemo(() => accounts.find(a => a.ig_user_id === selected) || null, [accounts, selected])

  useEffect(() => {
    fetch('/api/ig/accounts').then(r => r.ok ? r.json() : { ok: false }).then((j) => {
      if (j?.ok && Array.isArray(j.accounts)) {
        setAccounts(j.accounts)
        if (j.accounts.length) setSelected(j.accounts[0].ig_user_id)
      }
    })
  }, [])

  const publish = async () => {
    if (!selected) return alert('Select an Instagram account')
    if (!imageUrl) return alert('Provide an image URL')
    const res = await fetch('/api/ig/publish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ig_user_id: selected, image_url: imageUrl, caption }) })
    if (!res.ok) {
      alert(await res.text())
    } else {
      alert('Publish enqueued')
      setImageUrl('')
      setCaption('')
    }
  }

  return (
    <div className='dashboard'>
      <aside className='sidebar'>
        <h3>Dashboard</h3>
        <nav className='sidebar-nav'>
          <div className='sidebar-section'>
            <div className='sidebar-title'>Instagram Accounts</div>
            {accounts.length === 0 && (
              <div className='sidebar-empty'>
                No IG Business accounts linked.
                <div><Link to='/account/integrations'>Go to Integrations</Link></div>
              </div>
            )}
            {accounts.map(acc => {
              const disabled = !(acc as any).token_valid || (acc as any).linked === false
              const active = acc.ig_user_id === selected
              return (
                <div key={acc.ig_user_id} className={`sidebar-account${disabled ? ' disabled' : ''}${active ? ' active' : ''}`}>
                  <button className='sidebar-item' disabled={disabled} onClick={() => !disabled && setSelected(acc.ig_user_id)}>
                    @{acc.username || acc.ig_user_id}
                  </button>
                  {disabled && (
                    <div className='overlay'>
                      <button className='btn primary' onClick={() => window.open('/api/auth/iggraph/start','_blank','popup=yes,width=480,height=640')}>Re-connect</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Integrations link removed to keep Dashboard focused */}
        </nav>
      </aside>
      <main className='content'>
        {selectedAccount && (
          <section className='card'>
            <h2>Publish to @{selectedAccount.username || selectedAccount.ig_user_id}</h2>
            <div style={{display:'grid', gap:8, marginTop:8}}>
              <input placeholder='Image URL (https://...)' value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
              <input placeholder='Caption' value={caption} onChange={e => setCaption(e.target.value)} />
              <button className='btn primary' onClick={publish}>Publish Image</button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

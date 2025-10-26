import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../components/ToastProvider'

type Media = {
  media_id: string
  ig_user_id: string
  caption?: string
  media_type?: string
  media_url?: string
  permalink?: string
  thumbnail_url?: string
  timestamp?: string
}

type IGAccount = { ig_user_id: string; username: string; page_name: string }

export default function IGContentPage() {
  const toast = useToast()
  const [items, setItems] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<IGAccount[]>([])
  const [filter, setFilter] = useState<string>('')

  const load = async (ig?: string) => {
    setLoading(true)
    try {
      const url = new URL('/api/ig/content', window.location.origin)
      if (ig) url.searchParams.set('ig_user_id', ig)
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(await res.text())
      const j = await res.json() as { ok: boolean; items?: Media[] }
      if (j?.ok && Array.isArray(j.items)) setItems(j.items)
      else setItems([])
    } catch (e: any) {
      toast.show(`Failed to load content: ${e?.message || 'unknown error'}`, 'error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    fetch('/api/ig/accounts').then(r => r.ok ? r.json() : { ok: false }).then((j) => {
      if (j?.ok && j.accounts) setAccounts(j.accounts)
    })
  }, [])

  const title = useMemo(() => {
    if (!filter) return 'Instagram Content'
    const acc = accounts.find(a => a.ig_user_id === filter)
    return acc ? `Instagram Content — @${acc.username}` : 'Instagram Content'
  }, [filter, accounts])

  return (
    <section className='card'>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
        <h1 style={{margin:0}}>{title}</h1>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={filter} onChange={(e) => { setFilter(e.target.value); load(e.target.value) }}>
            <option value=''>All accounts</option>
            {accounts.map(a => (
              <option key={a.ig_user_id} value={a.ig_user_id}>@{a.username || a.ig_user_id} — {a.page_name}</option>
            ))}
          </select>
          <button className='btn' onClick={() => load(filter)} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </div>
      <div style={{marginTop:12}}>
        {loading && <p>Loading…</p>}
        {!loading && items.length === 0 && (
          <p className='read-the-docs'>No media found. Try syncing from Manage Content → Fetch IG Content.</p>
        )}
        {!loading && items.length > 0 && (
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))',
            gap:12,
            marginTop:8
          }}>
            {items.map(m => (
              <article key={m.media_id} className='card' style={{margin:0}}>
                <a href={m.permalink || '#'} target='_blank' rel='noreferrer'>
                  {m.media_type === 'VIDEO' && m.thumbnail_url ? (
                    <img src={m.thumbnail_url} alt='' style={{width:'100%',borderRadius:8}} />
                  ) : m.media_url ? (
                    <img src={m.media_url} alt='' style={{width:'100%',borderRadius:8}} />
                  ) : (
                    <div className='preview-placeholder'>No preview</div>
                  )}
                </a>
                {m.caption && <div style={{marginTop:8, maxHeight:80, overflow:'hidden', textOverflow:'ellipsis'}}>{m.caption}</div>}
                <div className='read-the-docs' style={{marginTop:6}}>{m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}</div>
                <div style={{marginTop:8,display:'flex',justifyContent:'space-between'}}>
                  <a className='btn' href={m.permalink || '#'} target='_blank' rel='noreferrer'>Open</a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}


import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../components/ToastProvider'
import usePublishStore from '../store/publish'
import useAppStore, { type AppState } from '../store/app'

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

export default function IGContentPage() {
  const toast = useToast()
  const [items, setItems] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  // Use the globally selected IG account from the toolbar
  const selectedId = usePublishStore(s => s.currentId)
  const igAccounts = useAppStore((s: AppState) => s.igAccounts)

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
    load(selectedId || undefined)
  }, [selectedId])

  const title = useMemo(() => {
    if (!selectedId) return 'Instagram Content'
    const acc = igAccounts.find((a: any) => a.ig_user_id === selectedId)
    return acc ? `Instagram Content — @${acc.username || selectedId}` : 'Instagram Content'
  }, [selectedId, igAccounts])

  return (
    <section className='card'>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
        <h1 className='igc-title'>{title}</h1>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button className='btn' onClick={() => load(selectedId || undefined)} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
          <button className='btn' onClick={async (e) => {
            const b = e.currentTarget as HTMLButtonElement
            const prev = b.textContent
            b.disabled = true
            b.textContent = 'Syncing…'
            try {
              const res = await fetch('/api/ig/sync-content', { method: 'POST' })
              if (!res.ok) throw new Error(await res.text())
              const j = await res.json() as any
              const total = j && j.counts ? Object.values(j.counts).reduce((a: number, b: any) => a + (Number(b)||0), 0) : 0
              toast.show(`Fetched ${total} items`, 'success')
              await load(selectedId || undefined)
            } catch (e: any) {
              toast.show(`Sync failed: ${e?.message || 'unknown error'}`, 'error')
            } finally {
              b.disabled = false
              b.textContent = prev || 'Sync Now'
            }
          }}>Sync Now</button>
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

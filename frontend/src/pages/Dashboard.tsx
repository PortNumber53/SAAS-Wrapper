import { useEffect, useMemo, useState } from 'react'
import FileDrop from '../components/FileDrop'
import { useToast } from '../components/ToastProvider'
import usePublishStore, { initialDraft } from '../store/publish'
import { Link } from 'react-router-dom'

type IGAccount = { ig_user_id: string; page_id: string; page_name: string; username: string; token_valid?: boolean; token_expires_at?: number | null }

export default function DashboardPage() {
  const toast = useToast()
  const currentId = usePublishStore(s => s.currentId)
  const draft = usePublishStore(s => (s.drafts[s.currentId] || initialDraft))
  const setCurrent = usePublishStore(s => s.setCurrent)
  const setDraft = usePublishStore(s => s.setDraft)
  const [accounts, setAccounts] = useState<IGAccount[]>([])
  const selected = currentId || draft.ig_user_id
  const imageUrl = draft.image_url
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const caption = draft.caption
  const selectedAccount = useMemo(() => accounts.find(a => a.ig_user_id === selected) || null, [accounts, selected])

  useEffect(() => {
    fetch('/api/ig/accounts').then(r => r.ok ? r.json() : { ok: false }).then((j) => {
      if (j?.ok && Array.isArray(j.accounts)) {
        setAccounts(j.accounts)
        if (j.accounts.length && !selected) setCurrent(j.accounts[0].ig_user_id)
      }
    })
  }, [])

  // Lazy hydrate from server if local draft is empty
  useEffect(() => {
    if (!selected) return
    const empty = !draft.image_url && !draft.caption
    if (!empty) return
    let cancelled = false
    fetch(`/api/drafts?ig_user_id=${encodeURIComponent(selected)}`)
      .then(r => r.ok ? r.json() : { ok: false })
      .then((j) => {
        if (cancelled) return
        const p = j?.payload as any
        if (p && (p.image_url || p.caption)) {
          setDraft({ image_url: p.image_url || '', thumb_url: p.thumb_url || '', caption: p.caption || '' })
        }
      }).catch(() => {})
    return () => { cancelled = true }
  }, [selected])

  // Debounced save of draft to server on changes
  useEffect(() => {
    if (!selected) return
    const handler = setTimeout(() => {
      const payload = { image_url: draft.image_url, thumb_url: draft.thumb_url, caption: draft.caption }
      // Skip saving if truly empty
      if (!payload.image_url && !payload.caption) return
      fetch('/api/drafts', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ig_user_id: selected, payload }) }).catch(() => {})
    }, 800)
    return () => clearTimeout(handler)
  }, [selected, draft.image_url, draft.thumb_url, draft.caption])

  const publish = async () => {
    if (!selected) return toast.show('Select an Instagram account', 'error')
    if (!imageUrl) return toast.show('Provide an image URL', 'error')
    const res = await fetch('/api/ig/publish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ig_user_id: selected, image_url: imageUrl, caption }) })
    if (!res.ok) {
      toast.show(await res.text(), 'error')
    } else {
      toast.show('Publish enqueued', 'success')
      setDraft({ image_url: '', thumb_url: '', caption: '' })
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
                  <button className='sidebar-item' disabled={disabled} onClick={() => !disabled && setCurrent(acc.ig_user_id)}>
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
          <section className='publish-panel'>
            <div className='publish-layout'>
              <div className='publish-form'>
                <h2 style={{margin:0}}>Publish to @{selectedAccount.username || selectedAccount.ig_user_id}</h2>
                <div className='field'>
                  <label>Image</label>
                  <div className='upload-row'>
                    <FileDrop
                      accept='image/*'
                      primary='Click to choose an image'
                      secondary='or drag and drop here'
                      onSelect={async (f) => {
                        setUploading(true); setUploadPct(0)
                        try {
                          const res = await uploadWithProgress(f, (pct) => setUploadPct(pct))
                          if (res?.url || res?.thumb_url) {
                            setDraft({ image_url: res?.url || '', thumb_url: res?.thumb_url || '' })
                            // Fire-and-forget: record file metadata to the server
                            try {
                              await fetch('/api/files', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(res) })
                            } catch {}
                          }
                        } catch (e: any) {
                          toast.show(e?.message || 'Upload failed', 'error')
                        } finally {
                          setUploading(false)
                        }
                      }}
                    />
                    {uploading ? (
                      <div style={{minWidth:160}}>
                        <div className='read-the-docs'>Uploading… {Math.round(uploadPct)}%</div>
                        <div style={{height:6, background:'var(--border)', borderRadius:4, overflow:'hidden'}}>
                          <div style={{height:6, width:`${uploadPct}%`, background:'var(--primary)'}} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className='field'>
                  <label>Image URL</label>
                  <div style={{display:'flex', gap:8}}>
                    <input placeholder='https://...' value={imageUrl} onChange={e => setDraft({ image_url: e.target.value, thumb_url: '' })} />
                    {imageUrl && (
                      <button className='btn' onClick={async () => {
                        try {
                          const u = new URL(imageUrl, window.location.origin)
                          if (u.pathname.startsWith('/api/media/')) {
                            const name = u.pathname.split('/').pop() || ''
                            if (name) {
                              await fetch(`/api/uploads/${name}`, { method: 'DELETE' })
                            }
                          }
                        } catch {}
                        setDraft({ image_url: '', thumb_url: '' })
                      }}>Clear</button>
                    )}
                  </div>
                </div>
                <div className='field'>
                  <label>Caption</label>
                  <textarea placeholder='Write a caption…' value={caption} onChange={e => setDraft({ caption: e.target.value })} rows={6} />
                </div>
                <div>
                  <button className='btn primary' onClick={publish}>Publish Image</button>
                </div>
              </div>
              <div className='publish-preview'>
                <div className='preview-card'>
                  <div className='preview-header'>@{selectedAccount.username || selectedAccount.ig_user_id}</div>
                  <div className='preview-media'>
                    {(draft.thumb_url || imageUrl) ? (
                      <img className='preview-image' src={draft.thumb_url || imageUrl} alt='Preview' />
                    ) : (
                      <div className='preview-placeholder'>No image selected</div>
                    )}
                  </div>
                  {caption && <div className='preview-caption'>{caption}</div>}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

type UploadResp = { ok?: boolean; url?: string; thumb_url?: string }
async function uploadWithProgress(file: File, onProgress: (pct: number) => void): Promise<UploadResp | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/uploads')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100)
    }
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const j = JSON.parse(xhr.responseText) as UploadResp
            resolve(j)
          } catch { resolve(null) }
        } else {
          reject(new Error(xhr.responseText || 'upload_failed'))
        }
      }
    }
    const fd = new FormData()
    fd.append('file', file)
    xhr.send(fd)
  })
}

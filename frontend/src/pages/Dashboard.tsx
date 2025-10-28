import { useEffect, useMemo, useState } from 'react'
import FileDrop from '../components/FileDrop'
import { useToast } from '../components/ToastProvider'
import usePublishStore, { initialDraft } from '../store/publish'
import useAppStore, { type AppState } from '../store/app'
import './Dashboard.css'

// IGAccount type is defined in store; local usage is via store state

export default function DashboardPage() {
  const toast = useToast()
  const currentId = usePublishStore(s => s.currentId)
  const draft = usePublishStore(s => (s.drafts[s.currentId] || initialDraft))
  const setCurrent = usePublishStore(s => s.setCurrent)
  const setDraft = usePublishStore(s => s.setDraft)
  // Use global accounts from store; toolbar keeps them fresh
  const igAccounts = useAppStore((s: AppState) => s.igAccounts)
  const selected = currentId || draft.ig_user_id
  const imageUrl = draft.image_url
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const caption = draft.caption
  const selectedAccount = useMemo(() => igAccounts.find((a: any) => a.ig_user_id === selected) || null, [igAccounts, selected])

  // Fallback: if nothing selected yet, pick the first account
  useEffect(() => {
    if (!selected && igAccounts.length) setCurrent(igAccounts[0].ig_user_id)
  }, [selected, igAccounts.length])

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
    <div className='pub-page'>
      <div>
        {selectedAccount && (
          <div className='pub-grid'>
              <section className='pub-card'>
                <h2 className='pub-title'>Publish to @{selectedAccount.username || selectedAccount.ig_user_id}</h2>
                <div className='pub-form'>
                  <div>
                    <label>Image</label>
                    <div className='pub-row'>
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
                              try { await fetch('/api/files', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(res) }) } catch {}
                            }
                          } catch (e: any) {
                            toast.show(e?.message || 'Upload failed', 'error')
                          } finally { setUploading(false) }
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
                  <div>
                    <label>Image URL</label>
                    <div className='pub-row'>
                      <input placeholder='https://...' value={imageUrl} onChange={e => setDraft({ image_url: e.target.value, thumb_url: '' })} />
                      {imageUrl && (
                        <button className='btn' onClick={async () => {
                          try {
                            const u = new URL(imageUrl, window.location.origin)
                            if (u.pathname.startsWith('/api/media/')) {
                              const name = u.pathname.split('/').pop() || ''
                              if (name) { await fetch(`/api/uploads/${name}`, { method: 'DELETE' }) }
                            }
                          } catch {}
                          setDraft({ image_url: '', thumb_url: '' })
                        }}>Clear</button>
                      )}
                    </div>
                  </div>
                  <div className='pub-caption'>
                    <label>Caption</label>
                    <textarea placeholder='Write a caption…' value={caption} onChange={e => setDraft({ caption: e.target.value })} rows={6} />
                  </div>
                  <div>
                    <button className='btn primary' onClick={publish}>Publish Image</button>
                  </div>
                </div>
              </section>
              <section className='pub-card'>
                <div className='pub-preview'>
                  <div className='pub-title'>@{selectedAccount.username || selectedAccount.ig_user_id}</div>
                  <div className='pub-media'>
                    {(draft.thumb_url || imageUrl) ? (
                      <img src={draft.thumb_url || imageUrl} alt='Preview' />
                    ) : (
                      <div className='pub-muted'>No image selected</div>
                    )}
                  </div>
                  {caption && <div style={{whiteSpace:'pre-wrap'}}>{caption}</div>}
                </div>
              </section>
          </div>
        )}
      </div>
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

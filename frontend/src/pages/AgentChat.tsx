import { useEffect, useRef, useState } from 'react'
import { useToast } from '../components/ToastProvider'
import useAppStore, { type AppState } from '../store/app'

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

export default function AgentChatPage() {
  const toast = useToast()
  const [model, setModel] = useState('')
  const agentSettings = useAppStore((s: AppState) => s.agentSettings)
  const agentSettingsLoaded = useAppStore((s: AppState) => s.agentSettingsLoaded)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'You are a helpful assistant.' },
  ])
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  // Load agent settings and last-used model
  useEffect(() => {
    // Load server settings; no hard-coded defaults
    // Use store-loaded models
    const serverModels = Array.isArray(agentSettings.models) ? agentSettings.models : []
    if (serverModels.length) {
        const local = localStorage.getItem('agent.defaultModel') || ''
        const serverDefault = agentSettings.default_model || ''
        const pick = (local && serverModels.includes(local)) ? local : (serverDefault && serverModels.includes(serverDefault) ? serverDefault : (serverModels[0] || ''))
        if (pick) {
          setModel(pick)
          localStorage.setItem('agent.defaultModel', pick)
        } else {
          setModel('')
        }
    } else {
      // If not loaded yet, try local-only for initial render; effect reruns on load
      const local = localStorage.getItem('agent.defaultModel') || ''
      if (local) setModel(local)
    }
  }, [agentSettingsLoaded, agentSettings.models, agentSettings.default_model])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/agents/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, messages: next.map(m => ({ role: m.role, content: m.content })) }) })
      if (!res.ok) {
        const txt = await res.text()
        let msg = 'Chat failed'
        try {
          const j = JSON.parse(txt)
          msg = (j?.message as string) || (j?.error as string) || msg
        } catch {
          msg = txt.slice(0, 200)
        }
        console.error('Chat error', txt)
        toast.show(msg, 'error')
        return
      }
      const j = await res.json() as { ok: boolean; text?: string }
      const reply = j?.text || '(no response)'
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (e: any) {
      console.error('Chat error', e)
      toast.show(`Chat failed: ${e?.message || 'unknown error'}`, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className='card'>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
        <h1 style={{margin:0}}>Chat Agent</h1>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={model} onChange={(e) => { const m = e.target.value; setModel(m); localStorage.setItem('agent.defaultModel', m) }}>
            {agentSettings.models.map((m: string) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{marginTop:12, display:'grid', gap:8}}>
        <div style={{border:'1px solid var(--border)', borderRadius:8, padding:12, minHeight:320, maxHeight:480, overflow:'auto', background:'var(--surface)'}}>
          {messages.map((m, i) => (
            <div key={i} style={{marginBottom:8}}>
              <div style={{fontWeight:600, color: m.role==='user' ? 'var(--primary)' : (m.role==='assistant' ? '#059669' : '#6b7280')}}>
                {m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Agent' : 'System'}
              </div>
              <div style={{whiteSpace:'pre-wrap'}}>{m.content}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div style={{display:'flex', gap:8}}>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} placeholder='Type your message…' style={{flex:1, resize:'vertical'}} />
          <div style={{display:'grid', alignContent:'end'}}>
            <button className='btn primary' disabled={sending || !input.trim()} onClick={send}>{sending ? 'Sending…' : 'Send'}</button>
          </div>
        </div>
        <div className='read-the-docs'>Ensure your Gemini API key is set under Agents → API Keys.</div>
      </div>
    </section>
  )
}

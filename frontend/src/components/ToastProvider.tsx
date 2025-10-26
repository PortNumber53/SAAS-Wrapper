import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type ToastKind = 'info' | 'success' | 'error'
export type Toast = { id: number; kind: ToastKind; message: string; timeout?: number }

type ToastCtx = {
  show: (message: string, kind?: ToastKind, timeoutMs?: number) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function useToast(): ToastCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useToast must be used within ToastProvider')
  return v
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((message: string, kind: ToastKind = 'info', timeoutMs = 4000) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((t) => [...t, { id, kind, message, timeout: timeoutMs }])
    if (timeoutMs > 0) {
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), timeoutMs)
    }
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className='toast-container' role='status' aria-live='polite'>
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span className='toast-message'>{t.message}</span>
            <button className='toast-close' aria-label='Dismiss' onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}


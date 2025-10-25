import { useEffect, useMemo, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import cloudflareLogo from './assets/Cloudflare_Logo.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [name, setName] = useState('unknown')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // Memoize same-origin target for message filtering
  const expectedOrigin = useMemo(() => window.location.origin, [])

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== expectedOrigin) return
      const msg = ev.data as any
      if (!msg || msg.type !== 'oauth:google') return
      const data = msg.data as { ok: boolean; provider: string; email?: string; error?: string }
      if (data?.ok && data.email) {
        setUserEmail(data.email)
        setAuthError(null)
      } else {
        setAuthError(data?.error || 'Authentication failed')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [expectedOrigin])

  const startGoogleLogin = () => {
    const w = 480, h = 640
    const y = window.top?.outerHeight ? Math.max(0, ((window.top!.outerHeight - h) / 2) + (window.top!.screenY || 0)) : 0
    const x = window.top?.outerWidth ? Math.max(0, ((window.top!.outerWidth - w) / 2) + (window.top!.screenX || 0)) : 0
    const url = new URL('/api/auth/google/start', window.location.origin).toString()
    // Helpful in dev to confirm the exact URL opened
    // eslint-disable-next-line no-console
    console.log('OAuth start URL:', url)
    window.open(url, '_blank', `popup=yes,width=${w},height=${h},top=${y},left=${x},noopener`)
  }

  return (
    <>
      <div>
        <a href='https://vite.dev' target='_blank'>
          <img src={viteLogo} className='logo' alt='Vite logo' />
        </a>
        <a href='https://react.dev' target='_blank'>
          <img src={reactLogo} className='logo react' alt='React logo' />
        </a>
        <a href='https://workers.cloudflare.com/' target='_blank'>
          <img src={cloudflareLogo} className='logo cloudflare' alt='Cloudflare logo' />
        </a>
      </div>
      <h1>Vite + React + Cloudflare</h1>
      <div className='card'>
        <button
          onClick={() => setCount((count) => count + 1)}
          aria-label='increment'
        >
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <div className='card'>
        <button onClick={startGoogleLogin} aria-label='google login'>
          {userEmail ? `Logged in as ${userEmail}` : 'Sign in with Google'}
        </button>
        {authError && <p style={{ color: 'tomato' }}>Error: {authError}</p>}
      </div>
      <div className='card'>
        <button
          onClick={() => {
            fetch('/api/')
              .then((res) => res.json() as Promise<{ name: string }>)
              .then((data) => setName(data.name))
          }}
          aria-label='get name'
        >
          Name from API is: {name}
        </button>
        <p>
          Edit <code>worker/index.ts</code> to change the name
        </p>
      </div>
      <p className='read-the-docs'>
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App

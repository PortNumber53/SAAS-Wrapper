import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Routes, Route, Link, useNavigate } from 'react-router-dom'
import DashboardPage from './pages/Dashboard'
import TermsPage from './pages/Terms'
import PrivacyPage from './pages/Privacy'
import ProfilePage from './pages/Profile'
import SettingsPage from './pages/Settings'
import IntegrationsPage from './pages/Integrations'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import cloudflareLogo from './assets/Cloudflare_Logo.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [name, setName] = useState('unknown')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Memoize same-origin target for message filtering
  const expectedOrigin = useMemo(() => window.location.origin, [])

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== expectedOrigin) return
      const msg = ev.data as unknown as { type?: string; data?: { ok: boolean; provider: string; email?: string; name?: string; picture?: string; error?: string } }
      if (!msg || !msg.type || !msg.type.startsWith('oauth:')) return
      const data = msg.data
      if (msg.type === 'oauth:google' && data?.ok && data.email) {
        setUserEmail(data.email)
        if (data.name) setUserName(data.name)
        if (data.picture) setUserAvatar(data.picture)
        setAuthError(null)
      } else if (msg.type === 'oauth:instagram' && data?.ok) {
        // Integration linked; nothing to update in header
        setAuthError(null)
      } else {
        setAuthError(data?.error || 'Authentication failed')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [expectedOrigin])

  // Hydrate auth state from session on first load
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((j: { ok: boolean; email?: string; name?: string; picture?: string }) => {
        if (j?.ok && j.email) {
          setUserEmail(j.email)
          if (j.name) setUserName(j.name)
          if (j.picture) setUserAvatar(j.picture)
        }
      })
      .catch(() => {})
  }, [])

  // Close account dropdown on outside click / escape
  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  const startGoogleLogin = () => {
    const w = 480, h = 640
    const y = window.top?.outerHeight ? Math.max(0, ((window.top!.outerHeight - h) / 2) + (window.top!.screenY || 0)) : 0
    const x = window.top?.outerWidth ? Math.max(0, ((window.top!.outerWidth - w) / 2) + (window.top!.screenX || 0)) : 0
    const url = new URL('/api/auth/google/start', window.location.origin).toString()
    // Helpful in dev to confirm the exact URL opened
    console.log('OAuth start URL:', url)
    // Note: don't use `noopener` here since we rely on window.opener for postMessage
    window.open(url, '_blank', `popup=yes,width=${w},height=${h},top=${y},left=${x}`)
  }

  const displayName = userName || userEmail || 'Account'
  const initials = useMemo(() => {
    const src = (userName && userName.trim()) || userEmail || ''
    if (!src) return '🙂'
    const parts = src.replace(/[^\p{L} \-]/gu, '').trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    if (parts.length === 1 && parts[0]) return parts[0].slice(0,2).toUpperCase()
    // Fallback from email like name@example.com
    const m = (userEmail || '').split('@')[0]
    return m.slice(0,2).toUpperCase() || '🙂'
  }, [userName, userEmail])

  return (
    <div className='layout'>
      <header className='topbar'>
        <div className='brand'><NavLink to='/'>SAAS Wrapper</NavLink></div>
        {!userEmail ? (
          <nav className='mainnav' aria-label='Main'>
            <NavLink to='/' end>Home</NavLink>
            <NavLink to='/features'>Features</NavLink>
            <NavLink to='/pricing'>Pricing</NavLink>
            <NavLink to='/about'>About</NavLink>
          </nav>
        ) : (
          <div className='toolbar' aria-label='User Toolbar'>
            <div className='menu'>
              <button>Manage Content ▾</button>
              <div className='menu-dropdown'>
                <NavLink to='/dashboard'>Dashboard</NavLink>
                <NavLink to='/account/integrations'>Integrations</NavLink>
                <button onClick={async () => {
                  try {
                    const res = await fetch('/api/ig/sync-content', { method: 'POST' })
                    if (!res.ok) {
                      const t = await res.text()
                      alert(`Sync failed: ${t}`)
                      return
                    }
                    const j = await res.json() as any
                    const total = j && j.counts ? Object.values(j.counts).reduce((a: number, b: any) => a + (Number(b)||0), 0) : 0
                    alert(`Fetched ${total} items across linked IG accounts`)
                  } catch (e) {
                    alert('Sync failed')
                  }
                }}>Fetch IG Content</button>
                {/* Additional content management links can be added here */}
              </div>
            </div>
          </div>
        )}
        <div className='account'>
          {!userEmail ? (
            <>
              <button className='btn' onClick={startGoogleLogin}>Login</button>
              <button className='btn primary' onClick={startGoogleLogin}>Sign Up</button>
            </>
          ) : (
            <div className='user-menu' ref={menuRef} onMouseEnter={() => setMenuOpen(true)} onMouseLeave={() => setMenuOpen(false)}>
              <button className='user-button' aria-haspopup='menu' aria-expanded={menuOpen} onClick={() => navigate('/dashboard')}>
                {userAvatar && !avatarFailed ? (
                  <img
                    className='avatar'
                    src={userAvatar}
                    alt=''
                    loading='lazy'
                    decoding='async'
                    referrerPolicy='no-referrer'
                    onError={() => { setAvatarFailed(true); setUserAvatar(null) }}
                  />
                ) : (
                  <div className='avatar fallback' aria-hidden>{initials}</div>
                )}
                <span>{displayName}</span>
              </button>
              {menuOpen && (
                <div className='user-dropdown' role='menu'>
                  <NavLink to='/dashboard' role='menuitem' onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
                  <NavLink to='/profile' role='menuitem' onClick={() => setMenuOpen(false)}>Profile</NavLink>
                  <NavLink to='/settings' role='menuitem' onClick={() => setMenuOpen(false)}>Settings</NavLink>
                  <NavLink to='/account/integrations' role='menuitem' onClick={() => setMenuOpen(false)}>Integrations</NavLink>
                  <button role='menuitem' onClick={() => {
                    fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
                      setUserEmail(null); setUserName(null); setUserAvatar(null); setMenuOpen(false)
                    })
                  }}>Logout</button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className={`content${userEmail ? ' wide' : ''}`}>
      <Routes>
        <Route path='/' element={
          <>
            <section>
              <a href='https://vite.dev' target='_blank' rel='noreferrer'>
                <img src={viteLogo} className='logo' alt='Vite logo' />
              </a>
              <a href='https://react.dev' target='_blank' rel='noreferrer'>
                <img src={reactLogo} className='logo react' alt='React logo' />
              </a>
              <a href='https://workers.cloudflare.com/' target='_blank' rel='noreferrer'>
                <img src={cloudflareLogo} className='logo cloudflare' alt='Cloudflare logo' />
              </a>
            </section>
            <h1>Vite + React + Cloudflare</h1>
            <div className='card'>
              <button onClick={() => setCount((count) => count + 1)} aria-label='increment'>
                count is {count}
              </button>
              <p> Edit <code>src/App.tsx</code> and save to test HMR </p>
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
              <p> Edit <code>worker/index.ts</code> to change the name </p>
            </div>
          </>
        } />
        <Route path='/features' element={
          <section className='card'>
            <h2>Features</h2>
            <p>Modern React frontend hosted on Cloudflare Workers with OAuth and API proxying.</p>
          </section>
        } />
        <Route path='/pricing' element={
          <section className='card'>
            <h2>Pricing</h2>
            <p>Contact us to discuss plans and usage-based pricing.</p>
          </section>
        } />
        <Route path='/about' element={
          <section className='card'>
            <h2>About</h2>
            <p>This is a starter template showcasing Vite, React and Cloudflare Workers.</p>
          </section>
        } />
        <Route path='/pages/terms-of-service' element={<TermsPage />} />
        <Route path='/pages/privacy-policy' element={<PrivacyPage />} />
        <Route path='/profile' element={<ProfilePage />} />
        <Route path='/settings' element={<SettingsPage />} />
        <Route path='/dashboard' element={<DashboardPage />} />
        <Route path='/account/integrations' element={<IntegrationsPage />} />
        <Route path='*' element={
          <section className='card'>
            <h2>404 — Page Not Found</h2>
            <p>We couldn’t find what you’re looking for.</p>
            <p><Link to='/'>Go back home</Link></p>
          </section>
        } />
      </Routes>
      </main>
      <footer className='footer'>
        <div style={{display:'flex',justifyContent:'space-between',gap:'1rem',maxWidth:1100,margin:'0 auto'}}>
          <span>© {new Date().getFullYear()} SAAS Wrapper</span>
          <span>
            <Link to='/pages/terms-of-service'>Terms</Link>
            {' · '}
            <Link to='/pages/privacy-policy'>Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App

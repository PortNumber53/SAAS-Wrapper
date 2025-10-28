import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'
import { useToast } from './components/ToastProvider'
import IGContentPage from './pages/IGContent'
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
import AgentChatPage from './pages/AgentChat'
import AgentSettingsPage from './pages/AgentSettings'
import useAppStore, { type AppState } from './store/app'
import usePublishStore from './store/publish'

function App() {
  const toast = useToast()
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
  const resetOnLogout = useAppStore((s: AppState) => s.resetOnLogout)
  const resetDraftSession = usePublishStore(s => s.resetSession)
  const storeLoadSession = useAppStore((s: AppState) => s.loadSession)
  const storeSessionOk = useAppStore((s: AppState) => !!s.session?.ok)
  const igAccounts = useAppStore((s: AppState) => s.igAccounts)
  const igAccountsLoaded = useAppStore((s: AppState) => s.igAccountsLoaded)
  const loadIGAccounts = useAppStore((s: AppState) => s.loadIGAccounts)
  const setPublishCurrent = usePublishStore(s => s.setCurrent)
  const currentPublishId = usePublishStore(s => s.currentId)

  // Memoize same-origin target for message filtering
  const expectedOrigin = useMemo(() => window.location.origin, [])

  useEffect(() => {
    const onMessage = async (ev: MessageEvent) => {
      if (ev.origin !== expectedOrigin) return
      const msg = ev.data as unknown as { type?: string; data?: { ok: boolean; provider: string; email?: string; name?: string; picture?: string; error?: string } }
      if (!msg || !msg.type || !msg.type.startsWith('oauth:')) return
      const data = msg.data
      if (msg.type === 'oauth:google' && data?.ok && data.email) {
        setUserEmail(data.email)
        if (data.name) setUserName(data.name)
        if (data.picture) setUserAvatar(data.picture)
        setAuthError(null)
        // Refresh the app store session after OAuth completes
        try {
          await storeLoadSession()
          // Ensure guard sees authenticated session before navigating
          const st = useAppStore.getState() as AppState
          if (st.session?.ok) navigate('/dashboard')
        } catch {
          // Fallback: small delay then re-check
          setTimeout(() => {
            const st = useAppStore.getState() as AppState
            if (st.session?.ok) navigate('/dashboard')
          }, 100)
        }
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

  // Opportunistically refresh session on window focus if not authenticated yet
  useEffect(() => {
    const onFocus = () => { if (!storeSessionOk) storeLoadSession() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [storeSessionOk])

  // Ensure IG accounts are loaded when session is authenticated
  useEffect(() => {
    if (storeSessionOk && !igAccountsLoaded) {
      loadIGAccounts()
    }
  }, [storeSessionOk, igAccountsLoaded])

  // Reflect store session into header display
  const storeSession = useAppStore((s: AppState) => s.session)
  useEffect(() => {
    if (storeSession?.ok) {
      setUserEmail(storeSession.email || null)
      setUserName((storeSession as any).name || null)
      setUserAvatar((storeSession as any).picture || null)
    } else {
      setUserEmail(null); setUserName(null); setUserAvatar(null)
    }
  }, [storeSession?.ok, (storeSession as any)?.email, (storeSession as any)?.name, (storeSession as any)?.picture])

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
    const start = new URL('/api/auth/google/start', window.location.origin)
    start.searchParams.set('origin', window.location.origin)
    const url = start.toString()
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
        <div className='toolbar' aria-label='Global Toolbar'>
          <div className='toolbar-group'>
            <NavLink to='/' className={({isActive}) => `toolbar-link brand${isActive ? ' active' : ''}`}>SAAS Wrapper</NavLink>
            { !userEmail ? (
              <>
                <NavLink to='/' end className={({isActive}) => `toolbar-link${isActive ? ' active' : ''}`}>Home</NavLink>
                <NavLink to='/features' className={({isActive}) => `toolbar-link${isActive ? ' active' : ''}`}>Features</NavLink>
                <NavLink to='/pricing' className={({isActive}) => `toolbar-link${isActive ? ' active' : ''}`}>Pricing</NavLink>
                <NavLink to='/about' className={({isActive}) => `toolbar-link${isActive ? ' active' : ''}`}>About</NavLink>
              </>
            ) : (
              <>
                <NavLink to='/dashboard' className={({isActive}) => `toolbar-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
                <div className='menu'>
                  <button>Content ▾</button>
                  <div className='menu-dropdown'>
                    <NavLink to='/content/instagram'>View IG Content</NavLink>
                    <button onClick={async (e) => {
                      const btn = e.currentTarget as HTMLButtonElement;
                      const prev = btn.textContent;
                      btn.disabled = true;
                      btn.textContent = 'Fetching…';
                      try {
                        const res = await fetch('/api/ig/sync-content', { method: 'POST' });
                        if (!res.ok) {
                          const t = await res.text();
                          toast.show(`Sync failed: ${t}`, 'error');
                          return;
                        }
                        const j = await res.json() as any;
                        const total = j && j.counts ? Object.values(j.counts).reduce((a: number, b: any) => a + (Number(b)||0), 0) : 0;
                        toast.show(`Fetched ${total} items across linked IG accounts`, 'success');
                      } catch (e) {
                        toast.show('Sync failed', 'error');
                      } finally {
                        btn.disabled = false;
                        btn.textContent = prev || 'Fetch IG Content';
                      }
                    }}>Fetch IG Content</button>
                  </div>
                </div>
                {/* Accounts moved next to user menu */}
                <div className='menu'>
                  <button>Agents ▾</button>
                  <div className='menu-dropdown'>
                    <NavLink to='/agents/chat'>Chat Agent</NavLink>
                  </div>
                </div>
                {/* Removed top-level Settings menu (moved items under User Account) */}
                {/* Push Social Accounts to the right within the group */}
                <div className='toolbar-spacer' />
                <div className='menu'>
                  <button>Social Accounts ▾</button>
                  <div className='menu-dropdown'>
                    { (!igAccountsLoaded && igAccounts.length === 0) && <span className='read-the-docs' style={{display:'block',padding:'8px 12px'}}>Loading…</span> }
                    { igAccountsLoaded && igAccounts.length === 0 && (
                      <div className='read-the-docs' style={{padding:'8px 12px'}}>No IG accounts.
                        <div><NavLink to='/account/integrations'>Manage Integrations</NavLink></div>
                      </div>
                    )}
                    { igAccounts.length > 0 && igAccounts.map((acc: any) => {
                      const disabled = !acc.token_valid || acc.linked === false;
                      return (
                        <button
                          key={acc.ig_user_id}
                          disabled={disabled}
                          className={acc.ig_user_id === currentPublishId ? 'active' : undefined}
                          onClick={() => {
                            setPublishCurrent(acc.ig_user_id);
                            navigate('/dashboard')
                          }}
                        >
                          @{acc.username || acc.ig_user_id}
                        </button>
                      )
                    }) }
                  </div>
                </div>
              </>
            )}
          </div>
          <div className='account'>
            { !userEmail ? (
              <>
                <button className='btn' onClick={startGoogleLogin}>Login</button>
                <button className='btn primary' onClick={startGoogleLogin}>Sign Up</button>
              </>
            ) : (
              <div className='user-menu' ref={menuRef} onMouseEnter={() => setMenuOpen(true)} onMouseLeave={() => setMenuOpen(false)}>
                <button className='user-button' aria-haspopup='menu' aria-expanded={menuOpen} onClick={() => navigate('/dashboard')}>
                  {userAvatar && !avatarFailed ? (
                    <img className='avatar' src={userAvatar} alt='' loading='lazy' decoding='async' referrerPolicy='no-referrer' onError={() => { setAvatarFailed(true); setUserAvatar(null) }} />
                  ) : (
                    <div className='avatar fallback' aria-hidden>{initials}</div>
                  )}
                  <span>{displayName}</span>
                </button>
                {menuOpen && (
                  <div className='user-dropdown' role='menu'>
                    <NavLink to='/profile' role='menuitem' onClick={() => setMenuOpen(false)}>Profile</NavLink>
                    <NavLink to='/settings' role='menuitem' onClick={() => setMenuOpen(false)}>Settings</NavLink>
                    <NavLink to='/agents/settings' role='menuitem' onClick={() => setMenuOpen(false)}>Agent Settings</NavLink>
                    <NavLink to='/account/integrations' role='menuitem' onClick={() => setMenuOpen(false)}>Integrations</NavLink>
                    <button role='menuitem' onClick={() => {
                      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
                        setUserEmail(null); setUserName(null); setUserAvatar(null); setMenuOpen(false);
                        resetOnLogout(); resetDraftSession();
                        navigate('/');
                      })
                    }}>Logout</button>
                  </div>
                )}
              </div>
            )}
          </div>
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
        <Route path='/settings' element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path='/dashboard' element={<RequireAuth><DashboardPage /></RequireAuth>} />
        {/* Common typo alias */}
        <Route path='/dashbord' element={<Navigate to='/dashboard' replace />} />
        <Route path='/content/instagram' element={<RequireAuth><IGContentPage /></RequireAuth>} />
        <Route path='/agents/chat' element={<RequireAuth><AgentChatPage /></RequireAuth>} />
        <Route path='/agents/settings' element={<RequireAuth><AgentSettingsPage /></RequireAuth>} />
        <Route path='/account/integrations' element={<RequireAuth><IntegrationsPage /></RequireAuth>} />
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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useAppStore((s: AppState) => s.session)
  const loaded = useAppStore((s: AppState) => s.sessionLoaded)
  if (!loaded) return <section className='card'><p>Checking session…</p></section>
  if (!session?.ok) return <Navigate to='/' replace />
  return <>{children}</>
}

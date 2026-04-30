import { useState, useEffect } from 'react'
import './index.css'
import { setToken } from './lib/sheets'
import Sidebar from './components/Sidebar'
import OrdersPage from './pages/Orders'
import CataloguePage from './pages/Catalogue'
import FeedsPage from './pages/Feeds'
import MarginsPage from './pages/Margins'

// Google OAuth client ID — replace with yours from Google Cloud Console
// Scopes needed: https://www.googleapis.com/auth/spreadsheets
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE'
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets'

export default function App() {
  const [token, setTokenState] = useState(null)
  const [user, setUser]        = useState(null)
  const [page, setPage]        = useState('orders')
  const [orderCount, setOrderCount] = useState(0)

  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    document.head.appendChild(script)
  }, [])

  function signIn() {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { console.error(resp); return }
        setToken(resp.access_token)
        setTokenState(resp.access_token)
        // Get basic user info
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${resp.access_token}` }
        }).then(r => r.json()).then(info => setUser(info))
      },
    })
    client.requestAccessToken()
  }

  function signOut() {
    window.google.accounts.oauth2.revoke(token, () => {
      setTokenState(null)
      setUser(null)
      setToken(null)
    })
  }

  if (!token) return <LoginScreen onSignIn={signIn} />

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar page={page} setPage={setPage} orderCount={orderCount} />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{
          height: 'var(--topbar-h)',
          background: 'var(--surface)',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 24px',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {user.picture && <img src={user.picture} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />}
              <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{user.email}</span>
            </div>
          )}
          <button onClick={signOut} style={{
            border: '0.5px solid var(--border-md)',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: 12,
            background: 'transparent',
            color: 'var(--text-2)',
            cursor: 'pointer',
          }}>Sign out</button>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {page === 'orders'    && <OrdersPage    token={token} />}
          {page === 'catalogue' && <CataloguePage token={token} />}
          {page === 'feeds'     && <FeedsPage />}
          {page === 'margins'   && <MarginsPage />}
        </main>
      </div>
    </div>
  )
}

function LoginScreen({ onSignIn }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--oak-dark)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#1e3520',
        border: '0.5px solid rgba(125,184,42,0.2)',
        borderRadius: 16,
        padding: '48px 56px',
        textAlign: 'center',
        maxWidth: 380,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🌳</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '0.02em' }}>
          Oakridge Goods
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 36, fontFamily: 'var(--font-mono)' }}>
          Operations Dashboard
        </div>
        <button onClick={onSignIn} style={{
          background: 'var(--oak-lime)',
          border: 'none',
          borderRadius: 8,
          padding: '11px 28px',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--oak-dark)',
          cursor: 'pointer',
          width: '100%',
          fontFamily: 'var(--font-sans)',
          letterSpacing: '0.01em',
        }}>
          Sign in with Google
        </button>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 20, lineHeight: 1.6 }}>
          Uses Google OAuth to access your Sheets.<br />
          No data is stored outside your Google account.
        </div>
      </div>
    </div>
  )
}

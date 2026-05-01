import { useState } from 'react'

const NAV = [
  { section: 'Operations' },
  { id: 'orders',    label: 'Orders',          icon: '📦', badge: null },
  { id: 'catalogue', label: 'Catalogue',        icon: '🗂️', badge: null },
  { section: 'Tools' },
  { id: 'feeds',     label: 'Feeds & Scripts',  icon: '⚡', badge: null },
  { id: 'margins',   label: 'Margin Calc',      icon: '🧮', badge: null },
  { id: 'logs',      label: 'Script Logs',      icon: '📋', badge: null },
  { section: 'Coming Soon' },
  { id: 'reports',   label: 'Reports',          icon: '📊', badge: null, soon: true },
  { id: 'suppliers', label: 'Suppliers',        icon: '🏭', badge: null, soon: true },
]

export default function Sidebar({ page, setPage, orderCount }) {
  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      background: 'var(--oak-dark)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '18px 16px 14px',
        borderBottom: '0.5px solid var(--oak-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--oak-mid)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}>🌳</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '0.03em' }}>
            Oakridge Goods
          </div>
          <div style={{ fontSize: 10, color: 'var(--oak-muted)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
            ops dashboard
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '10px 8px', flex: 1 }}>
        {NAV.map((item, i) => {
          if (item.section) return (
            <div key={i} style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.22)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              padding: '14px 10px 6px',
            }}>{item.section}</div>
          )

          const active = page === item.id
          const badge = item.id === 'orders' && orderCount > 0 ? orderCount : item.badge

          return (
            <button
              key={item.id}
              onClick={() => !item.soon && setPage(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: 7,
                border: 'none',
                background: active ? 'rgba(125,184,42,0.15)' : 'transparent',
                cursor: item.soon ? 'default' : 'pointer',
                marginBottom: 2,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!active && !item.soon) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: active ? 'var(--oak-lime)' : item.soon ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.65)',
                }}>{item.label}</span>
              </div>
              {badge != null && (
                <span style={{
                  fontSize: 11,
                  background: 'var(--oak-lime)',
                  color: 'var(--oak-dark)',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontWeight: 600,
                  minWidth: 20,
                  textAlign: 'center',
                }}>{badge}</span>
              )}
              {item.soon && (
                <span style={{
                  fontSize: 10,
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.3)',
                  borderRadius: 4,
                  padding: '1px 6px',
                }}>soon</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '0.5px solid var(--oak-border)',
      }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>
          v0.1.0 · admin@oakridgegoods.com.au
        </div>
      </div>
    </aside>
  )
}
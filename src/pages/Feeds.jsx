import { useState } from 'react'
import { SCRIPTS } from '../lib/config'
import { runScript } from '../lib/sheets'
import { Btn, Card, PageHeader } from '../components/UI'

const FEED_DEFS = [
  {
    id: 'pullEbayOrders',
    label: 'Pull eBay Orders',
    desc: 'Sync latest eBay orders into the eBay download sheet via eBay API.',
    icon: '📥',
    category: 'Orders',
    scriptKey: 'pullEbayOrders',
  },
  {
    id: 'pullAmazonOrders',
    label: 'Pull Amazon Orders',
    desc: 'Sync latest Amazon orders into the Amazon download sheet via SP-API.',
    icon: '📥',
    category: 'Orders',
    scriptKey: 'pullAmazonOrders',
  },
  {
    id: 'compileOrders',
    label: 'Compile All Orders',
    desc: 'Pull eBay + Amazon orders into the compiled AllOrders hub sheet.',
    icon: '🔀',
    category: 'Orders',
    scriptKey: 'compileOrders',
  },
  {
    id: 'pushTrackingEbay',
    label: 'Push Tracking → eBay',
    desc: 'Push all tracking numbers from AllOrders back to eBay Fulfillment API.',
    icon: '📤',
    category: 'Orders',
    scriptKey: 'pushTrackingEbay',
  },
  {
    id: 'pushTrackingAmazon',
    label: 'Push Tracking → Amazon',
    desc: 'Push all tracking numbers from AllOrders back to Amazon SP-API.',
    icon: '📤',
    category: 'Orders',
    scriptKey: 'pushTrackingAmazon',
  },
  {
    id: 'generateEbayRevise',
    label: 'Generate eBay Revise CSV',
    desc: 'Build the eBay File Exchange Revise CSV from the Masterfeed catalogue.',
    icon: '📝',
    category: 'Catalogue',
    scriptKey: 'generateEbayRevise',
  },
  {
    id: 'rubiesSync',
    label: 'Rubies Deerfield Sync',
    desc: 'Check Rubies Deerfield stock levels and update eBay listings accordingly.',
    icon: '🏭',
    category: 'Suppliers',
    scriptKey: null,
    soon: true,
  },
]

const CATEGORIES = ['Orders', 'Catalogue', 'Suppliers']

export default function FeedsPage() {
  const [status, setStatus] = useState({}) // {id: 'idle'|'running'|'done'|'error'}
  const [logs, setLogs]     = useState([])

  async function run(feed) {
    if (feed.soon) return
    const url = SCRIPTS[feed.scriptKey]
    if (!url) {
      setStatus(s => ({ ...s, [feed.id]: 'error' }))
      addLog(feed.label, 'error', 'Script URL not configured in src/lib/config.js')
      return
    }
    setStatus(s => ({ ...s, [feed.id]: 'running' }))
    addLog(feed.label, 'info', 'Running...')
    try {
      const res = await runScript(url)
      setStatus(s => ({ ...s, [feed.id]: 'done' }))
      addLog(feed.label, 'success', res.message || 'Complete')
      setTimeout(() => setStatus(s => ({ ...s, [feed.id]: 'idle' })), 3000)
    } catch (e) {
      setStatus(s => ({ ...s, [feed.id]: 'error' }))
      addLog(feed.label, 'error', e.message)
    }
  }

  function addLog(label, type, message) {
    const time = new Date().toLocaleTimeString('en-AU')
    setLogs(l => [{ time, label, type, message }, ...l].slice(0, 50))
  }

  return (
    <div>
      <PageHeader title="Feeds & Scripts">
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Scripts run against your Google Sheets backend via Apps Script</span>
      </PageHeader>

      {CATEGORIES.map(cat => {
        const feeds = FEED_DEFS.filter(f => f.category === cat)
        return (
          <div key={cat} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              {cat}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {feeds.map(f => {
                const st = status[f.id] || 'idle'
                const hasUrl = f.scriptKey && SCRIPTS[f.scriptKey]
                return (
                  <div key={f.id} style={{
                    background: 'var(--surface)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{f.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.label}</span>
                      </div>
                      <StatusDot status={f.soon ? 'soon' : hasUrl ? 'ready' : 'unconfigured'} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{f.desc}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      {f.soon ? (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--bg)', borderRadius: 4, padding: '3px 8px' }}>Not built yet</span>
                      ) : (
                        <Btn
                          size="sm"
                          variant={st === 'done' ? 'default' : 'primary'}
                          disabled={st === 'running'}
                          onClick={() => run(f)}
                        >
                          {st === 'running' ? 'Running…' : st === 'done' ? '✓ Done' : st === 'error' ? '⚠ Retry' : 'Run ↗'}
                        </Btn>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Run log */}
      {logs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Run Log
          </div>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {logs.map((l, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 12,
                padding: '8px 14px',
                borderBottom: i < logs.length - 1 ? '0.5px solid var(--border)' : 'none',
                fontSize: 12,
                alignItems: 'center',
              }}>
                <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11, flexShrink: 0 }}>{l.time}</span>
                <span style={{ fontWeight: 500, flexShrink: 0, minWidth: 160 }}>{l.label}</span>
                <span style={{
                  color: l.type === 'error' ? '#8b1a1a' : l.type === 'success' ? '#2d5a0e' : 'var(--text-2)'
                }}>{l.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusDot({ status }) {
  const configs = {
    ready:        { color: '#22c55e', label: 'Ready' },
    unconfigured: { color: '#f59e0b', label: 'URL needed' },
    soon:         { color: '#a78bfa', label: 'Coming soon' },
  }
  const c = configs[status] || configs.ready
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{c.label}</span>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { SCRIPTS, SHEETS, MASTER_LOG_GID } from '../lib/config'
import { runScript, getToken } from '../lib/sheets'
import { Btn, PageHeader, Badge } from '../components/UI'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

const FEED_DEFS = [
  { id: 'syncEbayOrdersToSheet',         label: 'Download eBay Orders',       desc: 'Pull latest eBay orders into the eBay download sheet via eBay API.',                icon: '📥', category: 'Download',  scriptKey: 'pullEbayOrders'      },
  { id: 'spSyncOrdersFlat',              label: 'Download Amazon Orders',      desc: 'Pull latest Amazon orders into the Amazon download sheet via SP-API.',              icon: '📥', category: 'Download',  scriptKey: 'pullAmazonOrders'    },
  { id: 'pullEbayIntoAllOrders',         label: 'Compile eBay → AllOrders',    desc: 'Pull eBay orders from download sheet into the compiled AllOrders hub.',            icon: '🔀', category: 'Compile',   scriptKey: 'compileOrders'       },
  { id: 'pullAmazonIntoAllOrders',       label: 'Compile Amazon → AllOrders',  desc: 'Pull Amazon orders from download sheet into the compiled AllOrders hub.',          icon: '🔀', category: 'Compile',   scriptKey: 'compileAmazonOrders' },
  { id: 'pushTrackingToEbayFromSheet',   label: 'Push Tracking → eBay',        desc: 'Push all saved tracking numbers from AllOrders back to eBay Fulfillment API.',     icon: '📤', category: 'Tracking',  scriptKey: 'pushTrackingEbay'    },
  { id: 'pushTrackingToAmazonFromSheet', label: 'Push Tracking → Amazon',      desc: 'Push all saved tracking numbers from AllOrders back to Amazon SP-API.',            icon: '📤', category: 'Tracking',  scriptKey: 'pushTrackingAmazon'  },
  { id: 'ebayUpdatePriceOnly',           label: 'Update eBay Prices',          desc: 'Push updated prices from Masterfeed to eBay listings via API.',                    icon: '💲', category: 'Catalogue', scriptKey: 'ebayUpdatePrice'     },
  { id: 'ebayUpdateStockByItemID',       label: 'Update eBay Stock',           desc: 'Push current stock quantities from Masterfeed to eBay listings via API.',          icon: '📦', category: 'Catalogue', scriptKey: 'ebayUpdateStock'     },
  { id: 'syncRubiesStock',               label: 'Rubies Deerfield Stock Sync', desc: 'Check Rubies Deerfield stock levels and update eBay listings accordingly.',        icon: '🏭', category: 'Suppliers', scriptKey: 'rubiesSync'          },
]

const CATEGORIES = ['Download', 'Compile', 'Tracking', 'Catalogue', 'Suppliers']

function statusBadgeType(status) {
  const s = (status || '').toLowerCase()
  if (s === 'success' || s === 'ok' || s === 'complete' || s === 'done') return 'success'
  if (s === 'error' || s === 'fail' || s === 'failed' || s === 'err') return 'danger'
  if (s === 'warning' || s === 'warn' || s === 'skip' || s === 'skipped') return 'warning'
  return 'info'
}

export default function FeedsPage({ token }) {
  const [status, setStatus]         = useState({})
  const [logEntries, setLogEntries] = useState([])
  const [logLoading, setLogLoading] = useState(false)
  const [logError, setLogError]     = useState(null)
  const [logTabName, setLogTabName] = useState(null)
  const [lastRun, setLastRun]       = useState(null)   // { label, time }
  const [polling, setPolling]       = useState(false)

  // Resolve the master log tab name from gid once we have a token
  const resolveTabAndLoad = useCallback(async () => {
    if (!getToken()) return
    setLogLoading(true)
    setLogError(null)
    try {
      let tabName = logTabName
      if (!tabName) {
        const meta = await fetch(`${SHEETS_API}/${SHEETS.masterLogs}`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        }).then(r => r.json())
        const sheet = meta.sheets?.find(s => s.properties.sheetId === MASTER_LOG_GID)
        tabName = sheet?.properties?.title || null
        if (!tabName) throw new Error('Could not find log tab — check MASTER_LOG_GID in config.js')
        setLogTabName(tabName)
      }

      const range    = encodeURIComponent(`${tabName}!A:F`)
      const data     = await fetch(`${SHEETS_API}/${SHEETS.masterLogs}/values/${range}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      }).then(r => r.json())

      if (data.error) throw new Error(data.error.message)
      const values = data.values || []
      if (values.length < 2) { setLogEntries([]); return }
      const [headers, ...rows] = values
      const entries = rows
        .filter(r => r.some(c => c !== ''))
        .map(row => {
          const obj = {}
          headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
          return obj
        })
      // Newest first
      setLogEntries(entries.reverse())
    } catch (e) {
      setLogError(e.message)
    } finally {
      setLogLoading(false)
      setPolling(false)
    }
  }, [logTabName])

  useEffect(() => { if (token) resolveTabAndLoad() }, [token])

  async function run(feed) {
    const url = SCRIPTS[feed.scriptKey]
    if (!url) {
      setStatus(s => ({ ...s, [feed.id]: 'error' }))
      return
    }
    setStatus(s => ({ ...s, [feed.id]: 'running' }))
    setLastRun({ label: feed.label, time: new Date().toLocaleTimeString('en-AU') })
    try {
      await runScript(url)
      setStatus(s => ({ ...s, [feed.id]: 'done' }))
      setTimeout(() => setStatus(s => ({ ...s, [feed.id]: 'idle' })), 4000)
    } catch (e) {
      setStatus(s => ({ ...s, [feed.id]: 'error' }))
    }
    // Wait 6s for the Apps Script to run and log, then refresh
    setPolling(true)
    setTimeout(() => resolveTabAndLoad(), 6000)
  }

  return (
    <div style={{ display: 'flex', gap: 20, minHeight: 'calc(100vh - 52px - 48px)' }}>

      {/* Feed cards */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <PageHeader title="Feeds & Scripts" />

        {CATEGORIES.map(cat => {
          const feeds = FEED_DEFS.filter(f => f.category === cat)
          return (
            <div key={cat} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                {cat}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {feeds.map(f => {
                  const st     = status[f.id] || 'idle'
                  const hasUrl = f.scriptKey && SCRIPTS[f.scriptKey]
                  const dotColor = hasUrl ? '#22c55e' : '#f59e0b'
                  return (
                    <div key={f.id} style={{
                      background: 'var(--surface)', border: '0.5px solid var(--border)',
                      borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{f.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
                          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{hasUrl ? 'Ready' : 'URL needed'}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{f.desc}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{f.id}</span>
                        <Btn size="sm" variant={st === 'done' ? 'default' : 'primary'} disabled={st === 'running' || !hasUrl} onClick={() => run(f)}>
                          {st === 'running' ? 'Triggering…' : st === 'done' ? '✓ Triggered' : st === 'error' ? '⚠ Retry' : 'Run ↗'}
                        </Btn>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Right panel: live masterlog */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 2 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Script Log
          </div>
          <button onClick={resolveTabAndLoad} style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer' }}>
            ↻
          </button>
        </div>

        {lastRun && (
          <div style={{ background: polling ? 'rgba(125,184,42,0.08)' : 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 11 }}>
            <span style={{ color: 'var(--text-3)' }}>Last triggered: </span>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{lastRun.label}</span>
            <span style={{ color: 'var(--text-3)' }}> at {lastRun.time}</span>
            {polling && <div style={{ color: 'var(--oak-mid)', marginTop: 3 }}>Checking logs in a moment…</div>}
          </div>
        )}

        {logError && (
          <div style={{ background: '#fde8e8', border: '0.5px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 11, color: '#8b1a1a' }}>
            ⚠ {logError}
          </div>
        )}

        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', flex: 1, overflowY: 'auto' }}>
          {!token ? (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>Sign in to view logs</div>
          ) : logLoading ? (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>Loading…</div>
          ) : logEntries.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>No log entries yet</div>
          ) : (
            logEntries.slice(0, 30).map((l, i) => (
              <div key={i} style={{
                padding: '9px 12px',
                borderBottom: i < Math.min(logEntries.length, 30) - 1 ? '0.5px solid var(--border)' : 'none',
                borderLeft: `3px solid ${statusBadgeType(l.Status) === 'danger' ? '#fca5a5' : statusBadgeType(l.Status) === 'success' ? 'var(--oak-lime)' : statusBadgeType(l.Status) === 'warning' ? '#f59e0b' : 'var(--border)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, gap: 4 }}>
                  <Badge type={statusBadgeType(l.Status)}>{l.Status || '—'}</Badge>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                    {(l.Timestamp || '').slice(5, 16)}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text)', marginBottom: 1 }}>
                  {l.Script || '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{l.Function || ''}</div>
                {l.SKU && <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{l.SKU}</div>}
                {l.Details && (
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.Details}>
                    {l.Details}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}
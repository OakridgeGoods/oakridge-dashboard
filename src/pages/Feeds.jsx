import { useState } from 'react'
import { SCRIPTS } from '../lib/config'
import { runScript } from '../lib/sheets'
import { Btn, PageHeader } from '../components/UI'

const FEED_DEFS = [
  { id: 'syncEbayOrdersToSheet',      label: 'Download eBay Orders',       desc: 'Pull latest eBay orders into the eBay download sheet via eBay API.',                         icon: '📥', category: 'Download',  scriptKey: 'pullEbayOrders'     },
  { id: 'spSyncOrdersFlat',           label: 'Download Amazon Orders',      desc: 'Pull latest Amazon orders into the Amazon download sheet via SP-API.',                       icon: '📥', category: 'Download',  scriptKey: 'pullAmazonOrders'   },
  { id: 'pullEbayIntoAllOrders',      label: 'Compile eBay → AllOrders',    desc: 'Pull eBay orders from download sheet into the compiled AllOrders hub.',                      icon: '🔀', category: 'Compile',   scriptKey: 'compileOrders'      },
  { id: 'pullAmazonIntoAllOrders',    label: 'Compile Amazon → AllOrders',  desc: 'Pull Amazon orders from download sheet into the compiled AllOrders hub.',                    icon: '🔀', category: 'Compile',   scriptKey: 'compileAmazonOrders'},
  { id: 'pushTrackingToEbayFromSheet',   label: 'Push Tracking → eBay',     desc: 'Push all saved tracking numbers from AllOrders back to eBay Fulfillment API.',              icon: '📤', category: 'Tracking',  scriptKey: 'pushTrackingEbay'   },
  { id: 'pushTrackingToAmazonFromSheet', label: 'Push Tracking → Amazon',   desc: 'Push all saved tracking numbers from AllOrders back to Amazon SP-API.',                     icon: '📤', category: 'Tracking',  scriptKey: 'pushTrackingAmazon' },
  { id: 'ebayUpdatePriceOnly',        label: 'Update eBay Prices',          desc: 'Push updated prices from Masterfeed to eBay listings via API.',                             icon: '💲', category: 'Catalogue', scriptKey: 'ebayUpdatePrice'    },
  { id: 'ebayUpdateStockByItemID',    label: 'Update eBay Stock',           desc: 'Push current stock quantities from Masterfeed to eBay listings via API.',                   icon: '📦', category: 'Catalogue', scriptKey: 'ebayUpdateStock'    },
  { id: 'syncRubiesStock',            label: 'Rubies Deerfield Stock Sync', desc: 'Check Rubies Deerfield stock levels and update eBay listings accordingly.',                 icon: '🏭', category: 'Suppliers', scriptKey: 'rubiesSync'       },
]

const CATEGORIES = ['Download', 'Compile', 'Tracking', 'Catalogue', 'Suppliers']

export default function FeedsPage() {
  const [status, setStatus] = useState({})
  const [logs, setLogs]     = useState([])

  async function run(feed) {
    if (feed.soon) return
    const url = SCRIPTS[feed.scriptKey]
    if (!url) {
      setStatus(s => ({ ...s, [feed.id]: 'error' }))
      addLog(feed.label, 'error', `Script URL not configured — add "${feed.scriptKey}" to src/lib/config.js`)
      return
    }
    setStatus(s => ({ ...s, [feed.id]: 'running' }))
    addLog(feed.label, 'info', 'Running…')
    try {
      await runScript(url)
      setStatus(s => ({ ...s, [feed.id]: 'done' }))
      addLog(feed.label, 'success', 'Request sent successfully')
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
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Add deployment URLs to src/lib/config.js to enable each button</span>
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
                const st       = status[f.id] || 'idle'
                const hasUrl   = f.scriptKey && SCRIPTS[f.scriptKey]
                const dotColor = f.soon ? '#a78bfa' : hasUrl ? '#22c55e' : '#f59e0b'
                const dotLabel = f.soon ? 'Coming soon' : hasUrl ? 'Ready' : 'URL needed'
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
                        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{dotLabel}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{f.desc}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{f.id}</span>
                      {f.soon ? (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--bg)', borderRadius: 4, padding: '3px 8px' }}>Not built yet</span>
                      ) : (
                        <Btn size="sm" variant={st === 'done' ? 'default' : 'primary'} disabled={st === 'running'} onClick={() => run(f)}>
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

      {logs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Run Log</div>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {logs.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 14px', borderBottom: i < logs.length - 1 ? '0.5px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11, flexShrink: 0 }}>{l.time}</span>
                <span style={{ fontWeight: 500, flexShrink: 0, minWidth: 200 }}>{l.label}</span>
                <span style={{ color: l.type === 'error' ? '#8b1a1a' : l.type === 'success' ? '#2d5a0e' : 'var(--text-2)' }}>{l.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

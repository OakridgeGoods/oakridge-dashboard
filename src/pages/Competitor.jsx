import { useState, useEffect } from 'react'
import { getToken } from '../lib/sheets'
import { SHEETS } from '../lib/config'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

const STATUS_COLOR = {
  profitable:     '#7db82a',
  marginal:       '#f59e0b',
  'not-worth-it': '#ef4444',
}

const STATUS_LABEL = {
  profitable:     'Worth Beating',
  marginal:       'Marginal',
  'not-worth-it': 'Not Worth It',
}

function parseRow(row) {
  const g = (i) => ((row[i] ?? '')).toString().trim()
  const n = (i) => { const v = parseFloat(g(i)); return isNaN(v) ? 0 : v }

  const beatProfit = n(8)
  const competitors = [
    { name: g(9),  price: n(10), ship: n(11), link: g(12) },
    { name: g(13), price: n(14), ship: n(15), link: g(16) },
    { name: g(17), price: n(18), ship: n(19), link: g(20) },
  ].filter(c => c.name)

  const withPrice = competitors.filter(c => c.price > 0)
  const cheapest = withPrice.length > 0
    ? withPrice.reduce((a, b) => (a.price + a.ship) <= (b.price + b.ship) ? a : b)
    : null

  let status = 'not-worth-it'
  if (beatProfit > 0) status = 'profitable'
  else if (beatProfit >= -2) status = 'marginal'

  return {
    sku: g(0),
    title: g(1),
    cost: n(2),
    ourPrice: n(3),
    shippingCharge: n(4),
    shippingCost: n(5),
    currentMarginStr: g(6),
    beatPrice: n(7),
    beatProfit,
    competitors,
    cheapest,
    status,
  }
}

function PriceStat({ label, value, color, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: color || (highlight ? 'var(--oak-lime)' : 'var(--text)'),
        fontFamily: 'var(--font-mono)',
      }}>
        {value}
      </div>
    </div>
  )
}

function ProductCard({ row, expanded, onToggle }) {
  const borderColor = STATUS_COLOR[row.status]
  const profitSign = row.beatProfit >= 0 ? '+' : ''

  return (
    <div style={{
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 10,
      padding: '14px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              background: 'rgba(255,255,255,0.07)',
              padding: '2px 7px',
              borderRadius: 4,
              color: 'var(--text-2)',
              flexShrink: 0,
            }}>{row.sku}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
              {row.title}
            </span>
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              background: `${borderColor}22`,
              color: borderColor,
              fontWeight: 600,
              flexShrink: 0,
            }}>{STATUS_LABEL[row.status]}</span>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <PriceStat label="Our Price" value={`$${row.ourPrice.toFixed(2)}`} />
            {row.shippingCharge > 0 && (
              <PriceStat label="+ Shipping" value={`$${row.shippingCharge.toFixed(2)}`} />
            )}
            <PriceStat label="Current Margin" value={row.currentMarginStr || '—'} />
            <PriceStat label="Beat At" value={row.beatPrice > 0 ? `$${row.beatPrice.toFixed(2)}` : '—'} highlight />
            <PriceStat
              label="Profit if Beat"
              value={`${profitSign}$${row.beatProfit.toFixed(2)}`}
              color={row.beatProfit >= 0 ? '#7db82a' : '#ef4444'}
            />
            {row.cheapest && (
              <PriceStat
                label={`Cheapest (${row.cheapest.name})`}
                value={`$${(row.cheapest.price + row.cheapest.ship).toFixed(2)}`}
                color="#f59e0b"
              />
            )}
          </div>
        </div>

        <button
          onClick={onToggle}
          style={{
            border: '0.5px solid var(--border)',
            borderRadius: 6,
            padding: '4px 10px',
            background: 'transparent',
            color: 'var(--text-2)',
            fontSize: 12,
            cursor: 'pointer',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {expanded ? '▲ Hide' : '▼ Competitors'}
        </button>
      </div>

      {expanded && row.competitors.length > 0 && (
        <div style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: '0.5px solid var(--border)',
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          {row.competitors.map((c, i) => {
            const total = c.price + c.ship
            const isCheapest = row.cheapest && row.cheapest.name === c.name
            return (
              <div key={i} style={{
                flex: '1 1 200px',
                background: isCheapest ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                border: `0.5px solid ${isCheapest ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                borderRadius: 8,
                padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: isCheapest ? '#f59e0b' : 'var(--text)' }}>
                    {c.name}{isCheapest ? ' ★' : ''}
                  </span>
                  {c.link && (
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: 'var(--oak-lime)', textDecoration: 'none' }}
                    >
                      ↗ View
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-2)', flexWrap: 'wrap' }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    ${c.price.toFixed(2)}
                  </span>
                  {c.ship > 0 && <span>+ ${c.ship.toFixed(2)} ship</span>}
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Total: ${total.toFixed(2)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CompetitorPage({ token }) {
  const [tabs, setTabs]         = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    const tok = token || getToken()
    if (!tok) return
    fetch(`${SHEETS_API}/${SHEETS.competitorAnalysis}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.json())
      .then(meta => {
        if (meta.error) { setError(meta.error.message); return }
        const sheetTabs = meta.sheets?.map(s => s.properties) || []
        setTabs(sheetTabs)
        if (sheetTabs.length > 0) setActiveTab(sheetTabs[0].title)
      })
      .catch(e => setError(e.message))
  }, [token])

  useEffect(() => {
    if (!activeTab) return
    const tok = token || getToken()
    if (!tok) return

    setLoading(true)
    setError(null)
    fetch(`${SHEETS_API}/${SHEETS.competitorAnalysis}/values/${encodeURIComponent(activeTab + '!A:U')}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error.message); setLoading(false); return }
        const values = data.values || []
        const parsed = values.slice(1).filter(row => row[0]).map(parseRow)
        setRows(parsed)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [activeTab, token])

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.sku.toLowerCase().includes(q) && !r.title.toLowerCase().includes(q)) return false
    }
    return true
  })

  const profitable = rows.filter(r => r.status === 'profitable').length
  const marginal   = rows.filter(r => r.status === 'marginal').length
  const notWorth   = rows.filter(r => r.status === 'not-worth-it').length

  const marginVals = rows.map(r => parseFloat(r.currentMarginStr)).filter(v => !isNaN(v))
  const avgMargin  = marginVals.length
    ? (marginVals.reduce((a, b) => a + b, 0) / marginVals.length).toFixed(1)
    : null

  const toggleExpand = (sku) => setExpanded(p => ({ ...p, [sku]: !p[sku] }))

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>
          Competitor Pricing Analysis
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, marginBottom: 0 }}>
          Track competitor prices and identify which products are worth beating
        </p>
      </div>

      {tabs.length > 1 && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '0.5px solid var(--border)' }}>
          {tabs.map(tab => (
            <button
              key={tab.sheetId}
              onClick={() => setActiveTab(tab.title)}
              style={{
                padding: '8px 18px',
                border: 'none',
                borderBottom: activeTab === tab.title ? '2px solid var(--oak-lime)' : '2px solid transparent',
                background: 'transparent',
                color: activeTab === tab.title ? 'var(--oak-lime)' : 'var(--text-2)',
                fontSize: 13,
                fontWeight: activeTab === tab.title ? 600 : 400,
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 0.12s',
              }}
            >
              {tab.title}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Products Tracked', value: rows.length, color: 'var(--text)' },
          { label: 'Worth Beating',    value: profitable,  color: '#7db82a' },
          { label: 'Marginal',         value: marginal,    color: '#f59e0b' },
          { label: 'Not Worth It',     value: notWorth,    color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)',
            border: '0.5px solid var(--border)',
            borderRadius: 10,
            padding: '14px 18px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>
              {loading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      {avgMargin && !loading && (
        <div style={{
          background: 'rgba(125,184,42,0.06)',
          border: '0.5px solid rgba(125,184,42,0.2)',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--text-2)',
        }}>
          <span style={{ color: 'var(--oak-lime)', fontWeight: 600 }}>Avg Current Margin:</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>{avgMargin}%</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            across {rows.length} product{rows.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { key: 'all',           label: 'All' },
          { key: 'profitable',    label: 'Worth Beating' },
          { key: 'marginal',      label: 'Marginal' },
          { key: 'not-worth-it',  label: 'Not Worth It' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: filter === f.key ? '1px solid var(--oak-lime)' : '0.5px solid var(--border)',
              background: filter === f.key ? 'rgba(125,184,42,0.15)' : 'transparent',
              color: filter === f.key ? 'var(--oak-lime)' : 'var(--text-2)',
              fontSize: 12.5,
              fontWeight: filter === f.key ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
          >
            {f.label}
          </button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search SKU or title…"
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            borderRadius: 6,
            border: '0.5px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: 12.5,
            outline: 'none',
            width: 220,
            fontFamily: 'var(--font-sans)',
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239,68,68,0.1)',
          border: '0.5px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          color: '#ef4444',
          fontSize: 13,
          marginBottom: 16,
        }}>
          ⚠ Sheets API error: {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-2)', fontSize: 13 }}>
          Loading competitor data…
        </div>
      )}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-2)', fontSize: 13 }}>
              No products match the current filters.
            </div>
          )}
          {filtered.map(row => (
            <ProductCard
              key={row.sku}
              row={row}
              expanded={!!expanded[row.sku]}
              onToggle={() => toggleExpand(row.sku)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

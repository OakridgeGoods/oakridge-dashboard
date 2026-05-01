import { useState, useEffect, useMemo } from 'react'
import { getToken } from '../lib/sheets'
import { SHEETS, SHEET_TABS, R2_BASE } from '../lib/config'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

function parseCompetitorRow(row) {
  const g = (i) => ((row[i] ?? '')).toString().trim()
  const n = (i) => { const v = parseFloat(g(i)); return isNaN(v) ? 0 : v }
  return {
    sku:              g(0),
    title:            g(1),
    cost:             n(2),
    ourPrice:         n(3),
    shippingCharge:   n(4),
    shippingCost:     n(5),
    currentMargin:    g(6),
    beatPrice:        n(7),
    beatProfit:       parseFloat(g(8)) || 0,
    competitors: [
      { name: g(9),  price: n(10), ship: n(11), link: g(12) },
      { name: g(13), price: n(14), ship: n(15), link: g(16) },
      { name: g(17), price: n(18), ship: n(19), link: g(20) },
    ].filter(c => c.name),
  }
}

function Th({ label, col, sort, onSort }) {
  const active = sort.col === col
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        padding: '10px 12px',
        textAlign: 'left',
        fontSize: 11,
        fontWeight: 600,
        color: active ? 'var(--oak-lime)' : 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
        background: 'var(--oak-dark)',
        position: 'sticky',
        top: 0,
        zIndex: 2,
        borderBottom: '0.5px solid var(--border)',
      }}
    >
      {label}{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}

function CompLink({ comp }) {
  if (!comp.name) return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>—</span>
  const total = comp.price + comp.ship
  return (
    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
      {comp.link ? (
        <a
          href={comp.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--oak-lime)',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: 11,
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 130,
          }}
          title={comp.name}
        >
          ↗ {comp.name}
        </a>
      ) : (
        <span style={{ color: 'var(--text-2)', fontSize: 11, display: 'block', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={comp.name}>
          {comp.name}
        </span>
      )}
      <span style={{ color: '#fff', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
        ${total.toFixed(2)}
      </span>
      {comp.ship > 0 && (
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginLeft: 4 }}>
          (${comp.price.toFixed(2)} + ${comp.ship.toFixed(2)} ship)
        </span>
      )}
    </div>
  )
}

export default function CompetitorPage({ token }) {
  const [tabs, setTabs]         = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [rows, setRows]         = useState([])
  const [imageMap, setImageMap] = useState({})
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [sort, setSort]         = useState({ col: 'title', dir: 'asc' })

  const tok = token || getToken()

  // Load sheet tabs
  useEffect(() => {
    if (!tok) return
    fetch(`${SHEETS_API}/${SHEETS.competitorAnalysis}`, {
      headers: { Authorization: 'Bearer ' + tok },
    })
      .then(r => r.json())
      .then(meta => {
        if (meta.error) { setError(meta.error.message); return }
        const sheetTabs = meta.sheets?.map(s => s.properties) || []
        setTabs(sheetTabs)
        if (sheetTabs.length > 0) setActiveTab(sheetTabs[0].title)
      })
      .catch(e => setError(e.message))
  }, [tok])

  // Load images from datafeed Masterfeed tab
  useEffect(() => {
    if (!tok) return
    fetch(`${SHEETS_API}/${SHEETS.datafeeds}/values/${encodeURIComponent(SHEET_TABS.masterfeed + '!A:ZZ')}`, {
      headers: { Authorization: 'Bearer ' + tok },
    })
      .then(r => r.json())
      .then(data => {
        if (!data.values || data.values.length < 2) return
        const headers = data.values[0].map(h => h.toString().toLowerCase())
        const skuIdx  = headers.findIndex(h => h === 'sku' || h === 'custom label')
        const picIdx  = headers.findIndex(h => h.includes('picurl') || h.includes('pic url') || h.includes('pictureurl') || h.includes('gallery'))
        if (skuIdx === -1 || picIdx === -1) return
        const map = {}
        data.values.slice(1).forEach(row => {
          const sku = (row[skuIdx] || '').toString().trim()
          const pic = (row[picIdx] || '').toString().trim()
          if (sku && pic) map[sku] = pic
        })
        setImageMap(map)
      })
      .catch(() => {})
  }, [tok])

  // Load competitor sheet data
  useEffect(() => {
    if (!activeTab || !tok) return
    setLoading(true)
    setError(null)
    fetch(`${SHEETS_API}/${SHEETS.competitorAnalysis}/values/${encodeURIComponent(activeTab + '!A:U')}`, {
      headers: { Authorization: 'Bearer ' + tok },
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error.message); setLoading(false); return }
        const values = data.values || []
        const parsed = values.slice(1).filter(row => row[0]).map(parseCompetitorRow)
        setRows(parsed)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [activeTab, tok])

  const handleSort = (col) => {
    setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }))
  }

  const filtered = useMemo(() => {
    let data = rows
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q)
      )
    }
    return [...data].sort((a, b) => {
      let av = a[sort.col], bv = b[sort.col]
      if (sort.col === 'currentMargin') {
        av = parseFloat(av) || 0
        bv = parseFloat(bv) || 0
      }
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, search, sort])

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Competitor Pricing</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, marginBottom: 0 }}>
            {rows.length} products · click column headers to sort · click competitor names to view listings
          </p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title or SKU…"
          style={{
            padding: '7px 14px',
            borderRadius: 7,
            border: '0.5px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: 13,
            outline: 'none',
            width: 240,
            fontFamily: 'var(--font-sans)',
          }}
        />
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: 20 }}>
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
              }}
            >
              {tab.title}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-2)', fontSize: 13 }}>Loading…</div>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '0.5px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px', width: 56, background: 'var(--oak-dark)', position: 'sticky', top: 0, zIndex: 2, borderBottom: '0.5px solid var(--border)' }} />
                <Th label="Product"        col="title"         sort={sort} onSort={handleSort} />
                <Th label="Our Price"      col="ourPrice"      sort={sort} onSort={handleSort} />
                <Th label="Margin"         col="currentMargin" sort={sort} onSort={handleSort} />
                <Th label="Beat At"        col="beatPrice"     sort={sort} onSort={handleSort} />
                <Th label="Profit if Beat" col="beatProfit"    sort={sort} onSort={handleSort} />
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--oak-dark)', position: 'sticky', top: 0, zIndex: 2, borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap' }}>Competitor 1</th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--oak-dark)', position: 'sticky', top: 0, zIndex: 2, borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap' }}>Competitor 2</th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--oak-dark)', position: 'sticky', top: 0, zIndex: 2, borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap' }}>Competitor 3</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const img = imageMap[row.sku]
                const profitColor = row.beatProfit > 0 ? '#7db82a' : row.beatProfit >= -2 ? '#f59e0b' : '#ef4444'
                return (
                  <tr
                    key={row.sku}
                    style={{
                      background: i % 2 === 0 ? 'var(--surface)' : 'rgba(255,255,255,0.018)',
                      borderBottom: '0.5px solid var(--border)',
                    }}
                  >
                    {/* Image */}
                    <td style={{ padding: '10px 10px 10px 14px', verticalAlign: 'middle' }}>
                      {img ? (
                        <a href={img} target="_blank" rel="noopener noreferrer">
                          <img
                            src={img}
                            alt=""
                            style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, background: '#fff', display: 'block' }}
                            onError={e => { e.target.style.display = 'none' }}
                          />
                        </a>
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                          📦
                        </div>
                      )}
                    </td>

                    {/* Product */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle', maxWidth: 240 }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.title}>
                        {row.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>{row.sku}</div>
                    </td>

                    {/* Our Price */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                        ${row.ourPrice.toFixed(2)}
                      </div>
                      {row.shippingCharge > 0 && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                          + ${row.shippingCharge.toFixed(2)} ship
                        </div>
                      )}
                    </td>

                    {/* Margin */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--oak-lime)', fontWeight: 600 }}>
                        {row.currentMargin || '—'}
                      </span>
                    </td>

                    {/* Beat At */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#fff', fontWeight: 600 }}>
                        {row.beatPrice > 0 ? '$' + row.beatPrice.toFixed(2) : '—'}
                      </span>
                    </td>

                    {/* Profit if Beat */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: profitColor }}>
                        {row.beatProfit >= 0 ? '+' : ''}${row.beatProfit.toFixed(2)}
                      </span>
                    </td>

                    {/* Competitors */}
                    {[0, 1, 2].map(ci => (
                      <td key={ci} style={{ padding: '10px 12px', verticalAlign: 'middle', minWidth: 150 }}>
                        <CompLink comp={row.competitors[ci] || {}} />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-2)', fontSize: 13 }}>
          No data loaded.
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { getToken } from '../lib/sheets'
import { SHEETS, SHEET_TABS } from '../lib/config'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

function parseCompetitorRow(row) {
  const g = (i) => ((row[i] ?? '')).toString().trim()
  const n = (i) => { const v = parseFloat(g(i)); return isNaN(v) ? 0 : v }

  const ourPrice       = n(3)
  const shippingCharge = n(4)
  const beatPrice      = n(7)
  const beatProfit     = parseFloat(g(8)) || 0
  // profit % at beat price — column 9 if sheet provides it, else derive
  const sheetPct       = g(9)
  const beatPct        = sheetPct && !isNaN(parseFloat(sheetPct)) && parseFloat(sheetPct) < 1 && parseFloat(sheetPct) > -1
    ? parseFloat(sheetPct) * 100
    : beatPrice > 0
      ? (beatProfit / (beatPrice + shippingCharge)) * 100
      : null

  const compStart = sheetPct && !isNaN(parseFloat(sheetPct)) && parseFloat(sheetPct) < 1 ? 10 : 9

  return {
    sku:            g(0),
    title:          g(1),
    cost:           n(2),
    ourPrice,
    shippingCharge,
    shippingCost:   n(5),
    currentMargin:  g(6),
    beatPrice,
    beatProfit,
    beatPct,
    competitors: [
      { name: g(compStart),   price: n(compStart+1), ship: n(compStart+2), link: g(compStart+3) },
      { name: g(compStart+4), price: n(compStart+5), ship: n(compStart+6), link: g(compStart+7) },
      { name: g(compStart+8), price: n(compStart+9), ship: n(compStart+10), link: g(compStart+11) },
    ].filter(c => c.name),
  }
}

function Th({ label, col, sort, onSort, style = {} }) {
  const active = sort.col === col
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        padding: '10px 14px',
        textAlign: 'left',
        fontSize: 11,
        fontWeight: 700,
        color: active ? 'var(--oak-lime)' : 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
        background: 'var(--oak-dark)',
        position: 'sticky',
        top: 0,
        zIndex: 2,
        borderBottom: '0.5px solid rgba(255,255,255,0.1)',
        ...style,
      }}
    >
      {label}{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}

function StaticTh({ label }) {
  return (
    <th style={{
      padding: '10px 14px',
      textAlign: 'left',
      fontSize: 11,
      fontWeight: 700,
      color: 'rgba(255,255,255,0.55)',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      whiteSpace: 'nowrap',
      background: 'var(--oak-dark)',
      position: 'sticky',
      top: 0,
      zIndex: 2,
      borderBottom: '0.5px solid rgba(255,255,255,0.1)',
    }}>
      {label}
    </th>
  )
}

function CompCell({ comp }) {
  if (!comp || !comp.name) {
    return <td style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 12 }}>—</td>
  }
  const total = comp.price + comp.ship
  return (
    <td style={{ padding: '12px 14px', verticalAlign: 'middle', minWidth: 160 }}>
      {comp.link ? (
        <a
          href={comp.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#2a7d2a',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 11.5,
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 155,
            marginBottom: 3,
          }}
          title={comp.name}
        >
          ↗ {comp.name}
        </a>
      ) : (
        <span style={{ color: 'var(--text-2)', fontSize: 11.5, display: 'block', maxWidth: 155, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }} title={comp.name}>
          {comp.name}
        </span>
      )}
      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text)' }}>
        ${total.toFixed(2)}
      </span>
      {comp.ship > 0 && (
        <span style={{ color: 'var(--text-3)', fontSize: 11, marginLeft: 6 }}>
          ${comp.price.toFixed(2)} + ${comp.ship.toFixed(2)} ship
        </span>
      )}
    </td>
  )
}

export default function CompetitorPage({ token }) {
  const [tabs, setTabs]           = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [rows, setRows]           = useState([])
  const [imageMap, setImageMap]   = useState({})
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [search, setSearch]       = useState('')
  const [sort, setSort]           = useState({ col: 'title', dir: 'asc' })

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

  // Load images from Masterfeed
  useEffect(() => {
    if (!tok) return
    fetch(`${SHEETS_API}/${SHEETS.datafeeds}/values/${encodeURIComponent(SHEET_TABS.masterfeed + '!A:ZZ')}`, {
      headers: { Authorization: 'Bearer ' + tok },
    })
      .then(r => r.json())
      .then(data => {
        if (!data.values || data.values.length < 2) return
        const headers = data.values[0].map(h => h.toString().toLowerCase())
        const skuIdx  = headers.findIndex(h => h === 'sku' || h === 'custom label' || h === 'custlabel')
        const picIdx  = headers.findIndex(h =>
          h.includes('picurl') || h.includes('pic url') || h.includes('pictureurl') || h.includes('galleryurl') || h.includes('gallery url') || h === 'image'
        )
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

  // Load competitor data
  useEffect(() => {
    if (!activeTab || !tok) return
    setLoading(true)
    setError(null)
    fetch(`${SHEETS_API}/${SHEETS.competitorAnalysis}/values/${encodeURIComponent(activeTab + '!A:ZZ')}`, {
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
      data = data.filter(r => r.title.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q))
    }
    return [...data].sort((a, b) => {
      let av = a[sort.col], bv = b[sort.col]
      if (sort.col === 'currentMargin') { av = parseFloat(av) || 0; bv = parseFloat(bv) || 0 }
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, search, sort])

  return (
    <div style={{ maxWidth: 1500 }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Competitor Pricing</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, marginBottom: 0 }}>
            {loading ? 'Loading…' : `${rows.length} products`} · click column headers to sort · click competitor names to view listings
          </p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title or SKU…"
          style={{
            padding: '7px 14px',
            borderRadius: 7,
            border: '1px solid var(--border-md)',
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
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-md)', marginBottom: 20 }}>
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
        <div style={{ padding: '12px 16px', background: 'var(--red-bg)', border: '1px solid rgba(139,26,26,0.2)', borderRadius: 8, color: 'var(--red-text)', fontSize: 13, marginBottom: 16 }}>
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-2)', fontSize: 13 }}>Loading…</div>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-md)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', width: 56, background: 'var(--oak-dark)', position: 'sticky', top: 0, zIndex: 2, borderBottom: '0.5px solid rgba(255,255,255,0.1)' }} />
                <Th label="Product"        col="title"         sort={sort} onSort={handleSort} />
                <Th label="Our Total"      col="ourPrice"      sort={sort} onSort={handleSort} />
                <Th label="Margin"         col="currentMargin" sort={sort} onSort={handleSort} />
                <Th label="Beat At"        col="beatPrice"     sort={sort} onSort={handleSort} />
                <Th label="Profit $"       col="beatProfit"    sort={sort} onSort={handleSort} />
                <Th label="Profit %"       col="beatPct"       sort={sort} onSort={handleSort} />
                <StaticTh label="Competitor 1" />
                <StaticTh label="Competitor 2" />
                <StaticTh label="Competitor 3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const img        = imageMap[row.sku]
                const ourTotal   = row.ourPrice + row.shippingCharge
                const pColor     = row.beatProfit > 0 ? 'var(--green-text)' : row.beatProfit >= -2 ? 'var(--amber-text)' : 'var(--red-text)'
                const pBg        = row.beatProfit > 0 ? 'var(--green-bg)' : row.beatProfit >= -2 ? 'var(--amber-bg)' : 'var(--red-bg)'
                const rowBg      = i % 2 === 0 ? 'var(--surface)' : 'var(--bg)'

                return (
                  <tr key={row.sku} style={{ background: rowBg, borderBottom: '1px solid var(--border)' }}>

                    {/* Image */}
                    <td style={{ padding: '10px 10px 10px 14px', verticalAlign: 'middle' }}>
                      {img ? (
                        <a href={img} target="_blank" rel="noopener noreferrer">
                          <img
                            src={img}
                            alt=""
                            style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border-md)', background: '#fff', display: 'block' }}
                            onError={e => { e.target.style.display = 'none' }}
                          />
                        </a>
                      ) : (
                        <div style={{ width: 42, height: 42, borderRadius: 6, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text-3)' }}>
                          📦
                        </div>
                      )}
                    </td>

                    {/* Product */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', maxWidth: 260 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.title}>
                        {row.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{row.sku}</div>
                    </td>

                    {/* Our Total */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                        ${ourTotal.toFixed(2)}
                      </div>
                      {row.shippingCharge > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          ${row.ourPrice.toFixed(2)} + ${row.shippingCharge.toFixed(2)} ship
                        </div>
                      )}
                    </td>

                    {/* Current Margin */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#2a7d2a' }}>
                        {row.currentMargin || '—'}
                      </span>
                    </td>

                    {/* Beat At */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text)' }}>
                        {row.beatPrice > 0 ? '$' + row.beatPrice.toFixed(2) : '—'}
                      </span>
                    </td>

                    {/* Profit $ */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 5,
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: 13,
                        color: pColor,
                        background: pBg,
                      }}>
                        {row.beatProfit >= 0 ? '+' : ''}${row.beatProfit.toFixed(2)}
                      </span>
                    </td>

                    {/* Profit % */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {row.beatPct != null ? (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: 13,
                          color: pColor,
                        }}>
                          {row.beatPct >= 0 ? '+' : ''}{row.beatPct.toFixed(1)}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-3)' }}>—</span>
                      )}
                    </td>

                    {/* Competitors */}
                    {[0, 1, 2].map(ci => (
                      <CompCell key={ci} comp={row.competitors[ci]} />
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

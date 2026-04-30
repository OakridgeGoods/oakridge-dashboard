import { useState } from 'react'
import { FEES } from '../lib/config'
import { StatCard, PageHeader, Btn } from '../components/UI'

// AusPost flat rate costs (what YOU pay to ship)
const SHIPPING_CLASSES = [
  { label: 'None',     cost: 0,     code: '',           variable: false },
  { label: 'X-Small',  cost: 6.79,  code: 'XS',         variable: false },
  { label: 'Small',    cost: 7.81,  code: 'S',          variable: false },
  { label: 'Medium',   cost: 10.68, code: 'M',          variable: false },
  { label: 'Large',    cost: 13.51, code: 'L',          variable: false },
  { label: 'XL',       cost: 16.31, code: 'XL',         variable: false },
  { label: 'Class_Free', cost: 0,   code: 'Class_Free', variable: false },
  { label: 'Variable', cost: 0,     code: 'Variable',   variable: true  },
]

const PRESETS = [
  { label: 'Standard',   margin: 55, ads: 0 },
  { label: 'Aggressive', margin: 40, ads: 5 },
  { label: 'Premium',    margin: 65, ads: 10 },
]

// Commission options per platform
const COMMISSION_OPTIONS = {
  ebay:   [
    { label: 'Standard 12.75%', rate: 0.1275 },
    { label: 'Custom',          rate: null },
  ],
  amazon: [
    { label: 'Standard 15%',   rate: 0.15 },
    { label: 'Custom',         rate: null },
  ],
}

function calcSingle({ cost, margin, ads, shippingCost, shippingCharge, feeRate }) {
  // totalCost = what you pay (product cost + ad spend + shipping cost to send)
  const adsAmt     = cost * (ads / 100)
  const totalCost  = cost + adsAmt + shippingCost

  // Sell price logic:
  // If shipping charge > 0, customer pays it separately — it doesn't affect your sell price margin calc
  // Your sell price needs to cover: totalCost + margin + platform fee + GST
  // sellEx = totalCost / (1 - margin% - feeRate)
  const sellEx     = totalCost / (1 - margin / 100 - feeRate)
  const sellInc    = sellEx * (1 + FEES.gst)
  const feeAmt     = sellEx * feeRate
  const gstAmt     = sellEx * FEES.gst
  const marginAmt  = sellEx * (margin / 100)
  const breakeven  = totalCost / (1 - feeRate - FEES.gst / (1 + FEES.gst))
  // If charging separately for shipping, that's extra revenue on top
  const netRevenue = marginAmt + shippingCharge

  return { adsAmt, totalCost, sellEx, sellInc, feeAmt, gstAmt, marginAmt, breakeven, netRevenue }
}

export default function MarginsPage() {
  const [platform, setPlatform]   = useState('ebay')
  const [cost, setCost]           = useState('11.28')
  const [margin, setMargin]       = useState(55)
  const [ads, setAds]             = useState(0)
  const [tab, setTab]             = useState('single')

  // Shipping
  const [shippingClass, setShippingClass]     = useState(SHIPPING_CLASSES[0])
  const [variableCost, setVariableCost]       = useState('')   // for Variable class
  const [shippingCharge, setShippingCharge]   = useState('')   // what customer pays

  // Commission
  const [commissionMode, setCommissionMode]   = useState('standard') // 'standard' | 'custom'
  const [customRate, setCustomRate]           = useState('')

  // Bulk
  const [bulkInput, setBulkInput]   = useState('')
  const [bulkRows, setBulkRows]     = useState([])
  const [bulkParsed, setBulkParsed] = useState(false)

  const feeRate = commissionMode === 'custom'
    ? (parseFloat(customRate) || 0) / 100
    : FEES[platform]

  const costNum       = parseFloat(cost) || 0
  const shippingCost  = shippingClass.variable ? (parseFloat(variableCost) || 0) : shippingClass.cost
  const shippingChargeNum = parseFloat(shippingCharge) || 0

  const calc = calcSingle({ cost: costNum, margin, ads, shippingCost, shippingCharge: shippingChargeNum, feeRate })

  const fmt    = n => isNaN(n) || !isFinite(n) ? '—' : `$${n.toFixed(2)}`
  const fmtPct = n => `${Number(n).toFixed(1)}%`

  const inputStyle = {
    border: '0.5px solid var(--border-md)', borderRadius: 6, padding: '7px 10px',
    fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)',
    background: 'var(--surface)', color: 'var(--text)', outline: 'none',
  }

  const smallInput = { ...inputStyle, fontSize: 13, padding: '5px 8px' }

  function parseBulk() {
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(Boolean)
    const rows = lines.map((line, idx) => {
      const parts = line.split(',').map(s => s.trim())
      const sku   = parts.length > 1 ? parts[0] : `Row ${idx + 1}`
      const c     = parseFloat(parts.length > 1 ? parts[1] : parts[0]) || 0
      return {
        sku, cost: c,
        margin,
        shipping: SHIPPING_CLASSES[0],
        variableCost: '',
        shippingCharge: '',
      }
    })
    setBulkRows(rows)
    setBulkParsed(true)
  }

  function updateBulkRow(idx, field, val) {
    setBulkRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  function calcRow(r) {
    const sc = r.shipping.variable ? (parseFloat(r.variableCost) || 0) : r.shipping.cost
    const charge = parseFloat(r.shippingCharge) || 0
    return calcSingle({ cost: r.cost, margin: r.margin, ads, shippingCost: sc, shippingCharge: charge, feeRate })
  }

  function exportBulkCSV() {
    const headers = [
      'SKU', 'Cost (ex GST)', 'Ad Spend %',
      'Shipping Class', 'Shipping Cost', 'Shipping Charge (customer)',
      `Sell Price (inc GST) - ${platform}`, 'Platform Fee', 'Margin %', 'Margin $', 'Net Revenue', 'Break-even'
    ]
    const rows = bulkRows.map(r => {
      const c  = calcRow(r)
      const sc = r.shipping.variable ? (parseFloat(r.variableCost) || 0) : r.shipping.cost
      return [
        r.sku, r.cost.toFixed(2), ads,
        r.shipping.code || 'None',
        sc.toFixed(2),
        (parseFloat(r.shippingCharge) || 0).toFixed(2),
        isFinite(c.sellInc)    ? c.sellInc.toFixed(2)    : '',
        isFinite(c.feeAmt)     ? c.feeAmt.toFixed(2)     : '',
        r.margin,
        isFinite(c.marginAmt)  ? c.marginAmt.toFixed(2)  : '',
        isFinite(c.netRevenue) ? c.netRevenue.toFixed(2) : '',
        isFinite(c.breakeven)  ? c.breakeven.toFixed(2)  : '',
      ].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `margin-calc-${platform}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <PageHeader title="Margin Calculator" />

      {/* Platform + Commission row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Platform */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['ebay', 'amazon'].map(p => (
            <button key={p} onClick={() => { setPlatform(p); setCommissionMode('standard'); setCustomRate('') }} style={{
              padding: '6px 16px', borderRadius: 7, border: '0.5px solid',
              borderColor: platform === p ? 'var(--oak-lime)' : 'var(--border)',
              background: platform === p ? 'var(--oak-dark)' : 'transparent',
              color: platform === p ? 'var(--oak-lime)' : 'var(--text-2)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>{p === 'ebay' ? 'eBay' : 'Amazon'}</button>
          ))}
        </div>

        {/* Commission selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginRight: 4 }}>Commission</span>
          {COMMISSION_OPTIONS[platform].map(opt => (
            <button
              key={opt.label}
              onClick={() => {
                if (opt.rate !== null) { setCommissionMode('standard'); setCustomRate('') }
                else setCommissionMode('custom')
              }}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '0.5px solid',
                borderColor: (opt.rate !== null ? commissionMode === 'standard' : commissionMode === 'custom') ? 'var(--oak-lime)' : 'var(--border)',
                background: (opt.rate !== null ? commissionMode === 'standard' : commissionMode === 'custom') ? 'rgba(125,184,42,0.1)' : 'transparent',
                color: 'var(--text-2)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >{opt.label}</button>
          ))}
          {commissionMode === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number" min="0" max="50" step="0.1"
                value={customRate}
                onChange={e => setCustomRate(e.target.value)}
                placeholder="e.g. 10"
                style={{ ...smallInput, width: 70 }}
                autoFocus
              />
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>%</span>
            </div>
          )}
          <span style={{ fontSize: 11, color: 'var(--oak-lime)', fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
            {fmtPct(feeRate * 100)} active
          </span>
        </div>

        {/* Presets */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { setMargin(p.margin); setAds(p.ads) }} style={{
              padding: '5px 10px', borderRadius: 6, border: '0.5px solid var(--border)',
              background: 'transparent', color: 'var(--text-2)', fontSize: 11,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {[['single', 'Single product'], ['bulk', 'Bulk calculate']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '5px 14px', borderRadius: 6, border: '0.5px solid',
            borderColor: tab === id ? 'var(--oak-lime)' : 'var(--border)',
            background: tab === id ? 'var(--oak-lime)' : 'transparent',
            color: tab === id ? 'var(--oak-dark)' : 'var(--text-2)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'single' && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* Inputs */}
          <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Cost */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>Cost price (ex GST)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: 'var(--text-3)' }}>$</span>
                <input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)}
                  style={{ ...inputStyle, width: 110 }} />
                <input type="range" min="0.5" max="500" step="0.5" value={parseFloat(cost) || 0}
                  onChange={e => setCost(e.target.value)} style={{ flex: 1 }} />
              </div>
            </div>

            {/* Target margin */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>Target margin</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" min="0" max="80" step="1" value={margin}
                  onChange={e => setMargin(parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, width: 80 }} />
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>%</span>
                <input type="range" min="5" max="80" step="1" value={margin}
                  onChange={e => setMargin(parseFloat(e.target.value))} style={{ flex: 1 }} />
              </div>
            </div>

            {/* Ad spend */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>Ad spend (% of cost)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" min="0" max="30" step="0.5" value={ads}
                  onChange={e => setAds(parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, width: 80 }} />
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>%</span>
                <input type="range" min="0" max="30" step="0.5" value={ads}
                  onChange={e => setAds(parseFloat(e.target.value))} style={{ flex: 1 }} />
              </div>
            </div>

            {/* Shipping section */}
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 12 }}>
                Shipping (optional)
              </div>

              {/* Shipping CLASS (cost to you) */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>
                  Shipping cost to you <span style={{ fontWeight: 400 }}>(AusPost flat rate)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SHIPPING_CLASSES.map(sc => (
                    <button key={sc.code} onClick={() => setShippingClass(sc)} style={{
                      padding: '4px 9px', borderRadius: 6, border: '0.5px solid',
                      borderColor: shippingClass.code === sc.code ? 'var(--oak-lime)' : 'var(--border)',
                      background: shippingClass.code === sc.code ? 'rgba(125,184,42,0.1)' : 'transparent',
                      color: shippingClass.code === sc.code ? 'var(--oak-mid)' : 'var(--text-2)',
                      fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}>
                      {sc.label}
                      {sc.cost > 0 && <span style={{ fontSize: 10, opacity: 0.65, marginLeft: 3 }}>${sc.cost}</span>}
                    </button>
                  ))}
                </div>
                {shippingClass.variable && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Shipping cost $</span>
                    <input type="number" min="0" step="0.01" value={variableCost}
                      onChange={e => setVariableCost(e.target.value)}
                      placeholder="0.00"
                      style={{ ...smallInput, width: 90 }}
                    />
                  </div>
                )}
              </div>

              {/* Shipping CHARGE (what customer pays) */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>
                  Shipping charge to customer <span style={{ fontWeight: 400 }}>(what you charge them)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>$</span>
                  <input type="number" min="0" step="0.01" value={shippingCharge}
                    onChange={e => setShippingCharge(e.target.value)}
                    placeholder="0.00 (leave blank if free shipping)"
                    style={{ ...smallInput, width: 220 }}
                  />
                </div>
                {shippingChargeNum > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                    Shipping revenue added to net. Not included in sell price calc.
                  </div>
                )}
              </div>
            </div>

            {/* Breakdown */}
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 10 }}>
                Cost breakdown · {fmtPct(feeRate * 100)} fee + 10% GST
              </div>
              {[
                ['Product cost (ex GST)',    fmt(costNum)],
                ads > 0               ? ['Ad spend',                fmt(calc.adsAmt)]         : null,
                shippingCost > 0      ? ['Shipping cost to you',    fmt(shippingCost)]         : null,
                (ads > 0 || shippingCost > 0) ? ['Total effective cost', fmt(calc.totalCost)] : null,
                ['Platform fee',             fmt(calc.feeAmt)],
                ['GST component',            fmt(calc.gstAmt)],
                ['Your margin $',            fmt(calc.marginAmt)],
                shippingChargeNum > 0 ? ['Shipping charge (revenue)', fmt(shippingChargeNum)]  : null,
                shippingChargeNum > 0 ? ['Net revenue',              fmt(calc.netRevenue)]     : null,
                ['Break-even price',         fmt(calc.breakeven)],
              ].filter(Boolean).map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Result */}
          <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'var(--oak-dark)', borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Sell price (inc GST)
              </div>
              <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--oak-lime)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {fmt(calc.sellInc)}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>{fmt(calc.sellEx)} ex GST</div>
              {shippingChargeNum > 0 && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>+ {fmt(shippingChargeNum)} shipping charge</div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Margin $"      value={fmt(calc.marginAmt)} />
              <StatCard label="Margin %"      value={fmtPct(margin)} />
              <StatCard label="Platform fee"  value={fmt(calc.feeAmt)} />
              <StatCard label="Break-even"    value={fmt(calc.breakeven)} />
              {shippingChargeNum > 0 && <StatCard label="Net revenue" value={fmt(calc.netRevenue)} />}
            </div>
          </div>
        </div>
      )}

      {tab === 'bulk' && (
        <div>
          {!bulkParsed ? (
            <div style={{ maxWidth: 500 }}>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
                One per line: <span style={{ fontFamily: 'var(--font-mono)' }}>SKU, cost</span> — or just <span style={{ fontFamily: 'var(--font-mono)' }}>cost</span>
              </label>
              <textarea
                value={bulkInput}
                onChange={e => setBulkInput(e.target.value)}
                placeholder={"5CJ8830L12, 11.28\n2CJAXPO30, 17.00\nsor-bike-mt, 2.50"}
                rows={8}
                style={{
                  width: '100%', border: '0.5px solid var(--border-md)', borderRadius: 8,
                  padding: '10px 12px', fontSize: 12.5, fontFamily: 'var(--font-mono)',
                  background: 'var(--surface)', color: 'var(--text)', resize: 'vertical', outline: 'none', marginBottom: 12,
                }}
              />
              <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text-3)' }}>
                Ad spend ({ads}%) and commission ({fmtPct(feeRate * 100)}) from above will apply to all rows.
                You can adjust margin, shipping cost and charge per row after loading.
              </div>
              <Btn variant="primary" onClick={parseBulk}>Load rows ↗</Btn>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
                <Btn size="sm" onClick={() => { setBulkParsed(false); setBulkRows([]) }}>← Edit input</Btn>
                <Btn size="sm" variant="primary" onClick={exportBulkCSV}>⬇ Export CSV</Btn>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{bulkRows.length} rows · {platform} · {fmtPct(feeRate * 100)} commission · {ads}% ad spend</span>
              </div>

              <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['SKU', 'Cost', 'Margin %', 'Ship class', 'Ship cost $', 'Ship charge $', 'Sell (inc GST)', 'Fee', 'Margin $', 'Net rev.', 'Break-even'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((r, i) => {
                      const c  = calcRow(r)
                      const sc = r.shipping.variable ? (parseFloat(r.variableCost) || 0) : r.shipping.cost
                      return (
                        <tr key={i} style={{ borderBottom: '0.5px solid var(--border)' }}>
                          <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.sku}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>${r.cost.toFixed(2)}</td>
                          <td style={{ padding: '4px 6px' }}>
                            <input type="number" min="0" max="80" step="1" value={r.margin}
                              onChange={e => updateBulkRow(i, 'margin', parseFloat(e.target.value) || 0)}
                              style={{ width: 55, border: '0.5px solid var(--border-md)', borderRadius: 5, padding: '3px 5px', fontSize: 12, fontFamily: 'var(--font-mono)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                            />
                            <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 2 }}>%</span>
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <select value={r.shipping.code}
                              onChange={e => updateBulkRow(i, 'shipping', SHIPPING_CLASSES.find(sc => sc.code === e.target.value) || SHIPPING_CLASSES[0])}
                              style={{ border: '0.5px solid var(--border-md)', borderRadius: 5, padding: '3px 5px', fontSize: 11, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                              {SHIPPING_CLASSES.map(sc => (
                                <option key={sc.code} value={sc.code}>{sc.label}{sc.cost > 0 ? ` $${sc.cost}` : ''}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            {r.shipping.variable ? (
                              <input type="number" min="0" step="0.01" value={r.variableCost}
                                onChange={e => updateBulkRow(i, 'variableCost', e.target.value)}
                                placeholder="0.00"
                                style={{ width: 65, border: '0.5px solid var(--border-md)', borderRadius: 5, padding: '3px 5px', fontSize: 12, fontFamily: 'var(--font-mono)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                              />
                            ) : (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>${sc.toFixed(2)}</span>
                            )}
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <input type="number" min="0" step="0.01" value={r.shippingCharge}
                              onChange={e => updateBulkRow(i, 'shippingCharge', e.target.value)}
                              placeholder="0.00"
                              style={{ width: 65, border: '0.5px solid var(--border-md)', borderRadius: 5, padding: '3px 5px', fontSize: 12, fontFamily: 'var(--font-mono)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                            />
                          </td>
                          <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--oak-mid)' }}>{isFinite(c.sellInc) ? `$${c.sellInc.toFixed(2)}` : '—'}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{isFinite(c.feeAmt) ? `$${c.feeAmt.toFixed(2)}` : '—'}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{isFinite(c.marginAmt) ? `$${c.marginAmt.toFixed(2)}` : '—'}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{isFinite(c.netRevenue) ? `$${c.netRevenue.toFixed(2)}` : '—'}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{isFinite(c.breakeven) ? `$${c.breakeven.toFixed(2)}` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
                Export CSV → XLOOKUP into Masterfeed by SKU to update sell prices.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

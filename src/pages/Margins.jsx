import { useState } from 'react'
import { FEES } from '../lib/config'
import { StatCard, PageHeader, Btn } from '../components/UI'

const SHIPPING_CLASSES = [
  { label: 'None',          cost: 0,     code: '' },
  { label: 'X-Small',       cost: 6.79,  code: 'XS' },
  { label: 'Small',         cost: 7.81,  code: 'S' },
  { label: 'Medium',        cost: 10.68, code: 'M' },
  { label: 'Large',         cost: 13.51, code: 'L' },
  { label: 'XL',            cost: 16.31, code: 'XL' },
  { label: 'Free (Class_Free)', cost: 0, code: 'Class_Free' },
  { label: 'Variable',      cost: 0,     code: 'Variable' },
]

const PRESETS = [
  { label: 'Standard',   margin: 55, ads: 0 },
  { label: 'Aggressive', margin: 40, ads: 5 },
  { label: 'Premium',    margin: 65, ads: 10 },
]

export default function MarginsPage() {
  const [platform, setPlatform]   = useState('ebay')
  const [cost, setCost]           = useState('11.28')
  const [margin, setMargin]       = useState(55)
  const [ads, setAds]             = useState(0)
  const [shippingClass, setShippingClass] = useState(SHIPPING_CLASSES[0])
  const [tab, setTab]             = useState('single')

  // Bulk state
  const [bulkInput, setBulkInput] = useState('')
  const [bulkRows, setBulkRows]   = useState([]) // [{sku, cost, margin, shipping}]
  const [bulkParsed, setBulkParsed] = useState(false)

  const feeRate    = FEES[platform]
  const costNum    = parseFloat(cost) || 0
  const shipCost   = shippingClass.cost
  const totalCost  = costNum * (1 + ads / 100) + shipCost
  const sellEx     = totalCost / (1 - margin / 100 - feeRate)
  const sellInc    = sellEx * (1 + FEES.gst)
  const feeAmt     = sellEx * feeRate
  const gstAmt     = sellEx * FEES.gst
  const marginAmt  = sellEx * (margin / 100)
  const adsAmt     = costNum * (ads / 100)
  const breakeven  = (costNum + shipCost) / (1 - feeRate - FEES.gst / (1 + FEES.gst))

  const fmt    = n => isNaN(n) || !isFinite(n) ? '—' : `$${n.toFixed(2)}`
  const fmtPct = n => `${Number(n).toFixed(1)}%`

  const inputStyle = {
    border: '0.5px solid var(--border-md)', borderRadius: 6, padding: '7px 10px',
    fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)',
    background: 'var(--surface)', color: 'var(--text)', outline: 'none',
  }

  function parseBulk() {
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(Boolean)
    const rows = lines.map((line, idx) => {
      const parts = line.split(',').map(s => s.trim())
      const sku   = parts.length > 1 ? parts[0] : `Row ${idx + 1}`
      const c     = parseFloat(parts.length > 1 ? parts[1] : parts[0]) || 0
      return { sku, cost: c, margin: margin, shipping: SHIPPING_CLASSES[0] }
    })
    setBulkRows(rows)
    setBulkParsed(true)
  }

  function updateBulkRow(idx, field, val) {
    setBulkRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  function calcRow(r) {
    const tc    = r.cost * (1 + ads / 100) + r.shipping.cost
    const sEx   = tc / (1 - r.margin / 100 - feeRate)
    const sInc  = sEx * (1 + FEES.gst)
    const fee   = sEx * feeRate
    const mAmt  = sEx * (r.margin / 100)
    const be    = (r.cost + r.shipping.cost) / (1 - feeRate - FEES.gst / (1 + FEES.gst))
    return { sellInc: sInc, fee, marginAmt: mAmt, breakeven: be }
  }

  function exportBulkCSV() {
    const headers = ['SKU', 'Cost (ex GST)', 'Ad Spend %', 'Shipping Class', 'Shipping Cost', `Sell Price (inc GST) - ${platform}`, 'Platform Fee', 'Margin %', 'Margin $', 'Break-even']
    const rows = bulkRows.map(r => {
      const c = calcRow(r)
      return [
        r.sku,
        r.cost.toFixed(2),
        ads,
        r.shipping.code || 'None',
        r.shipping.cost.toFixed(2),
        isFinite(c.sellInc) ? c.sellInc.toFixed(2) : '',
        isFinite(c.fee) ? c.fee.toFixed(2) : '',
        r.margin,
        isFinite(c.marginAmt) ? c.marginAmt.toFixed(2) : '',
        isFinite(c.breakeven) ? c.breakeven.toFixed(2) : '',
      ].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `margin-calc-${platform}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader title="Margin Calculator">
        <div style={{ display: 'flex', gap: 6 }}>
          {['ebay', 'amazon'].map(p => (
            <button key={p} onClick={() => setPlatform(p)} style={{
              padding: '5px 16px', borderRadius: 7, border: '0.5px solid',
              borderColor: platform === p ? 'var(--oak-lime)' : 'var(--border)',
              background: platform === p ? 'var(--oak-dark)' : 'transparent',
              color: platform === p ? 'var(--oak-lime)' : 'var(--text-2)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>{p === 'ebay' ? 'eBay' : 'Amazon'}</button>
          ))}
        </div>
      </PageHeader>

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

      {/* Shared controls - ads + presets */}
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Ad spend</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="number" min="0" max="30" step="0.5" value={ads}
            onChange={e => setAds(parseFloat(e.target.value) || 0)}
            style={{ ...inputStyle, width: 65, fontSize: 13 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>% of cost</span>
          <input type="range" min="0" max="30" step="0.5" value={ads}
            onChange={e => setAds(parseFloat(e.target.value))}
            style={{ width: 100 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { setMargin(p.margin); setAds(p.ads) }} style={{
              padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--border)',
              background: 'transparent', color: 'var(--text-2)', fontSize: 11,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {tab === 'single' && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 18 }}>

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

            {/* Margin */}
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

            {/* Shipping class */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>
                Shipping class <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional — AusPost flat rate)</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SHIPPING_CLASSES.map(sc => (
                  <button key={sc.code} onClick={() => setShippingClass(sc)} style={{
                    padding: '5px 10px', borderRadius: 6, border: '0.5px solid',
                    borderColor: shippingClass.code === sc.code ? 'var(--oak-lime)' : 'var(--border)',
                    background: shippingClass.code === sc.code ? 'rgba(125,184,42,0.1)' : 'transparent',
                    color: shippingClass.code === sc.code ? 'var(--oak-mid)' : 'var(--text-2)',
                    fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}>
                    {sc.label}
                    {sc.cost > 0 && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>${sc.cost}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 10 }}>
                Breakdown · {platform === 'ebay' ? '12.75%' : '15%'} fee + 10% GST
              </div>
              {[
                ['Cost (ex GST)',     fmt(costNum)],
                ads > 0           ? ['Ad spend',       fmt(adsAmt)]   : null,
                shipCost > 0      ? ['Shipping',       fmt(shipCost)] : null,
                (ads > 0 || shipCost > 0) ? ['Effective cost', fmt(totalCost)] : null,
                ['Platform fee',     fmt(feeAmt)],
                ['GST component',    fmt(gstAmt)],
                ['Your margin $',    fmt(marginAmt)],
                ['Break-even price', fmt(breakeven)],
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
                {fmt(sellInc)}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>{fmt(sellEx)} ex GST</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Margin $"     value={fmt(marginAmt)} />
              <StatCard label="Margin %"     value={fmtPct(margin)} />
              <StatCard label="Platform fee" value={fmt(feeAmt)} />
              <StatCard label="Break-even"   value={fmt(breakeven)} />
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
                  background: 'var(--surface)', color: 'var(--text)', resize: 'vertical', outline: 'none',
                  marginBottom: 12,
                }}
              />
              <Btn variant="primary" onClick={parseBulk}>Load rows ↗</Btn>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
                <Btn size="sm" onClick={() => { setBulkParsed(false); setBulkRows([]) }}>← Edit input</Btn>
                <Btn size="sm" variant="primary" onClick={exportBulkCSV}>⬇ Export CSV</Btn>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{bulkRows.length} rows · adjust margin and shipping per row</span>
              </div>

              <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      {['SKU', 'Cost', 'Margin %', 'Shipping', 'Sell (inc GST)', 'Fee', 'Margin $', 'Break-even'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((r, i) => {
                      const c = calcRow(r)
                      return (
                        <tr key={i} style={{ borderBottom: '0.5px solid var(--border)' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.sku}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>${r.cost.toFixed(2)}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="number" min="0" max="80" step="1"
                              value={r.margin}
                              onChange={e => updateBulkRow(i, 'margin', parseFloat(e.target.value) || 0)}
                              style={{ width: 60, border: '0.5px solid var(--border-md)', borderRadius: 5, padding: '4px 6px', fontSize: 12, fontFamily: 'var(--font-mono)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                            />
                            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 3 }}>%</span>
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <select
                              value={r.shipping.code}
                              onChange={e => updateBulkRow(i, 'shipping', SHIPPING_CLASSES.find(sc => sc.code === e.target.value) || SHIPPING_CLASSES[0])}
                              style={{ border: '0.5px solid var(--border-md)', borderRadius: 5, padding: '4px 6px', fontSize: 11, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                            >
                              {SHIPPING_CLASSES.map(sc => (
                                <option key={sc.code} value={sc.code}>{sc.label}{sc.cost > 0 ? ` ($${sc.cost})` : ''}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--oak-mid)' }}>
                            {isFinite(c.sellInc) ? `$${c.sellInc.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                            {isFinite(c.fee) ? `$${c.fee.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
                            {isFinite(c.marginAmt) ? `$${c.marginAmt.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                            {isFinite(c.breakeven) ? `$${c.breakeven.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
                Export CSV and XLOOKUP into Masterfeed by SKU to update sell prices.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

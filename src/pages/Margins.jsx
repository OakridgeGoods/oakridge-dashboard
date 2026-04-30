import { useState } from 'react'
import { FEES } from '../lib/config'
import { StatCard, PageHeader, Btn } from '../components/UI'

const PRESETS = [
  { label: 'Standard',   margin: 55, ads: 0 },
  { label: 'Aggressive', margin: 40, ads: 5 },
  { label: 'Premium',    margin: 65, ads: 10 },
]

export default function MarginsPage() {
  const [platform, setPlatform] = useState('ebay')
  const [cost, setCost]         = useState('11.28')
  const [margin, setMargin]     = useState(55)
  const [ads, setAds]           = useState(0)
  const [tab, setTab]           = useState('single')
  const [bulkSkus, setBulkSkus] = useState('')
  const [bulkMargin, setBulkMargin] = useState(55)
  const [bulkResult, setBulkResult] = useState(null)

  const feeRate   = FEES[platform]
  const costNum   = parseFloat(cost) || 0
  const totalCost = costNum * (1 + ads / 100)
  const sellEx    = totalCost / (1 - margin / 100 - feeRate)
  const sellInc   = sellEx * (1 + FEES.gst)
  const feeAmt    = sellEx * feeRate
  const gstAmt    = sellEx * FEES.gst
  const marginAmt = sellEx * (margin / 100)
  const adsAmt    = costNum * (ads / 100)
  const breakeven = costNum / (1 - feeRate - FEES.gst / (1 + FEES.gst))

  const fmt    = n => isNaN(n) || !isFinite(n) ? '—' : `$${n.toFixed(2)}`
  const fmtPct = n => `${Number(n).toFixed(1)}%`

  function calcBulk() {
    const lines = bulkSkus.split('\n').map(l => l.trim()).filter(Boolean)
    const results = lines.map((line, idx) => {
      const parts = line.split(',').map(s => s.trim())
      const sku   = parts.length > 1 ? parts[0] : `Row ${idx + 1}`
      const c     = parseFloat(parts[parts.length - 1]) || 0
      const tc    = c * (1 + ads / 100)
      const sEx   = tc / (1 - bulkMargin / 100 - feeRate)
      const sInc  = sEx * (1 + FEES.gst)
      const fee   = sEx * feeRate
      return { sku, cost: c, sellInc: sInc, fee, margin: bulkMargin }
    })
    setBulkResult(results)
  }

  function exportBulkCSV() {
    if (!bulkResult) return
    const csv = ['SKU,Cost (ex GST),Sell Price (inc GST),Platform Fee,Margin %',
      ...bulkResult.map(r => `${r.sku},${r.cost.toFixed(2)},${r.sellInc.toFixed(2)},${r.fee.toFixed(2)},${r.margin}`)
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'bulk-margin-calc.csv'
    a.click()
  }

  const inputStyle = {
    border: '0.5px solid var(--border-md)', borderRadius: 6, padding: '7px 10px',
    fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)',
    background: 'var(--surface)', color: 'var(--text)', outline: 'none',
  }

  return (
    <div style={{ maxWidth: 800 }}>
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
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
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

      {/* Shared ad spend (applies to both tabs) */}
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Ad spend (% of cost)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="number" min="0" max="30" step="0.5" value={ads}
            onChange={e => setAds(parseFloat(e.target.value) || 0)}
            style={{ ...inputStyle, width: 70, fontSize: 13 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>%</span>
          <input type="range" min="0" max="30" step="0.5" value={ads}
            onChange={e => setAds(parseFloat(e.target.value))}
            style={{ width: 120 }}
          />
        </div>
        {ads > 0 && <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Adds {ads}% to cost before margin calc</span>}
        {/* Presets */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { setMargin(p.margin); setAds(p.ads); setBulkMargin(p.margin) }} style={{
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
                <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>$</span>
                <input type="number" min="0" step="0.01" value={cost}
                  onChange={e => setCost(e.target.value)}
                  style={{ ...inputStyle, width: 110 }}
                />
                <input type="range" min="0.5" max="500" step="0.5"
                  value={parseFloat(cost) || 0}
                  onChange={e => setCost(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* Margin */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>Target margin</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" min="0" max="80" step="1" value={margin}
                  onChange={e => setMargin(parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, width: 80 }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>%</span>
                <input type="range" min="5" max="80" step="1" value={margin}
                  onChange={e => setMargin(parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* Breakdown */}
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 10 }}>
                Breakdown · {platform === 'ebay' ? '12.75%' : '15%'} fee + 10% GST
              </div>
              {[
                ['Cost (ex GST)',     fmt(costNum)],
                ads > 0 ? ['Ad spend', fmt(adsAmt)] : null,
                ads > 0 ? ['Effective cost', fmt(totalCost)] : null,
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
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>
                {fmt(sellEx)} ex GST
              </div>
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
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
                One per line: <span style={{ fontFamily: 'var(--font-mono)' }}>SKU, cost</span> — or just <span style={{ fontFamily: 'var(--font-mono)' }}>cost</span>
              </label>
              <textarea
                value={bulkSkus}
                onChange={e => setBulkSkus(e.target.value)}
                placeholder={"5CJ8830L12, 11.28\n2CJAXPO30, 17.00\nsor-bike-mt, 2.50"}
                rows={8}
                style={{
                  width: '100%', border: '0.5px solid var(--border-md)', borderRadius: 8,
                  padding: '10px 12px', fontSize: 12.5, fontFamily: 'var(--font-mono)',
                  background: 'var(--surface)', color: 'var(--text)', resize: 'vertical', outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Target margin</label>
              <input type="number" min="5" max="80" value={bulkMargin}
                onChange={e => setBulkMargin(parseFloat(e.target.value) || 0)}
                style={{ ...inputStyle, width: 70, fontSize: 13 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>%</span>
            </div>
            <Btn variant="primary" onClick={calcBulk}>Calculate all ↗</Btn>
          </div>

          {bulkResult && (
            <div style={{ flex: 2, minWidth: 320 }}>
              <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      {['SKU', 'Cost', 'Sell (inc GST)', 'Fee', 'Margin'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '0.5px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResult.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '0.5px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.sku}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>${r.cost.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--oak-mid)' }}>${r.sellInc.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>${r.fee.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{r.margin}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Btn size="sm" onClick={exportBulkCSV}>⬇ Export CSV</Btn>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

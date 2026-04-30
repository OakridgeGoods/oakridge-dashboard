import { useState } from 'react'
import { FEES } from '../lib/config'
import { Card, PageHeader, StatCard } from '../components/UI'

export default function MarginsPage() {
  const [cost, setCost]       = useState(11.28)
  const [margin, setMargin]   = useState(55)
  const [platform, setPlatform] = useState('ebay')

  const feeRate = FEES[platform]
  const gstRate = FEES.gst

  // Solve for sell price (ex GST) given cost, target margin, and platform fee
  // sell_ex = cost / (1 - margin% - feeRate)
  const sellEx    = cost / (1 - margin / 100 - feeRate)
  const sellInc   = sellEx * (1 + gstRate)
  const feeAmt    = sellEx * feeRate
  const gstAmt    = sellEx * gstRate
  const marginAmt = sellEx * (margin / 100)

  function fmt(n) { return isNaN(n) || !isFinite(n) ? '—' : `$${n.toFixed(2)}` }
  function fmtPct(n) { return `${n.toFixed(1)}%` }

  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="Margin Calculator" />

      {/* Platform toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {['ebay', 'amazon'].map(p => (
          <button key={p} onClick={() => setPlatform(p)} style={{
            padding: '6px 18px',
            borderRadius: 7,
            border: '0.5px solid',
            borderColor: platform === p ? 'var(--oak-lime)' : 'var(--border)',
            background: platform === p ? 'var(--oak-dark)' : 'transparent',
            color: platform === p ? 'var(--oak-lime)' : 'var(--text-2)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            textTransform: 'capitalize',
          }}>{p === 'ebay' ? 'eBay' : 'Amazon'}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Inputs */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
              Cost price (ex GST) — ${cost.toFixed(2)}
            </label>
            <input type="range" min="0.5" max="500" step="0.5" value={cost}
              onChange={e => setCost(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
              Target margin — {margin}%
            </label>
            <input type="range" min="5" max="80" step="1" value={margin}
              onChange={e => setMargin(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 600 }}>
              Fee breakdown ({platform === 'ebay' ? '12.75%' : '15%'} + 10% GST)
            </div>
            {[
              ['Cost price (ex GST)',  fmt(cost)],
              ['Platform fee',         fmt(feeAmt)],
              ['GST on sell price',    fmt(gstAmt)],
              ['Your margin $',        fmt(marginAmt)],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-2)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Result */}
        <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: 'var(--oak-dark)', borderRadius: 12, padding: '20px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Sell price (inc GST)
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--oak-lime)', fontFamily: 'var(--font-mono)' }}>
              {fmt(sellInc)}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
              {fmt(sellEx)} ex GST
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StatCard label="Margin $"   value={fmt(marginAmt)}  />
            <StatCard label="Margin %"   value={fmtPct(margin)}  />
            <StatCard label="Platform fee" value={fmt(feeAmt)}   />
            <StatCard label="GST"        value={fmt(gstAmt)}     />
          </div>

          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick reference</div>
            {[
              ['eBay fee rate',    '12.75%'],
              ['Amazon fee rate',  '15%'],
              ['GST rate',         '10%'],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12.5 }}>
                <span style={{ color: 'var(--text-2)' }}>{l}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { readSheet } from '../lib/sheets'
import { SHEETS, SHEET_TABS, R2_BASE, FEES } from '../lib/config'
import { Badge, Btn, Table, TR, TD, Mono, PageHeader, Spinner, EmptyState } from '../components/UI'

export default function CataloguePage({ token }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (token) load()
  }, [token])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const rows = await readSheet(SHEETS.datafeeds, SHEET_TABS.masterfeed)
      setProducts(rows)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = products.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (p.SKU || '').toLowerCase().includes(q) ||
      (p.Title || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q)
    )
  })

  function calcMargin(p) {
    const cost = parseFloat(p['costPrice (ex GST)'] || 0)
    const sell = parseFloat(p['eBay Sell Price (Inc GST)'] || 0)
    if (!sell) return null
    const sellEx = sell / 1.1
    const margin = ((sellEx - cost - sellEx * FEES.ebay) / sellEx * 100)
    return margin.toFixed(0)
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - var(--topbar-h) - 40px)' }}>
      {/* List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <PageHeader title="Catalogue">
          <Btn onClick={load} size="sm">↻ Refresh</Btn>
          <Btn variant="primary" size="sm" onClick={() => alert('Add Product — coming next')}>+ Add Product</Btn>
        </PageHeader>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search SKU, title or brand..."
          style={{
            width: '100%',
            border: '0.5px solid var(--border-md)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            background: 'var(--surface)',
            color: 'var(--text)',
            marginBottom: 14,
            outline: 'none',
          }}
        />

        {error && (
          <div style={{ background: '#fde8e8', border: '0.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#8b1a1a', fontSize: 13 }}>⚠ {error}</div>
        )}

        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', flex: 1, overflowY: 'auto' }}>
          {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No products found" /> : (
            <Table headers={['SKU','Title','Brand','Cost','eBay','Amazon','Margin','Stock','WH']}>
              {filtered.map(p => {
                const margin = calcMargin(p)
                const wh = p.warehouse === '1' ? 'Own' : 'DS'
                const isSelected = selected?.SKU === p.SKU
                return (
                  <TR key={p.SKU} onClick={() => setSelected(isSelected ? null : p)}>
                    <TD><Mono size={11}>{p.SKU}</Mono></TD>
                    <TD>
                      <div style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>
                        {p.Title || p.EbayTitle}
                      </div>
                    </TD>
                    <TD style={{ fontSize: 12, color: 'var(--text-2)' }}>{p.brand}</TD>
                    <TD><Mono>${parseFloat(p['costPrice (ex GST)'] || 0).toFixed(2)}</Mono></TD>
                    <TD><Mono>${parseFloat(p['eBay Sell Price (Inc GST)'] || 0).toFixed(2)}</Mono></TD>
                    <TD><Mono>${parseFloat(p['Amazon Sell Price (Inc GST)'] || 0).toFixed(2)}</Mono></TD>
                    <TD>
                      {margin !== null && (
                        <Badge type={parseInt(margin) >= 40 ? 'success' : 'warning'}>{margin}%</Badge>
                      )}
                    </TD>
                    <TD><Mono>{p.stockQty || 0}</Mono></TD>
                    <TD>
                      <span style={{
                        background: wh === 'Own' ? '#e0f2fe' : '#fff3cd',
                        color: wh === 'Own' ? '#075985' : '#7a5000',
                        borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 500,
                      }}>{wh}</span>
                    </TD>
                  </TR>
                )
              })}
            </Table>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && <ProductDetail product={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function ProductDetail({ product: p, onClose }) {
  const img1 = p.image1
  return (
    <div style={{
      width: 300,
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 12,
      padding: 20,
      flexShrink: 0,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Mono size={11}>{p.SKU}</Mono>
        <button onClick={onClose} style={{ border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {img1 && (
        <img src={img1} alt={p.SKU} style={{ width: '100%', borderRadius: 8, border: '0.5px solid var(--border)', objectFit: 'contain', maxHeight: 180 }} onError={e => e.target.style.display='none'} />
      )}

      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
        {p.Title || p.EbayTitle}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          ['Brand',        p.brand],
          ['Cost (ex GST)', `$${parseFloat(p['costPrice (ex GST)']||0).toFixed(2)}`],
          ['eBay price',   `$${parseFloat(p['eBay Sell Price (Inc GST)']||0).toFixed(2)}`],
          ['Amazon price', `$${parseFloat(p['Amazon Sell Price (Inc GST)']||0).toFixed(2)}`],
          ['Stock qty',    p.stockQty],
          ['Weight',       p.weight_g ? `${p.weight_g}g` : '—'],
          ['Dimensions',   p.length_cm ? `${p.length_cm}×${p.width_cm}×${p.height_cm} cm` : '—'],
          ['Category',     p.CategoryInternal],
          ['Packaging',    p.packagingPreset],
          ['eBay enabled', p.ebayEnabled === '1' || p.ebayEnabled === 'TRUE' ? '✓ Yes' : '✗ No'],
          ['Amazon enabled', p.amazonEnabled === '1' || p.amazonEnabled === 'TRUE' ? '✓ Yes' : '✗ No'],
        ].map(([label, val]) => val ? (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ color: 'var(--text-3)' }}>{label}</span>
            <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</span>
          </div>
        ) : null)}
      </div>

      {p.EbayItemId && (
        <a
          href={`https://www.ebay.com.au/itm/${p.EbayItemId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--oak-mid)', textDecoration: 'none' }}
        >
          View on eBay →
        </a>
      )}

      <Btn variant="primary" size="sm" onClick={() => alert('Edit product — full form coming next')}>
        Edit Product
      </Btn>
    </div>
  )
}

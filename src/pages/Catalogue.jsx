import { useState, useEffect } from 'react'
import { readSheet } from '../lib/sheets'
import { SHEETS, SHEET_TABS } from '../lib/config'
import { Badge, Btn, Table, TR, TD, Mono, PageHeader, Spinner, EmptyState } from '../components/UI'

const WH_FILTERS = ['All', 'Own stock', 'Dropship']

export default function CataloguePage({ token }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [whFilter, setWhFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [error, setError]       = useState(null)

  useEffect(() => { if (token) load() }, [token])

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
    const matchWh =
      whFilter === 'Own stock' ? p.warehouse === '1' :
      whFilter === 'Dropship'  ? p.warehouse !== '1' : true
    if (!matchWh) return false
    if (!search) return true
    const q = search.toLowerCase()
    return [p.SKU, p.Title, p.brand, p.EbayTitle].some(f => (f || '').toLowerCase().includes(q))
  })

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 52px - 48px)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <PageHeader title="Catalogue">
          <Btn onClick={load} size="sm">↻ Refresh</Btn>
          <Btn variant="primary" size="sm" onClick={() => alert('Add Product — coming next build')}>+ Add Product</Btn>
        </PageHeader>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search SKU, title, brand..."
            style={{ border: '0.5px solid var(--border-md)', borderRadius: 7, padding: '6px 12px', fontSize: 13, background: 'var(--surface)', color: 'var(--text)', outline: 'none', width: 260 }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {WH_FILTERS.map(f => (
              <button key={f} onClick={() => setWhFilter(f)} style={{
                padding: '5px 12px', borderRadius: 6, border: '0.5px solid',
                borderColor: whFilter === f ? 'var(--oak-lime)' : 'var(--border)',
                background: whFilter === f ? 'var(--oak-lime)' : 'transparent',
                color: whFilter === f ? 'var(--oak-dark)' : 'var(--text-2)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>{f}</button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{filtered.length} products</span>
        </div>

        {error && (
          <div style={{ background: '#fde8e8', border: '0.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#8b1a1a', fontSize: 13 }}>⚠ {error}</div>
        )}

        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', flex: 1, overflowY: 'auto' }}>
          {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No products found" /> : (
            <Table headers={['SKU', 'Title', 'Brand', 'Cost (ex GST)', 'eBay price', 'Amazon price', 'Stock', 'WH', 'eBay', 'AMZ']}>
              {filtered.map(p => {
                const wh = p.warehouse === '1' ? 'Own' : 'DS'
                const isSelected = selected?.SKU === p.SKU
                return (
                  <TR key={p.SKU} onClick={() => setSelected(isSelected ? null : p)}>
                    <TD><Mono size={11}>{p.SKU}</Mono></TD>
                    <TD>
                      <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {p.Title || p.EbayTitle}
                      </div>
                    </TD>
                    <TD style={{ fontSize: 12, color: 'var(--text-2)' }}>{p.brand}</TD>
                    <TD><Mono>${parseFloat(p['costPrice (ex GST)'] || 0).toFixed(2)}</Mono></TD>
                    <TD><Mono>${parseFloat(p['eBay Sell Price (Inc GST)'] || 0).toFixed(2)}</Mono></TD>
                    <TD><Mono>${parseFloat(p['Amazon Sell Price (Inc GST)'] || 0).toFixed(2)}</Mono></TD>
                    <TD><Mono>{p.stockQty || 0}</Mono></TD>
                    <TD>
                      <span style={{
                        background: wh === 'Own' ? '#e0f2fe' : '#fff3cd',
                        color: wh === 'Own' ? '#075985' : '#7a5000',
                        borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 500,
                      }}>{wh}</span>
                    </TD>
                    <TD style={{ fontSize: 12 }}>{p.ebayEnabled?.toString().toUpperCase() === 'TRUE' ? '✓' : '—'}</TD>
                    <TD style={{ fontSize: 12 }}>{p.amazonEnabled?.toString().toUpperCase() === 'TRUE' ? '✓' : '—'}</TD>
                  </TR>
                )
              })}
            </Table>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
          💡 Prices are read-only here. Edit pricing directly in Masterfeed, then refresh.
        </div>
      </div>

      {selected && <ProductDetail product={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function ProductDetail({ product: p, onClose }) {
  const [imgIdx, setImgIdx] = useState(0)
  const images = [p.image1, p.image2, p.image3, p.image4, p.image5, p.image6].filter(Boolean)

  return (
    <div style={{
      width: 320, background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 12, padding: 20, flexShrink: 0, overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Mono size={11}>{p.SKU}</Mono>
        <button onClick={onClose} style={{ border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
      </div>

      {images.length > 0 && (
        <div>
          <img
            src={images[imgIdx]} alt={p.SKU}
            style={{ width: '100%', borderRadius: 8, border: '0.5px solid var(--border)', objectFit: 'contain', maxHeight: 200, background: '#fafafa' }}
            onError={e => e.target.style.display = 'none'}
          />
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {images.map((img, i) => (
                <img key={i} src={img} alt="" onClick={() => setImgIdx(i)}
                  style={{ width: 44, height: 44, borderRadius: 5, objectFit: 'contain', border: imgIdx === i ? '2px solid var(--oak-lime)' : '0.5px solid var(--border)', cursor: 'pointer', background: '#fafafa' }}
                  onError={e => e.target.style.display = 'none'}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{p.Title || p.EbayTitle}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          ['Brand',           p.brand],
          ['Cost (ex GST)',   `$${parseFloat(p['costPrice (ex GST)'] || 0).toFixed(2)}`],
          ['eBay price',      `$${parseFloat(p['eBay Sell Price (Inc GST)'] || 0).toFixed(2)}`],
          ['Amazon price',    `$${parseFloat(p['Amazon Sell Price (Inc GST)'] || 0).toFixed(2)}`],
          ['RRP',             p.rrp ? `$${parseFloat(p.rrp).toFixed(2)}` : null],
          ['Stock qty',       p.stockQty],
          ['Weight',          p.weight_g ? `${p.weight_g}g` : null],
          ['Dimensions',      p.length_cm ? `${p.length_cm} × ${p.width_cm} × ${p.height_cm} cm` : null],
          ['Shipping class',  p['Shipping Class']],
          ['Packaging',       p.packagingPreset],
          ['Category',        p.CategoryInternal],
          ['Country',         p.countryOfOrigin],
          ['Warranty',        p.warrantyMonths ? `${p.warrantyMonths} months` : null],
          ['EAN',             p.EAN],
          ['ASIN',            p.asin],
          ['eBay Item ID',    p.EbayItemId],
        ].filter(([, v]) => v).map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, gap: 8 }}>
            <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>{label}</span>
            <span style={{ fontWeight: 500, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
          </div>
        ))}
      </div>

      {p.EbayItemId && (
        <a href={`https://www.ebay.com.au/itm/${p.EbayItemId}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--oak-mid)', textDecoration: 'none' }}>
          View on eBay →
        </a>
      )}
    </div>
  )
}
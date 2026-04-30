import { useState, useEffect } from 'react'
import { readSheet, updateRow } from '../lib/sheets'
import { SHEETS, SHEET_TABS, FEES } from '../lib/config'
import { Badge, Btn, Table, TR, TD, Mono, PageHeader, Spinner, EmptyState } from '../components/UI'

const WH_FILTERS = ['All', 'Own stock', 'Dropship']

function calcMarginPct(p) {
  const cost = parseFloat(p['costPrice (ex GST)'] || 0)
  const sell = parseFloat(p['eBay Sell Price (Inc GST)'] || 0)
  if (!sell || !cost) return null
  const sellEx = sell / 1.1
  return ((sellEx - cost - sellEx * FEES.ebay) / sellEx * 100).toFixed(0)
}

export default function CataloguePage({ token }) {
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [whFilter, setWhFilter]     = useState('All')
  const [selected, setSelected]     = useState(null)
  const [editing, setEditing]       = useState({})      // {lineItemId: {field: value}}
  const [saving, setSaving]         = useState({})
  const [confirmModal, setConfirmModal] = useState(null) // {sku, field, oldVal, newVal, pct}
  const [error, setError]           = useState(null)

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

  function startEdit(sku, field, currentVal) {
    setEditing(e => ({ ...e, [`${sku}_${field}`]: currentVal }))
  }

  function editVal(sku, field) {
    return editing[`${sku}_${field}`]
  }

  function isEditing(sku, field) {
    return editing.hasOwnProperty(`${sku}_${field}`)
  }

  function cancelEdit(sku, field) {
    const key = `${sku}_${field}`
    setEditing(e => { const n = { ...e }; delete n[key]; return n })
  }

  function requestSave(sku, field, oldVal, newVal) {
    const oldNum = parseFloat(oldVal) || 0
    const newNum = parseFloat(newVal) || 0
    if (!newNum) return
    const pct = oldNum ? Math.abs((newNum - oldNum) / oldNum * 100) : 0

    if (pct > 30) {
      setConfirmModal({ sku, field, oldVal, newVal, pct: pct.toFixed(1) })
    } else {
      doSave(sku, field, newVal)
    }
  }

  async function doSave(sku, field, newVal) {
    setConfirmModal(null)
    setSaving(s => ({ ...s, [`${sku}_${field}`]: true }))
    try {
      await updateRow(SHEETS.datafeeds, SHEET_TABS.masterfeed, products, 'SKU', sku, { [field]: newVal })
      await load()
      cancelEdit(sku, field)
    } catch (e) {
      alert('Error saving: ' + e.message)
    } finally {
      setSaving(s => ({ ...s, [`${sku}_${field}`]: false }))
    }
  }

  const PRICE_FIELDS = [
    { key: 'eBay Sell Price (Inc GST)',    label: 'eBay' },
    { key: 'Amazon Sell Price (Inc GST)',  label: 'Amazon' },
    { key: 'costPrice (ex GST)',           label: 'Cost' },
  ]

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 52px - 48px)', position: 'relative' }}>

      {/* Confirm modal */}
      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 22, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Large price change detected</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.6 }}>
              You're changing <strong>{confirmModal.field}</strong> for <Mono size={12}>{confirmModal.sku}</Mono> by <strong style={{ color: '#d97706' }}>{confirmModal.pct}%</strong>.<br />
              From <strong>${parseFloat(confirmModal.oldVal).toFixed(2)}</strong> → <strong>${parseFloat(confirmModal.newVal).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn onClick={() => { setConfirmModal(null); cancelEdit(confirmModal.sku, confirmModal.field) }}>Cancel</Btn>
              <Btn variant="primary" onClick={() => doSave(confirmModal.sku, confirmModal.field, confirmModal.newVal)}>
                Confirm change
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Main list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <PageHeader title="Catalogue">
          <Btn onClick={load} size="sm">↻ Refresh</Btn>
          <Btn variant="primary" size="sm" onClick={() => alert('Add Product — coming next build')}>+ Add Product</Btn>
        </PageHeader>

        {/* Search + WH filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search SKU, title, brand..."
            style={{
              border: '0.5px solid var(--border-md)', borderRadius: 7, padding: '6px 12px',
              fontSize: 13, background: 'var(--surface)', color: 'var(--text)', outline: 'none', width: 260,
            }}
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
            <Table headers={['SKU', 'Title', 'Brand', 'Cost', 'eBay price', 'Amazon price', 'Margin', 'Stock', 'WH', 'eBay', 'AMZ']}>
              {filtered.map(p => {
                const margin = calcMarginPct(p)
                const wh = p.warehouse === '1' ? 'Own' : 'DS'
                const isSelected = selected?.SKU === p.SKU

                return (
                  <TR key={p.SKU} onClick={() => setSelected(isSelected ? null : p)}>
                    <TD><Mono size={11}>{p.SKU}</Mono></TD>
                    <TD>
                      <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {p.Title || p.EbayTitle}
                      </div>
                    </TD>
                    <TD style={{ fontSize: 12, color: 'var(--text-2)' }}>{p.brand}</TD>

                    {/* Editable price cells */}
                    {PRICE_FIELDS.map(({ key }) => (
                      <TD key={key} onClick={e => e.stopPropagation()}>
                        {isEditing(p.SKU, key) ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>$</span>
                            <input
                              autoFocus
                              type="number"
                              step="0.01"
                              defaultValue={parseFloat(p[key] || 0).toFixed(2)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') requestSave(p.SKU, key, p[key], e.target.value)
                                if (e.key === 'Escape') cancelEdit(p.SKU, key)
                              }}
                              onBlur={e => requestSave(p.SKU, key, p[key], e.target.value)}
                              style={{
                                width: 70, border: '0.5px solid var(--oak-lime)', borderRadius: 4,
                                padding: '3px 5px', fontSize: 12, fontFamily: 'var(--font-mono)',
                                background: 'var(--surface)', color: 'var(--text)', outline: 'none',
                              }}
                            />
                            {saving[`${p.SKU}_${key}`] && <span style={{ fontSize: 10 }}>…</span>}
                          </div>
                        ) : (
                          <span
                            title="Click to edit"
                            onClick={() => startEdit(p.SKU, key, p[key])}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, cursor: 'text', borderBottom: '1px dashed transparent' }}
                            onMouseEnter={e => e.target.style.borderBottomColor = 'var(--oak-lime)'}
                            onMouseLeave={e => e.target.style.borderBottomColor = 'transparent'}
                          >
                            ${parseFloat(p[key] || 0).toFixed(2)}
                          </span>
                        )}
                      </TD>
                    ))}

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
                    <TD>
                      <span style={{ fontSize: 12 }}>{p.ebayEnabled === '1' || p.ebayEnabled?.toString().toUpperCase() === 'TRUE' ? '✓' : '—'}</span>
                    </TD>
                    <TD>
                      <span style={{ fontSize: 12 }}>{p.amazonEnabled === '1' || p.amazonEnabled?.toString().toUpperCase() === 'TRUE' ? '✓' : '—'}</span>
                    </TD>
                  </TR>
                )
              })}
            </Table>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
          💡 Click any price to edit inline. Changes over 30% require confirmation before saving to Masterfeed.
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <ProductDetail
          product={selected}
          onClose={() => setSelected(null)}
        />
      )}
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

      {/* Image gallery */}
      {images.length > 0 && (
        <div>
          <img
            src={images[imgIdx]}
            alt={p.SKU}
            style={{ width: '100%', borderRadius: 8, border: '0.5px solid var(--border)', objectFit: 'contain', maxHeight: 200, background: '#fafafa' }}
            onError={e => e.target.style.display = 'none'}
          />
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  onClick={() => setImgIdx(i)}
                  style={{
                    width: 44, height: 44, borderRadius: 5, objectFit: 'contain',
                    border: imgIdx === i ? '2px solid var(--oak-lime)' : '0.5px solid var(--border)',
                    cursor: 'pointer', background: '#fafafa',
                  }}
                  onError={e => e.target.style.display = 'none'}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{p.Title || p.EbayTitle}</div>

      {/* Key details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          ['Brand',          p.brand],
          ['Cost (ex GST)',  `$${parseFloat(p['costPrice (ex GST)'] || 0).toFixed(2)}`],
          ['eBay price',     `$${parseFloat(p['eBay Sell Price (Inc GST)'] || 0).toFixed(2)}`],
          ['Amazon price',   `$${parseFloat(p['Amazon Sell Price (Inc GST)'] || 0).toFixed(2)}`],
          ['Stock qty',      p.stockQty],
          ['Weight',         p.weight_g ? `${p.weight_g}g` : '—'],
          ['Dimensions',     p.length_cm ? `${p.length_cm} × ${p.width_cm} × ${p.height_cm} cm` : '—'],
          ['Category',       p.CategoryInternal],
          ['Sub-category',   p.SubcategoryInternal],
          ['Packaging',      p.packagingPreset],
          ['Country',        p.countryOfOrigin],
          ['Warranty',       p.warrantyMonths ? `${p.warrantyMonths} months` : '—'],
          ['EAN',            p.EAN],
          ['ASIN',           p.asin],
        ].filter(([, v]) => v && v !== '—').map(([label, val]) => (
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

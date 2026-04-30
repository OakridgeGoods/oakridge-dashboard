import { useState, useEffect } from 'react'
import { readSheet, updateRow } from '../lib/sheets'
import { SHEETS, SHEET_TABS } from '../lib/config'
import { Badge, Btn, StatCard, Table, TR, TD, Mono, PageHeader, Spinner, EmptyState, Input } from '../components/UI'

const FILTERS = ['All', 'Needs Tracking', 'Fulfilled']

function statusBadge(row) {
  const tracking = row.trackingNumber
  const pushed   = row.trackingPushed
  if (pushed === '1' || pushed === 'true' || pushed === 'ORDER_DONE') return <Badge type="success">Pushed</Badge>
  if (tracking) return <Badge type="info">Tracking added</Badge>
  if (row.fulfillmentStatus === 'FULFILLED' || row.fulfillmentStatus === 'Shipped') return <Badge type="success">Fulfilled</Badge>
  return <Badge type="warning">Needs tracking</Badge>
}

function needsTracking(row) {
  return !row.trackingNumber || row.trackingNumber === ''
}

export default function OrdersPage({ token }) {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('All')
  const [tracking, setTracking] = useState({}) // {lineItemId: value}
  const [pushing, setPushing]   = useState({})
  const [error, setError]       = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const rows = await readSheet(SHEETS.compiledOrders, SHEET_TABS.allOrders)
      setOrders(rows)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (token) load() }, [token])

  const filtered = orders.filter(o => {
    if (filter === 'Needs Tracking') return needsTracking(o)
    if (filter === 'Fulfilled') return !needsTracking(o)
    return true
  })

  const needsCount = orders.filter(needsTracking).length

  async function pushTracking(order) {
    const val = tracking[order.lineItemId] || order.trackingNumber
    if (!val) return alert('Enter a tracking number first')

    setPushing(p => ({ ...p, [order.lineItemId]: true }))
    try {
      await updateRow(
        SHEETS.compiledOrders,
        SHEET_TABS.allOrders,
        orders,
        'lineItemId',
        order.lineItemId,
        {
          trackingNumber: val,
          trackingCarrier: 'AUSTRALIA_POST',
        }
      )
      // Refresh
      await load()
    } catch (e) {
      alert('Error writing tracking: ' + e.message)
    } finally {
      setPushing(p => ({ ...p, [order.lineItemId]: false }))
    }
  }

  // Download AusPost label CSV
  function downloadLabelCSV() {
    const toLabel = orders.filter(needsTracking)
    if (!toLabel.length) return alert('No orders need labelling')

    const headers = [
      'Sender Name','Sender Address','Sender Suburb','Sender State','Sender Postcode',
      'Receiver Name','Receiver Address','Receiver Suburb','Receiver State','Receiver Postcode',
      'Weight (kg)','Length (cm)','Width (cm)','Height (cm)',
      'Product','Reference','Authority to Leave','Safe Drop'
    ].join(',')

    const rows = toLabel.map(o => [
      'Oakridge Goods', '123 Your Street', 'Box Hill', 'VIC', '3128',
      o['Recipient Name'],
      `"${o.Address}${o['Address'] && o['Suburb'] ? '' : ''}"`,
      o.Suburb, o.State, o.Postcode,
      '', '', '', '',
      'eParcel', o.orderId, 'No', 'No'
    ].join(','))

    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `auspost-labels-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  return (
    <div>
      <PageHeader title="Orders">
        <Btn onClick={load} size="sm">↻ Refresh</Btn>
        <Btn onClick={downloadLabelCSV} size="sm">⬇ AusPost CSV</Btn>
        <Btn variant="primary" size="sm" onClick={load}>Pull Orders ↗</Btn>
      </PageHeader>

      {error && (
        <div style={{ background: '#fde8e8', border: '0.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#8b1a1a', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Orders"     value={orders.length}    sub="All time" />
        <StatCard label="Needs Tracking"   value={needsCount}       accent={needsCount > 0 ? '#d97706' : undefined} sub="Action required" />
        <StatCard label="Fulfilled"        value={orders.length - needsCount} accent="#3d8b1a" sub="Tracking pushed" />
        <StatCard label="Revenue"
          value={'$' + orders.reduce((s, o) => s + parseFloat(o.orderTotal || 0), 0).toFixed(0)}
          sub="All time (est.)"
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 14px',
            borderRadius: 6,
            border: '0.5px solid',
            borderColor: filter === f ? 'var(--oak-lime)' : 'var(--border)',
            background: filter === f ? 'var(--oak-lime)' : 'transparent',
            color: filter === f ? 'var(--oak-dark)' : 'var(--text-2)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No orders found" /> : (
          <Table headers={['Source','Order ID','SKU','Recipient','Ship By','Status','Tracking','']}>
            {filtered.map(o => (
              <TR key={o.lineItemId}>
                <TD><Badge type={o.source === 'EBAY' ? 'ebay' : 'amazon'}>{o.source}</Badge></TD>
                <TD><Mono>{o.orderId}</Mono></TD>
                <TD>
                  <div><Mono size={11}>{o.SKU}</Mono></div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.Item}</div>
                </TD>
                <TD>
                  <div style={{ fontSize: 13 }}>{o['Recipient Name']}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{o.Suburb} {o.State}</div>
                </TD>
                <TD style={{ fontSize: 12, color: 'var(--text-2)' }}>{o['Ship By'] ? new Date(o['Ship By']).toLocaleDateString('en-AU') : '—'}</TD>
                <TD>{statusBadge(o)}</TD>
                <TD>
                  {needsTracking(o) ? (
                    <Input
                      value={tracking[o.lineItemId] || ''}
                      onChange={v => setTracking(t => ({ ...t, [o.lineItemId]: v }))}
                      placeholder="Enter tracking..."
                      style={{ width: 200 }}
                    />
                  ) : (
                    <Mono size={11} style={{ color: 'var(--text-3)' }}>
                      {(o.trackingNumber || '').slice(0, 18)}{o.trackingNumber?.length > 18 ? '…' : ''}
                    </Mono>
                  )}
                </TD>
                <TD>
                  {needsTracking(o) ? (
                    <Btn
                      variant="primary"
                      size="sm"
                      disabled={pushing[o.lineItemId]}
                      onClick={() => pushTracking(o)}
                    >
                      {pushing[o.lineItemId] ? '...' : 'Save ↗'}
                    </Btn>
                  ) : (
                    <Btn size="sm" disabled style={{ opacity: 0.35 }}>Saved</Btn>
                  )}
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </div>
    </div>
  )
}

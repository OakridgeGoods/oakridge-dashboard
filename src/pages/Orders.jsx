import { useState, useEffect } from 'react'
import { readSheet, updateRow } from '../lib/sheets'
import { SHEETS, SHEET_TABS } from '../lib/config'
import { Badge, Btn, StatCard, Table, TR, TD, Mono, PageHeader, Spinner, EmptyState, Input } from '../components/UI'

const FILTERS = ['All', 'Needs Tracking', 'Fulfilled']

function needsTracking(row) {
  return !row.trackingNumber || row.trackingNumber.trim() === ''
}

function statusBadge(row) {
  if (row.trackingPushed === '1' || row.trackingPushed === 'ORDER_DONE') return <Badge type="success">Pushed ✓</Badge>
  if (!needsTracking(row)) return <Badge type="info">Tracking saved</Badge>
  if (row.fulfillmentStatus === 'FULFILLED' || row.fulfillmentStatus === 'Shipped') return <Badge type="success">Fulfilled</Badge>
  return <Badge type="warning">Needs tracking</Badge>
}

export default function OrdersPage({ token }) {
  const [orders, setOrders]     = useState([])
  const [log, setLog]           = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('All')
  const [tracking, setTracking] = useState({})
  const [saving, setSaving]     = useState({})
  const [error, setError]       = useState(null)
  const [tab, setTab]           = useState('orders') // 'orders' | 'log'
  const [search, setSearch]     = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [orderRows, logRows] = await Promise.all([
        readSheet(SHEETS.compiledOrders, SHEET_TABS.allOrders),
        readSheet(SHEETS.compiledOrders, SHEET_TABS.log),
      ])
      setOrders(orderRows)
      setLog(logRows.reverse()) // most recent first
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (token) load() }, [token])

  const filtered = orders.filter(o => {
    const matchFilter =
      filter === 'Needs Tracking' ? needsTracking(o) :
      filter === 'Fulfilled'      ? !needsTracking(o) : true
    const q = search.toLowerCase()
    const matchSearch = !q || [o.orderId, o.SKU, o['Recipient Name'], o.Item].some(f => (f || '').toLowerCase().includes(q))
    return matchFilter && matchSearch
  })

  const needsCount = orders.filter(needsTracking).length

  async function saveTracking(order) {
    const val = (tracking[order.lineItemId] || '').trim()
    if (!val) return alert('Enter a tracking number first')

    setSaving(s => ({ ...s, [order.lineItemId]: true }))
    try {
      await updateRow(
        SHEETS.compiledOrders,
        SHEET_TABS.allOrders,
        orders,
        'lineItemId',
        order.lineItemId,
        { trackingNumber: val, trackingCarrier: 'AUSTRALIA_POST' }
      )
      await load()
    } catch (e) {
      alert('Error saving tracking: ' + e.message)
    } finally {
      setSaving(s => ({ ...s, [order.lineItemId]: false }))
    }
  }

  function downloadAuspostCSV() {
    const toLabel = orders.filter(needsTracking)
    if (!toLabel.length) return alert('No unfulfilled orders to label')

    const header = [
      'Sender Name', 'Sender Address', 'Sender Suburb', 'Sender State', 'Sender Postcode',
      'Receiver Name', 'Receiver Address', 'Receiver Suburb', 'Receiver State', 'Receiver Postcode',
      'Product ID', 'Weight (kg)', 'Length (cm)', 'Width (cm)', 'Height (cm)',
      'Reference', 'Authority to Leave', 'Safe Drop', 'Contains Dangerous Goods'
    ].join(',')

    const rows = toLabel.map(o => [
      'Oakridge Goods',
      '"Your Street Address"',
      'Box Hill', 'VIC', '3128',
      `"${o['Recipient Name'] || ''}"`,
      `"${[o.Address, o.address2].filter(Boolean).join(', ')}"`,
      `"${o.Suburb || ''}"`,
      o.State || '',
      o.Postcode || '',
      'EP',   // eParcel — change to 'PARAP' for Parcel Post
      '',     // weight — blank so AusPost uses defaults
      '', '', '',
      o.orderId,
      'No', 'No', 'No'
    ].join(','))

    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `auspost-labels-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const logEventColor = (event) => {
    if (event?.includes('ERROR')) return '#8b1a1a'
    if (event?.includes('PUSHED') || event?.includes('COMPLETE') || event?.includes('DONE')) return '#2d5a0e'
    return 'var(--text-2)'
  }

  return (
    <div>
      <PageHeader title="Orders">
        <Btn onClick={load} size="sm">↻ Refresh</Btn>
        <Btn onClick={downloadAuspostCSV} size="sm">⬇ AusPost CSV</Btn>
      </PageHeader>

      {error && (
        <div style={{ background: '#fde8e8', border: '0.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#8b1a1a', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Orders"    value={orders.length}           sub="All time" />
        <StatCard label="Needs Tracking"  value={needsCount}              accent={needsCount > 0 ? '#d97706' : undefined} sub="Action required" />
        <StatCard label="Fulfilled"       value={orders.length - needsCount} accent="#3d8b1a" sub="Tracking saved" />
        <StatCard label="Revenue (est.)"  value={'$' + orders.reduce((s, o) => s + parseFloat(o.orderTotal || 0), 0).toFixed(0)} sub="All time" />
      </div>

      {/* Page tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[['orders', 'Orders'], ['log', 'Run Log']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '5px 14px', borderRadius: 6, border: '0.5px solid',
            borderColor: tab === id ? 'var(--oak-lime)' : 'var(--border)',
            background: tab === id ? 'var(--oak-lime)' : 'transparent',
            color: tab === id ? 'var(--oak-dark)' : 'var(--text-2)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'orders' && (
        <>
          {/* Search + filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search order ID, SKU, recipient..."
              style={{
                border: '0.5px solid var(--border-md)', borderRadius: 7, padding: '6px 12px',
                fontSize: 13, background: 'var(--surface)', color: 'var(--text)', outline: 'none', width: 280,
              }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '5px 12px', borderRadius: 6, border: '0.5px solid',
                  borderColor: filter === f ? 'var(--oak-lime)' : 'var(--border)',
                  background: filter === f ? 'var(--oak-lime)' : 'transparent',
                  color: filter === f ? 'var(--oak-dark)' : 'var(--text-2)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}>{f}</button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No orders found" /> : (
              <Table headers={['Source', 'Order ID', 'SKU / Item', 'Recipient', 'Ship By', 'Status', 'Tracking number', '']}>
                {filtered.map(o => (
                  <TR key={o.lineItemId}>
                    <TD><Badge type={o.source === 'EBAY' ? 'ebay' : 'amazon'}>{o.source}</Badge></TD>
                    <TD><Mono size={11}>{o.orderId}</Mono></TD>
                    <TD>
                      <div><Mono size={11}>{o.SKU}</Mono></div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.Item}</div>
                    </TD>
                    <TD>
                      <div style={{ fontSize: 13 }}>{o['Recipient Name']}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{o.Suburb} {o.State} {o.Postcode}</div>
                    </TD>
                    <TD style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {o['Ship By'] ? new Date(o['Ship By']).toLocaleDateString('en-AU') : '—'}
                    </TD>
                    <TD>{statusBadge(o)}</TD>
                    <TD>
                      {needsTracking(o) ? (
                        <input
                          value={tracking[o.lineItemId] || ''}
                          onChange={e => setTracking(t => ({ ...t, [o.lineItemId]: e.target.value }))}
                          placeholder="Enter tracking number..."
                          style={{
                            border: '0.5px solid var(--border-md)', borderRadius: 6, padding: '5px 8px',
                            fontSize: 12, fontFamily: 'var(--font-mono)', background: 'var(--bg)',
                            color: 'var(--text)', outline: 'none', width: 210,
                          }}
                        />
                      ) : (
                        <Mono size={11} style={{ color: 'var(--text-3)' }}>
                          {(o.trackingNumber || '').slice(0, 20)}{(o.trackingNumber || '').length > 20 ? '…' : ''}
                        </Mono>
                      )}
                    </TD>
                    <TD>
                      {needsTracking(o) ? (
                        <Btn
                          variant="primary"
                          size="sm"
                          disabled={saving[o.lineItemId] || !tracking[o.lineItemId]}
                          onClick={() => saveTracking(o)}
                        >
                          {saving[o.lineItemId] ? 'Saving…' : 'Save →'}
                        </Btn>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>✓ Saved</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </Table>
            )}
          </div>
        </>
      )}

      {tab === 'log' && (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? <Spinner /> : log.length === 0 ? <EmptyState message="No log entries found" /> : (
            <Table headers={['Timestamp', 'Event', 'Order ID', 'Details']}>
              {log.slice(0, 100).map((l, i) => (
                <TR key={i}>
                  <TD><Mono size={11} style={{ color: 'var(--text-3)' }}>{l.timestamp}</Mono></TD>
                  <TD>
                    <span style={{ fontSize: 11, fontWeight: 600, color: logEventColor(l.event), fontFamily: 'var(--font-mono)' }}>
                      {l.event}
                    </span>
                  </TD>
                  <TD><Mono size={11}>{l.orderId || '—'}</Mono></TD>
                  <TD style={{ fontSize: 11.5, color: 'var(--text-2)', maxWidth: 400, wordBreak: 'break-all' }}>
                    {l.details || l.source || ''}
                  </TD>
                </TR>
              ))}
            </Table>
          )}
        </div>
      )}
    </div>
  )
}

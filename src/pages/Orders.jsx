import { useState, useEffect } from 'react'
import { readSheet, updateRow } from '../lib/sheets'
import { SHEETS, SHEET_TABS } from '../lib/config'
import { Badge, Btn, StatCard, Table, TR, TD, Mono, PageHeader, Spinner, EmptyState } from '../components/UI'

const SENDER = {
  name:     'Oakridge Goods',
  business: 'Oakridge Goods',
  address1: 'Your Street Address',
  address2: '', address3: '',
  suburb:   'Box Hill',
  state:    'VIC',
  postcode: '3128',
  phone:    '',
  email:    'admin@oakridgegoods.com.au',
}

function needsTracking(row) {
  return !row.trackingNumber || row.trackingNumber.trim() === ''
}

function getStatus(row) {
  if (row.trackingPushed === 'TRUE' || row.trackingPushed === '1') return 'pushed'
  if (!needsTracking(row)) return 'saved'
  return 'pending'
}

function StatusBadge({ row }) {
  const s = getStatus(row)
  if (s === 'pushed') return <Badge type="success">Pushed ✓</Badge>
  if (s === 'saved')  return <Badge type="info">Tracking saved</Badge>
  return <Badge type="warning">Needs tracking</Badge>
}

function stateAbbr(state) {
  const map = { 'Victoria': 'VIC', 'New South Wales': 'NSW', 'Queensland': 'QLD', 'South Australia': 'SA', 'Western Australia': 'WA', 'Tasmania': 'TAS', 'Northern Territory': 'NT', 'Australian Capital Territory': 'ACT' }
  return map[state] || state
}

const FILTERS = ['Unsent', 'All', 'Fulfilled']

export default function OrdersPage({ token }) {
  const [orders, setOrders]       = useState([])
  const [log, setLog]             = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('Unsent')
  const [search, setSearch]       = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [tracking, setTracking]   = useState({})
  const [saving, setSaving]       = useState({})
  const [error, setError]         = useState(null)
  const [tab, setTab]             = useState('orders')
  const [errorDismissed, setErrorDismissed] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    setErrorDismissed(false)
    try {
      const [orderRows, logRows] = await Promise.all([
        readSheet(SHEETS.compiledOrders, SHEET_TABS.allOrders),
        readSheet(SHEETS.compiledOrders, SHEET_TABS.log),
      ])
      setOrders(orderRows)
      setLog(logRows.reverse())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (token) load() }, [token])

  const filtered = orders.filter(o => {
    if (filter === 'Unsent'    && !needsTracking(o)) return false
    if (filter === 'Fulfilled' && needsTracking(o))  return false
    if (dateFrom || dateTo) {
      const created = new Date(o.Created)
      if (dateFrom && created < new Date(dateFrom)) return false
      if (dateTo   && created > new Date(dateTo + 'T23:59:59')) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (![o.orderId, o.SKU, o['Recipient Name'], o.Item].some(f => (f || '').toLowerCase().includes(q))) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => new Date(a['Ship By'] || '9999') - new Date(b['Ship By'] || '9999'))

  const needsCount  = orders.filter(needsTracking).length
  const errorLogs   = log.filter(l => (l.event || '').includes('ERROR'))
  const errorCount  = errorLogs.length
  const showErrorBanner = errorCount > 0 && !errorDismissed

  async function saveTracking(order) {
    const val = (tracking[order.lineItemId] || '').trim()
    if (!val) return alert('Enter a tracking number first')
    setSaving(s => ({ ...s, [order.lineItemId]: true }))
    try {
      await updateRow(SHEETS.compiledOrders, SHEET_TABS.allOrders, orders, 'lineItemId', order.lineItemId, {
        trackingNumber: val, trackingCarrier: 'AUSTRALIA_POST',
      })
      await load()
    } catch (e) {
      alert('Error saving: ' + e.message)
    } finally {
      setSaving(s => ({ ...s, [order.lineItemId]: false }))
    }
  }

  function exportAusPost() {
    const toExport = orders.filter(o => needsTracking(o) && (o.warehouse === '1' || o.warehouse === 1))
    if (!toExport.length) return alert('No pending own-stock orders to export')

    const headers = [
      'Additional Label Information 1','Send Tracking Notifications',
      'Send From Name','Send From Business Name','Send From Address Line 1','Send From Address Line 2','Send From Address Line 3',
      'Send From Suburb','Send From State','Send From Postcode','Send From Phone Number','Send From Email Address',
      'Deliver To Name','Deliver To MyPost Number','Deliver To Business Name','Deliver To Type Of Address',
      'Deliver To Address Line 1','Deliver To Address Line 2','Deliver To Address Line 3',
      'Deliver To Suburb','Deliver To State','Deliver To Postcode','Deliver To Phone Number','Deliver To Email Address',
      'Item Packaging Type','Item Delivery Service','Item Description',
      'Item Length','Item Width','Item Height','Item Weight',
      'Item Dangerous Goods Flag','Signature On Delivery','Extra Cover Amount',
    ]

    const csvCell = val => {
      const s = String(val ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }

    const rows = toExport.map(o => {
      const addrParts = (o.Address || '').split(',').map(s => s.trim())
      return [
        o.orderId, 'Yes',
        SENDER.name, SENDER.business, SENDER.address1, SENDER.address2, SENDER.address3,
        SENDER.suburb, SENDER.state, SENDER.postcode, SENDER.phone, SENDER.email,
        o['Recipient Name'] || '', '', '', 'Residence',
        addrParts[0] || '', addrParts[1] || '', '',
        o.Suburb || '', stateAbbr(o.State || ''), o.Postcode || '', '', '',
        'Parcel', 'AUS_PARCEL_REGULAR',
        (o.Item || o.SKU || '').slice(0, 50),
        '', '', '', '', 'N', 'N', '',
      ].map(csvCell).join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `auspost-import-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  function logColor(event) {
    if ((event || '').includes('ERROR'))   return '#8b1a1a'
    if ((event || '').includes('PUSHED') || (event || '').includes('SUMMARY')) return '#2d5a0e'
    return 'var(--text-2)'
  }

  return (
    <div>
      <PageHeader title="Orders">
        <Btn onClick={load} size="sm">↻ Refresh</Btn>
        <Btn onClick={exportAusPost} size="sm">⬇ AusPost Export</Btn>
      </PageHeader>

      {/* API error */}
      {error && (
        <div style={{ background: '#fde8e8', border: '0.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#8b1a1a', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Log error banner — dismissible */}
      {showErrorBanner && (
        <div style={{ background: '#fff3cd', border: '0.5px solid #f59e0b', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#7a5000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span>⚠ {errorCount} error{errorCount !== 1 ? 's' : ''} in run log — check the Run Log tab for details</span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setTab('log')} style={{ fontSize: 12, color: '#7a5000', background: 'none', border: '0.5px solid #f59e0b', borderRadius: 5, padding: '2px 10px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              View log
            </button>
            <button onClick={() => setErrorDismissed(true)} style={{ fontSize: 12, color: '#7a5000', background: 'none', border: '0.5px solid #f59e0b', borderRadius: 5, padding: '2px 10px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              ✕ Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Orders"   value={orders.length}              sub="All time" />
        <StatCard label="Needs Tracking" value={needsCount}                 accent={needsCount > 0 ? '#d97706' : undefined} sub="Action required" />
        <StatCard label="Fulfilled"      value={orders.length - needsCount} accent="#3d8b1a" sub="Tracking saved" />
        <StatCard label="Log Errors"     value={errorCount}                 accent={errorCount > 0 ? '#8b1a1a' : undefined} sub="Recent runs" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[['orders', 'Orders'], ['log', 'Run Log']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '5px 14px', borderRadius: 6, border: '0.5px solid',
            borderColor: tab === id ? 'var(--oak-lime)' : 'var(--border)',
            background: tab === id ? 'var(--oak-lime)' : 'transparent',
            color: tab === id ? 'var(--oak-dark)' : 'var(--text-2)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            {label}
            {id === 'log' && errorCount > 0 && (
              <span style={{ marginLeft: 6, background: '#8b1a1a', color: '#fff', borderRadius: 8, padding: '0 5px', fontSize: 10 }}>{errorCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order, SKU, recipient..."
              style={{ border: '0.5px solid var(--border-md)', borderRadius: 7, padding: '6px 12px', fontSize: 13, background: 'var(--surface)', color: 'var(--text)', outline: 'none', width: 240 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>From</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ border: '0.5px solid var(--border-md)', borderRadius: 6, padding: '5px 8px', fontSize: 12, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>To</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ border: '0.5px solid var(--border-md)', borderRadius: 6, padding: '5px 8px', fontSize: 12, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
              />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo('') }} style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              )}
            </div>
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
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
              {sorted.length} orders · sorted by Ship By ↑
            </span>
          </div>

          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {loading ? <Spinner /> : sorted.length === 0 ? <EmptyState message="No orders found" /> : (
              <Table headers={['Source', 'Order ID', 'SKU / Item', 'Recipient', 'Created', 'Ship By', 'WH', 'Status', 'Tracking', '']}>
                {sorted.map(o => {
                  const urgent = o['Ship By'] && new Date(o['Ship By']) < new Date(Date.now() + 24 * 60 * 60 * 1000)
                  return (
                    <TR key={o.lineItemId}>
                      <TD><Badge type={o.source === 'EBAY' ? 'ebay' : 'amazon'}>{o.source}</Badge></TD>
                      <TD><Mono size={11}>{o.orderId}</Mono></TD>
                      <TD>
                        <div><Mono size={11}>{o.SKU}</Mono></div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.Item}</div>
                      </TD>
                      <TD>
                        <div style={{ fontSize: 13 }}>{o['Recipient Name']}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{o.Suburb} {stateAbbr(o.State || '')} {o.Postcode}</div>
                      </TD>
                      <TD style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                        {o.Created ? new Date(o.Created).toLocaleDateString('en-AU') : '—'}
                      </TD>
                      <TD>
                        <span style={{ fontSize: 12, fontWeight: 500, color: urgent && needsTracking(o) ? '#8b1a1a' : 'var(--text-2)' }}>
                          {o['Ship By'] ? new Date(o['Ship By']).toLocaleDateString('en-AU') : '—'}
                          {urgent && needsTracking(o) ? ' ⚠' : ''}
                        </span>
                      </TD>
                      <TD>
                        <span style={{ fontSize: 11, fontWeight: 500, borderRadius: 4, padding: '2px 6px', background: o.warehouse === '1' ? '#e0f2fe' : '#fff3cd', color: o.warehouse === '1' ? '#075985' : '#7a5000' }}>
                          {o.warehouse === '1' ? 'Own' : 'DS'}
                        </span>
                      </TD>
                      <TD><StatusBadge row={o} /></TD>
                      <TD>
                        {needsTracking(o) ? (
                          <input value={tracking[o.lineItemId] || ''} onChange={e => setTracking(t => ({ ...t, [o.lineItemId]: e.target.value }))}
                            placeholder="Enter tracking..."
                            style={{ border: '0.5px solid var(--border-md)', borderRadius: 6, padding: '5px 8px', fontSize: 12, fontFamily: 'var(--font-mono)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 200 }}
                          />
                        ) : (
                          <Mono size={11} style={{ color: 'var(--text-3)' }}>
                            {(o.trackingNumber || '').slice(0, 18)}{(o.trackingNumber || '').length > 18 ? '…' : ''}
                          </Mono>
                        )}
                      </TD>
                      <TD>
                        {needsTracking(o) ? (
                          <Btn variant="primary" size="sm" disabled={saving[o.lineItemId] || !tracking[o.lineItemId]} onClick={() => saveTracking(o)}>
                            {saving[o.lineItemId] ? 'Saving…' : 'Save →'}
                          </Btn>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>✓</span>
                        )}
                      </TD>
                    </TR>
                  )
                })}
              </Table>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
            AusPost Export — own-stock (WH=1) pending orders only, formatted for MyPost Business bulk import.
          </div>
        </>
      )}

      {tab === 'log' && (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? <Spinner /> : log.length === 0 ? <EmptyState message="No log entries" /> : (
            <Table headers={['Timestamp', 'Event', 'Order', 'Details']}>
              {log.slice(0, 150).map((l, i) => (
                <TR key={i}>
                  <TD><Mono size={11} style={{ color: 'var(--text-3)' }}>{l.timestamp}</Mono></TD>
                  <TD>
                    <span style={{ fontSize: 11, fontWeight: 600, color: logColor(l.event), fontFamily: 'var(--font-mono)' }}>{l.event}</span>
                  </TD>
                  <TD><Mono size={11}>{l.orderId || '—'}</Mono></TD>
                  <TD style={{ fontSize: 11.5, color: 'var(--text-2)', maxWidth: 500, wordBreak: 'break-word' }}>{l.details || l.source || ''}</TD>
                </TR>
              ))}
            </Table>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { SHEETS, MASTER_LOG_GID } from '../lib/config'
import { getToken } from '../lib/sheets'
import { Badge, Btn, Table, TR, TD, Mono, PageHeader, Spinner, EmptyState } from '../components/UI'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

const DATE_PRESETS = [
  { label: 'Last Hour',   hours: 1 },
  { label: 'Last Day',    hours: 24 },
  { label: 'Last 3 Days', hours: 72 },
  { label: 'Last 7 Days', hours: 168, isDefault: true },
  { label: 'Last Month',  hours: 720 },
  { label: 'Last Year',   hours: 8760 },
]

function statusBadgeType(status) {
  const s = (status || '').toLowerCase()
  if (s === 'success' || s === 'ok' || s === 'complete' || s === 'done') return 'success'
  if (s === 'error' || s === 'fail' || s === 'failed' || s === 'err') return 'danger'
  if (s === 'warning' || s === 'warn' || s === 'skip' || s === 'skipped') return 'warning'
  return 'info'
}

function parseLogTime(value) {
  if (!value) return 0

  const direct = new Date(value)
  if (!isNaN(direct)) return direct.getTime()

  // Handles Google Sheets dates like: 5/2/2026 9:39:36
  const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/)

  if (match) {
    const month = Number(match[1]) - 1
    const day = Number(match[2])
    const year = Number(match[3])
    const hour = Number(match[4])
    const minute = Number(match[5])
    const second = Number(match[6] || 0)

    return new Date(year, month, day, hour, minute, second).getTime()
  }

  return 0
}

export default function LogsPage({ token }) {
  const [logs, setLogs]                   = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [preset, setPreset]               = useState(DATE_PRESETS.find(p => p.isDefault))
  const [scriptFilter, setScriptFilter]   = useState('All')
  const [statusFilter, setStatusFilter]   = useState('All')
  const [search, setSearch]               = useState('')
  const [resolvedTab, setResolvedTab]     = useState(null)

  const load = useCallback(async () => {
    if (!getToken()) return

    setLoading(true)
    setError(null)

    try {
      let tabName = resolvedTab

      if (!tabName) {
        const meta = await fetch(`${SHEETS_API}/${SHEETS.masterLogs}`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        }).then(r => r.json())

        if (meta.error) {
          throw new Error(`Spreadsheet error: ${meta.error.message}`)
        }

        const sheet = meta.sheets?.find(s => s.properties.sheetId === MASTER_LOG_GID)

        if (!sheet) {
          throw new Error(`Tab with gid ${MASTER_LOG_GID} not found. Check MASTER_LOG_GID in config.js.`)
        }

        tabName = sheet.properties.title
        setResolvedTab(tabName)
      }

      const range = encodeURIComponent(`${tabName}!A:F`)
      const data  = await fetch(`${SHEETS_API}/${SHEETS.masterLogs}/values/${range}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      }).then(r => r.json())

      if (data.error) {
        throw new Error(data.error.message)
      }

      const values = data.values || []

      if (values.length < 2) {
        setLogs([])
        return
      }

      const [headers, ...rows] = values

      const entries = rows
        .filter(r => r.some(c => c !== ''))
        .map(row => {
          const obj = {}
          headers.forEach((h, i) => {
            obj[h] = row[i] ?? ''
          })
          return obj
        })

      setLogs(entries)

    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [resolvedTab])

  useEffect(() => {
    if (token) load()
  }, [token, load])

  const cutoffMs = Date.now() - preset.hours * 60 * 60 * 1000

  const sortedLogs = [...logs].sort((a, b) => {
    return parseLogTime(b.Timestamp) - parseLogTime(a.Timestamp)
  })

  const scripts = [
    'All',
    ...Array.from(new Set(sortedLogs.map(l => l.Script).filter(Boolean)))
  ]

  const statuses = [
    'All',
    ...Array.from(new Set(sortedLogs.map(l => l.Status).filter(Boolean)))
  ]

  const filtered = sortedLogs.filter(l => {
    const ts = parseLogTime(l.Timestamp)

    if (ts && ts < cutoffMs) return false

    if (scriptFilter !== 'All' && l.Script !== scriptFilter) return false
    if (statusFilter !== 'All' && l.Status !== statusFilter) return false

    if (search) {
      const q = search.toLowerCase()
      const fields = [l.Script, l.Function, l.Status, l.SKU, l.Details]

      if (!fields.some(f => (f || '').toLowerCase().includes(q))) {
        return false
      }
    }

    return true
  })

  const recent = sortedLogs.slice(0, 20)

  const errCount = filtered.filter(l => {
    return statusBadgeType(l.Status) === 'danger'
  }).length

  const selectStyle = {
    border: '0.5px solid var(--border-md)',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 12,
    background: 'var(--surface)',
    color: 'var(--text)',
    outline: 'none',
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 52px - 48px)' }}>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <PageHeader title="Script Logs">
          <Btn onClick={load} size="sm">↻ Refresh</Btn>

          {resolvedTab && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              tab: {resolvedTab}
            </span>
          )}

          {errCount > 0 && (
            <span style={{
              fontSize: 12,
              background: '#fde8e8',
              color: '#8b1a1a',
              borderRadius: 6,
              padding: '4px 10px',
              border: '0.5px solid #fca5a5'
            }}>
              {errCount} error{errCount !== 1 ? 's' : ''} in view
            </span>
          )}
        </PageHeader>

        <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            fontSize: 11,
            color: 'var(--text-3)',
            fontWeight: 600,
            marginRight: 4,
            flexShrink: 0
          }}>
            Period:
          </span>

          {DATE_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setPreset(p)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '0.5px solid',
                borderColor: preset?.label === p.label ? 'var(--oak-lime)' : 'var(--border)',
                background: preset?.label === p.label ? 'rgba(125,184,42,0.1)' : 'transparent',
                color: preset?.label === p.label ? 'var(--oak-mid)' : 'var(--text-2)',
                fontSize: 11,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search script, function, SKU, details..."
            style={{
              border: '0.5px solid var(--border-md)',
              borderRadius: 7,
              padding: '6px 12px',
              fontSize: 13,
              background: 'var(--surface)',
              color: 'var(--text)',
              outline: 'none',
              width: 280
            }}
          />

          <select
            value={scriptFilter}
            onChange={e => setScriptFilter(e.target.value)}
            style={selectStyle}
          >
            {scripts.map(s => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Scripts' : s}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={selectStyle}
          >
            {statuses.map(s => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </option>
            ))}
          </select>

          {(scriptFilter !== 'All' || statusFilter !== 'All' || search) && (
            <button
              onClick={() => {
                setScriptFilter('All')
                setStatusFilter('All')
                setSearch('')
              }}
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                background: 'none',
                border: '0.5px solid var(--border)',
                borderRadius: 5,
                padding: '4px 8px',
                cursor: 'pointer'
              }}
            >
              ✕ Clear
            </button>
          )}

          <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
            {filtered.length} entries
          </span>
        </div>

        {error && (
          <div style={{
            background: '#fde8e8',
            border: '0.5px solid #fca5a5',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 14,
            color: '#8b1a1a',
            fontSize: 13
          }}>
            ⚠ {error}
          </div>
        )}

        <div style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          flex: 1,
          overflowY: 'auto'
        }}>
          {loading ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <EmptyState message="No log entries for this period" />
          ) : (
            <Table headers={['Timestamp', 'Script', 'Function', 'Status', 'SKU', 'Details']}>
              {filtered.map((l, i) => (
                <TR key={i}>
                  <TD>
                    <Mono size={11} style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {l.Timestamp}
                    </Mono>
                  </TD>

                  <TD>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      whiteSpace: 'nowrap'
                    }}>
                      {l.Script || '—'}
                    </span>
                  </TD>

                  <TD>
                    <Mono size={11}>{l.Function || '—'}</Mono>
                  </TD>

                  <TD>
                    <Badge type={statusBadgeType(l.Status)}>{l.Status || '—'}</Badge>
                  </TD>

                  <TD>
                    <Mono size={11}>{l.SKU || '—'}</Mono>
                  </TD>

                  <TD style={{
                    fontSize: 11.5,
                    color: 'var(--text-2)',
                    maxWidth: 380,
                    wordBreak: 'break-word'
                  }}>
                    {l.Details || ''}
                  </TD>
                </TR>
              ))}
            </Table>
          )}
        </div>
      </div>

      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 10,
          marginTop: 2
        }}>
          Most Recent
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          flex: 1,
          overflowY: 'auto'
        }}>
          {loading ? (
            <Spinner />
          ) : recent.length === 0 ? (
            <div style={{
              padding: 20,
              fontSize: 12,
              color: 'var(--text-3)',
              textAlign: 'center'
            }}>
              No entries
            </div>
          ) : (
            recent.map((l, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  borderBottom: i < recent.length - 1 ? '0.5px solid var(--border)' : 'none',
                  borderLeft: `3px solid ${
                    statusBadgeType(l.Status) === 'danger'
                      ? '#fca5a5'
                      : statusBadgeType(l.Status) === 'success'
                        ? 'var(--oak-lime)'
                        : statusBadgeType(l.Status) === 'warning'
                          ? '#f59e0b'
                          : 'var(--border)'
                  }`,
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 4,
                  marginBottom: 4
                }}>
                  <Badge type={statusBadgeType(l.Status)}>{l.Status || '—'}</Badge>

                  <span style={{
                    fontSize: 10,
                    color: 'var(--text-3)',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0
                  }}>
                    {(l.Timestamp || '').slice(5, 16)}
                  </span>
                </div>

                <div style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'var(--text)',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: 2
                }}>
                  {l.Script || '—'}
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                  {l.Function || ''}
                </div>

                {l.SKU && (
                  <div style={{
                    fontSize: 10,
                    color: 'var(--text-3)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: 2
                  }}>
                    {l.SKU}
                  </div>
                )}

                {l.Details && (
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'var(--text-3)',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={l.Details}
                  >
                    {l.Details}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}

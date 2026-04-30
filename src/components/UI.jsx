// Shared UI primitives

export function Badge({ type = 'default', children }) {
  const styles = {
    ebay:     { background: '#dbeafe', color: '#1e3a8a' },
    amazon:   { background: '#fff3cd', color: '#7a5000' },
    success:  { background: '#e8f5d4', color: '#2d5a0e' },
    warning:  { background: '#fff3cd', color: '#7a5000' },
    danger:   { background: '#fde8e8', color: '#8b1a1a' },
    info:     { background: '#e0f2fe', color: '#075985' },
    muted:    { background: '#f1f0f0', color: '#666' },
    default:  { background: '#f1f0f0', color: '#444' },
  }
  const s = styles[type] || styles.default
  return (
    <span style={{
      ...s,
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 5,
      fontSize: 11,
      fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

export function Btn({ variant = 'default', size = 'md', onClick, children, disabled, style = {} }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    border: '0.5px solid',
    borderRadius: 7,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.12s',
    fontFamily: 'var(--font-sans)',
    whiteSpace: 'nowrap',
  }
  const sizes = {
    sm: { padding: '4px 10px', fontSize: 12 },
    md: { padding: '6px 14px', fontSize: 13 },
    lg: { padding: '8px 18px', fontSize: 14 },
  }
  const variants = {
    default: { background: 'transparent', borderColor: 'var(--border-md)', color: 'var(--text)' },
    primary: { background: 'var(--oak-lime)', borderColor: 'var(--oak-lime)', color: 'var(--oak-dark)' },
    danger:  { background: 'transparent', borderColor: '#fca5a5', color: '#8b1a1a' },
    ghost:   { background: 'transparent', borderColor: 'transparent', color: 'var(--text-2)' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
    >{children}</button>
  )
}

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
      ...style,
    }}>{children}</div>
  )
}

export function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: accent || 'var(--text)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function Mono({ children, size = 11.5 }) {
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: size }}>{children}</span>
}

export function PageHeader({ title, children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    }}>
      <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{title}</h1>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{children}</div>
    </div>
  )
}

export function Table({ headers, children, style = {} }) {
  return (
    <div style={{ overflowX: 'auto', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                textAlign: 'left',
                padding: '8px 12px',
                color: 'var(--text-3)',
                fontWeight: 500,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                borderBottom: '0.5px solid var(--border)',
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function TR({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'background 0.1s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >{children}</tr>
  )
}

export function TD({ children, style = {} }) {
  return (
    <td style={{
      padding: '10px 12px',
      borderBottom: '0.5px solid var(--border)',
      color: 'var(--text)',
      verticalAlign: 'middle',
      ...style,
    }}>{children}</td>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text-3)', gap: 10 }}>
      <div style={{
        width: 16, height: 16,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--oak-lime)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      Loading...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-3)' }}>
      {message}
    </div>
  )
}

export function Input({ value, onChange, placeholder, style = {} }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        border: '0.5px solid var(--border-md)',
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: 12.5,
        background: 'var(--surface)',
        color: 'var(--text)',
        outline: 'none',
        fontFamily: 'var(--font-mono)',
        ...style,
      }}
    />
  )
}

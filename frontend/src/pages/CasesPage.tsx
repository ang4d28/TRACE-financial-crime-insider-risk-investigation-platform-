import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../lib/api'

interface Alert {
  case_id: number | null
  title: string
  overall_risk: 'low' | 'medium' | 'high' | 'critical'
  evidence_count: number
  detection_categories: string[]
}

const RISK_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  high:     { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
  medium:   { color: '#eab308', bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.25)' },
  low:      { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)' },
}

export function CasesPage() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [riskFilter, setRiskFilter] = useState('all')
  const [patternFilter, setPatternFilter] = useState('all')

  useEffect(() => {
    fetch(apiUrl('/alerts'))
      .then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json() })
      .then((data) => { setAlerts(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [])

  const allPatterns = Array.from(new Set(alerts.flatMap((a) => a.detection_categories)))

  const filtered = alerts.filter((a) => {
    if (riskFilter !== 'all' && a.overall_risk !== riskFilter) return false
    if (patternFilter !== 'all' && !a.detection_categories.includes(patternFilter)) return false
    return true
  })

  const selectStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: '13px',
    color: '#f5f5f7',
    backgroundColor: '#2e2e2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '7px 12px',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '140px',
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="h-8 w-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(132,125,255,0.2)', borderTopColor: '#847dff' }} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6a6b6b' }}>Loading cases…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[16px] p-6"
        style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', letterSpacing: '0.12em', color: '#ef4444', textTransform: 'uppercase', marginBottom: '8px' }}>Error</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9f9fa0' }}>{error}</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div>
        <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', letterSpacing: '0.15em', color: '#6a6b6b', textTransform: 'uppercase', marginBottom: '8px' }}>
          Case Registry
        </div>
        <h1 style={{ fontFamily: 'DM Serif Display, Georgia, serif', fontWeight: 300, fontSize: '32px', lineHeight: 1.05, color: '#f5f5f7' }}>
          All Cases
        </h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9f9fa0', marginTop: '6px', fontWeight: 300 }}>
          {alerts.length} case{alerts.length !== 1 ? 's' : ''} in registry
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', color: '#6a6b6b', textTransform: 'uppercase' }}>
            Risk Level
          </label>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', color: '#6a6b6b', textTransform: 'uppercase' }}>
            Pattern Type
          </label>
          <select value={patternFilter} onChange={(e) => setPatternFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Patterns</option>
            {allPatterns.map((p) => (
              <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#6a6b6b', letterSpacing: '0.1em', alignSelf: 'flex-end', paddingBottom: '2px' }}>
          {filtered.length}/{alerts.length} shown
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[16px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#090a0b' }}>
                {['ID', 'Risk', 'Title', 'Pattern Types', 'Evidence', ''].map((h) => (
                  <th key={h} style={{ padding: '11px 20px', textAlign: h === '' ? 'right' : 'left' }}>
                    <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a6b6b' }}>
                      {h}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6a6b6b' }}>
                    No cases match the current filters
                  </td>
                </tr>
              ) : filtered.map((alert) => {
                const rc = RISK_COLORS[alert.overall_risk] ?? { color: '#9f9fa0', bg: 'transparent', border: 'rgba(255,255,255,0.1)' }
                return (
                  <tr
                    key={alert.case_id}
                    onClick={() => alert.case_id && navigate(`/cases/${alert.case_id}`)}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '15px 20px' }}>
                      <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#6a6b6b' }}>
                        #{alert.case_id}
                      </span>
                    </td>
                    <td style={{ padding: '15px 20px' }}>
                      <span style={{
                        fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: rc.color, backgroundColor: rc.bg, border: `1px solid ${rc.border}`,
                        borderRadius: '9999px', padding: '3px 10px',
                      }}>
                        {alert.overall_risk}
                      </span>
                    </td>
                    <td style={{ padding: '15px 20px', maxWidth: '300px' }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#f5f5f7' }}>
                        {alert.title}
                      </div>
                    </td>
                    <td style={{ padding: '15px 20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {alert.detection_categories.map((cat) => (
                          <span key={cat} style={{
                            fontFamily: 'Roboto Mono, monospace', fontSize: '10px', letterSpacing: '0.08em',
                            color: '#d1c9ff', backgroundColor: 'rgba(132,125,255,0.1)',
                            border: '1px solid rgba(132,125,255,0.2)', borderRadius: '4px', padding: '2px 7px',
                          }}>
                            {cat.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '15px 20px' }}>
                      <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#9f9fa0' }}>
                        {alert.evidence_count}
                      </span>
                    </td>
                    <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); alert.case_id && navigate(`/cases/${alert.case_id}`) }}
                        style={{
                          fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500,
                          color: '#000000', backgroundColor: '#ffffff',
                          border: 'none', borderRadius: '8px', padding: '5px 14px', cursor: 'pointer',
                          transition: 'opacity 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

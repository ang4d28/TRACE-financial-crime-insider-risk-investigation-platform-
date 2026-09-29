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

type SortField = 'case_id' | 'overall_risk' | 'title'
type SortDirection = 'asc' | 'desc'

const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)', dot: '#ef4444' },
  high:     { label: 'High',     color: '#f97316', bg: 'rgba(249,115,22,0.06)', border: 'rgba(249,115,22,0.2)', dot: '#f97316' },
  medium:   { label: 'Medium',   color: '#eab308', bg: 'rgba(234,179,8,0.06)',  border: 'rgba(234,179,8,0.2)',  dot: '#eab308' },
  low:      { label: 'Low',      color: '#22c55e', bg: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.2)',  dot: '#22c55e' },
}

function RiskBadge({ risk }: { risk: string }) {
  const cfg = RISK_CONFIG[risk] ?? { label: risk, color: '#9f9fa0', bg: 'transparent', border: 'rgba(255,255,255,0.1)', dot: '#9f9fa0' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontFamily: 'Roboto Mono, monospace',
        fontSize: '10px',
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: cfg.color,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '9999px',
        padding: '3px 10px',
      }}
    >
      <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

export function DashboardPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('overall_risk')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const navigate = useNavigate()

  useEffect(() => {
    fetch(apiUrl('/alerts'))
      .then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json() })
      .then((data) => { setAlerts(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [])

  const riskCounts = alerts.reduce((acc, a) => {
    acc[a.overall_risk] = (acc[a.overall_risk] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  const sortedAlerts = [...alerts].sort((a, b) => {
    let cmp = 0
    if (sortField === 'overall_risk') cmp = riskOrder[a.overall_risk] - riskOrder[b.overall_risk]
    else if (sortField === 'case_id') cmp = (a.case_id ?? 0) - (b.case_id ?? 0)
    else cmp = a.title.localeCompare(b.title)
    return sortDirection === 'asc' ? cmp : -cmp
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div
          className="h-8 w-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(132,125,255,0.2)', borderTopColor: '#847dff' }}
        />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6a6b6b' }}>
          Running detectors…
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-[16px] p-6"
        style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', letterSpacing: '0.12em', color: '#ef4444', textTransform: 'uppercase', marginBottom: '8px' }}>
          Connection Error
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9f9fa0' }}>
          {error} — make sure the API is running at{' '}
          <code style={{ fontFamily: 'Roboto Mono, monospace', color: '#d1c9ff' }}>http://localhost:8000</code>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── PAGE HEADER ── */}
      <div>
        <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', letterSpacing: '0.15em', color: '#6a6b6b', textTransform: 'uppercase', marginBottom: '8px' }}>
          Alert Dashboard
        </div>
        <h1
          style={{
            fontFamily: 'DM Serif Display, Georgia, serif',
            fontWeight: 300,
            fontSize: '32px',
            lineHeight: 1.05,
            color: '#f5f5f7',
          }}
        >
          Active Investigations
        </h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9f9fa0', marginTop: '6px', fontWeight: 300 }}>
          Real-time fraud detection across all case types
        </p>
      </div>

      {/* ── RISK SUMMARY CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {(['critical', 'high', 'medium', 'low'] as const).map((risk) => {
          const cfg = RISK_CONFIG[risk]
          return (
            <div
              key={risk}
              className="rounded-[16px] p-5"
              style={{ backgroundColor: '#2e2e2e' }}
            >
              <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: cfg.color, marginBottom: '8px' }}>
                {cfg.label}
              </div>
              <div
                style={{
                  fontFamily: 'DM Serif Display, Georgia, serif',
                  fontWeight: 300,
                  fontSize: '40px',
                  lineHeight: 1,
                  color: '#ffffff',
                }}
              >
                {riskCounts[risk] ?? 0}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── CASES TABLE ── */}
      <div
        className="rounded-[16px] overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Table header bar */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#090a0b' }}
        >
          <div>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: '#f5f5f7' }}>
              Cases
            </span>
            <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#6a6b6b', marginLeft: '10px', letterSpacing: '0.1em' }}>
              {alerts.length} total
            </span>
          </div>
          <button
            onClick={() => navigate('/cases')}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              color: '#847dff',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
            }}
          >
            View all →
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div style={{ fontFamily: 'DM Serif Display, Georgia, serif', fontSize: '24px', fontWeight: 300, color: '#6a6b6b' }}>
              No cases detected
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6a6b6b', marginTop: '8px' }}>
              Run the data generator to create synthetic cases
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {(['case_id', 'overall_risk', 'title'] as SortField[]).map((field) => (
                    <th
                      key={field}
                      style={{ padding: '10px 24px', textAlign: 'left' }}
                    >
                      <button
                        onClick={() => handleSort(field)}
                        style={{
                          fontFamily: 'Roboto Mono, monospace',
                          fontSize: '10px',
                          fontWeight: 500,
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          color: sortField === field ? '#d1c9ff' : '#6a6b6b',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '0',
                        }}
                      >
                        {field === 'case_id' ? 'ID' : field === 'overall_risk' ? 'Risk' : 'Title'}
                        {sortField === field && (
                          <svg
                            width="10" height="10" viewBox="0 0 10 10" fill="none"
                            style={{ transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none' }}
                          >
                            <path d="M2 7L5 3L8 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </th>
                  ))}
                  <th style={{ padding: '10px 24px', textAlign: 'left' }}>
                    <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a6b6b' }}>
                      Detectors
                    </span>
                  </th>
                  <th style={{ padding: '10px 24px', textAlign: 'left' }}>
                    <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a6b6b' }}>
                      Evidence
                    </span>
                  </th>
                  <th style={{ padding: '10px 24px', textAlign: 'right' }}>
                    <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a6b6b' }}>
                      Open
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAlerts.map((alert) => (
                  <tr
                    key={alert.case_id ?? alert.title}
                    onClick={() => alert.case_id && navigate(`/cases/${alert.case_id}`)}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* ID */}
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#6a6b6b', letterSpacing: '0.05em' }}>
                        #{alert.case_id ?? '—'}
                      </span>
                    </td>
                    {/* Risk */}
                    <td style={{ padding: '16px 24px' }}>
                      <RiskBadge risk={alert.overall_risk} />
                    </td>
                    {/* Title */}
                    <td style={{ padding: '16px 24px', maxWidth: '280px' }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 400, color: '#f5f5f7' }}>
                        {alert.title}
                      </div>
                    </td>
                    {/* Detectors */}
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {alert.detection_categories.slice(0, 2).map((cat) => (
                          <span
                            key={cat}
                            style={{
                              fontFamily: 'Roboto Mono, monospace',
                              fontSize: '10px',
                              letterSpacing: '0.08em',
                              color: '#d1c9ff',
                              backgroundColor: 'rgba(132,125,255,0.1)',
                              border: '1px solid rgba(132,125,255,0.2)',
                              borderRadius: '4px',
                              padding: '2px 7px',
                            }}
                          >
                            {cat.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {alert.detection_categories.length > 2 && (
                          <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', color: '#6a6b6b', padding: '2px 4px' }}>
                            +{alert.detection_categories.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Evidence count */}
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#9f9fa0', letterSpacing: '0.05em' }}>
                        {alert.evidence_count} signals
                      </span>
                    </td>
                    {/* Open button */}
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <span
                        onClick={(e) => { e.stopPropagation(); alert.case_id && navigate(`/cases/${alert.case_id}`) }}
                        style={{
                          fontFamily: 'Roboto Mono, monospace',
                          fontSize: '11px',
                          letterSpacing: '0.1em',
                          color: '#847dff',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                        }}
                      >
                        Open →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

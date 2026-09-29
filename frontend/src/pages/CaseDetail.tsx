import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ForceGraph2D from 'react-force-graph-2d'
import { apiUrl } from '../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Evidence {
  rule_name: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  reason: string
  supporting_ids: string[]
  metric: Record<string, unknown>
}

interface RiskAssessment {
  overall_risk: 'low' | 'medium' | 'high' | 'critical'
  evidence_list: Evidence[]
  reasoning: string
}

interface AlertDetail {
  case_id: number
  title: string
  risk_assessment: RiskAssessment
}

interface CaseGraph {
  nodes: Array<{ id: string; type: string; label: string }>
  edges: Array<{ source: string; target: string; type: string }>
}

interface TimelineEvent {
  timestamp: string
  event_type: string
  actor: string | null
  description: string
  entity_id: number
  evidence_rule: string | null
}

interface CaseTimeline {
  case_id: number
  case_title: string
  events: TimelineEvent[]
}

interface CallRecord {
  target: string
  target_type: string
  question: string
  answer: string
  consistency_flag: boolean
  evidence_context: string
  called_at: string
}

interface Employee {
  id: number
  full_name: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  high:     { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
  medium:   { color: '#eab308', bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.25)' },
  low:      { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)' },
}

const NODE_COLORS: Record<string, string> = {
  transaction: '#ef4444',
  account:     '#00b3dd',
  customer:    '#847dff',
  employee:    '#dd90d8',
}

function getNodeColor(type: string) {
  return NODE_COLORS[type] ?? '#6a6b6b'
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const graphRef = useRef<any>(null)

  const [alertDetail, setAlertDetail]   = useState<AlertDetail | null>(null)
  const [graph, setGraph]               = useState<CaseGraph | null>(null)
  const [timeline, setTimeline]         = useState<CaseTimeline | null>(null)
  const [callRecords, setCallRecords]   = useState<CallRecord[]>([])
  const [employees, setEmployees]       = useState<Employee[]>([])
  const [caseStatus, setCaseStatus]     = useState('new')
  const [assignedTo, setAssignedTo]     = useState<number | ''>('')
  const [noteText, setNoteText]         = useState('')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [callingInProgress, setCallingInProgress] = useState(false)
  const [callError, setCallError]       = useState<string | null>(null)
  const [updating, setUpdating]         = useState(false)
  const [updateError, setUpdateError]   = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  // All hooks must run before any early return
  useEffect(() => {
    if (!id) { setError('No case ID provided'); setLoading(false); return }

    Promise.all([
      fetch(apiUrl(`/alerts/${id}`))
        .then((r) => { if (!r.ok) throw new Error(`Alert fetch failed (${r.status})`); return r.json() }),
      fetch(apiUrl(`/graph/${id}`))
        .then((r) => { if (!r.ok) throw new Error(`Graph fetch failed (${r.status})`); return r.json() }),
      fetch(apiUrl(`/timeline/${id}`))
        .then((r) => { if (!r.ok) throw new Error(`Timeline fetch failed (${r.status})`); return r.json() }),
      fetch(apiUrl(`/cases/${id}/calls`))
        .then((r) => r.ok ? r.json() : []),
      fetch(apiUrl('/employees'))
        .then((r) => r.ok ? r.json() : []),
    ])
      .then(([alert, graphData, timelineData, callData, empData]) => {
        setAlertDetail(alert)
        setGraph(graphData)
        setTimeline(timelineData)
        setCallRecords(callData)
        setEmployees(empData)
        setLoading(false)
      })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [id])

  const handleTriggerCall = async () => {
    if (!id) return
    setCallingInProgress(true)
    setCallError(null)
    try {
      const r = await fetch(apiUrl(`/cases/${id}/trigger-call`), { method: 'POST' })
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail ?? 'Call failed') }
      const newCall = await r.json()
      setCallRecords((prev) => [...prev, newCall])
    } catch (err: any) {
      setCallError(err.message)
    } finally {
      setCallingInProgress(false)
    }
  }

  const handleUpdateCase = async () => {
    if (!id) return
    if (caseStatus.startsWith('closed_') && !noteText.trim()) {
      setUpdateError('A closing note is required')
      return
    }
    setUpdating(true)
    setUpdateError(null)
    setUpdateSuccess(false)
    try {
      const r = await fetch(apiUrl(`/cases/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: caseStatus,
          assigned_to_id: assignedTo !== '' ? Number(assignedTo) : null,
          note: noteText.trim() || null,
        }),
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail ?? 'Update failed') }
      setNoteText('')
      setUpdateSuccess(true)
      setTimeout(() => setUpdateSuccess(false), 3000)
    } catch (err: any) {
      setUpdateError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleExportPDF = () => {
    if (!id) return
    window.open(apiUrl(`/cases/${id}/export`), '_blank')
  }

  // ── Loading / error ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px' }}>
        <div className="h-8 w-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(132,125,255,0.2)', borderTopColor: '#847dff' }} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6a6b6b' }}>Loading case…</span>
      </div>
    )
  }

  if (error || !alertDetail || !graph || !timeline) {
    return (
      <div>
        <div className="rounded-[16px] p-6 mb-4"
          style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', letterSpacing: '0.12em', color: '#ef4444', textTransform: 'uppercase', marginBottom: '8px' }}>
            Error
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9f9fa0' }}>
            {error ?? 'No data available for this case'}
          </div>
        </div>
        <button onClick={() => navigate('/dashboard')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#847dff', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>
    )
  }

  // ── Graph transform ──────────────────────────────────────────────────────────

  const graphData = {
    nodes: graph.nodes.map((n) => ({ id: n.id, name: n.label, type: n.type, color: getNodeColor(n.type) })),
    links: graph.edges.map((e) => ({ source: e.source, target: e.target, type: e.type })),
  }

  const risk = alertDetail.risk_assessment.overall_risk
  const riskCfg = RISK_COLORS[risk] ?? RISK_COLORS.low

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── HEADER ── */}
      <div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#6a6b6b', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#9f9fa0')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6a6b6b')}
        >
          ← Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'DM Serif Display, Georgia, serif', fontWeight: 300, fontSize: '28px', lineHeight: 1.1, color: '#f5f5f7', margin: 0 }}>
                {alertDetail.title}
              </h1>
              <span style={{
                fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: riskCfg.color, backgroundColor: riskCfg.bg, border: `1px solid ${riskCfg.border}`,
                borderRadius: '9999px', padding: '4px 12px',
              }}>
                {risk}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
              <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#6a6b6b', letterSpacing: '0.08em' }}>
                Case #{alertDetail.case_id}
              </span>
              <span style={{ color: '#3f4041' }}>·</span>
              <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#6a6b6b' }}>
                {alertDetail.risk_assessment.evidence_list.length} signals
              </span>
            </div>
          </div>

          {/* Header action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleTriggerCall}
              disabled={callingInProgress}
              style={{
                fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500,
                color: '#d1c9ff', backgroundColor: 'rgba(132,125,255,0.12)',
                border: '1px solid rgba(132,125,255,0.25)', borderRadius: '8px',
                padding: '8px 16px', cursor: callingInProgress ? 'not-allowed' : 'pointer',
                opacity: callingInProgress ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'opacity 0.15s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 3a1 1 0 011-1h2.5a1 1 0 011 1v2.5a1 1 0 01-.7.95L4.4 7a8 8 0 003.6 3.6l.55-1.4A1 1 0 019.5 8.5H12a1 1 0 011 1V12a1 1 0 01-1 1C5.9 13 1 8.1 1 3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              {callingInProgress ? 'Calling…' : 'Trigger Call'}
            </button>
            <button
              onClick={handleExportPDF}
              style={{
                fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500,
                color: '#9f9fa0', backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
                padding: '8px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── RISK REASONING ── */}
      <div
        className="rounded-[16px] p-5"
        style={{ backgroundColor: 'rgba(132,125,255,0.05)', border: '1px solid rgba(132,125,255,0.15)' }}
      >
        <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', color: '#847dff', textTransform: 'uppercase', marginBottom: '6px' }}>
          Risk Assessment
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', lineHeight: 1.6, color: '#9f9fa0', fontWeight: 300 }}>
          {alertDetail.risk_assessment.reasoning}
        </div>
      </div>

      {/* ── CALL ERROR ── */}
      {callError && (
        <div className="rounded-[12px] p-4"
          style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#ef4444' }}>
            Call error: {callError}
          </div>
        </div>
      )}

      {/* ── TWO-COLUMN: GRAPH + EVIDENCE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Graph panel */}
        <div className="rounded-[16px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#090a0b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: '#f5f5f7' }}>
                Relationship Graph
              </div>
              <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#6a6b6b', marginTop: '2px' }}>
                {graph.nodes.length} entities · {graph.edges.length} edges
              </div>
            </div>
          </div>

          <div style={{ height: '440px', backgroundColor: '#090a0b' }}>
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              nodeLabel="name"
              nodeColor="color"
              nodeRelSize={5}
              linkColor={() => 'rgba(255,255,255,0.12)'}
              linkWidth={1.2}
              linkDirectionalArrowLength={3}
              linkDirectionalArrowRelPos={1}
              backgroundColor="#090a0b"
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const r = 5
                ctx.beginPath()
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
                ctx.fillStyle = node.color
                ctx.fill()

                if (globalScale > 1.5) {
                  const fontSize = 10 / globalScale
                  ctx.font = `${fontSize}px "Roboto Mono"`
                  ctx.fillStyle = 'rgba(255,255,255,0.6)'
                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'top'
                  ctx.fillText(node.name, node.x, node.y + r + 2)
                }
              }}
            />
          </div>

          {/* Legend */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#090a0b', display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', color: '#6a6b6b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '560px' }}>

          {/* Call transcripts */}
          {callRecords.map((call, idx) => (
            <div
              key={idx}
              className="rounded-[16px] p-5"
              style={{ backgroundColor: '#2e2e2e', border: '1px solid rgba(132,125,255,0.15)', flexShrink: 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', color: '#847dff', textTransform: 'uppercase' }}>
                    AI Verification Call
                  </span>
                  <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', color: '#6a6b6b' }}>
                    — not a decision
                  </span>
                </div>
                <span style={{
                  fontFamily: 'Roboto Mono, monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: call.consistency_flag ? '#22c55e' : '#ef4444',
                  backgroundColor: call.consistency_flag ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${call.consistency_flag ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  borderRadius: '9999px', padding: '3px 10px',
                }}>
                  {call.consistency_flag ? 'Consistent' : 'Inconsistent'}
                </span>
              </div>

              <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', color: '#6a6b6b', marginBottom: '12px' }}>
                {call.target} · {call.target_type} · {new Date(call.called_at).toLocaleString()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(0,179,221,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Roboto Mono, monospace', fontSize: '9px', color: '#00b3dd', flexShrink: 0 }}>AI</div>
                  <div className="rounded-[8px] p-3 flex-1" style={{ backgroundColor: '#3f4041' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#f5f5f7', lineHeight: 1.5, margin: 0 }}>{call.question}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#3f4041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Roboto Mono, monospace', fontSize: '9px', color: '#9f9fa0', flexShrink: 0 }}>
                    {call.target.charAt(0).toUpperCase()}
                  </div>
                  <div className="rounded-[8px] p-3 flex-1" style={{ backgroundColor: '#2e2e2e', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#9f9fa0', lineHeight: 1.5, margin: 0 }}>{call.answer}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Evidence cards */}
          {alertDetail.risk_assessment.evidence_list.map((ev, idx) => {
            const sev = RISK_COLORS[ev.severity] ?? RISK_COLORS.low
            return (
              <div
                key={idx}
                className="rounded-[16px] p-5"
                style={{ backgroundColor: '#2e2e2e', border: `1px solid ${sev.border}`, flexShrink: 0 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#d1c9ff' }}>
                    {ev.rule_name.replace(/_/g, ' ')}
                  </span>
                  <span style={{
                    fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: sev.color, backgroundColor: sev.bg, border: `1px solid ${sev.border}`,
                    borderRadius: '9999px', padding: '3px 8px',
                  }}>
                    {ev.severity}
                  </span>
                </div>

                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', lineHeight: 1.6, color: '#9f9fa0', margin: '0 0 12px' }}>
                  {ev.reason}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {ev.supporting_ids.slice(0, 8).map((sid) => (
                    <span key={sid} style={{
                      fontFamily: 'Roboto Mono, monospace', fontSize: '10px', color: '#9f9fa0',
                      backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '4px', padding: '2px 6px', letterSpacing: '0.05em',
                    }}>
                      #{sid}
                    </span>
                  ))}
                  {ev.supporting_ids.length > 8 && (
                    <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', color: '#6a6b6b', padding: '2px 6px' }}>
                      +{ev.supporting_ids.length - 8}
                    </span>
                  )}
                </div>

                {Object.keys(ev.metric).length > 0 && (
                  <details style={{ marginTop: '10px' }}>
                    <summary style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', color: '#6a6b6b', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Metrics
                    </summary>
                    <pre style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#6a6b6b', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '8px', marginTop: '6px', overflowX: 'auto' }}>
                      {JSON.stringify(ev.metric, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── CASE MANAGEMENT ── */}
      <div className="rounded-[16px] p-6" style={{ border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#090a0b' }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: '#f5f5f7', marginBottom: '20px' }}>
          Case Management
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Status */}
          <div>
            <label style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a6b6b', display: 'block', marginBottom: '8px' }}>
              Status
            </label>
            <select
              value={caseStatus}
              onChange={(e) => setCaseStatus(e.target.value)}
              style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#f5f5f7', backgroundColor: '#2e2e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '9px 12px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="new">New</option>
              <option value="assigned">Assigned</option>
              <option value="under_review">Under Review</option>
              <option value="escalated">Escalated</option>
              <option value="closed_legit">Closed — Legitimate</option>
              <option value="closed_confirmed">Closed — Confirmed Fraud</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a6b6b', display: 'block', marginBottom: '8px' }}>
              Assigned To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : '')}
              style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#f5f5f7', backgroundColor: '#2e2e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '9px 12px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="">Unassigned</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a6b6b', display: 'block', marginBottom: '8px' }}>
            Investigation Notes
            {caseStatus.startsWith('closed_') && (
              <span style={{ marginLeft: '8px', color: '#f97316' }}>(required when closing)</span>
            )}
          </label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder="Document findings, decisions, or observations…"
            style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#f5f5f7', backgroundColor: '#2e2e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', outline: 'none', resize: 'none', lineHeight: 1.6 }}
          />
        </div>

        {/* Error / success feedback */}
        {updateError && (
          <div className="rounded-[8px] p-3 mt-3" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#ef4444' }}>{updateError}</span>
          </div>
        )}
        {updateSuccess && (
          <div className="rounded-[8px] p-3 mt-3" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#22c55e' }}>Case updated successfully</span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            onClick={handleUpdateCase}
            disabled={updating}
            style={{
              fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500,
              color: '#000000', backgroundColor: '#ffffff',
              border: 'none', borderRadius: '8px', padding: '9px 20px',
              cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.5 : 1,
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!updating) e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { if (!updating) e.currentTarget.style.opacity = '1' }}
          >
            {updating ? 'Updating…' : 'Update Case'}
          </button>

          <button
            onClick={handleExportPDF}
            style={{
              fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500,
              color: '#9f9fa0', backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '9px 20px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Export Evidence
          </button>
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div className="rounded-[16px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#090a0b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: '#f5f5f7' }}>
            Timeline
          </div>
          <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#6a6b6b', letterSpacing: '0.1em' }}>
            {timeline.events.length} events
          </span>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {timeline.events.map((event, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '16px' }}>
              {/* Timeline track */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '20px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, marginTop: '4px',
                  backgroundColor: event.evidence_rule ? '#ef4444' : '#3f4041',
                  boxShadow: event.evidence_rule ? '0 0 8px rgba(239,68,68,0.4)' : 'none',
                }} />
                {idx < timeline.events.length - 1 && (
                  <div style={{ width: '1px', flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: '4px', marginBottom: '4px', minHeight: '24px' }} />
                )}
              </div>

              {/* Event content */}
              <div style={{ flex: 1, paddingBottom: idx < timeline.events.length - 1 ? '16px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#6a6b6b', letterSpacing: '0.05em' }}>
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                  <span style={{
                    fontFamily: 'Roboto Mono, monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: event.event_type === 'transaction' ? '#00b3dd' : '#847dff',
                    backgroundColor: event.event_type === 'transaction' ? 'rgba(0,179,221,0.08)' : 'rgba(132,125,255,0.08)',
                    border: `1px solid ${event.event_type === 'transaction' ? 'rgba(0,179,221,0.2)' : 'rgba(132,125,255,0.2)'}`,
                    borderRadius: '4px', padding: '1px 6px',
                  }}>
                    {event.event_type.replace('_', ' ')}
                  </span>
                  {event.evidence_rule && (
                    <span style={{
                      fontFamily: 'Roboto Mono, monospace', fontSize: '10px', letterSpacing: '0.08em',
                      color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px', padding: '1px 6px',
                    }}>
                      {event.evidence_rule}
                    </span>
                  )}
                </div>
                {event.actor && (
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: '#f5f5f7', marginBottom: '2px' }}>
                    {event.actor}
                  </div>
                )}
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#9f9fa0', lineHeight: 1.5 }}>
                  {event.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState, useRef, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { apiUrl } from '../lib/api'

interface CaseOption {
  case_id: number
  title: string
  overall_risk: string
}

interface CaseGraph {
  nodes: Array<{ id: string; type: string; label: string }>
  edges: Array<{ source: string; target: string; type: string }>
}

const NODE_COLORS: Record<string, string> = {
  transaction: '#ef4444',
  account:     '#00b3dd',
  customer:    '#847dff',
  employee:    '#dd90d8',
}

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
}

function getNodeColor(type: string): string {
  return NODE_COLORS[type] ?? '#6a6b6b'
}

export function GraphExplorerPage() {
  const graphRef = useRef<any>(null)

  const [cases, setCases]               = useState<CaseOption[]>([])
  const [selectedId, setSelectedId]     = useState<number | null>(null)
  const [graph, setGraph]               = useState<CaseGraph | null>(null)
  const [loadingCases, setLoadingCases] = useState(true)
  const [loadingGraph, setLoadingGraph] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [graphError, setGraphError]     = useState<string | null>(null)
  const [searchQuery, setSearchQuery]   = useState('')

  // Load all cases for the selector
  useEffect(() => {
    fetch(apiUrl('/alerts'))
      .then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json() })
      .then((data: CaseOption[]) => {
        const valid = data.filter((c) => c.case_id != null)
        setCases(valid)
        if (valid.length > 0) setSelectedId(valid[0].case_id)
        setLoadingCases(false)
      })
      .catch((err) => { setError(err.message); setLoadingCases(false) })
  }, [])

  // Load graph for selected case
  useEffect(() => {
    if (!selectedId) return
    setLoadingGraph(true)
    setGraphError(null)
    setGraph(null)

    fetch(apiUrl(`/graph/${selectedId}`))
      .then((r) => { if (!r.ok) throw new Error(`Graph fetch failed (${r.status})`); return r.json() })
      .then((data) => { setGraph(data); setLoadingGraph(false) })
      .catch((err) => { setGraphError(err.message); setLoadingGraph(false) })
  }, [selectedId])

  // Auto-fit when graph loads
  const handleEngineStop = useCallback(() => {
    graphRef.current?.zoomToFit(400, 60)
  }, [])

  const filteredCases = searchQuery.trim()
    ? cases.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(c.case_id).includes(searchQuery)
      )
    : cases

  const selectedCase = cases.find((c) => c.case_id === selectedId)

  const graphData = graph
    ? {
        nodes: graph.nodes.map((n) => ({
          id: n.id,
          name: n.label,
          type: n.type,
          color: getNodeColor(n.type),
        })),
        links: graph.edges.map((e) => ({
          source: e.source,
          target: e.target,
          type: e.type,
        })),
      }
    : { nodes: [], links: [] }

  // ── Node type counts for sidebar stats
  const nodeCounts = graph
    ? graph.nodes.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] ?? 0) + 1
        return acc
      }, {} as Record<string, number>)
    : {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── PAGE HEADER ── */}
      <div>
        <div style={{
          fontFamily: 'Roboto Mono, monospace', fontSize: '11px',
          letterSpacing: '0.15em', color: '#6a6b6b',
          textTransform: 'uppercase', marginBottom: '8px',
        }}>
          Graph Explorer
        </div>
        <h1 style={{
          fontFamily: 'DM Serif Display, Georgia, serif', fontWeight: 300,
          fontSize: '32px', lineHeight: 1.05, color: '#f5f5f7', margin: 0,
        }}>
          Entity Relationship Graph
        </h1>
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: '14px',
          color: '#9f9fa0', marginTop: '6px', fontWeight: 300,
        }}>
          Explore transaction flows and entity relationships for any case
        </p>
      </div>

      {/* ── ERROR STATES ── */}
      {error && (
        <div className="rounded-[16px] p-5" style={{
          backgroundColor: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <div style={{
            fontFamily: 'Roboto Mono, monospace', fontSize: '10px',
            letterSpacing: '0.12em', color: '#ef4444',
            textTransform: 'uppercase', marginBottom: '6px',
          }}>
            Connection Error
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#9f9fa0' }}>
            {error} — ensure the backend is running at{' '}
            <code style={{ fontFamily: 'Roboto Mono, monospace', color: '#d1c9ff' }}>
              http://localhost:8000
            </code>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT: selector sidebar + graph canvas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', alignItems: 'start' }}>

        {/* ── CASE SELECTOR SIDEBAR ── */}
        <div className="rounded-[16px] overflow-hidden" style={{
          border: '1px solid rgba(255,255,255,0.06)',
          backgroundColor: '#090a0b',
        }}>
          {/* Search */}
          <div style={{ padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#2e2e2e', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px',
            }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="#6a6b6b" strokeWidth="1.3" />
                <path d="M9.5 9.5L12.5 12.5" stroke="#6a6b6b" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cases…"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontFamily: 'Inter, sans-serif', fontSize: '13px',
                  color: '#f5f5f7',
                }}
              />
            </div>
          </div>

          {/* Case list */}
          <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
            {loadingCases ? (
              <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
                <div className="h-5 w-5 rounded-full border-2 animate-spin" style={{
                  borderColor: 'rgba(132,125,255,0.2)', borderTopColor: '#847dff',
                }} />
              </div>
            ) : filteredCases.length === 0 ? (
              <div style={{
                padding: '24px', textAlign: 'center',
                fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#6a6b6b',
              }}>
                No cases found
              </div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = c.case_id === selectedId
                const riskColor = RISK_COLORS[c.overall_risk] ?? '#6a6b6b'
                return (
                  <button
                    key={c.case_id}
                    onClick={() => setSelectedId(c.case_id)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 16px',
                      backgroundColor: isSelected ? 'rgba(132,125,255,0.1)' : 'transparent',
                      border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer', transition: 'background-color 0.15s ease',
                      display: 'flex', flexDirection: 'column', gap: '4px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        backgroundColor: riskColor, flexShrink: 0,
                      }} />
                      <span style={{
                        fontFamily: 'Roboto Mono, monospace', fontSize: '10px',
                        color: isSelected ? '#d1c9ff' : '#6a6b6b', letterSpacing: '0.08em',
                      }}>
                        #{c.case_id}
                      </span>
                    </div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif', fontSize: '12px',
                      color: isSelected ? '#ffffff' : '#9f9fa0',
                      lineHeight: 1.4,
                      paddingLeft: '12px',
                    }}>
                      {c.title}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Entity stats for selected case */}
          {graph && Object.keys(nodeCounts).length > 0 && (
            <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{
                fontFamily: 'Roboto Mono, monospace', fontSize: '10px',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#6a6b6b', marginBottom: '10px',
              }}>
                Entities
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(NODE_COLORS).map(([type, color]) => {
                  const count = nodeCounts[type] ?? 0
                  if (count === 0) return null
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                        <span style={{
                          fontFamily: 'Roboto Mono, monospace', fontSize: '10px',
                          textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9f9fa0',
                        }}>
                          {type}
                        </span>
                      </div>
                      <span style={{
                        fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#f5f5f7',
                      }}>
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── GRAPH CANVAS ── */}
        <div className="rounded-[16px] overflow-hidden" style={{
          border: '1px solid rgba(255,255,255,0.06)',
          backgroundColor: '#090a0b',
        }}>
          {/* Canvas header */}
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              {selectedCase ? (
                <>
                  <div style={{
                    fontFamily: 'Inter, sans-serif', fontSize: '14px',
                    fontWeight: 500, color: '#f5f5f7',
                  }}>
                    {selectedCase.title}
                  </div>
                  <div style={{
                    fontFamily: 'Roboto Mono, monospace', fontSize: '11px',
                    color: '#6a6b6b', marginTop: '2px',
                  }}>
                    {graph ? `${graph.nodes.length} nodes · ${graph.edges.length} edges` : 'Loading…'}
                  </div>
                </>
              ) : (
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6a6b6b',
                }}>
                  Select a case to view its graph
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {Object.entries(NODE_COLORS).map(([type, color]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{
                    width: '7px', height: '7px', borderRadius: '50%', backgroundColor: color,
                  }} />
                  <span style={{
                    fontFamily: 'Roboto Mono, monospace', fontSize: '9px',
                    textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6b6b',
                  }}>
                    {type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Graph area */}
          <div style={{ height: '560px', position: 'relative', backgroundColor: '#090a0b' }}>
            {loadingGraph && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
                zIndex: 10,
              }}>
                <div className="h-8 w-8 rounded-full border-2 animate-spin" style={{
                  borderColor: 'rgba(132,125,255,0.2)', borderTopColor: '#847dff',
                }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#6a6b6b' }}>
                  Building graph…
                </span>
              </div>
            )}

            {graphError && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px',
              }}>
                <div style={{
                  fontFamily: 'Roboto Mono, monospace', fontSize: '10px',
                  letterSpacing: '0.12em', color: '#ef4444', textTransform: 'uppercase',
                }}>
                  Graph Error
                </div>
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '13px',
                  color: '#9f9fa0', textAlign: 'center',
                }}>
                  {graphError}
                </div>
              </div>
            )}

            {!loadingGraph && !graphError && graphData.nodes.length === 0 && selectedId && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.3 }}>
                  <circle cx="10" cy="20" r="5" stroke="#847dff" strokeWidth="1.5" />
                  <circle cx="30" cy="10" r="5" stroke="#847dff" strokeWidth="1.5" />
                  <circle cx="30" cy="30" r="5" stroke="#847dff" strokeWidth="1.5" />
                  <path d="M15 20L25 12M15 20L25 28" stroke="#847dff" strokeWidth="1.5" />
                </svg>
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6a6b6b',
                }}>
                  No graph data for this case
                </div>
              </div>
            )}

            {!loadingGraph && !graphError && graphData.nodes.length > 0 && (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={undefined}
                height={560}
                backgroundColor="#090a0b"
                nodeLabel="name"
                nodeColor="color"
                nodeRelSize={5}
                linkColor={() => 'rgba(255,255,255,0.1)'}
                linkWidth={1.2}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                onEngineStop={handleEngineStop}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  // Glow ring for flagged nodes
                  ctx.beginPath()
                  ctx.arc(node.x, node.y, 7, 0, 2 * Math.PI)
                  ctx.fillStyle = node.color + '22'
                  ctx.fill()

                  // Main dot
                  ctx.beginPath()
                  ctx.arc(node.x, node.y, 4.5, 0, 2 * Math.PI)
                  ctx.fillStyle = node.color
                  ctx.fill()

                  // Label at higher zoom levels
                  if (globalScale >= 1.8) {
                    const fontSize = 9 / globalScale
                    ctx.font = `${fontSize}px "Roboto Mono", monospace`
                    ctx.fillStyle = 'rgba(245,245,247,0.7)'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'top'
                    ctx.fillText(node.name, node.x, node.y + 6)
                  }
                }}
                nodeCanvasObjectMode={() => 'replace'}
              />
            )}
          </div>

          {/* Footer hint */}
          <div style={{
            padding: '10px 20px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', gap: '16px',
          }}>
            {[
              ['Scroll', 'zoom'],
              ['Drag node', 'reposition'],
              ['Drag canvas', 'pan'],
            ].map(([key, action]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  fontFamily: 'Roboto Mono, monospace', fontSize: '9px',
                  color: '#f5f5f7', backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px',
                  padding: '1px 6px',
                }}>
                  {key}
                </span>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#6a6b6b',
                }}>
                  {action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

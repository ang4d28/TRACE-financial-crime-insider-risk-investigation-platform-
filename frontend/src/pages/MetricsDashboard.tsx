import { useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'

interface Metrics {
  baseline: {
    total_cases: number
    true_positives: number
    false_positives: number
    true_negatives: number
    false_negatives: number
    precision: number
    recall: number
    f1_score: number
    accuracy: number
    false_positive_rate: number
  }
  with_calls: {
    cases_with_calls: number
    false_positives_resolved: number
    fpr_with_calls: number
    fpr_without_calls: number
    fp_reduction_percent: number
  }
  adjusted: {
    false_positives: number
    true_negatives: number
    precision: number
    false_positive_rate: number
  }
  evidence_stats: {
    total_signals: number
    circular_transfer: number
    structuring: number
    profile_mismatch: number
    insider_link: number
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const num = (v: number) => v.toLocaleString()

function StatCard({
  label,
  value,
  sub,
  accent,
  inverted = false,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
  inverted?: boolean
}) {
  return (
    <div
      style={{
        backgroundColor: inverted ? '#cacaca' : '#2e2e2e',
        borderRadius: '16px',
        padding: '28px 24px',
      }}
    >
      <div
        style={{
          fontFamily: 'Roboto Mono, monospace',
          fontSize: '10px',
          fontWeight: 500,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: inverted ? '#6a6b6b' : '#6a6b6b',
          marginBottom: '10px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'DM Serif Display, Georgia, serif',
          fontWeight: 300,
          fontSize: '44px',
          lineHeight: 1,
          color: accent ?? (inverted ? '#000000' : '#ffffff'),
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: inverted ? '#3f4041' : '#9f9fa0',
            marginTop: '8px',
            lineHeight: 1.5,
            fontWeight: 300,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const pctWidth = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily: 'Roboto Mono, monospace',
            fontSize: '11px',
            letterSpacing: '0.08em',
            color: '#9f9fa0',
            textTransform: 'uppercase',
          }}
        >
          {label.replace(/_/g, ' ')}
        </span>
        <span
          style={{
            fontFamily: 'Roboto Mono, monospace',
            fontSize: '12px',
            color: '#f5f5f7',
          }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pctWidth}%`,
            backgroundColor: color,
            borderRadius: '9999px',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(apiUrl('/metrics'))
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setMetrics(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '300px',
          gap: '16px',
        }}
      >
        <div
          className="h-8 w-8 rounded-full border-2 animate-spin"
          style={{
            borderColor: 'rgba(132,125,255,0.2)',
            borderTopColor: '#847dff',
          }}
        />
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            color: '#6a6b6b',
          }}
        >
          Computing metrics…
        </span>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div
        className="rounded-[16px] p-6"
        style={{
          backgroundColor: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        <div
          style={{
            fontFamily: 'Roboto Mono, monospace',
            fontSize: '11px',
            letterSpacing: '0.12em',
            color: '#ef4444',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Error
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            color: '#9f9fa0',
          }}
        >
          {error ?? 'No metrics available'} — ensure the backend is running at{' '}
          <code style={{ fontFamily: 'Roboto Mono, monospace', color: '#d1c9ff' }}>
            http://localhost:8000
          </code>
        </div>
      </div>
    )
  }

  const b = metrics.baseline
  const w = metrics.with_calls
  const a = metrics.adjusted
  const e = metrics.evidence_stats
  const maxEvidence = Math.max(e.circular_transfer, e.structuring, e.profile_mismatch, e.insider_link, 1)
  const hasCallData = w.cases_with_calls > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── PAGE HEADER ── */}
      <div>
        <div
          style={{
            fontFamily: 'Roboto Mono, monospace',
            fontSize: '11px',
            letterSpacing: '0.15em',
            color: '#6a6b6b',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          System Performance
        </div>
        <h1
          style={{
            fontFamily: 'DM Serif Display, Georgia, serif',
            fontWeight: 300,
            fontSize: '32px',
            lineHeight: 1.05,
            color: '#f5f5f7',
            margin: 0,
          }}
        >
          Metrics Dashboard
        </h1>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            color: '#9f9fa0',
            marginTop: '6px',
            fontWeight: 300,
          }}
        >
          Live evaluation of fraud detection accuracy and AI verification impact
        </p>
      </div>

      {/* ── DIFFERENTIATOR CALLOUT ── */}
      <div
        className="rounded-[16px] p-6"
        style={{
          backgroundColor: '#847dff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background rings */}
        <div
          style={{
            position: 'absolute',
            right: '-60px',
            top: '-60px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.12)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '-30px',
            top: '-30px',
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative' }}>
          <div
            style={{
              fontFamily: 'Roboto Mono, monospace',
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.65)',
              marginBottom: '10px',
            }}
          >
            Key Differentiator
          </div>
          <div
            style={{
              fontFamily: 'DM Serif Display, Georgia, serif',
              fontWeight: 300,
              fontSize: '42px',
              lineHeight: 1,
              color: '#ffffff',
              marginBottom: '8px',
            }}
          >
            {hasCallData ? `${w.fp_reduction_percent.toFixed(1)}%` : '—'}
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 300,
              maxWidth: '520px',
              lineHeight: 1.5,
            }}
          >
            {hasCallData
              ? `False positive reduction via AI verification calls — ${w.false_positives_resolved} cases resolved automatically`
              : 'Trigger verification calls on cases to measure false positive reduction'}
          </div>
        </div>
      </div>

      {/* ── CORE METRICS GRID ── */}
      <div>
        <div
          style={{
            fontFamily: 'Roboto Mono, monospace',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#6a6b6b',
            marginBottom: '16px',
          }}
        >
          Baseline Metrics
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
          }}
        >
          <StatCard
            label="Precision"
            value={pct(b.precision)}
            sub="Of flagged cases, how many are actual fraud"
            accent="#00b3dd"
          />
          <StatCard
            label="Recall"
            value={pct(b.recall)}
            sub="Of actual fraud, how many were caught"
            inverted
          />
          <StatCard
            label="F1 Score"
            value={pct(b.f1_score)}
            sub="Harmonic mean of precision & recall"
            accent="#847dff"
          />
          <StatCard
            label="Accuracy"
            value={pct(b.accuracy)}
            sub="Overall correct predictions"
          />
        </div>
      </div>

      {/* ── CONFUSION MATRIX + FPR COMPARISON (side by side) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Confusion Matrix */}
        <div
          className="rounded-[16px] overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              backgroundColor: '#090a0b',
            }}
          >
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: '#f5f5f7',
              }}
            >
              Confusion Matrix
            </div>
            <div
              style={{
                fontFamily: 'Roboto Mono, monospace',
                fontSize: '11px',
                color: '#6a6b6b',
                marginTop: '2px',
              }}
            >
              {num(b.total_cases)} total cases
            </div>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* TP */}
            <div
              className="rounded-[12px] p-4"
              style={{
                backgroundColor: 'rgba(34,197,94,0.06)',
                border: '1px solid rgba(34,197,94,0.2)',
              }}
            >
              <div
                style={{
                  fontFamily: 'Roboto Mono, monospace',
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#22c55e',
                  marginBottom: '6px',
                }}
              >
                True Positives
              </div>
              <div
                style={{
                  fontFamily: 'DM Serif Display, Georgia, serif',
                  fontWeight: 300,
                  fontSize: '32px',
                  lineHeight: 1,
                  color: '#22c55e',
                }}
              >
                {b.true_positives}
              </div>
              <div
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  color: '#6a6b6b',
                  marginTop: '4px',
                }}
              >
                Fraud correctly flagged
              </div>
            </div>

            {/* FP */}
            <div
              className="rounded-[12px] p-4"
              style={{
                backgroundColor: 'rgba(249,115,22,0.06)',
                border: '1px solid rgba(249,115,22,0.2)',
              }}
            >
              <div
                style={{
                  fontFamily: 'Roboto Mono, monospace',
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#f97316',
                  marginBottom: '6px',
                }}
              >
                False Positives
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                {a.false_positives < b.false_positives && (
                  <div
                    style={{
                      fontFamily: 'DM Serif Display, Georgia, serif',
                      fontWeight: 300,
                      fontSize: '22px',
                      lineHeight: 1,
                      color: '#6a6b6b',
                      textDecoration: 'line-through',
                    }}
                  >
                    {b.false_positives}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: 'DM Serif Display, Georgia, serif',
                    fontWeight: 300,
                    fontSize: '32px',
                    lineHeight: 1,
                    color: '#f97316',
                  }}
                >
                  {a.false_positives}
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  color: '#6a6b6b',
                  marginTop: '4px',
                }}
              >
                {a.false_positives < b.false_positives
                  ? `${b.false_positives - a.false_positives} resolved by calls`
                  : 'Legitimate, incorrectly flagged'}
              </div>
            </div>

            {/* FN */}
            <div
              className="rounded-[12px] p-4"
              style={{
                backgroundColor: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <div
                style={{
                  fontFamily: 'Roboto Mono, monospace',
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#ef4444',
                  marginBottom: '6px',
                }}
              >
                False Negatives
              </div>
              <div
                style={{
                  fontFamily: 'DM Serif Display, Georgia, serif',
                  fontWeight: 300,
                  fontSize: '32px',
                  lineHeight: 1,
                  color: '#ef4444',
                }}
              >
                {b.false_negatives}
              </div>
              <div
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  color: '#6a6b6b',
                  marginTop: '4px',
                }}
              >
                Fraud missed by detectors
              </div>
            </div>

            {/* TN */}
            <div
              className="rounded-[12px] p-4"
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  fontFamily: 'Roboto Mono, monospace',
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#6a6b6b',
                  marginBottom: '6px',
                }}
              >
                True Negatives
              </div>
              <div
                style={{
                  fontFamily: 'DM Serif Display, Georgia, serif',
                  fontWeight: 300,
                  fontSize: '32px',
                  lineHeight: 1,
                  color: '#9f9fa0',
                }}
              >
                {a.true_negatives}
              </div>
              <div
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  color: '#6a6b6b',
                  marginTop: '4px',
                }}
              >
                Legitimate, correctly cleared
              </div>
            </div>
          </div>
        </div>

        {/* FPR Before / After */}
        <div
          className="rounded-[16px] overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              backgroundColor: '#090a0b',
            }}
          >
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: '#f5f5f7',
              }}
            >
              False Positive Rate
            </div>
            <div
              style={{
                fontFamily: 'Roboto Mono, monospace',
                fontSize: '11px',
                color: '#6a6b6b',
                marginTop: '2px',
              }}
            >
              Before vs after AI verification calls
            </div>
          </div>

          <div style={{ padding: '24px' }}>
            {!hasCallData ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  gap: '12px',
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ opacity: 0.25 }}
                >
                  <path
                    d="M3 5a2 2 0 012-2h2.5a1 1 0 01.95.684l1.5 4.493a1 1 0 01-.503 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498A1 1 0 0121 17.5V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    stroke="#847dff"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 300,
                    color: '#6a6b6b',
                    textAlign: 'center',
                    maxWidth: '240px',
                    lineHeight: 1.6,
                  }}
                >
                  No verification calls yet.
                  <br />
                  Open a case and click{' '}
                  <span style={{ color: '#d1c9ff' }}>Trigger Call</span> to see impact.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Without calls */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        color: '#9f9fa0',
                      }}
                    >
                      Without AI Calls
                    </span>
                    <span
                      style={{
                        fontFamily: 'DM Serif Display, Georgia, serif',
                        fontWeight: 300,
                        fontSize: '28px',
                        color: '#f97316',
                      }}
                    >
                      {pct(w.fpr_without_calls)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${w.fpr_without_calls * 100}%`,
                        backgroundColor: '#f97316',
                        borderRadius: '9999px',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '11px',
                      color: '#6a6b6b',
                      marginTop: '4px',
                    }}
                  >
                    {num(b.total_cases - w.cases_with_calls)} cases without verification
                  </div>
                </div>

                {/* Arrow */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    paddingLeft: '4px',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 2v12M4 10l4 4 4-4"
                      stroke="#22c55e"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      fontFamily: 'Roboto Mono, monospace',
                      fontSize: '11px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#22c55e',
                    }}
                  >
                    {w.fp_reduction_percent.toFixed(1)}% reduction
                  </span>
                </div>

                {/* With calls */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        color: '#9f9fa0',
                      }}
                    >
                      With AI Calls
                    </span>
                    <span
                      style={{
                        fontFamily: 'DM Serif Display, Georgia, serif',
                        fontWeight: 300,
                        fontSize: '28px',
                        color: '#22c55e',
                      }}
                    >
                      {pct(w.fpr_with_calls)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${w.fpr_with_calls * 100}%`,
                        backgroundColor: '#22c55e',
                        borderRadius: '9999px',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '11px',
                      color: '#6a6b6b',
                      marginTop: '4px',
                    }}
                  >
                    {num(w.cases_with_calls)} cases verified ·{' '}
                    <span style={{ color: '#22c55e' }}>
                      {w.false_positives_resolved} resolved
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DETECTOR BREAKDOWN ── */}
      <div
        className="rounded-[16px] overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backgroundColor: '#090a0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              color: '#f5f5f7',
            }}
          >
            Detection Rule Breakdown
          </div>
          <span
            style={{
              fontFamily: 'Roboto Mono, monospace',
              fontSize: '11px',
              color: '#6a6b6b',
              letterSpacing: '0.08em',
            }}
          >
            {num(e.total_signals)} total signals
          </span>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <BarRow label="Circular Transfer" value={e.circular_transfer} max={maxEvidence} color="#847dff" />
          <BarRow label="Structuring" value={e.structuring} max={maxEvidence} color="#f97316" />
          <BarRow label="Profile Mismatch" value={e.profile_mismatch} max={maxEvidence} color="#dd90d8" />
          <BarRow label="Insider Link" value={e.insider_link} max={maxEvidence} color="#00b3dd" />
        </div>
      </div>

      {/* ── JUDGE SUMMARY ── */}
      <div
        className="rounded-[16px] p-6"
        style={{
          backgroundColor: '#090a0b',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(132,125,255,0.15)',
              border: '1px solid rgba(132,125,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1l1.8 3.6L14 5.5l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1L2 5.5l4.2-.9L8 1z"
                stroke="#847dff"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: '#f5f5f7',
                marginBottom: '8px',
              }}
            >
              Why This Matters
            </div>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                lineHeight: 1.7,
                color: '#9f9fa0',
                fontWeight: 300,
                margin: 0,
              }}
            >
              TRACE combines graph-based fraud detection with AI-powered verification calls to
              create a two-layer defence. With{' '}
              <span style={{ color: '#00b3dd', fontWeight: 400 }}>
                {pct(b.precision)} precision
              </span>{' '}
              and{' '}
              <span style={{ color: '#847dff', fontWeight: 400 }}>
                {pct(b.recall)} recall
              </span>
              , the system catches real fraud while minimising disruption to customers. Every
              alert carries a full evidence trail — no opaque scores, no unexplained flags.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

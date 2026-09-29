import { Link } from 'react-router-dom'
import { useState } from 'react'

export function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: '#0f1011', color: '#ffffff' }}
    >
      {/* Subtle node-graph SVG background */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#ffffff" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Atmospheric gradient behind hero */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(132,125,255,0.08) 0%, transparent 70%)',
        }}
      />

      {/* ── NAV ── */}
      <nav
        className="relative z-20 border-b"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          backgroundColor: 'rgba(15,16,17,0.7)',
        }}
      >
        <div className="mx-auto max-w-[1200px] px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(132,125,255,0.15)', border: '1px solid rgba(132,125,255,0.3)' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="4" cy="4" r="2" fill="#847dff" />
                <circle cx="12" cy="4" r="2" fill="#00b3dd" />
                <circle cx="8" cy="12" r="2" fill="#847dff" opacity="0.6" />
                <line x1="4" y1="4" x2="12" y2="4" stroke="#847dff" strokeWidth="0.8" opacity="0.5" />
                <line x1="4" y1="4" x2="8" y2="12" stroke="#00b3dd" strokeWidth="0.8" opacity="0.5" />
                <line x1="12" y1="4" x2="8" y2="12" stroke="#847dff" strokeWidth="0.8" opacity="0.5" />
              </svg>
            </div>
            <span
              className="text-base tracking-[0.15em] uppercase"
              style={{ fontFamily: 'Roboto Mono, monospace', color: '#ffffff', fontWeight: 500 }}
            >
              TRACE
            </span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-sm transition-colors"
              style={{ color: '#9f9fa0' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9f9fa0')}
            >
              Features
            </a>
            <a
              href="#metrics"
              className="text-sm transition-colors"
              style={{ color: '#9f9fa0' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9f9fa0')}
            >
              Performance
            </a>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm transition-colors"
              style={{ color: '#9f9fa0' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9f9fa0')}
            >
              API Docs
            </a>
            <Link
              to="/dashboard"
              className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                borderRadius: '8px',
                padding: '8px 18px',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Enter Dashboard →
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: '#9f9fa0' }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden border-t px-6 py-4 space-y-3"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <a href="#features" className="block text-sm" style={{ color: '#9f9fa0' }}>
              Features
            </a>
            <a href="#metrics" className="block text-sm" style={{ color: '#9f9fa0' }}>
              Performance
            </a>
            <Link
              to="/dashboard"
              className="block text-sm font-medium text-center py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Enter Dashboard →
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 mx-auto max-w-[1200px] px-6 pt-28 pb-24 text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center mb-8" style={{ gap: '8px' }}>
          <span
            className="uppercase tracking-[0.18em] text-[11px]"
            style={{
              fontFamily: 'Roboto Mono, monospace',
              color: '#f5f5f7',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '9999px',
              padding: '4px 20px',
              letterSpacing: '0.18em',
            }}
          >
            Fraud Intelligence Platform
          </span>
        </div>

        {/* Display headline */}
        <h1
          className="mx-auto max-w-[820px]"
          style={{
            fontFamily: 'DM Serif Display, Georgia, serif',
            fontWeight: 300,
            fontSize: 'clamp(48px, 7vw, 88px)',
            lineHeight: 0.96,
            letterSpacing: '-0.01em',
            color: '#f5f5f7',
          }}
        >
          Connect <em style={{ fontStyle: 'italic', color: '#ffffff' }}>insider</em> activity
          <br />to financial crime.
        </h1>

        {/* Subhead */}
        <p
          className="mt-8 mx-auto max-w-[520px]"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 300,
            fontSize: '18px',
            lineHeight: 1.6,
            color: '#9f9fa0',
          }}
        >
          TRACE surfaces circular transfers, structuring patterns, and insider-linked anomalies
          across your transaction graph — evidence-first, never a black box.
        </p>

        {/* CTA group */}
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 font-medium transition-opacity hover:opacity-85"
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '15px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Open Dashboard
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-medium transition-opacity hover:opacity-70"
            style={{
              backgroundColor: 'transparent',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '15px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            API Reference
          </a>
        </div>

        {/* Divider line */}
        <div
          className="mx-auto mt-20 w-px"
          style={{ height: '60px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)' }}
        />
      </section>

      {/* ── STATS ── */}
      <section
        id="metrics"
        className="relative z-10"
        style={{ backgroundColor: '#090a0b' }}
      >
        <div className="mx-auto max-w-[1200px] px-6 py-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Stat 1 */}
            <div
              className="p-8 rounded-[30px]"
              style={{ backgroundColor: '#2e2e2e' }}
            >
              <div
                style={{
                  fontFamily: 'DM Serif Display, Georgia, serif',
                  fontWeight: 300,
                  fontSize: '56px',
                  lineHeight: 1,
                  color: '#ffffff',
                }}
              >
                7
              </div>
              <div
                className="mt-3"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9f9fa0' }}
              >
                Active fraud cases detected from 116 synthetic transactions
              </div>
            </div>

            {/* Stat 2 — inverted */}
            <div
              className="p-8 rounded-[30px]"
              style={{ backgroundColor: '#cacaca' }}
            >
              <div
                style={{
                  fontFamily: 'DM Serif Display, Georgia, serif',
                  fontWeight: 300,
                  fontSize: '56px',
                  lineHeight: 1,
                  color: '#000000',
                }}
              >
                100%
              </div>
              <div
                className="mt-3"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#3f4041' }}
              >
                Detection precision — every flagged case confirmed by ground-truth labels
              </div>
            </div>

            {/* Stat 3 */}
            <div
              className="p-8 rounded-[30px]"
              style={{ backgroundColor: '#2e2e2e' }}
            >
              <div
                style={{
                  fontFamily: 'DM Serif Display, Georgia, serif',
                  fontWeight: 300,
                  fontSize: '56px',
                  lineHeight: 1,
                  color: '#00b3dd',
                }}
              >
                4×
              </div>
              <div
                className="mt-3"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9f9fa0' }}
              >
                Independent detectors — circular rings, structuring, profile anomalies, insider links
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative z-10 mx-auto max-w-[1200px] px-6 py-24">
        {/* Section label */}
        <div className="mb-16">
          <span
            className="uppercase tracking-[0.18em] text-[11px]"
            style={{
              fontFamily: 'Roboto Mono, monospace',
              color: '#9f9fa0',
            }}
          >
            Detection Engine
          </span>
          <h2
            className="mt-4 max-w-[500px]"
            style={{
              fontFamily: 'DM Serif Display, Georgia, serif',
              fontWeight: 300,
              fontSize: '38px',
              lineHeight: 1.05,
              color: '#f5f5f7',
            }}
          >
            Four detectors. One coherent risk picture.
          </h2>
        </div>

        {/* Feature tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Circular Transfer — iris */}
          <div
            className="p-8 rounded-[30px]"
            style={{ backgroundColor: '#847dff' }}
          >
            <div
              className="mb-4"
              style={{
                fontFamily: 'Roboto Mono, monospace',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.18em',
                color: 'rgba(255,255,255,0.65)',
                textTransform: 'uppercase',
              }}
            >
              Detector 01
            </div>
            <div
              style={{
                fontFamily: 'DM Serif Display, Georgia, serif',
                fontWeight: 300,
                fontSize: '28px',
                lineHeight: 1.05,
                color: '#ffffff',
              }}
            >
              Circular Transfers
            </div>
            <p className="mt-3" style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.75)' }}>
              Graph-based cycle detection over transaction flows within a configurable time window.
              Flags rings closing within 24 hours across 3–6 accounts.
            </p>
          </div>

          {/* Structuring — deep iris */}
          <div
            className="p-8 rounded-[30px]"
            style={{ backgroundColor: '#4b49aa' }}
          >
            <div
              className="mb-4"
              style={{
                fontFamily: 'Roboto Mono, monospace',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.18em',
                color: 'rgba(255,255,255,0.65)',
                textTransform: 'uppercase',
              }}
            >
              Detector 02
            </div>
            <div
              style={{
                fontFamily: 'DM Serif Display, Georgia, serif',
                fontWeight: 300,
                fontSize: '28px',
                lineHeight: 1.05,
                color: '#ffffff',
              }}
            >
              Structuring
            </div>
            <p className="mt-3" style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.75)' }}>
              Clusters of transfers just under reporting thresholds from the same account.
              Compares count and volume against each customer's historical baseline.
            </p>
          </div>

          {/* Profile Mismatch — orchid */}
          <div
            className="p-8 rounded-[30px]"
            style={{ backgroundColor: '#dd90d8' }}
          >
            <div
              className="mb-4"
              style={{
                fontFamily: 'Roboto Mono, monospace',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.18em',
                color: 'rgba(0,0,0,0.5)',
                textTransform: 'uppercase',
              }}
            >
              Detector 03
            </div>
            <div
              style={{
                fontFamily: 'DM Serif Display, Georgia, serif',
                fontWeight: 300,
                fontSize: '28px',
                lineHeight: 1.05,
                color: '#0f1011',
              }}
            >
              Profile Mismatch
            </div>
            <p className="mt-3" style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(0,0,0,0.65)' }}>
              Transaction volume deviating more than Nx from a customer's declared income bracket
              and occupation baseline. Catches sudden wealth anomalies.
            </p>
          </div>

          {/* Insider Link — periwinkle */}
          <div
            className="p-8 rounded-[30px]"
            style={{ backgroundColor: '#90b8f0' }}
          >
            <div
              className="mb-4"
              style={{
                fontFamily: 'Roboto Mono, monospace',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.18em',
                color: 'rgba(0,0,0,0.5)',
                textTransform: 'uppercase',
              }}
            >
              Detector 04
            </div>
            <div
              style={{
                fontFamily: 'DM Serif Display, Georgia, serif',
                fontWeight: 300,
                fontSize: '28px',
                lineHeight: 1.05,
                color: '#0f1011',
              }}
            >
              Insider Links
            </div>
            <p className="mt-3" style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(0,0,0,0.65)' }}>
              Employee actions (KYC edits, beneficiary changes) preceding anomalous transactions
              on accounts outside their assigned portfolio.
            </p>
          </div>
        </div>
      </section>

      {/* ── AI CALL SECTION ── */}
      <section style={{ backgroundColor: '#090a0b' }}>
        <div className="mx-auto max-w-[1200px] px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span
                className="uppercase tracking-[0.18em] text-[11px]"
                style={{ fontFamily: 'Roboto Mono, monospace', color: '#9f9fa0' }}
              >
                AI Verification Layer
              </span>
              <h2
                className="mt-4"
                style={{
                  fontFamily: 'DM Serif Display, Georgia, serif',
                  fontWeight: 300,
                  fontSize: '38px',
                  lineHeight: 1.05,
                  color: '#f5f5f7',
                }}
              >
                Calls that resolve doubt.{' '}
                <em style={{ color: '#00b3dd' }}>Not decisions.</em>
              </h2>
              <p
                className="mt-6"
                style={{ fontSize: '16px', lineHeight: 1.7, color: '#9f9fa0', fontWeight: 300 }}
              >
                Each flagged case can trigger a simulated verification call to the relevant
                customer or employee. The AI constructs a context-aware script, records the
                response, and appends a structured transcript to the evidence panel.
              </p>
              <p
                className="mt-4"
                style={{ fontSize: '16px', lineHeight: 1.7, color: '#9f9fa0', fontWeight: 300 }}
              >
                The auditor reads it. The system never auto-closes or auto-escalates.
                Every decision stays human.
              </p>
            </div>

            {/* Mock transcript card */}
            <div
              className="rounded-[16px] p-6"
              style={{ backgroundColor: '#2e2e2e' }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: '#847dff' }}
                />
                <span
                  style={{
                    fontFamily: 'Roboto Mono, monospace',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#9f9fa0',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                  }}
                >
                  AI Verification Call — not a decision
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div
                    className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: 'rgba(0,179,221,0.15)', color: '#00b3dd', fontFamily: 'Roboto Mono, monospace' }}
                  >
                    AI
                  </div>
                  <div
                    className="rounded-[8px] p-3 flex-1"
                    style={{ backgroundColor: '#3f4041' }}
                  >
                    <p style={{ fontSize: '14px', color: '#f5f5f7', lineHeight: 1.5 }}>
                      Can you confirm the purpose of five transfers of $9,800 made within 3 hours on Nov 12?
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div
                    className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: '#3f4041', color: '#9f9fa0', fontFamily: 'Roboto Mono, monospace' }}
                  >
                    C
                  </div>
                  <div
                    className="rounded-[8px] p-3 flex-1"
                    style={{ backgroundColor: '#2e2e2e', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <p style={{ fontSize: '14px', color: '#9f9fa0', lineHeight: 1.5 }}>
                      Those were for a property renovation. I can provide the contractor invoices.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span
                    style={{
                      fontFamily: 'Roboto Mono, monospace',
                      fontSize: '11px',
                      color: '#6a6b6b',
                      letterSpacing: '0.1em',
                    }}
                  >
                    CONSISTENCY
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      fontFamily: 'Roboto Mono, monospace',
                      backgroundColor: 'rgba(0,179,221,0.12)',
                      color: '#00b3dd',
                      border: '1px solid rgba(0,179,221,0.25)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Consistent ✓
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="relative z-10 mx-auto max-w-[1200px] px-6 py-28 text-center">
        <h2
          className="mx-auto max-w-[600px]"
          style={{
            fontFamily: 'DM Serif Display, Georgia, serif',
            fontWeight: 300,
            fontSize: 'clamp(38px, 5vw, 64px)',
            lineHeight: 0.98,
            color: '#f5f5f7',
          }}
        >
          Audit with confidence.
          <br />
          <em style={{ color: '#847dff' }}>Not guesswork.</em>
        </h2>
        <p
          className="mt-6 mx-auto max-w-[440px]"
          style={{ fontSize: '16px', lineHeight: 1.7, color: '#9f9fa0', fontWeight: 300 }}
        >
          Every alert comes with a full evidence trail — no opaque scores, no unexplained flags.
        </p>
        <div className="mt-10">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 font-medium transition-opacity hover:opacity-85"
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              borderRadius: '8px',
              padding: '14px 28px',
              fontSize: '15px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Start Investigating →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#090a0b' }}
      >
        <div
          className="mx-auto max-w-[1200px] px-6 py-8 flex items-center justify-between flex-wrap gap-4"
        >
          <span
            style={{
              fontFamily: 'Roboto Mono, monospace',
              fontSize: '11px',
              color: '#6a6b6b',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            TRACE · Fraud Intelligence · 2026
          </span>
          <div className="flex items-center gap-6">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm transition-colors"
              style={{ color: '#6a6b6b' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#9f9fa0')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6a6b6b')}
            >
              API Docs
            </a>
            <Link
              to="/dashboard"
              className="text-sm transition-colors"
              style={{ color: '#6a6b6b' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#9f9fa0')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6a6b6b')}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

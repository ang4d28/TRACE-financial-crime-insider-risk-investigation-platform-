import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    end: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    to: '/cases',
    label: 'Cases',
    end: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/graph',
    label: 'Graph Explorer',
    end: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="13" cy="4" r="2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 7.2L11 4.8M5 8.8L11 11.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/metrics',
    label: 'Metrics',
    end: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 13L5 9l3 2 3-5 3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const

export function AppLayout() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0f1011' }}>
      {/* ── SIDEBAR ── */}
      <aside
        className="flex w-56 shrink-0 flex-col"
        style={{
          backgroundColor: '#090a0b',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Brand */}
        <div
          className="px-5 py-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(132,125,255,0.15)',
                border: '1px solid rgba(132,125,255,0.3)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="4" cy="4" r="2" fill="#847dff" />
                <circle cx="12" cy="4" r="2" fill="#00b3dd" />
                <circle cx="8" cy="12" r="2" fill="#847dff" opacity="0.6" />
                <line x1="4" y1="4" x2="12" y2="4" stroke="#847dff" strokeWidth="0.8" opacity="0.5" />
                <line x1="4" y1="4" x2="8" y2="12" stroke="#00b3dd" strokeWidth="0.8" opacity="0.5" />
                <line x1="12" y1="4" x2="8" y2="12" stroke="#847dff" strokeWidth="0.8" opacity="0.5" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'Roboto Mono, monospace',
                  fontWeight: 500,
                  fontSize: '13px',
                  letterSpacing: '0.15em',
                  color: '#ffffff',
                }}
              >
                TRACE
              </div>
              <div
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '10px',
                  color: '#6a6b6b',
                  letterSpacing: '0.05em',
                  marginTop: '1px',
                }}
              >
                Risk Audit Platform
              </div>
            </div>
          </div>
        </div>

        {/* Nav label */}
        <div className="px-4 pt-5 pb-2">
          <span
            style={{
              fontFamily: 'Roboto Mono, monospace',
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.15em',
              color: '#6a6b6b',
              textTransform: 'uppercase',
            }}
          >
            Navigation
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5 px-3 pb-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                fontWeight: 400,
                transition: 'background-color 0.15s ease, color 0.15s ease',
                backgroundColor: isActive ? 'rgba(132,125,255,0.12)' : 'transparent',
                color: isActive ? '#d1c9ff' : '#9f9fa0',
              })}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                if (!el.getAttribute('aria-current')) {
                  el.style.backgroundColor = 'rgba(255,255,255,0.04)'
                  el.style.color = '#ffffff'
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                if (!el.getAttribute('aria-current')) {
                  el.style.backgroundColor = 'transparent'
                  el.style.color = '#9f9fa0'
                }
              }}
            >
              {({ isActive }) => (
                <>
                  <span style={{ color: isActive ? '#847dff' : 'currentColor', opacity: isActive ? 1 : 0.6 }}>
                    {item.icon}
                  </span>
                  {item.label}
                  {isActive && (
                    <span
                      className="ml-auto h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: '#847dff' }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status indicator */}
        <div
          className="mx-3 mb-4 rounded-[8px] p-3"
          style={{ backgroundColor: 'rgba(0,179,221,0.06)', border: '1px solid rgba(0,179,221,0.12)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: '#00b3dd' }}
            />
            <span
              style={{
                fontFamily: 'Roboto Mono, monospace',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.12em',
                color: '#00b3dd',
                textTransform: 'uppercase',
              }}
            >
              Live
            </span>
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#6a6b6b' }}>
            Detection engine running
          </div>
        </div>

        {/* Version */}
        <div
          className="px-4 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span
            style={{
              fontFamily: 'Roboto Mono, monospace',
              fontSize: '10px',
              color: '#6a6b6b',
              letterSpacing: '0.1em',
            }}
          >
            v1.0.0 · hackathon
          </span>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main
        className="min-w-0 flex-1"
        style={{ backgroundColor: '#0f1011' }}
      >
        <div className="p-8 max-w-[1200px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

import { useState, useEffect } from 'react'

const STEPS = [
  { key: 'profile', label: 'Complete your profile', page: 'profile', icon: '👤' },
  { key: 'ebooks', label: 'Browse the E-Book Library', page: 'ebooks', icon: '📚' },
  { key: 'leaderboard', label: 'Check the Leaderboard', page: 'leaderboard', icon: '🏆' },
]

export default function OnboardingBanner({ role, currentPage, setPage }) {
  const [checked, setChecked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('iconnect_onboarding') || '{}')
    } catch (_) { return {} }
  })

  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('iconnect_onboarded') === 'true'
  )

  // Auto-check current page step
  useEffect(() => {
    const step = STEPS.find(s => s.page === currentPage)
    if (step && !checked[step.key]) {
      const updated = { ...checked, [step.key]: true }
      setChecked(updated)
      localStorage.setItem('iconnect_onboarding', JSON.stringify(updated))
    }
  }, [currentPage])

  const allDone = STEPS.every(s => checked[s.key])

  // Auto-dismiss 3.5s after all steps are done
  useEffect(() => {
    if (!allDone) return
    const t = setTimeout(() => {
      localStorage.setItem('iconnect_onboarded', 'true')
      setDismissed(true)
    }, 3500)
    return () => clearTimeout(t)
  }, [allDone])

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem('iconnect_onboarded', 'true')
  }

  // Only show for doctor role, and only if not dismissed
  if (role !== 'doctor' || dismissed) return null

  return (
    <div style={{
      background: allDone ? '#DCFCE7' : '#EFF6FF',
      border: `1px solid ${allDone ? '#86EFAC' : '#BFDBFE'}`,
      borderRadius: 10, padding: '14px 18px', marginBottom: 20,
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 16,
      flexWrap: 'wrap', animation: 'fadeUp 0.3s ease both'
    }}>
      <div style={{ flex: 1 }}>
        {allDone ? (
          <div style={{ fontWeight: 700, color: '#166534', fontSize: 15 }}>
            🎉 You are all set! Welcome to iConnect.
          </div>
        ) : (
          <>
            <div style={{
              fontWeight: 600, fontSize: 14,
              marginBottom: 10, color: '#1E40AF'
            }}>
              👋 Welcome! Complete these steps to get started:
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {STEPS.map(s => (
                <div
                  key={s.key}
                  onClick={() => !checked[s.key] && setPage(s.page)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 20,
                    background: checked[s.key] ? '#DCFCE7' : 'white',
                    border: `1px solid ${checked[s.key] ? '#86EFAC' : '#BFDBFE'}`,
                    cursor: checked[s.key] ? 'default' : 'pointer',
                    fontSize: 13, fontWeight: 500,
                    color: checked[s.key] ? '#166534' : '#1E40AF',
                    transition: 'all 0.2s ease',
                    boxShadow: checked[s.key]
                      ? 'none'
                      : '0 1px 3px rgba(0,0,0,0.08)'
                  }}
                >
                  <span>{checked[s.key] ? '✅' : s.icon}</span>
                  <span style={{
                    textDecoration: checked[s.key] ? 'line-through' : 'none',
                    opacity: checked[s.key] ? 0.6 : 1
                  }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        onClick={dismiss}
        title="Dismiss"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 18, color: '#9CA3AF', lineHeight: 1,
          padding: 4, flexShrink: 0, borderRadius: 4
        }}
      >
        ✕
      </button>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganizationList, useUser } from '@clerk/nextjs'

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useUser()
  const { createOrganization, setActive } = useOrganizationList({ userMemberships: true })

  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!orgName.trim()) { setError('Organization name is required'); return }
    if (!createOrganization || !setActive) { setError('Please refresh and try again'); return }
    if (!user) { setError('User not found'); return }
    setLoading(true)
    setError('')
    try {
      const org = await createOrganization({ name: orgName.trim() })
      await setActive({ organization: org.id })
      router.push('/onboarding/setup')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", background: '#F7F8FC' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .tf-input{width:100%;height:48px;padding:0 16px;border:1.5px solid #E2E8F0;border-radius:10px;font-size:15px;font-family:inherit;color:#1A202C;background:#fff;outline:none;transition:border-color 0.2s,box-shadow 0.2s;}
        .tf-input:focus{border-color:#2BBE9A;box-shadow:0 0 0 3px rgba(43,190,154,0.12);}
        .tf-input::placeholder{color:#A0AEC0;}
        .tf-btn{width:100%;height:48px;background:#1F3A5F;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:500;font-family:inherit;cursor:pointer;transition:background 0.2s,transform 0.1s;display:flex;align-items:center;justify-content:center;gap:8px;}
        .tf-btn:hover:not(:disabled){background:#162d4a;}
        .tf-btn:active:not(:disabled){transform:scale(0.99);}
        .tf-btn:disabled{opacity:0.6;cursor:not-allowed;}
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>

      {/* Left dark panel */}
      <div style={{ width: '42%', background: '#1F3A5F', padding: '48px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 350, height: 350, borderRadius: '50%', background: 'rgba(43,190,154,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 64 }}>
          <div style={{ width: 36, height: 36, background: 'rgba(43,190,154,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <path d="M3 15L16 4L29 15" stroke="#2BBE9A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 13V27H26V13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="14.5" y="16" width="3" height="10" rx="1" fill="#2BBE9A"/>
            </svg>
          </div>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px' }}>TenantFlow</span>
        </div>

        {/* Step badge */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(43,190,154,0.1)', border: '1px solid rgba(43,190,154,0.2)', borderRadius: 100, fontSize: 12, color: '#2BBE9A', fontWeight: 500 }}>
            Step 1 of 2
          </span>
        </div>

        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#fff', fontSize: 38, fontWeight: 400, lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.5px' }}>
          Your workspace,<br />your rules.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.7, maxWidth: 280, marginBottom: 48 }}>
          Set up your organization to manage properties, tenants, and leases — all in one place.
        </p>

        {/* Feature list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {['Multi-property portfolio management', 'Automated lease & payment tracking', 'Role-based team access controls'].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(43,190,154,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 6L4.5 9L10.5 3" stroke="#2BBE9A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.6, paddingTop: 4 }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, marginTop: 32 }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Trusted by 500+ property managers across 30 countries</p>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {user?.firstName && (
            <p style={{ color: '#718096', fontSize: 14, marginBottom: 8 }}>Welcome back, {user.firstName} 👋</p>
          )}
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1A202C', letterSpacing: '-0.4px', marginBottom: 8 }}>
            Name your organization
          </h2>
          <p style={{ color: '#718096', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
            This is your workspace name. You can invite your team after setup.
          </p>

          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4A5568', marginBottom: 6 }}>
            Organization name
          </label>
          <input
            className="tf-input"
            type="text"
            placeholder="e.g. Acme Properties"
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <p style={{ fontSize: 12, color: '#A0AEC0', marginTop: 6, marginBottom: 20 }}>
            This will be visible to your team members.
          </p>

          {error && (
            <div style={{ padding: '10px 14px', background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 8, color: '#C53030', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button className="tf-btn" onClick={handleCreate} disabled={loading || !orgName.trim()}>
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                  <path d="M8 2a6 6 0 0 1 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Creating workspace...
              </>
            ) : (
              <>
                Continue
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            <span style={{ color: '#A0AEC0', fontSize: 12 }}>secure & private</span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {['SOC 2 Type II', 'GDPR Ready', '256-bit SSL'].map(b => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 11, color: '#718096', fontWeight: 500 }}>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M4.5 0.5L5.8 3H8.5L6.3 4.8L7.2 7.5L4.5 6L1.8 7.5L2.7 4.8L0.5 3H3.2L4.5 0.5Z" fill="#2BBE9A"/></svg>
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

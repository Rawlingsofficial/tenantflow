'use client'

import { useState } from 'react'
import { useAuth, useOrganization } from '@clerk/nextjs'
import { savePropertyType } from './actions'

export default function OnboardingSetupPage() {
  const { orgId } = useAuth()
  const { organization } = useOrganization()

  const [selected, setSelected] = useState<'residential' | 'commercial' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!selected || !orgId) { setError('Please select a property type.'); return }
    setSaving(true)
    setError('')
    try {
      const result = await savePropertyType({ orgId, orgName: organization?.name ?? 'My Organization', propertyType: selected })
      if (result.error) throw new Error(result.error)
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", background: '#F7F8FC' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .type-card{width:100%;padding:28px;border:1.5px solid #E2E8F0;border-radius:16px;background:#fff;cursor:pointer;text-align:left;transition:all 0.2s;font-family:inherit;}
        .type-card:hover{border-color:#CBD5E0;box-shadow:0 4px 16px rgba(0,0,0,0.06);}
        .type-card.selected-res{border-color:#2BBE9A;background:#F0FDF9;box-shadow:0 0 0 3px rgba(43,190,154,0.1);}
        .type-card.selected-com{border-color:#1F3A5F;background:#EEF2F8;box-shadow:0 0 0 3px rgba(31,58,95,0.1);}
        .tf-btn{width:100%;height:48px;background:#1F3A5F;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:500;font-family:inherit;cursor:pointer;transition:background 0.2s,transform 0.1s;display:flex;align-items:center;justify-content:center;gap:8px;}
        .tf-btn:hover:not(:disabled){background:#162d4a;}
        .tf-btn:active:not(:disabled){transform:scale(0.99);}
        .tf-btn:disabled{opacity:0.5;cursor:not-allowed;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}
        .fade-in{animation:fadeIn 0.25s ease forwards;}
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

        {/* Progress */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(43,190,154,0.1)', border: '1px solid rgba(43,190,154,0.2)', borderRadius: 100, fontSize: 12, color: '#2BBE9A', fontWeight: 500 }}>
            Step 2 of 2
          </span>
        </div>

        {/* Step tracker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 40 }}>
          {[
            { label: 'Create organization', done: true },
            { label: 'Choose property type', done: false, active: true },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: i < 1 ? 24 : 0, position: 'relative' }}>
              {i < 1 && <div style={{ position: 'absolute', left: 11, top: 24, width: 1, height: '100%', background: 'rgba(43,190,154,0.3)' }} />}
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: step.done ? '#2BBE9A' : step.active ? 'rgba(43,190,154,0.15)' : 'rgba(255,255,255,0.1)',
                border: step.active ? '2px solid #2BBE9A' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {step.done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 6L4.5 9L10.5 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2BBE9A' }} />
                )}
              </div>
              <div style={{ paddingTop: 2 }}>
                <p style={{ fontSize: 14, color: step.done ? 'rgba(255,255,255,0.9)' : step.active ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: step.active ? 500 : 400 }}>
                  {step.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#fff', fontSize: 34, fontWeight: 400, lineHeight: 1.25, marginBottom: 16, letterSpacing: '-0.5px' }}>
          Tailored to your<br />property type.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>
          We customize your dashboard, reports, and workflows based on how you manage your properties.
        </p>

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, marginTop: 32 }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>You can update this later in organization settings.</p>
        </div>
      </div>

      {/* Right selection panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1A202C', letterSpacing: '-0.4px', marginBottom: 8 }}>
            What do you manage?
          </h2>
          <p style={{ color: '#718096', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
            Choose the type that best describes your portfolio.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>

            {/* Residential card */}
            <button
              className={`type-card${selected === 'residential' ? ' selected-res' : ''}`}
              onClick={() => setSelected('residential')}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: selected === 'residential' ? 'rgba(43,190,154,0.12)' : '#F7F8FC',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12L12 3L21 12" stroke={selected === 'residential' ? '#2BBE9A' : '#A0AEC0'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 10V20H19V10" stroke={selected === 'residential' ? '#2BBE9A' : '#A0AEC0'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 20V15H14V20" stroke={selected === 'residential' ? '#2BBE9A' : '#A0AEC0'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: selected === 'residential' ? '#0F6E56' : '#1A202C' }}>Residential</span>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: selected === 'residential' ? 'none' : '1.5px solid #CBD5E0',
                      background: selected === 'residential' ? '#2BBE9A' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>
                      {selected === 'residential' && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#718096', lineHeight: 1.5, marginBottom: 12 }}>
                    Apartments, houses, studios & guesthouses
                  </p>
                  {selected === 'residential' && (
                    <div className="fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['Rent tracking', 'Lease management', 'Tenant portal', 'Occupancy reports'].map(tag => (
                        <span key={tag} style={{ padding: '3px 10px', background: 'rgba(43,190,154,0.1)', border: '1px solid rgba(43,190,154,0.2)', borderRadius: 100, fontSize: 11, color: '#0F6E56', fontWeight: 500 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Commercial card */}
            <button
              className={`type-card${selected === 'commercial' ? ' selected-com' : ''}`}
              onClick={() => setSelected('commercial')}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: selected === 'commercial' ? 'rgba(31,58,95,0.08)' : '#F7F8FC',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="7" width="18" height="14" rx="1" stroke={selected === 'commercial' ? '#1F3A5F' : '#A0AEC0'} strokeWidth="1.8"/>
                    <path d="M7 7V5C7 3.9 7.9 3 9 3H15C16.1 3 17 3.9 17 5V7" stroke={selected === 'commercial' ? '#1F3A5F' : '#A0AEC0'} strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M8 12H16M8 16H13" stroke={selected === 'commercial' ? '#1F3A5F' : '#A0AEC0'} strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: selected === 'commercial' ? '#1F3A5F' : '#1A202C' }}>Commercial</span>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: selected === 'commercial' ? 'none' : '1.5px solid #CBD5E0',
                      background: selected === 'commercial' ? '#1F3A5F' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>
                      {selected === 'commercial' && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#718096', lineHeight: 1.5, marginBottom: 12 }}>
                    Offices, retail spaces, warehouses & co-working
                  </p>
                  {selected === 'commercial' && (
                    <div className="fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['Invoice generation', 'Service charges', 'Break clauses', 'VAT tracking'].map(tag => (
                        <span key={tag} style={{ padding: '3px 10px', background: 'rgba(31,58,95,0.08)', border: '1px solid rgba(31,58,95,0.15)', borderRadius: 100, fontSize: 11, color: '#1F3A5F', fontWeight: 500 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 8, color: '#C53030', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button className="tf-btn" onClick={handleSave} disabled={!selected || saving}>
            {saving ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                  <path d="M8 2a6 6 0 0 1 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Setting up your workspace...
              </>
            ) : (
              <>
                Go to Dashboard
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#A0AEC0', marginTop: 16 }}>
            You can change this later in Settings → Organization
          </p>
        </div>
      </div>
    </div>
  )
}

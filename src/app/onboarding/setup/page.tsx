'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useOrganization } from '@clerk/nextjs'
import { savePropertyType } from './actions'

export default function OnboardingSetupPage() {
  const { orgId } = useAuth()
  const { organization } = useOrganization()

  const [selected, setSelected] = useState<'residential' | 'commercial' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!selected || !orgId) {
      setError('Please select a property type.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const result = await savePropertyType({
        orgId,
        orgName: organization?.name ?? 'My Organization',
        propertyType: selected,
      })

      if (result.error) throw new Error(result.error)

      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h1>What type of properties do you manage?</h1>

      <div style={{ display: 'flex', gap: 16, margin: '24px 0' }}>
        <button
          onClick={() => setSelected('residential')}
          style={{
            flex: 1,
            padding: '16px',
            fontSize: 16,
            cursor: 'pointer',
            border: selected === 'residential' ? '2px solid black' : '2px solid #ccc',
            borderRadius: 8,
            background: selected === 'residential' ? '#f0f0f0' : 'white',
          }}
        >
          Residential
        </button>

        <button
          onClick={() => setSelected('commercial')}
          style={{
            flex: 1,
            padding: '16px',
            fontSize: 16,
            cursor: 'pointer',
            border: selected === 'commercial' ? '2px solid black' : '2px solid #ccc',
            borderRadius: 8,
            background: selected === 'commercial' ? '#f0f0f0' : 'white',
          }}
        >
          Commercial
        </button>
      </div>

      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

      <button
        onClick={handleSave}
        disabled={!selected || saving}
        style={{ padding: '8px 24px', fontSize: 16, cursor: 'pointer' }}
      >
        {saving ? 'Saving...' : 'Continue to Dashboard'}
      </button>
    </div>
  )
}

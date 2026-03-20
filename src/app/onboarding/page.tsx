'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganizationList } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const { createOrganization, setActive } = useOrganizationList()

  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!orgName.trim()) {
      setError('Organization name is required')
      return
    }
    if (!createOrganization || !setActive) {
      setError('Organization feature not ready — please refresh')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 1. Create org via Clerk
      const org = await createOrganization({ name: orgName.trim() })

      // 2. Set it as active org
      await setActive({ organization: org.id })

      // 3. Save to Supabase using Clerk org ID as primary key
      const supabase = getSupabaseBrowserClient()
      const { error: supabaseError } = await supabase
        .from('organizations')
        .insert({
          id: org.id,
          name: orgName.trim(),
        } as any)

      if (supabaseError) throw new Error(supabaseError.message)

      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <div className="p-2 bg-slate-900 rounded-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-semibold text-slate-900">TenantFlow</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your organization</CardTitle>
            <CardDescription>
              Set up your property management workspace. You can invite team members after setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name *</Label>
              <Input
                id="orgName"
                placeholder="e.g. Acme Properties"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create organization & continue'
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">
          You'll be set as the owner with full access.
        </p>
      </div>
    </div>
  )
}


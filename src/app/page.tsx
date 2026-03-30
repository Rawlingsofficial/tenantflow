import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const { userId, orgId } = await auth()

  if (!userId) redirect('/sign-in')
  if (!orgId)  redirect('/onboarding')

  // ← THE FIX: check Supabase before sending to dashboard
  const supabase = createServerClient()
  const { data: org } = await (supabase
    .from('organizations')
    .select('property_type')
    .eq('id', orgId)
    .maybeSingle() as any)

  if (!org?.property_type) redirect('/onboarding')

  redirect('/dashboard')
}
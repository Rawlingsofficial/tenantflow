// src/app/(dashboard)/layout.tsx  ← server component (no 'use client')
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import DashboardShell from './_shell'   // ← see below

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, orgId } = await auth()

  if (!userId) redirect('/sign-in')
  if (!orgId)  redirect('/onboarding')

  const supabase = createServerClient()
  const { data: org } = await (supabase
    .from('organizations')
    .select('property_type')
    .eq('id', orgId)
    .maybeSingle() as any)

  if (!org?.property_type) redirect('/onboarding')

  return <DashboardShell>{children}</DashboardShell>
}
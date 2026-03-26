// src/app/(dashboard)/page.tsx
'use client'

import { useAuth } from '@clerk/nextjs'
import { usePropertyType } from '@/hooks/usePropertyType'

export default function DashboardPage() {
  const { orgId } = useAuth()
  const { propertyType } = usePropertyType()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="text-slate-600 mt-2">
        Organization: {orgId}<br />
        Property type: {propertyType}
      </p>
    </div>
  )
}
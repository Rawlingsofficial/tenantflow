'use client'

/**
 * ReportSwitcher
 * Reads property_type and renders the correct overview report.
 * Used by src/app/(dashboard)/reports/page.tsx
 */

import { Skeleton } from '@/components/ui/skeleton'
import { usePropertyType } from '@/hooks/usePropertyType'
import dynamic from 'next/dynamic'

const ResidentialOverview = dynamic(() => import('@/components/reports/residential/ResidentialReportsOverview'), { ssr: false })
const CommercialOverview  = dynamic(() => import('@/components/reports/commercial/CommercialReportsOverview'),  { ssr: false })
const MixedOverview       = dynamic(() => import('@/components/reports/mixed/MixedReportsOverview'),            { ssr: false })

export default function ReportSwitcher() {
  const { propertyType, loading } = usePropertyType()

  if (loading) return (
    <div className="min-h-screen bg-[#F4F6F9] p-6 space-y-4">
      <Skeleton className="h-10 w-56 rounded-xl" />
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )

  if (propertyType === 'commercial') return <CommercialOverview />
  if (propertyType === 'mixed')       return <MixedOverview />
  return <ResidentialOverview />
}

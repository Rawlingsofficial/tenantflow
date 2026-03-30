//src/components/reports/LeasesReportSwitcher.tsx
'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { usePropertyType } from '@/hooks/usePropertyType'
import dynamic from 'next/dynamic'

const ResidentialLeases = dynamic(() => import('@/app/(dashboard)/reports/leases/page'), { ssr: false })
const CommercialLeases  = dynamic(() => import('@/components/reports/commercial/CommercialLeasesReport'), { ssr: false })


export default function LeasesReportSwitcher() {
  const { propertyType, loading } = usePropertyType()
  if (loading) return <div className="min-h-screen bg-[#F4F6F9] p-6 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
  if (propertyType === 'commercial') return <CommercialLeases />
  
  return <ResidentialLeases />
}

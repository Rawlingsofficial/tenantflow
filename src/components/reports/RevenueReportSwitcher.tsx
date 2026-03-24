'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { usePropertyType } from '@/hooks/usePropertyType'
import dynamic from 'next/dynamic'

// Residential revenue = the original report (preserved as-is)
const ResidentialRevenue = dynamic(() => import('@/app/(dashboard)/reports/revenue/page'), { ssr: false })

// Commercial revenue = NNN-aware version
const CommercialRevenue  = dynamic(() => import('@/components/reports/commercial/CommercialRevenueReport'), { ssr: false })

// Mixed revenue = tabbed wrapper
const MixedRevenue       = dynamic(() => import('@/components/reports/mixed/MixedRevenueReport'), { ssr: false })

export default function RevenueReportSwitcher() {
  const { propertyType, loading } = usePropertyType()
  if (loading) return (
    <div className="min-h-screen bg-[#F4F6F9] p-6 space-y-3">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  )
  if (propertyType === 'commercial') return <CommercialRevenue />
  if (propertyType === 'mixed')       return <MixedRevenue />
  return <ResidentialRevenue />
}

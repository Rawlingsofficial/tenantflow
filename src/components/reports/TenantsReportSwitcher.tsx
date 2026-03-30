//src/components/reports/TenantsReportSwitcher.tsx
'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { usePropertyType } from '@/hooks/usePropertyType'
import dynamic from 'next/dynamic'

const ResidentialTenants = dynamic(() => import('@/app/(dashboard)/reports/tenants/page'), { ssr: false })
const CommercialTenants  = dynamic(() => import('@/components/reports/commercial/CommercialTenantsReport'), { ssr: false })


export default function TenantsReportSwitcher() {
  const { propertyType, loading } = usePropertyType()
  if (loading) return <div className="min-h-screen bg-[#F4F6F9] p-6 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
  if (propertyType === 'commercial') return <CommercialTenants />
  
  return <ResidentialTenants />
}


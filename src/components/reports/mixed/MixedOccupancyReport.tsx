'use client'

/**
 * Mixed Occupancy Report
 *
 * Uses ShadCN Tabs to present residential and commercial occupancy
 * in a single page. Each tab renders the respective standalone report.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Home, Building2 } from 'lucide-react'
import dynamic from 'next/dynamic'

const ResidentialOccupancy = dynamic(() => import('@/app/(dashboard)/reports/occupancy/page'), { ssr: false })
const CommercialOccupancy   = dynamic(() => import('@/components/reports/commercial/CommercialOccupancyReport'), { ssr: false })

export default function MixedOccupancyReport() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-[#070a0f]">
      <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b border-white/[0.05]">
        <button onClick={() => router.push('/reports')} className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Reports
        </button>
        <span className="text-gray-700">/</span>
        <h1 className="text-sm font-bold text-white">Occupancy</h1>
      </div>
      <div className="px-6 pt-5">
        <Tabs defaultValue="residential" className="w-full">
          <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl mb-5 w-fit">
            <TabsTrigger value="residential" className="text-[11px] font-semibold rounded-lg data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-300 text-gray-600 px-4 py-1.5 flex items-center gap-1.5">
              <Home className="h-3 w-3" /> Residential
            </TabsTrigger>
            <TabsTrigger value="commercial" className="text-[11px] font-semibold rounded-lg data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-300 text-gray-600 px-4 py-1.5 flex items-center gap-1.5">
              <Building2 className="h-3 w-3" /> Commercial
            </TabsTrigger>
          </TabsList>
          <TabsContent value="residential" className="mt-0 -mx-6">
            <ResidentialOccupancy />
          </TabsContent>
          <TabsContent value="commercial" className="mt-0 -mx-6">
            <CommercialOccupancy />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

//--------------------------------------------------- test


'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Search, Building2, TrendingUp,
  FileText, DollarSign, ArrowUpRight
} from 'lucide-react'
import AddCompanyDialog from '@/components/companies/AddCompanyDialog'
import { usePropertyType } from '@/hooks/usePropertyType'

type Tab = 'all' | 'active' | 'inactive'

export default function CompaniesPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = useSupabaseWithAuth()
  const { propertyType } = usePropertyType() // still keep in case you need it later

  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (orgId) load()
  }, [orgId]) // removed mode & propertyType from dependency

  async function load() {
    setLoading(true)
    const db = supabase as any
    const { data } = await db.from('tenants')
      .select(`*, leases(id, status, rent_amount, service_charge,
        units(unit_code, unit_purpose, area_sqm, floor_number, buildings(name, building_type)))`)
      .eq('organization_id', orgId!)
      .eq('tenant_type', 'company')
      .order('company_name')

    setCompanies(data ?? []) // removed mixed filtering logic
    setLoading(false)
  }

  const filtered = companies.filter(c => {
    const q = search.toLowerCase()
    const match = !q ||
      (c.company_name ?? '').toLowerCase().includes(q) ||
      (c.industry ?? '').toLowerCase().includes(q) ||
      (c.contact_person ?? '').toLowerCase().includes(q)
    if (!match) return false
    if (tab === 'active') return c.status === 'active'
    if (tab === 'inactive') return c.status === 'inactive'
    return true
  })

  const activeCount = companies.filter(c => c.status === 'active').length
  const withLease   = companies.filter(c => (c.leases ?? []).some((l: any) => l.status === 'active')).length
  const monthlyRev  = companies.reduce((sum, c) => {
    const al = (c.leases ?? []).find((l: any) => l.status === 'active')
    return sum + (al ? Number(al.rent_amount) + Number(al.service_charge ?? 0) : 0)
  }, 0)

  const tabs = [
    { label: 'All', value: 'all' as Tab, count: companies.length },
    { label: 'Active', value: 'active' as Tab, count: activeCount },
    { label: 'Inactive', value: 'inactive' as Tab, count: companies.length - activeCount },
  ]

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* ...rest of your JSX remains exactly the same, just remove mixed logic display */}
      <motion.div className="px-6 pt-6 pb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Companies</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {activeCount} active · {withLease} with lease · ${monthlyRev.toLocaleString()}/mo
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="h-9 bg-[#1B3B6F] hover:bg-[#162d52] text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 px-4 shadow-sm">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </motion.div>
      {/* ...rest of component remains the same */}
      <AddCompanyDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); load() }}
      />
    </div>
  )
}


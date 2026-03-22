'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Users, Search, ChevronUp, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Tenant } from '@/types'

interface TenantWithUnit extends Tenant {
  leases?: {
    units?: {
      unit_code: string
      buildings?: { name: string } | null
    } | null
    status: string
  }[]
}

interface TenantsTableProps {
  tenants: TenantWithUnit[]
}

export default function TenantsTable({ tenants }: TenantsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'name' | 'occupation' | 'status'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = tenants
    .filter((t) => {
      const q = search.toLowerCase()
      const name = `${t.first_name ?? ''} ${t.last_name ?? ''}`.toLowerCase()
      const matchesSearch = !q || name.includes(q) || t.email?.toLowerCase().includes(q) || t.primary_phone?.includes(q) || t.occupation?.toLowerCase().includes(q) || t.employer_name?.toLowerCase().includes(q)
      return matchesSearch && (statusFilter === 'all' || t.status === statusFilter)
    })
    .sort((a, b) => {
      let valA = '', valB = ''
      if (sortField === 'name') { valA = `${a.first_name ?? ''} ${a.last_name ?? ''}`.toLowerCase(); valB = `${b.first_name ?? ''} ${b.last_name ?? ''}`.toLowerCase() }
      else if (sortField === 'occupation') { valA = a.occupation?.toLowerCase() ?? ''; valB = b.occupation?.toLowerCase() ?? '' }
      else { valA = a.status; valB = b.status }
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 inline ml-1 text-slate-300" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1 text-teal-600" /> : <ChevronDown className="h-3 w-3 inline ml-1 text-teal-600" />
  }

  if (tenants.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Users className="h-5 w-5 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">No tenants yet.</p>
        <p className="text-xs text-slate-400 mt-1">
          Go to <a href="/buildings" className="text-teal-600 hover:underline font-medium">Buildings</a> and assign a tenant to a vacant unit.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search by name, phone, email, occupation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-40 h-9 rounded-xl border-slate-200 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} of {tenants.length} tenants</p>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('name')}>
                Name <SortIcon field="name" />
              </th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('occupation')}>
                Occupation <SortIcon field="occupation" />
              </th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Current Unit</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('status')}>
                Status <SortIcon field="status" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-10 text-sm">No tenants match your search</td>
              </tr>
            ) : (
              filtered.map((tenant, i) => {
                const activeLease = tenant.leases?.find((l) => l.status === 'active')
                const unit = activeLease?.units
                const unitLabel = unit ? `${unit.buildings?.name ?? ''} — ${unit.unit_code}` : '—'
                const initials = `${tenant.first_name?.[0] ?? ''}${tenant.last_name?.[0] ?? ''}`.toUpperCase()

                return (
                  <motion.tr
                    key={tenant.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                    className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50/60 transition-colors group"
                    onClick={() => router.push(`/tenants/${tenant.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl overflow-hidden bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] flex items-center justify-center text-xs font-bold text-[#14b8a6] shrink-0 shadow-sm border border-[#1B3B6F]/20">
                          {(tenant as any).photo_url
                            ? <img src={(tenant as any).photo_url} alt="" className="w-full h-full object-cover" />
                            : initials || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors text-sm leading-tight">
                            {tenant.first_name} {tenant.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{tenant.primary_phone ?? '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 max-w-[140px] truncate">{tenant.email ?? '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{tenant.occupation ?? '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{unitLabel}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        tenant.status === 'active'
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tenant.status === 'active' ? 'bg-teal-500' : 'bg-slate-400'}`} />
                        {tenant.status}
                      </span>
                    </td>
                  </motion.tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}



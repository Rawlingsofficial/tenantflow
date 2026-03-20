'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Search, ChevronUp, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
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
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = tenants
    .filter((t) => {
      const q = search.toLowerCase()
      const name = `${t.first_name ?? ''} ${t.last_name ?? ''}`.toLowerCase()
      const matchesSearch =
        !q ||
        name.includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.primary_phone?.includes(q) ||
        t.occupation?.toLowerCase().includes(q) ||
        t.employer_name?.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let valA = '', valB = ''
      if (sortField === 'name') {
        valA = `${a.first_name ?? ''} ${a.last_name ?? ''}`.toLowerCase()
        valB = `${b.first_name ?? ''} ${b.last_name ?? ''}`.toLowerCase()
      } else if (sortField === 'occupation') {
        valA = a.occupation?.toLowerCase() ?? ''
        valB = b.occupation?.toLowerCase() ?? ''
      } else {
        valA = a.status
        valB = b.status
      }
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return null
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 inline ml-1" />
      : <ChevronDown className="h-3 w-3 inline ml-1" />
  }

  if (tenants.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No tenants yet.</p>
        <p className="text-xs mt-1">
          Go to <a href="/buildings" className="text-indigo-500 hover:underline">Buildings</a> and assign a tenant to a vacant unit.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone, email, occupation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-slate-400">
        {filtered.length} of {tenants.length} tenants
      </p>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead
                className="text-xs cursor-pointer hover:text-slate-900"
                onClick={() => toggleSort('name')}
              >
                Name <SortIcon field="name" />
              </TableHead>
              <TableHead className="text-xs">Phone</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead
                className="text-xs cursor-pointer hover:text-slate-900"
                onClick={() => toggleSort('occupation')}
              >
                Occupation <SortIcon field="occupation" />
              </TableHead>
              <TableHead className="text-xs">Current unit</TableHead>
              <TableHead
                className="text-xs cursor-pointer hover:text-slate-900"
                onClick={() => toggleSort('status')}
              >
                Status <SortIcon field="status" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-8 text-sm">
                  No tenants match your search
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tenant) => {
                const activeLease = tenant.leases?.find((l) => l.status === 'active')
                const unit = activeLease?.units
                const unitLabel = unit
                  ? `${unit.buildings?.name ?? ''} — ${unit.unit_code}`
                  : '—'

                return (
                  <TableRow
                    key={tenant.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => router.push(`/tenants/${tenant.id}`)}
                  >
                    <TableCell className="font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">
                          {(tenant.first_name?.[0] ?? '?').toUpperCase()}
                          {(tenant.last_name?.[0] ?? '').toUpperCase()}
                        </div>
                        <span>{tenant.first_name} {tenant.last_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {tenant.primary_phone ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {tenant.email ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {tenant.occupation ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {unitLabel}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          tenant.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-100'
                        }
                      >
                        {tenant.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}


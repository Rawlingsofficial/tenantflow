'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, FileText, Clock, AlertCircle,
  CheckCircle2, XCircle, ChevronUp, ChevronDown
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { format, differenceInDays } from 'date-fns'
import type { LeaseWithDetails } from '@/types'

interface Props {
  leases: LeaseWithDetails[]
  onViewDetail: (lease: LeaseWithDetails) => void
}

function DaysRemaining({ leaseEnd }: { leaseEnd: string | null }) {
  if (!leaseEnd) {
    return (
      <span className="text-xs text-emerald-600 font-medium">
        Open ended
      </span>
    )
  }

  const days = differenceInDays(new Date(leaseEnd), new Date())

  if (days < 0) {
    return (
      <span className="text-xs text-red-500 font-medium">
        Expired {Math.abs(days)}d ago
      </span>
    )
  }
  if (days <= 30) {
    return (
      <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {days}d left
      </span>
    )
  }
  return (
    <span className="text-xs text-slate-500">
      {days}d left
    </span>
  )
}

const statusConfig: Record<string, { label: string; class: string; icon: any }> = {
  active: {
    label: 'Active',
    class: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2,
  },
  ended: {
    label: 'Ended',
    class: 'bg-slate-100 text-slate-500',
    icon: Clock,
  },
  terminated: {
    label: 'Terminated',
    class: 'bg-red-100 text-red-600',
    icon: XCircle,
  },
}

export default function LeasesTable({ leases, onViewDetail }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<'tenant' | 'start' | 'end' | 'rent'>('start')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = leases
    .filter((l) => {
      const q = search.toLowerCase()
      const tenantName = `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.toLowerCase()
      const unit = l.units?.unit_code?.toLowerCase() ?? ''
      const building = l.units?.buildings?.name?.toLowerCase() ?? ''
      const matchSearch = !q || tenantName.includes(q) || unit.includes(q) || building.includes(q)
      const matchStatus = statusFilter === 'all' || l.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      let valA = '', valB = ''
      if (sortField === 'tenant') {
        valA = `${a.tenants?.first_name ?? ''} ${a.tenants?.last_name ?? ''}`.toLowerCase()
        valB = `${b.tenants?.first_name ?? ''} ${b.tenants?.last_name ?? ''}`.toLowerCase()
      } else if (sortField === 'start') {
        valA = a.lease_start
        valB = b.lease_start
      } else if (sortField === 'end') {
        valA = a.lease_end ?? '9999'
        valB = b.lease_end ?? '9999'
      } else {
        valA = String(a.rent_amount)
        valB = String(b.rent_amount)
      }
      return sortDir === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA)
    })

  // Expiring soon count
  const expiringSoon = leases.filter((l) => {
    if (l.status !== 'active' || !l.lease_end) return false
    return differenceInDays(new Date(l.lease_end), new Date()) <= 30
  }).length

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return null
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 inline ml-1" />
      : <ChevronDown className="h-3 w-3 inline ml-1" />
  }

  if (leases.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium">No leases yet</p>
        <p className="text-xs mt-1">
          Assign a tenant to a unit from the{' '}
          <a href="/buildings" className="text-indigo-500 hover:underline">
            Buildings
          </a>{' '}
          page to create a lease
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Expiring soon alert */}
      {expiringSoon > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{expiringSoon} lease{expiringSoon > 1 ? 's' : ''}</span>
            {' '}expiring within 30 days
          </p>
          <button
            className="ml-auto text-xs text-amber-700 underline"
            onClick={() => setStatusFilter('active')}
          >
            View active
          </button>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by tenant, unit, building..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-slate-400">
        {filtered.length} of {leases.length} leases
      </p>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead
                className="text-xs cursor-pointer hover:text-slate-900"
                onClick={() => toggleSort('tenant')}
              >
                Tenant <SortIcon field="tenant" />
              </TableHead>
              <TableHead className="text-xs">Unit / Building</TableHead>
              <TableHead
                className="text-xs cursor-pointer hover:text-slate-900"
                onClick={() => toggleSort('start')}
              >
                Start <SortIcon field="start" />
              </TableHead>
              <TableHead
                className="text-xs cursor-pointer hover:text-slate-900"
                onClick={() => toggleSort('end')}
              >
                End <SortIcon field="end" />
              </TableHead>
              <TableHead className="text-xs">Remaining</TableHead>
              <TableHead
                className="text-xs cursor-pointer hover:text-slate-900"
                onClick={() => toggleSort('rent')}
              >
                Rent / mo <SortIcon field="rent" />
              </TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-slate-400 py-10 text-sm"
                >
                  No leases match your search
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lease) => {
                const config = statusConfig[lease.status]
                const StatusIcon = config.icon
                const tenantName = `${lease.tenants?.first_name ?? ''} ${lease.tenants?.last_name ?? ''}`.trim()
                const isExpiringSoon =
                  lease.status === 'active' &&
                  lease.lease_end &&
                  differenceInDays(new Date(lease.lease_end), new Date()) <= 30

                return (
                  <TableRow
                    key={lease.id}
                    className={`hover:bg-slate-50 cursor-pointer ${
                      isExpiringSoon ? 'bg-amber-50/30' : 'bg-white'
                    }`}
                    onClick={() => onViewDetail(lease)}
                  >
                    {/* Tenant */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                          {tenantName[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          {tenantName || '—'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Unit / Building */}
                    <TableCell>
                      <p className="text-sm font-medium text-slate-900">
                        {lease.units?.unit_code ?? '—'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {lease.units?.buildings?.name ?? '—'}
                      </p>
                    </TableCell>

                    {/* Start */}
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(lease.lease_start), 'dd MMM yyyy')}
                    </TableCell>

                    {/* End */}
                    <TableCell className="text-sm text-slate-600">
                      {lease.lease_end
                        ? format(new Date(lease.lease_end), 'dd MMM yyyy')
                        : <span className="text-slate-400 text-xs">Open ended</span>
                      }
                    </TableCell>

                    {/* Days remaining */}
                    <TableCell>
                      {lease.status === 'active'
                        ? <DaysRemaining leaseEnd={lease.lease_end} />
                        : <span className="text-xs text-slate-300">—</span>
                      }
                    </TableCell>

                    {/* Rent */}
                    <TableCell className="text-sm font-semibold text-slate-800">
                      {Number(lease.rent_amount).toLocaleString()}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${config.class}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => router.push(`/tenants/${lease.tenant_id}`)}
                        >
                          View tenant
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-indigo-600"
                          onClick={() => onViewDetail(lease)}
                        >
                          Details
                        </Button>
                      </div>
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


'use client'

import { useRouter } from 'next/navigation'
import { FileText, AlertCircle, ChevronDown } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import type { LeaseWithDetails } from '@/types'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface Props {
  leases: LeaseWithDetails[]
  onViewDetail: (lease: LeaseWithDetails) => void
}

function StatusBadge({ lease }: { lease: LeaseWithDetails }) {
  const leaseEnd = lease.lease_end
  const status = lease.status

  if (status === 'terminated') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Terminated
    </span>
  )
  if (status === 'ended') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Ended
    </span>
  )

  if (status === 'active') {
    if (!leaseEnd) return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
        <ChevronDown className="h-3 w-3 ml-0.5" />
      </span>
    )
    const days = differenceInDays(new Date(leaseEnd), new Date())
    if (days < 0) return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Expired
        <ChevronDown className="h-3 w-3 ml-0.5" />
      </span>
    )
    if (days <= 30) return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <AlertCircle className="h-3 w-3" /> Expiring Soon
        <ChevronDown className="h-3 w-3 ml-0.5" />
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
        <ChevronDown className="h-3 w-3 ml-0.5" />
      </span>
    )
  }
  return null
}

export default function LeasesTable({ leases, onViewDetail }: Props) {
  const router = useRouter()

  if (leases.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">No leases found</p>
        <p className="text-xs text-gray-400 mt-1">
          Assign a tenant to a unit from the{' '}
          <a href="/buildings" className="text-emerald-600 hover:underline">Buildings</a> page
        </p>
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-50 bg-gray-50/30">
          <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Lease</th>
          <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Unit</th>
          <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Start Date <span className="inline-block ml-0.5">↕</span>
          </th>
          <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Rent <span className="inline-block ml-0.5">↕</span>
          </th>
          <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide" />
        </tr>
      </thead>
      <tbody>
        {leases.map((lease) => {
          const tenant = (lease as any).tenants
          const unit = (lease as any).units
          const building = unit?.buildings
          const fullName = `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
          const initials = `${tenant?.first_name?.[0] ?? ''}${tenant?.last_name?.[0] ?? ''}`.toUpperCase()
          const leaseEnd = lease.lease_end
          const days = leaseEnd ? differenceInDays(new Date(leaseEnd), new Date()) : null
          const isExpiringSoon = lease.status === 'active' && days !== null && days <= 30 && days >= 0
          const isExpired = lease.status === 'active' && days !== null && days < 0

          return (
            <tr key={lease.id}
              className={`border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer transition-colors group ${
                isExpiringSoon ? 'bg-amber-50/30' : isExpired ? 'bg-red-50/20' : ''
              }`}
              onClick={() => onViewDetail(lease)}>

              {/* Tenant avatar + name */}
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 border border-gray-100 shadow-sm">
                    {tenant?.photo_url ? (
                      <img src={tenant.photo_url} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-700">
                        {initials || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{fullName || '—'}</p>
                    <p className="text-[11px] text-gray-400">{tenant?.primary_phone ?? tenant?.email ?? '—'}</p>
                  </div>
                </div>
              </td>

              {/* Unit */}
              <td className="px-4 py-3.5">
                <p className="text-sm font-semibold text-gray-800">{unit?.unit_code ?? '—'}</p>
                <p className="text-[11px] text-gray-400">{building?.name ?? '—'}</p>
              </td>

              {/* Start date */}
              <td className="px-4 py-3.5">
                <p className="text-sm text-gray-600">{format(new Date(lease.lease_start), 'MMM d, yyyy')}</p>
                {leaseEnd && (
                  <p className="text-[11px] text-gray-400">→ {format(new Date(leaseEnd), 'MMM d, yyyy')}</p>
                )}
              </td>

              {/* Rent */}
              <td className="px-4 py-3.5">
                <span className="text-sm font-semibold text-gray-800">${Number(lease.rent_amount).toLocaleString()}</span>
              </td>

              {/* Status */}
              <td className="px-4 py-3.5">
                <StatusBadge lease={lease} />
              </td>
            </tr>
          )
        })}
      </tbody>

      {/* Footer summary row */}
      <tfoot>
        <tr className="border-t border-gray-100 bg-gray-50/50">
          <td className="px-5 py-2.5" colSpan={3}>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-gray-700">{leases.filter(l => l.status === 'active').length}</span> active
              </span>
              <span className="text-gray-300">·</span>
              <span><span className="font-semibold text-gray-700">{leases.filter(l => l.status === 'ended').length}</span> ended</span>
              <span className="text-gray-300">·</span>
              <span><span className="font-semibold text-gray-700">{leases.filter(l => l.status === 'terminated').length}</span> terminated</span>
              <span className="text-gray-300">·</span>
              <span><span className="font-semibold text-gray-700">{leases.length}</span> total</span>
            </div>
          </td>
          <td className="px-4 py-2.5 text-right" colSpan={3}>
            <span className="text-xs text-gray-400">
              ${leases.filter(l => l.status === 'active').reduce((s, l) => s + Number(l.rent_amount), 0).toLocaleString()}/mo active revenue
            </span>
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

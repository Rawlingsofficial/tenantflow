'use client'

import { useEffect, useState } from 'react'
import { History, User, Calendar, DollarSign } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import type { Unit } from '@/types'

interface LeaseHistory {
  id: string
  rent_amount: number
  lease_start: string
  lease_end: string | null
  status: string
  tenants: {
    first_name: string | null
    last_name: string | null
    primary_phone: string | null
    occupation: string | null
  } | null
}

interface Props {
  open: boolean
  onClose: () => void
  unit: Unit | null
}

export default function UnitHistoryDialog({ open, onClose, unit }: Props) {
  const supabase = getSupabaseBrowserClient()
  const [leases, setLeases] = useState<LeaseHistory[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && unit) loadHistory()
  }, [open, unit])

  async function loadHistory() {
    if (!unit) return
    setLoading(true)
    const { data } = await supabase
      .from('leases')
      .select(`
        id, rent_amount, lease_start, lease_end, status,
        tenants ( first_name, last_name, primary_phone, occupation )
      `)
      .eq('unit_id', unit.id)
      .order('lease_start', { ascending: false })

    setLeases((data as LeaseHistory[]) ?? [])
    setLoading(false)
  }

  const statusColor: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    ended: 'bg-slate-100 text-slate-500',
    terminated: 'bg-red-100 text-red-600',
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            Unit {unit?.unit_code} — Tenant history
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Loading history...
            </p>
          ) : leases.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No tenant history for this unit</p>
            </div>
          ) : (
            leases.map((lease, index) => {
              const tenant = lease.tenants
              const name = tenant
                ? `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim()
                : 'Unknown tenant'

              return (
                <div
                  key={lease.id}
                  className="border border-slate-200 rounded-xl p-4 space-y-3"
                >
                  {/* Tenant name + status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                        {name[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {name}
                        </p>
                        {tenant?.occupation && (
                          <p className="text-xs text-slate-400">
                            {tenant.occupation}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[lease.status]}`}>
                      {lease.status}
                    </span>
                  </div>

                  {/* Lease details */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(lease.lease_start), 'dd MMM yyyy')}
                        {' → '}
                        {lease.lease_end
                          ? format(new Date(lease.lease_end), 'dd MMM yyyy')
                          : 'Present'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3" />
                      <span>
                        {Number(lease.rent_amount).toLocaleString()} / month
                      </span>
                    </div>
                    {tenant?.primary_phone && (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <User className="h-3 w-3" />
                        <span>{tenant.primary_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


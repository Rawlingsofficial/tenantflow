'use client'

import { AlertCircle, Clock, Home } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { LeaseWithDetails } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface NotificationsPanelProps {
  expiringLeases: LeaseWithDetails[]
  vacantUnits: number
}

export default function NotificationsPanel({
  expiringLeases,
  vacantUnits,
}: NotificationsPanelProps) {
  const hasNotifications = expiringLeases.length > 0 || vacantUnits > 0

  return (
    <Card className="border border-slate-200 shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">
            Alerts
          </CardTitle>
          {hasNotifications && (
            <Badge variant="destructive" className="text-xs">
              {expiringLeases.length + (vacantUnits > 0 ? 1 : 0)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasNotifications && (
          <p className="text-sm text-slate-400 text-center py-4">
            No alerts right now
          </p>
        )}

        {vacantUnits > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <Home className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                {vacantUnits} vacant {vacantUnits === 1 ? 'unit' : 'units'}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Consider listing or reassigning
              </p>
            </div>
          </div>
        )}

        {expiringLeases.map((lease) => {
          const tenantName = `${lease.tenants?.first_name ?? ''} ${lease.tenants?.last_name ?? ''}`.trim() || 'Unknown tenant'
          const unit = lease.units?.unit_code ?? 'Unknown unit'
          const daysLeft = lease.lease_end
            ? formatDistanceToNow(new Date(lease.lease_end), { addSuffix: true })
            : 'soon'

          return (
            <div
              key={lease.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100"
            >
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  {tenantName} — Unit {unit}
                </p>
                <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Lease expires {daysLeft}
                </p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}


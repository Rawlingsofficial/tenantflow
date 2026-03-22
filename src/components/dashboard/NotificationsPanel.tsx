'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { AlertCircle, Clock, Home, CheckCircle2, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { LeaseWithDetails } from '@/types'

interface NotificationsPanelProps {
  expiringLeases: LeaseWithDetails[]
  vacantUnits: number
}

export default function NotificationsPanel({ expiringLeases, vacantUnits }: NotificationsPanelProps) {
  const router = useRouter()
  const totalAlerts = expiringLeases.length + (vacantUnits > 0 ? 1 : 0)
  const hasNotifications = totalAlerts > 0

  // Build unified notification list
  const notifications = [
    ...(vacantUnits > 0
      ? [{
          id: 'vacant',
          type: 'vacant' as const,
          title: `${vacantUnits} vacant unit${vacantUnits !== 1 ? 's' : ''}`,
          subtitle: 'Consider assigning tenants',
          urgency: 'warning' as const,
          href: '/buildings',
        }]
      : []),
    ...expiringLeases.map((lease) => {
      const tenantName = `${lease.tenants?.first_name ?? ''} ${lease.tenants?.last_name ?? ''}`.trim() || 'Unknown'
      const unit = lease.units?.unit_code ?? '—'
      const daysLeft = lease.lease_end
        ? formatDistanceToNow(new Date(lease.lease_end), { addSuffix: true })
        : 'soon'
      const isPast = lease.lease_end ? new Date(lease.lease_end) < new Date() : false

      return {
        id: lease.id,
        type: 'lease' as const,
        title: `${tenantName} — Unit ${unit}`,
        subtitle: `Lease expires ${daysLeft}`,
        urgency: isPast ? 'critical' as const : 'warning' as const,
        href: '/leases',
      }
    }),
  ]

  const urgencyConfig = {
    critical: {
      dot: 'bg-red-500',
      line: 'bg-red-200',
      icon: AlertCircle,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-50',
      subtitleColor: 'text-red-400',
    },
    warning: {
      dot: 'bg-amber-400',
      line: 'bg-amber-200',
      icon: Clock,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
      subtitleColor: 'text-amber-500',
    },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Alerts</p>
          <h3 className="text-base font-semibold text-slate-900 mt-0.5">Notifications</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasNotifications && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center h-5 min-w-5 px-1.5 bg-red-500 rounded-full text-white text-[10px] font-bold"
            >
              {totalAlerts}
            </motion.div>
          )}
          <button
            onClick={() => router.push('/leases')}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 mx-5" />

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {!hasNotifications ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-6"
            >
              <div className="w-10 h-10 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center mb-3">
                <CheckCircle2 className="h-5 w-5 text-teal-500" />
              </div>
              <p className="text-sm font-medium text-slate-600">All clear!</p>
              <p className="text-xs text-slate-400 mt-0.5">No alerts right now</p>
            </motion.div>
          ) : (
            <motion.div key="list" className="space-y-0">
              {/* Timeline list */}
              {notifications.map((notif, i) => {
                const config = urgencyConfig[notif.urgency]
                const Icon = notif.type === 'vacant' ? Home : config.icon
                const isLast = i === notifications.length - 1

                return (
                  <motion.button
                    key={notif.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
                    onClick={() => router.push(notif.href)}
                    className="w-full flex items-start gap-3 py-2.5 text-left group relative"
                  >
                    {/* Timeline line */}
                    {!isLast && (
                      <div className={`absolute left-[18px] top-10 bottom-0 w-px ${config.line} opacity-50`} />
                    )}

                    {/* Dot + icon */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.iconBg}`}>
                        <Icon className={`h-4 w-4 ${config.iconColor}`} />
                      </div>
                      {/* Pulse dot */}
                      <div className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${config.dot} border-2 border-white`} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                        {notif.title}
                      </p>
                      <p className={`text-xs mt-0.5 ${config.subtitleColor}`}>
                        {notif.subtitle}
                      </p>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

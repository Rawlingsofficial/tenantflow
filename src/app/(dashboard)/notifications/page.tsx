'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { loadPortfolioData } from '@/lib/report-queries'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Bell, FileText, CreditCard, Wrench, Users, 
  Home, CheckCircle2, AlertCircle, Clock, Check
} from 'lucide-react'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import Link from 'next/link'

type Urgency = 'critical' | 'warning' | 'info'
type NotifType = 'lease' | 'payment' | 'maintenance' | 'tenant' | 'unit'

interface AppNotification {
  id: string
  type: NotifType
  title: string
  description: string
  urgency: Urgency
  timestamp: Date
  link: string
  read: boolean
}

export default function NotificationsPage() {
  const { orgId, getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  
  // Filters
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterUrgency, setFilterUrgency] = useState<string>('all')

  useEffect(() => {
    if (orgId) loadData()
  }, [orgId])

  async function loadData() {
    setLoading(true)
    try {
      const token = await getToken({ template: 'supabase' })
      const supabase = getSupabaseBrowserClient(token ?? undefined)
      const data = await loadPortfolioData(supabase as any, orgId!)
      
      const generated: AppNotification[] = []
      const today = new Date()

      // 1. Lease Expirations
      data.leases.forEach((lease: any) => {
        if (lease.status !== 'active' || !lease.lease_end) return
        const endDate = new Date(lease.lease_end)
        const daysLeft = differenceInDays(endDate, today)
        const tenantName = lease.tenants?.company_name || `${lease.tenants?.first_name} ${lease.tenants?.last_name}`
        const unit = lease.units?.unit_code

        if (daysLeft < 0) {
          generated.push({
            id: `lease-exp-${lease.id}`,
            type: 'lease',
            title: 'Lease Expired',
            description: `${tenantName}'s lease for Unit ${unit} expired ${Math.abs(daysLeft)} days ago.`,
            urgency: 'critical',
            timestamp: endDate,
            link: `/leases`,
            read: false
          })
        } else if (daysLeft <= 60) {
          generated.push({
            id: `lease-warn-${lease.id}`,
            type: 'lease',
            title: 'Lease Expiring Soon',
            description: `${tenantName}'s lease for Unit ${unit} expires in ${daysLeft} days.`,
            urgency: daysLeft <= 14 ? 'critical' : 'warning',
            timestamp: new Date(today.getTime() - Math.random() * 86400000 * 2), // random time in last 2 days
            link: `/leases`,
            read: false
          })
        }
      })

      // 2. Vacant Units
      data.units.forEach((unit: any) => {
        if (unit.status === 'vacant') {
          generated.push({
            id: `unit-vacant-${unit.id}`,
            type: 'unit',
            title: 'Unit Vacant',
            description: `Unit ${unit.unit_code} in ${unit.buildings?.name || 'Unknown Building'} is currently vacant.`,
            urgency: 'warning',
            timestamp: new Date(today.getTime() - Math.random() * 86400000 * 5),
            link: `/buildings`,
            read: false
          })
        }
      })

      // 3. Recent Payments
      data.payments.slice(0, 10).forEach((payment: any) => {
        generated.push({
          id: `pay-${payment.id}`,
          type: 'payment',
          title: payment.status === 'completed' ? 'Payment Recorded' : 'Payment Pending/Failed',
          description: `$${payment.amount.toLocaleString()} was ${payment.status} on ${payment.payment_date}.`,
          urgency: payment.status === 'completed' ? 'info' : 'critical',
          timestamp: new Date(payment.payment_date),
          link: `/payments`,
          read: true // Assume past payments are read
        })
      })

      // Sort by timestamp descending
      generated.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      
      setNotifications(generated)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (filterType !== 'all' && n.type !== filterType) return false
      if (filterStatus === 'unread' && n.read) return false
      if (filterStatus === 'read' && !n.read) return false
      if (filterUrgency !== 'all' && n.urgency !== filterUrgency) return false
      return true
    })
  }, [notifications, filterType, filterStatus, filterUrgency])

  const getTypeIcon = (type: NotifType) => {
    switch (type) {
      case 'lease': return FileText
      case 'payment': return CreditCard
      case 'maintenance': return Wrench
      case 'tenant': return Users
      case 'unit': return Home
      default: return Bell
    }
  }

  const getUrgencyStyles = (urgency: Urgency) => {
    switch (urgency) {
      case 'critical': return 'bg-red-50 text-red-600 border-red-100'
      case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100'
      case 'info': return 'bg-teal-50 text-teal-600 border-teal-100'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Activity Feed</h1>
            <p className="text-sm text-slate-500 mt-1">Aggregated events from across your portfolio</p>
          </div>
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 px-4 py-2 rounded-xl transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark all as read
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Type</label>
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="h-9 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">All Events</option>
              <option value="lease">Leases</option>
              <option value="payment">Payments</option>
              <option value="maintenance">Maintenance</option>
              <option value="tenant">Tenants</option>
              <option value="unit">Units</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Status</label>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="h-9 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Urgency</label>
            <select 
              value={filterUrgency} 
              onChange={e => setFilterUrgency(e.target.value)}
              className="h-9 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))
          ) : filtered.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200"
            >
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">You're all caught up!</p>
              <p className="text-xs text-slate-400 mt-1">No notifications match your filters.</p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {filtered.map((notif, i) => {
                const Icon = getTypeIcon(notif.type)
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className={`group relative bg-white p-5 rounded-2xl border transition-all ${
                      notif.read ? 'border-slate-100 shadow-sm opacity-70' : 'border-slate-200 shadow-md'
                    }`}
                  >
                    {!notif.read && (
                      <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-teal-500" />
                    )}
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${getUrgencyStyles(notif.urgency)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900">{notif.title}</h3>
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-3">
                          {notif.description}
                        </p>
                        <div className="flex items-center gap-4">
                          <Link href={notif.link} className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                            View Details →
                          </Link>
                          {!notif.read && (
                            <button 
                              onClick={() => markAsRead(notif.id)}
                              className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Check className="h-3 w-3" />
                              Mark Read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}

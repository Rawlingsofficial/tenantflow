//src/app/(dashboard)/reports/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@clerk/nextjs'
import { getResidentialKPIs, getCommercialKPIs } from '@/lib/report-queries'
import { useOrgStore } from '@/store/orgStore'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Building2, Home, Users, FileText, Wrench, DollarSign,
  Download, Calendar
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import { format, subMonths } from 'date-fns'
import Link from 'next/link'
import type { ResidentialKPIs, CommercialKPIs } from '@/types/reports'

function MiniSparkline({ color }: { color: string }) {
  const data = Array.from({ length: 12 }, () => ({ val: Math.random() * 100 + 50 }))
  return (
    <div className="h-12 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="val" stroke={color} fill={`url(#spark-${color})`} strokeWidth={2} isAnimationActive={true} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function ReportsOverviewPage() {
  const { orgId } = useAuth()
  const { currentOrg } = useOrgStore()
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<ResidentialKPIs | CommercialKPIs | null>(null)

  useEffect(() => {
    async function fetchKPIs() {
      if (!orgId || !currentOrg) return
      setLoading(true)
      try {
        const endDate = format(new Date(), 'yyyy-MM-dd')
        const startDate = format(subMonths(new Date(), 12), 'yyyy-MM-dd')
        
        const data = currentOrg.property_type === 'commercial'
          ? await getCommercialKPIs(currentOrg.id, startDate, endDate)
          : await getResidentialKPIs(currentOrg.id, startDate, endDate)
        
        setKpis(data)
      } catch (err) {
        console.error('Error fetching summary KPIs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchKPIs()
  }, [orgId, currentOrg])

  if (!currentOrg) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 rounded-xl" />
              <Skeleton className="h-4 w-48 rounded-lg" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-40 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const isCommercial = currentOrg.property_type === 'commercial'

  const formatCurrency = (val: number) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`
    return `$${val.toLocaleString()}`
  }

  const getKPIValue = (id: string) => {
    if (!kpis) return '—'
    
    if (isCommercial) {
      const c = kpis as CommercialKPIs
      switch (id) {
        case 'occupancy': return `${Math.round(c.occupancyRateByArea.current)}%`
        case 'revenue': return formatCurrency(c.totalRevenue.current)
        case 'leases': return c.activeLeasesCount.current.toString()
        case 'tenants': return c.activeLeasesCount.current.toString() // Use new leases in period as proxy
        case 'maintenance': return `${c.avgResolutionTime.current.toFixed(1)} days`
        default: return '—'
      }
    } else {
      const r = kpis as ResidentialKPIs
      switch (id) {
        case 'occupancy': return `${Math.round(r.occupancyRate.current)}%`
        case 'revenue': return formatCurrency(r.totalRentCollected.current)
        case 'leases': return r.activeLeasesCount.current.toString()
        case 'tenants': return r.activeLeasesCount.current.toString() // Use new leases in period as proxy
        case 'maintenance': return `${r.avgResolutionTime.current.toFixed(1)} days`
        default: return '—'
      }
    }
  }

  const reports = [
    {
      id: 'occupancy',
      title: isCommercial ? 'Space Utilization' : 'Occupancy Analytics',
      description: 'Track vacancy rates, duration, and projected occupancy.',
      icon: isCommercial ? Building2 : Home,
      color: '#14b8a6', // teal
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      href: '/reports/occupancy',
      kpi: getKPIValue('occupancy'),
      kpiLabel: 'Current Rate'
    },
    {
      id: 'revenue',
      title: isCommercial ? 'Revenue & Yield' : 'Revenue & Rent',
      description: 'Analyze collected rent, outstanding balances, and YOY growth.',
      icon: DollarSign,
      color: '#10b981', // emerald
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      href: '/reports/revenue',
      kpi: getKPIValue('revenue'),
      kpiLabel: isCommercial ? 'Total Revenue' : 'MTD Revenue'
    },
    {
      id: 'leases',
      title: isCommercial ? 'Commercial Leases & CAM' : 'Lease Portfolio',
      description: 'Monitor expirations, renewals, and lease durations.',
      icon: FileText,
      color: '#8b5cf6', // violet
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
      href: '/reports/leases',
      kpi: getKPIValue('leases'),
      kpiLabel: 'Active Leases'
    },
    {
      id: 'tenants',
      title: isCommercial ? 'Company Analytics' : 'Tenant Analytics',
      description: 'Understand retention, turnover, and payment behavior.',
      icon: Users,
      color: '#3b82f6', // blue
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      href: '/reports/tenants',
      kpi: getKPIValue('tenants'),
      kpiLabel: 'New This Year'
    },
    {
      id: 'maintenance',
      title: isCommercial ? 'Capex & Maintenance' : 'Maintenance Costs',
      description: 'Track resolution times, request volume, and expenses.',
      icon: Wrench,
      color: '#f59e0b', // amber
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      href: '/reports/maintenance',
      kpi: getKPIValue('maintenance'),
      kpiLabel: 'Avg Resolution'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Intelligence Center</h1>
            <p className="text-sm text-slate-500 mt-1">Deep historical analytics and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 shadow-sm cursor-pointer hover:bg-slate-50">
              <Calendar className="h-4 w-4 text-slate-400" />
              Trailing 12 Months
            </div>
            <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-colors">
              <Download className="h-4 w-4" />
              Export All
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report, i) => (
            <Link key={report.id} href={report.href}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                whileHover={{ y: -4, shadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm transition-all h-full flex flex-col cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${report.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                    <report.icon className={`h-6 w-6 ${report.iconColor}`} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{report.kpi}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{report.kpiLabel}</p>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{report.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                </div>

                <MiniSparkline color={report.color} />
              </motion.div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}

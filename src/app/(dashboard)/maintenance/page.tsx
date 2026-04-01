'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabaseWithAuth } from '../../../lib/supabase/client'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Skeleton } from '../../../components/ui/skeleton'
import { Badge } from '../../../components/ui/badge'
import { 
  Wrench, Search, Filter, Clock, CheckCircle2, 
  AlertCircle, MessageSquare, User, Building2,
  MoreVertical, ChevronRight, AlertTriangle,
  ArrowRight, Calendar, Hammer
} from 'lucide-react'
import type { MaintenanceRequest, Tenant, Unit } from '../../../types'
import { format } from 'date-fns'
import MaintenanceUpdateDialog from '../../../components/maintenance/MaintenanceUpdateDialog'
import { cn } from '../../../lib/utils'

interface RequestWithDetails extends Omit<MaintenanceRequest, 'tenant' | 'unit'> {
  tenant: {
    first_name: string | null
    last_name: string | null
    primary_phone: string | null
  } | null
  unit: {
    unit_code: string
    buildings: {
      name: string
    } | null
  } | null
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'scheduled' | 'completed'

export default function MaintenancePage() {
  const { orgId } = useAuth()
  const supabase = useSupabaseWithAuth()

  const [requests, setRequests] = useState<RequestWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Dialog State
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null)
  const [isUpdateOpen, setIsUpdateOpen] = useState(false)

  const loadRequests = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          tenant:tenants(first_name, last_name, primary_phone),
          unit:units(unit_code, buildings(name))
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests((data as unknown as RequestWithDetails[]) || [])
    } catch (err) {
      console.error('Error loading maintenance requests:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId, supabase])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const filtered = requests.filter(r => {
    const q = search.toLowerCase()
    const matchesSearch = 
      r.description.toLowerCase().includes(q) ||
      `${r.tenant?.first_name} ${r.tenant?.last_name}`.toLowerCase().includes(q) ||
      r.unit?.unit_code.toLowerCase().includes(q)
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    pending: requests.filter(r => r.status === 'open').length,
    inProgress: requests.filter(r => r.status === 'in_progress').length,
    scheduled: requests.filter(r => r.status === 'scheduled').length,
    completed: requests.filter(r => r.status === 'completed').length,
  }

  const getStatusConfig = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'open':        return { label: 'Open', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', dot: 'bg-rose-500' }
      case 'in_progress': return { label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', dot: 'bg-amber-500' }
      case 'scheduled':   return { label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', dot: 'bg-blue-500' }
      case 'completed':   return { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-500' }
      case 'cancelled':   return { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100', dot: 'bg-slate-400' }
      default:            return { label: status, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100', dot: 'bg-slate-400' }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      {/* Header Region */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-5 rounded-full bg-teal-500" />
            <p className="text-[10px] font-bold tracking-[0.15em] text-teal-600 uppercase">Operations & Logistics</p>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Maintenance Hub</h1>
          <p className="text-sm text-slate-500 mt-1">
            Managing {stats.pending} pending requests across your portfolio.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search tasks..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64 h-11 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pending', value: stats.pending, icon: AlertCircle, color: 'bg-rose-50 text-rose-600' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'bg-amber-50 text-amber-600' },
          { label: 'Scheduled', value: stats.scheduled, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
          { label: 'Resolved', value: stats.completed, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", s.color)}>
              <s.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{s.label}</p>
              <p className="text-xl font-black text-slate-900 leading-none">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Layout Container */}
      <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        
        {/* Tab Navigation */}
        <div className="px-8 pt-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex gap-8">
            {[
              { id: 'all', label: 'All Requests' },
              { id: 'open', label: 'Open' },
              { id: 'in_progress', label: 'Active' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'completed', label: 'History' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setStatusFilter(t.id as any)}
                className={cn(
                  "pb-4 text-sm font-bold transition-all relative",
                  statusFilter === t.id ? "text-teal-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {t.label}
                {statusFilter === t.id && (
                  <motion.div 
                    layoutId="activeMaintenanceTab"
                    className="absolute bottom-0 inset-x-0 h-1 bg-teal-500 rounded-t-full" 
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 flex-1">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-[32px]" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 border border-slate-100">
                <Wrench className="h-10 w-10 text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No requests found</h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-1">All maintenance tasks are up to date. No pending actions required.</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="space-y-4"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((r) => {
                  const cfg = getStatusConfig(r.status)
                  return (
                    <motion.div
                      key={r.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="group bg-white rounded-[28px] border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-teal-500/30 transition-all duration-300 overflow-hidden"
                    >
                      <div className="p-6 flex flex-col lg:flex-row lg:items-center gap-8">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5",
                              cfg.bg, cfg.color, cfg.border
                            )}>
                              <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                              {cfg.label}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                              <Clock className="h-3.5 w-3.5" />
                              {format(new Date(r.created_at), 'MMM dd • h:mm a')}
                            </div>
                            {r.priority === 'urgent' && (
                              <div className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse border border-rose-100">
                                <AlertTriangle className="h-3 w-3" />
                                Urgent
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">
                              {r.category || 'General Maintenance'}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1 leading-relaxed line-clamp-2">
                              {r.description}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-6 pt-1">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                                <User className="h-4 w-4 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Tenant</p>
                                <p className="text-sm font-bold text-slate-700 leading-none">{r.tenant?.first_name} {r.tenant?.last_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                                <Building2 className="h-4 w-4 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Location</p>
                                <p className="text-sm font-bold text-slate-700 leading-none">{r.unit?.buildings?.name} • {r.unit?.unit_code}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 lg:border-l lg:border-slate-100 lg:pl-8">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-11 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-teal-500 hover:text-teal-600 font-bold px-6 gap-2 transition-all active:scale-95"
                            onClick={() => {
                              setSelectedRequest(r);
                              setIsUpdateOpen(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                            Update Status
                          </Button>
                          <Button size="icon" variant="ghost" className="h-11 w-11 rounded-2xl text-slate-400 hover:bg-slate-50 active:scale-95 transition-all">
                            <ArrowRight className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      <MaintenanceUpdateDialog
        open={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        onSuccess={loadRequests}
        request={selectedRequest}
      />
    </div>
  )
}

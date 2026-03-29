'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, Search, Filter, Clock, CheckCircle2, 
  AlertCircle, MessageSquare, User, Building2,
  MoreVertical, ChevronRight, AlertTriangle
} from 'lucide-react'
import type { MaintenanceRequest, Tenant, Unit } from '@/types'
import { format } from 'date-fns'
import MaintenanceUpdateDialog from '@/components/maintenance/MaintenanceUpdateDialog'

interface RequestWithDetails extends MaintenanceRequest {
  tenant: Pick<Tenant, 'first_name' | 'last_name' | 'primary_phone'>
  unit: Pick<Unit, 'unit_code'> & { buildings: { name: string } }
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'scheduled' | 'completed'

export default function MaintenancePage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [requests, setRequests] = useState<RequestWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Dialog State
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null)
  const [isUpdateOpen, setIsUpdateOpen] = useState(false)

  useEffect(() => {
    if (orgId) loadRequests()
  }, [orgId])

  async function loadRequests() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          tenant:tenants(first_name, last_name, primary_phone),
          unit:units(unit_code, buildings(name))
        `)
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests((data as any) || [])
    } catch (err) {
      console.error('Error loading maintenance requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = requests.filter(r => {
    const matchesSearch = 
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      `${r.tenant?.first_name} ${r.tenant?.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      r.unit?.unit_code.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-700 border-red-200'
      case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'cancelled': return 'bg-slate-100 text-slate-700 border-slate-200'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getPriorityColor = (priority: MaintenanceRequest['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-600'
      case 'high': return 'text-amber-600'
      case 'medium': return 'text-blue-600'
      case 'low': return 'text-slate-600'
      default: return 'text-slate-600'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-900/20">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              Maintenance Requests
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Manage and track property maintenance tasks</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pending', count: requests.filter(r => r.status === 'open').length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'In Progress', count: requests.filter(r => r.status === 'in_progress').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Scheduled', count: requests.filter(r => r.status === 'scheduled').length, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Completed', count: requests.filter(r => r.status === 'completed').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.count}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {(['all', 'open', 'in_progress', 'scheduled', 'completed'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === f 
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-900/20' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search requests, tenants, units..." 
              className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl text-sm focus:ring-teal-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Request List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No requests found</h3>
              <p className="text-slate-500">All maintenance tasks are caught up!</p>
            </div>
          ) : (
            filtered.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getStatusColor(r.status)} border px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider`}>
                        {r.status.replace('_', ' ')}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(r.created_at), 'MMM d, yyyy • h:mm a')}
                      </div>
                      {r.priority === 'urgent' && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-md text-[10px] font-bold uppercase tracking-widest animate-pulse">
                          <AlertTriangle className="h-3 w-3" />
                          Urgent
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                        {r.category || 'General Maintenance'}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                        {r.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <span className="font-semibold text-slate-700">{r.tenant?.first_name} {r.tenant?.last_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <span className="font-semibold text-slate-700">{r.unit?.buildings?.name} • Unit {r.unit?.unit_code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 lg:border-l lg:border-slate-100 lg:pl-6">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2"
                      onClick={() => {
                        setSelectedRequest(r);
                        setIsUpdateOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Update Status
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
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

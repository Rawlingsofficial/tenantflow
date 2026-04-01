'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  User, Mail, Phone, Calendar, 
  MessageSquare, Search, Filter,
  MoreVertical, ChevronRight, UserPlus,
  ArrowUpRight, Clock, CheckCircle2, AlertCircle,
  Building2, MapPin, Users
} from 'lucide-react'
import type { Lead } from '@/types'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost' | 'converted'

export default function LeadsPage() {
  const { orgId } = useAuth()
  const supabase = useSupabaseWithAuth()

  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')

  const loadLeads = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (err) {
      console.error('Error loading leads:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId, supabase])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    const matchesSearch = 
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.phone || '').includes(search)
    
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
  }

  const getStatusConfig = (status: LeadStatus) => {
    switch (status) {
      case 'new':       return { label: 'New', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', dot: 'bg-blue-500' }
      case 'contacted': return { label: 'Contacted', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', dot: 'bg-amber-500' }
      case 'qualified': return { label: 'Qualified', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', dot: 'bg-teal-500' }
      case 'converted': return { label: 'Converted', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-500' }
      case 'lost':      return { label: 'Lost', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100', dot: 'bg-slate-400' }
      default:          return { label: status, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100', dot: 'bg-slate-400' }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      {/* Header Region */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-5 rounded-full bg-teal-500" />
            <p className="text-[10px] font-bold tracking-[0.15em] text-teal-600 uppercase">Leads Pipeline</p>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Leads & Inquiries</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tracking {stats.new} new inquiries and {stats.qualified} qualified prospects.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search leads..." 
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
          { label: 'Total Inquiries', value: stats.total, icon: Users, color: 'bg-slate-100 text-slate-600' },
          { label: 'New Leads', value: stats.new, icon: Clock, color: 'bg-blue-50 text-blue-600' },
          { label: 'Contacted', value: stats.contacted, icon: MessageSquare, color: 'bg-amber-50 text-amber-600' },
          { label: 'Qualified', value: stats.qualified, icon: CheckCircle2, color: 'bg-teal-50 text-teal-600' },
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

      {/* Filtering & Layout Container */}
      <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        
        {/* Tab Navigation */}
        <div className="px-8 pt-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex gap-8">
            {[
              { id: 'all', label: 'All Pipeline' },
              { id: 'new', label: 'New' },
              { id: 'contacted', label: 'Contacted' },
              { id: 'qualified', label: 'Qualified' },
              { id: 'converted', label: 'Converted' },
              { id: 'lost', label: 'Lost' },
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
                    layoutId="activeLeadTab"
                    className="absolute bottom-0 inset-x-0 h-1 bg-teal-500 rounded-t-full" 
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Content */}
        <div className="p-8 flex-1">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-[32px]" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 border border-slate-100">
                <Users className="h-10 w-10 text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No leads found</h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-1">Start growing your portfolio by listing your vacant properties.</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((l) => {
                  const cfg = getStatusConfig(l.status)
                  return (
                    <motion.div
                      key={l.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group bg-white rounded-[32px] border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-teal-500/30 transition-all duration-300 overflow-hidden flex flex-col"
                    >
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 border border-white shadow-sm font-black text-slate-500">
                              {l.first_name[0]}{l.last_name?.[0]}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-[15px] group-hover:text-teal-700 transition-colors leading-tight">
                                {l.first_name} {l.last_name}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {format(new Date(l.created_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5",
                            cfg.bg, cfg.color, cfg.border
                          )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                            {cfg.label}
                          </div>
                        </div>

                        <div className="space-y-3 mb-6">
                          {l.email && (
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                <Mail className="h-4 w-4 text-slate-400" />
                              </div>
                              <span className="truncate">{l.email}</span>
                            </div>
                          )}
                          {l.phone && (
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                <Phone className="h-4 w-4 text-slate-400" />
                              </div>
                              {l.phone}
                            </div>
                          )}
                        </div>

                        {l.message && (
                          <div className="relative p-4 bg-slate-50 rounded-[24px] border border-slate-100 flex-1">
                            <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-4">
                              "{l.message}"
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="p-4 px-6 bg-slate-50/50 border-t border-slate-100 flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          className="flex-1 h-10 text-[11px] font-black uppercase tracking-widest rounded-xl text-slate-500 hover:bg-white hover:text-teal-600 transition-all"
                        >
                          Details
                        </Button>
                        <Button 
                          className="flex-1 h-10 text-[11px] font-black uppercase tracking-widest rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 active:scale-95 transition-all gap-2"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Convert
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

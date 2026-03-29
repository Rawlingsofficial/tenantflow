'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  User, Mail, Phone, Calendar, 
  MessageSquare, Search, Filter,
  MoreVertical, ChevronRight, UserPlus
} from 'lucide-react'
import type { Lead } from '@/types'
import { format } from 'date-fns'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost' | 'converted'

export default function LeadsPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')

  useEffect(() => {
    if (orgId) loadLeads()
  }, [orgId])

  async function loadLeads() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (err) {
      console.error('Error loading leads:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = leads.filter(l => {
    const matchesSearch = 
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search)
    
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'contacted': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'qualified': return 'bg-teal-100 text-teal-700 border-teal-200'
      case 'converted': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'lost': return 'bg-slate-100 text-slate-700 border-slate-200'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1B3B6F] flex items-center justify-center shadow-lg shadow-[#1B3B6F]/20">
                <User className="h-5 w-5 text-teal-400" />
              </div>
              Leads & Inquiries
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Manage prospective tenants and property inquiries</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {(['all', 'new', 'contacted', 'qualified', 'converted', 'lost'] as (LeadStatus | 'all')[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === f 
                    ? 'bg-[#1B3B6F] text-white shadow-md shadow-[#1B3B6F]/20' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search leads..." 
              className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl text-sm focus:ring-teal-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Leads Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-2xl" />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No leads found</h3>
              <p className="text-slate-500">Wait for inquiries from your property listings!</p>
            </div>
          ) : (
            filtered.map((l) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                        {l.first_name[0]}{l.last_name?.[0]}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{l.first_name} {l.last_name}</h3>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 uppercase tracking-wider font-semibold">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(l.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(l.status)} border px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider`}>
                      {l.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {l.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {l.email}
                      </div>
                    )}
                    {l.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {l.phone}
                      </div>
                    )}
                  </div>

                  {l.message && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-600 line-clamp-3 italic leading-relaxed">
                        "{l.message}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg border-slate-200">
                    Contact
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-teal-600 hover:bg-teal-700 gap-1.5">
                    <UserPlus className="h-3 w-3" />
                    Convert
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-400">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

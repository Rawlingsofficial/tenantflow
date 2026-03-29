'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { 
  MessageSquare, Send, Search, Users, 
  Clock, CheckCircle2, AlertCircle, Trash2 
} from 'lucide-react'
import type { Tenant, Notification } from '@/types'
import { format } from 'date-fns'

export default function NotificationsPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all')
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)

  useEffect(() => {
    if (orgId) {
      loadData()
    }
  }, [orgId])

  async function loadData() {
    setLoading(true)
    try {
      const [tenantsRes, notificationsRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('organization_id', orgId!).eq('status', 'active'),
        supabase.from('notifications').select('*').eq('organization_id', orgId!).order('created_at', { ascending: false }).limit(20)
      ])

      setTenants(tenantsRes.data || [])
      setNotifications(notificationsRes.data || [])
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleBroadcast() {
    if (!message.trim()) return
    if (targetType === 'specific' && selectedTenantIds.length === 0) return

    setSending(true)
    setStatus(null)

    try {
      let targets = tenants.filter(t => t.user_id) // Only tenants linked to the app
      if (targetType === 'specific') {
        targets = targets.filter(t => selectedTenantIds.includes(t.id))
      }

      if (targets.length === 0) {
        throw new Error('No linked tenants found to receive notifications.')
      }

      const inserts = targets.map(t => ({
        organization_id: orgId!,
        user_id: t.user_id!,
        message: message.trim(),
        type: 'broadcast',
        is_read: false
      }))

      const { error } = await supabase.from('notifications').insert(inserts as any)
      if (error) throw error

      setStatus({ type: 'success', msg: `Successfully sent to ${targets.length} tenants.` })
      setMessage('')
      setSelectedTenantIds([])
      loadData() // Refresh list
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Failed to send broadcast' })
    } finally {
      setSending(false)
    }
  }

  const toggleTenant = (id: string) => {
    setSelectedTenantIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const filteredTenants = tenants.filter(t => 
    `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50/70 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-900/20">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            Broadcast Notifications
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Send real-time updates to your tenants via the mobile app</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Side */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. Water shutdown scheduled for Friday at 2 PM..."
                      className="w-full min-h-[120px] p-4 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Recipients</label>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                      <button
                        onClick={() => setTargetType('all')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          targetType === 'all' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        All Tenants
                      </button>
                      <button
                        onClick={() => setTargetType('specific')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          targetType === 'specific' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Specific Tenants
                      </button>
                    </div>

                    {targetType === 'specific' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3 pt-2"
                      >
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Search tenants..."
                            className="pl-10 h-9 text-sm bg-slate-50 border-slate-200 rounded-xl"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto space-y-1 p-1 no-scrollbar">
                          {filteredTenants.map(t => (
                            <button
                              key={t.id}
                              onClick={() => toggleTenant(t.id)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                                selectedTenantIds.includes(t.id) ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' : 'hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                                  {t.first_name?.[0]}{t.last_name?.[0]}
                                </div>
                                <span>{t.first_name} {t.last_name}</span>
                              </div>
                              {!t.user_id && <span className="text-[10px] text-slate-400 italic">(Not on App)</span>}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {status && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 ${
                    status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {status.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <p className="text-sm font-medium">{status.msg}</p>
                  </div>
                )}

                <Button
                  onClick={handleBroadcast}
                  disabled={sending || !message.trim()}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-teal-900/20 gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sending ? 'Sending Broadcast...' : 'Send Broadcast Now'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* History Side */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Recent History</h3>
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400">No broadcasts sent yet.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Clock className="h-3 w-3" />
                        {format(new Date(n.created_at!), 'MMM d, h:mm a')}
                      </div>
                      <div className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider">
                        {n.type}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

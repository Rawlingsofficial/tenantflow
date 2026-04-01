'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useSupabaseWithAuth } from '../../../lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldCheck, Search, User, Link as LinkIcon, 
  Unlink, CheckCircle2, AlertCircle, Loader2,
  ExternalLink, Mail, Key
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Skeleton } from '../../../components/ui/skeleton'
import { toast } from 'sonner'

export default function AuthenticationPage() {
  const { orgId } = useAuth()
  const supabase = useSupabaseWithAuth()
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [clerkIdInput, setClerkIdInput] = useState('')

  const loadTenants = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('tenants')
        .select('id, first_name, last_name, company_name, email, tenant_type, user_id, status, users(clerk_user_id)')
        .eq('organization_id', orgId)
        .order('first_name', { ascending: true })

      if (error) throw error
      setTenants(data || [])
    } catch (err: any) {
      console.error('Error loading tenants for auth:', err.message)
      toast.error('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }, [orgId, supabase])

  useEffect(() => {
    loadTenants()
  }, [loadTenants])

  async function handleLink(tenantId: string) {
    if (!clerkIdInput.trim()) return
    setLinkingId(tenantId)
    try {
      // 1. Find the internal user by clerk_user_id
      const { data: userData, error: userError } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerkIdInput.trim())
        .maybeSingle()

      if (userError) throw userError
      if (!userData) {
        toast.error('Tenant App ID not found. Ensure the tenant has signed up.')
        return
      }

      // 2. Link tenant to this internal user
      const { error: linkError } = await (supabase as any)
        .from('tenants')
        .update({ user_id: userData.id })
        .eq('id', tenantId)

      if (linkError) throw linkError

      toast.success('Tenant linked successfully')
      setClerkIdInput('')
      setLinkingId(null)
      loadTenants()
    } catch (err: any) {
      toast.error(err.message || 'Linking failed')
    } finally {
      setLinkingId(null)
    }
  }

  async function handleUnlink(tenantId: string) {
    if (!confirm('Are you sure you want to unlink this tenant from their app account?')) return
    try {
      const { error } = await (supabase as any)
        .from('tenants')
        .update({ user_id: null })
        .eq('id', tenantId)

      if (error) throw error
      toast.success('Tenant unlinked')
      loadTenants()
    } catch (err: any) {
      toast.error('Unlinking failed')
    }
  }

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase()
    const name = t.tenant_type === 'company' 
      ? (t.company_name || '') 
      : `${t.first_name || ''} ${t.last_name || ''}`
    return name.toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-5 rounded-full bg-teal-500" />
            <p className="text-[10px] font-bold tracking-[0.15em] text-teal-600 uppercase">System Security</p>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tenant Authentication</h1>
          <p className="text-sm text-slate-500 mt-1">Manage tenant access to the Tenant App</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search tenants..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-64 h-10 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500/20 transition-all"
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tenant Directory</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 text-slate-500 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider">Tenant / Company</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-center">App Connection</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider">Tenant App ID (Clerk ID)</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-6 py-4"><Skeleton className="h-12 w-full rounded-xl" /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No tenants found matching your search.</td>
                  </tr>
                ) : (
                  filtered.map((t) => {
                    const isLinked = !!t.user_id
                    const clerkId = t.users?.clerk_user_id
                    const name = t.tenant_type === 'company' ? t.company_name : `${t.first_name} ${t.last_name}`
                    
                    return (
                      <motion.tr 
                        key={t.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                              <User className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{name}</p>
                              <p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="h-3 w-3" /> {t.email || 'No email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isLinked ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                              <CheckCircle2 className="h-3 w-3" /> Connected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">
                              <AlertCircle className="h-3 w-3" /> Disconnected
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isLinked ? (
                            <code className="text-[11px] bg-slate-100 px-2 py-1 rounded-md text-slate-600 font-mono">{clerkId}</code>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input 
                                placeholder="Paste Clerk User ID..." 
                                className="h-8 text-[11px] w-48 rounded-lg border-slate-200"
                                value={linkingId === t.id ? clerkIdInput : ''}
                                onChange={(e) => {
                                  setLinkingId(t.id)
                                  setClerkIdInput(e.target.value)
                                }}
                              />
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 rounded-lg text-[10px] font-bold uppercase gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50"
                                onClick={() => handleLink(t.id)}
                                disabled={linkingId === t.id && !clerkIdInput.trim()}
                              >
                                {linkingId === t.id && clerkIdInput.trim() ? <><Loader2 className="h-3 w-3 animate-spin" /> Link</> : <><LinkIcon className="h-3 w-3" /> Link</>}
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {isLinked && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 rounded-lg text-[10px] font-bold uppercase gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => handleUnlink(t.id)}
                              >
                                <Unlink className="h-3 w-3" /> Unlink
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 rounded-lg text-slate-400 hover:text-slate-600"
                              onClick={() => window.open(`/tenants/${t.id}`, '_blank')}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-teal-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-teal-900/20">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <Key className="h-5 w-5 text-teal-300" />
              </div>
              <h3 className="text-xl font-bold">App Linking Guide</h3>
            </div>
            <p className="text-teal-100/80 max-w-2xl text-sm leading-relaxed mb-6">
              To provide your tenants with a personalized portal, you must link their local tenant profile to their registered app account. 
              Copy the <span className="text-white font-bold">User ID</span> from your identity provider (Clerk) and paste it into the field above. 
              Once linked, the tenant will be able to view their lease, pay rent, and submit maintenance requests directly from the app.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-xs font-bold uppercase text-teal-300 mb-1">Step 1</p>
                <p className="text-sm font-medium">Invite tenant to sign up for the Tenant App.</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-xs font-bold uppercase text-teal-300 mb-1">Step 2</p>
                <p className="text-sm font-medium">Obtain their unique System ID from Clerk.</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-xs font-bold uppercase text-teal-300 mb-1">Step 3</p>
                <p className="text-sm font-medium">Paste the ID here to enable sync features.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

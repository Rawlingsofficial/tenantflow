'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { 
  Loader2, X, MessageSquare, CheckCircle2, 
  Clock, Wrench, AlertCircle, Ban, Hammer,
  Calendar, CheckCircle, ArrowRight
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { MaintenanceRequest } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  request: MaintenanceRequest | null
}

const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open / New',      icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
  { value: 'in_progress', label: 'In Progress',     icon: Clock,       color: 'text-amber-500', bg: 'bg-amber-50' },
  { value: 'scheduled',   label: 'Scheduled',       icon: Calendar,    color: 'text-blue-500', bg: 'bg-blue-50' },
  { value: 'completed',   label: 'Completed',       icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { value: 'cancelled',   label: 'Cancelled',       icon: Ban,          color: 'text-slate-400', bg: 'bg-slate-50' },
]

export default function MaintenanceUpdateDialog({ open, onClose, onSuccess, request }: Props) {
  const supabase = useSupabaseWithAuth()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open && request) {
      setStatus(request.status)
      setNote('')
    }
  }, [open, request])

  async function handleUpdate() {
    if (!request) return
    setLoading(true)
    
    try {
      // 1. Add update log
      const { error: updateErr } = await (supabase as any).from('maintenance_updates').insert({
        request_id: request.id,
        status: status,
        notes: note.trim() || null, // Note: fixing field name from 'note' to 'notes' based on schema context if needed, but following current usage. Wait, schema says 'notes'.
      } as any)

      if (updateErr) throw updateErr

      // 2. Update request status
      const { error: requestErr } = await (supabase as any)
        .from('maintenance_requests')
        .update({ status: status } as any)
        .eq('id', request.id)

      if (requestErr) throw requestErr

      toast.success('Maintenance status updated')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error updating maintenance:', err)
      toast.error(err.message || 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  if (!request) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-[24px] border-slate-200/80 shadow-2xl bg-white">
        
        {/* Header Region */}
        <div className="relative px-8 pt-8 pb-6 border-b border-slate-100 flex-shrink-0 bg-slate-50/30">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600 shadow-lg shadow-teal-600/20 text-white">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">Update Request</DialogTitle>
              <p className="text-sm text-slate-500 mt-1">Log professional progress for this task</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute right-6 top-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Info Context Card */}
          <div className="p-5 bg-slate-50 rounded-[20px] border border-slate-100 shadow-inner">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                {request.category || 'General'}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-relaxed italic">
              "{request.description}"
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Status selector */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Current Milestone</Label>
              <Select value={status} onValueChange={(val: string | null) => { if (val) setStatus(val); }}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-teal-500/20 transition-all font-semibold text-slate-700">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem 
                      key={opt.value} 
                      value={opt.value}
                      className="rounded-xl focus:bg-teal-50 focus:text-teal-700 font-medium py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", opt.bg)}>
                          <opt.icon className={cn("h-3.5 w-3.5", opt.color)} />
                        </div>
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Internal Note</Label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe the actions taken or next steps..."
                className="w-full h-32 p-4 text-sm font-medium bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all resize-none text-slate-800 placeholder-slate-400 shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-6 border-t border-slate-100 bg-slate-50/50">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={loading} 
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl px-5 h-11 font-medium"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={loading || (status === request.status && !note.trim())}
            className="h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-teal-600/20 gap-2 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
            Publish Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Loader2, X, MessageSquare, CheckCircle2, Clock, Wrench, AlertCircle, Ban } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { MaintenanceRequest } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  request: MaintenanceRequest | null
}

const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open / New',      icon: AlertCircle, color: 'text-red-500' },
  { value: 'in_progress', label: 'In Progress',     icon: Clock,       color: 'text-amber-500' },
  { value: 'scheduled',   label: 'Scheduled',       icon: Wrench,      color: 'text-blue-500' },
  { value: 'completed',   label: 'Completed',       icon: CheckCircle2, color: 'text-emerald-500' },
  { value: 'cancelled',   label: 'Cancelled',       icon: Ban,          color: 'text-slate-400' },
]

export default function MaintenanceUpdateDialog({ open, onClose, onSuccess, request }: Props) {
  const supabase = getSupabaseBrowserClient()
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
        note: note.trim() || null,
      })

      if (updateErr) throw updateErr

      // 2. Update request status
      const { error: requestErr } = await (supabase as any)
        .from('maintenance_requests')
        .update({ status: status })
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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1B3B6F] shadow-sm">
              <MessageSquare className="h-4 w-4 text-[#14b8a6]" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">Update Status</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Log progress for this request</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Info context */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
            <p className="font-semibold text-slate-900 mb-1">{request.category || 'General Maintenance'}</p>
            <p className="line-clamp-2 italic">"{request.description}"</p>
          </div>

          {/* Status selector */}
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className={`h-3.5 w-3.5 ${opt.color}`} />
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Add Note (Optional)</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Parts ordered, expected arrival Wednesday..."
              className="w-full h-24 p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-9 text-sm rounded-xl border-slate-200">
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={loading || (status === request.status && !note.trim())}
            className="h-9 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-6 font-bold shadow-md gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

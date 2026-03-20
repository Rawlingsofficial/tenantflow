'use client'

import { useState, useEffect } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Building } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (building: Building) => void
  onDeleted?: (buildingId: string) => void
  organizationId: string
  editBuilding?: Building | null
}

export default function AddBuildingDialog({
  open, onClose, onSaved, onDeleted, organizationId, editBuilding
}: Props) {
  const supabase = getSupabaseBrowserClient()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName(editBuilding?.name ?? '')
      setAddress(editBuilding?.address ?? '')
      setError('')
      setConfirmDelete(false)
    }
  }, [open, editBuilding])

  async function handleSave() {
    if (!name.trim()) { setError('Building name is required'); return }
    setLoading(true)
    setError('')
    try {
      if (editBuilding) {
        const { data, error: err } = await supabase
          .from('buildings')
          .update({ name: name.trim(), address: address.trim() || null })
          .eq('id', editBuilding.id)
          .select()
          .single() as { data: Building | null; error: any }
        if (err || !data) throw new Error(err?.message)
        onSaved(data)
      } else {
        const { data, error: err } = await supabase
          .from('buildings')
          .insert({
            organization_id: organizationId,
            name: name.trim(),
            address: address.trim() || null
          } as any)
          .select()
          .single() as { data: Building | null; error: any }
        if (err || !data) throw new Error(err?.message)
        onSaved(data)
      }
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!editBuilding || !onDeleted) return
    setDeleting(true)
    setError('')
    try {
      // Soft delete — set status to inactive
      const { error: err } = await supabase
        .from('buildings')
        .update({ status: 'inactive' })
        .eq('id', editBuilding.id)
      if (err) throw new Error(err.message)
      onDeleted(editBuilding.id)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editBuilding ? 'Edit building' : 'Add building'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Building name *</Label>
            <Input
              placeholder="e.g. Sunset Apartments"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div className="space-y-2">
            <Label>
              Address{' '}
              <span className="text-slate-400 text-xs">(optional)</span>
            </Label>
            <Input
              placeholder="e.g. 123 Main St, Yaoundé"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          {/* Delete confirmation */}
          {editBuilding && confirmDelete && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-red-700">
                Delete this building?
              </p>
              <p className="text-xs text-red-500">
                This will archive the building and hide it from your list.
                Units and tenant data will be preserved.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-red-600 hover:bg-red-700"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting
                    ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Deleting...</>
                    : 'Yes, delete'
                  }
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Delete button — only on edit */}
          {editBuilding && !confirmDelete && (
            <Button
              variant="outline"
              className="text-red-500 hover:text-red-600 hover:border-red-200 sm:mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
              : editBuilding ? 'Save changes' : 'Add building'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


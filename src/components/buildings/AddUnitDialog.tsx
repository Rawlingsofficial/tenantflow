'use client'

import { useState, useEffect } from 'react'
import { Loader2, Trash2, UserPlus } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Unit, UnitStatus } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (unit: Unit) => void
  onDeleted?: (unitId: string) => void
  onAssignTenant?: (unit: Unit) => void
  buildingId: string
  editUnit?: Unit | null
}

const UNIT_TYPES = [
  'Apartment',
  'Studio',
  'One Room',
  'Office',
  'Shop',
  'Others',
]

export default function AddUnitDialog({
  open, onClose, onSaved, onDeleted,
  onAssignTenant, buildingId, editUnit
}: Props) {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [savedUnit, setSavedUnit] = useState<Unit | null>(null)

  const [form, setForm] = useState({
    unit_code: '',
    unit_type: '',
    bedrooms: '0',
    bathrooms: '0',
    kitchen: '0',
    parlour: '0',
    default_rent: '',
    status: 'vacant' as UnitStatus,
  })

  useEffect(() => {
    if (open) {
      setSavedUnit(null)
      setConfirmDelete(false)
      setError('')
      if (editUnit) {
        // Parse extra rooms from unit_type field if stored
        setForm({
          unit_code: editUnit.unit_code ?? '',
          unit_type: editUnit.unit_type ?? '',
          bedrooms: editUnit.bedrooms?.toString() ?? '0',
          bathrooms: editUnit.bathrooms?.toString() ?? '0',
          kitchen: '1',
          parlour: '1',
          default_rent: editUnit.default_rent?.toString() ?? '',
          status: editUnit.status ?? 'vacant',
        })
      } else {
        setForm({
          unit_code: '', unit_type: '', bedrooms: '0',
          bathrooms: '0', kitchen: '0', parlour: '0',
          default_rent: '', status: 'vacant',
        })
      }
    }
  }, [open, editUnit])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.unit_code.trim()) { setError('Unit code is required'); return }
    if (!form.unit_type) { setError('Unit type is required'); return }
    setLoading(true)
    setError('')

    const payload = {
      unit_code: form.unit_code.trim(),
      unit_type: form.unit_type,
      bedrooms: parseInt(form.bedrooms) || 0,
      bathrooms: parseInt(form.bathrooms) || 0,
      default_rent: form.default_rent ? parseFloat(form.default_rent) : null,
      status: form.status,
    }

    try {
      let result: Unit | null = null

      if (editUnit) {
        const { data, error: err } = await supabase
          .from('units')
          .update(payload)
          .eq('id', editUnit.id)
          .select()
          .single() as { data: Unit | null; error: any }
        if (err || !data) throw new Error(err?.message)
        result = data
        onSaved(data)
        onClose()
      } else {
        const { data, error: err } = await supabase
          .from('units')
          .insert({ ...payload, building_id: buildingId } as any)
          .select()
          .single() as { data: Unit | null; error: any }
        if (err || !data) throw new Error(err?.message)
        result = data
        onSaved(data)
        setSavedUnit(data) // show assign prompt
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save unit')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!editUnit || !onDeleted) return
    setDeleting(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('units')
        .delete()
        .eq('id', editUnit.id)
      if (err) throw new Error(err.message)
      onDeleted(editUnit.id)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete unit')
    } finally {
      setDeleting(false)
    }
  }

  // After saving new unit — show assign prompt
  if (savedUnit) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Unit {savedUnit.unit_code} created!</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-600">
              Would you like to assign a tenant to this unit now?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  onClose()
                  onAssignTenant?.(savedUnit)
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign tenant now
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={onClose}
              >
                Leave vacant for now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editUnit ? 'Edit unit' : 'Add unit'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Unit code + type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unit code *</Label>
              <Input
                placeholder="e.g. A101"
                value={form.unit_code}
                onChange={(e) => set('unit_code', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit type *</Label>
              <Select
                value={form.unit_type}
                onValueChange={(v) => set('unit_type', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Monthly rent */}
          <div className="space-y-2">
            <Label>Monthly rent (XAF / local currency)</Label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 50000"
              value={form.default_rent}
              onChange={(e) => set('default_rent', e.target.value)}
            />
          </div>

          {/* Rooms */}
          <div>
            <Label className="block mb-2">Rooms</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Bedrooms</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    onClick={() => set('bedrooms', String(Math.max(0, parseInt(form.bedrooms) - 1)))}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium">
                    {form.bedrooms}
                  </span>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    onClick={() => set('bedrooms', String(parseInt(form.bedrooms) + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Toilets</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    onClick={() => set('bathrooms', String(Math.max(0, parseInt(form.bathrooms) - 1)))}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium">
                    {form.bathrooms}
                  </span>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    onClick={() => set('bathrooms', String(parseInt(form.bathrooms) + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Kitchen</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    onClick={() => set('kitchen', String(Math.max(0, parseInt(form.kitchen) - 1)))}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium">
                    {form.kitchen}
                  </span>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    onClick={() => set('kitchen', String(parseInt(form.kitchen) + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Parlour</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    onClick={() => set('parlour', String(Math.max(0, parseInt(form.parlour) - 1)))}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium">
                    {form.parlour}
                  </span>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    onClick={() => set('parlour', String(parseInt(form.parlour) + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => set('status', v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delete confirmation */}
          {editUnit && confirmDelete && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-red-700">Delete this unit?</p>
              <p className="text-xs text-red-500">
                This will permanently delete unit {editUnit.unit_code}.
                Only delete if there are no active leases.
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
          {editUnit && !confirmDelete && (
            <Button
              variant="outline"
              className="text-red-500 hover:text-red-600 hover:border-red-200 sm:mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete unit
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
              : editUnit ? 'Save changes' : 'Add unit'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Pencil, DollarSign } from "lucide-react";

function val<T>(v: T): never { return v as never; }

interface EditUnitDialogProps {
  open: boolean;
  unit: {
    id: string;
    unit_code: string;
    unit_type: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    default_rent: number | null;
    status: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUnitDialog({ open, unit, onClose, onSuccess }: EditUnitDialogProps) {
  const supabase = createBrowserClient();
  const [form, setForm] = useState({
    unit_code: unit.unit_code,
    unit_type: unit.unit_type || "flat",
    bedrooms: unit.bedrooms?.toString() || "",
    bathrooms: unit.bathrooms?.toString() || "",
    default_rent: unit.default_rent?.toString() || "",
    status: unit.status,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        unit_code: unit.unit_code,
        unit_type: unit.unit_type || "flat",
        bedrooms: unit.bedrooms?.toString() || "",
        bathrooms: unit.bathrooms?.toString() || "",
        default_rent: unit.default_rent?.toString() || "",
        status: unit.status,
      });
    }
  }, [open, unit]);

  async function handleSubmit() {
    if (!form.unit_code.trim()) { toast.error("Unit code is required."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("units").update(val({
        unit_code: form.unit_code.trim().toUpperCase(),
        unit_type: form.unit_type || null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        default_rent: form.default_rent ? parseFloat(form.default_rent) : null,
        status: form.status,
      })).eq("id", unit.id);
      if (error) throw error;
      toast.success("Unit updated.");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update unit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl">
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-teal-600 shadow-sm">
              <Pencil className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-900">Edit Unit</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{unit.unit_code}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Unit Code <span className="text-red-400">*</span>
            </Label>
            <Input value={form.unit_code} onChange={(e) => setForm((p) => ({ ...p, unit_code: e.target.value }))}
              className="h-9 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400 font-mono"
              disabled={saving} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Bedrooms</Label>
              <Input type="number" min={0} value={form.bedrooms}
                onChange={(e) => setForm((p) => ({ ...p, bedrooms: e.target.value }))}
                className="h-9 text-sm rounded-xl border-slate-200" disabled={saving} />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Bathrooms</Label>
              <Input type="number" min={0} value={form.bathrooms}
                onChange={(e) => setForm((p) => ({ ...p, bathrooms: e.target.value }))}
                className="h-9 text-sm rounded-xl border-slate-200" disabled={saving} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Unit Type</Label>
              <Select value={form.unit_type}
                // @ts-ignore
                onValueChange={(v: string) => setForm((p) => ({ ...p, unit_type: v }))} disabled={saving}>
                <SelectTrigger className="h-9 text-sm rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="duplex">Duplex</SelectItem>
                  <SelectItem value="penthouse">Penthouse</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</Label>
              <Select value={form.status}
                // @ts-ignore
                onValueChange={(v: string) => setForm((p) => ({ ...p, status: v }))} disabled={saving}>
                <SelectTrigger className="h-9 text-sm rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Default Rent ($/mo)
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input type="number" min={0} value={form.default_rent}
                onChange={(e) => setForm((p) => ({ ...p, default_rent: e.target.value }))}
                className="h-9 text-sm rounded-xl border-slate-200 pl-9 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"
                disabled={saving} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}
            className="h-9 text-sm rounded-xl border-slate-200 text-slate-600">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}
            className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-xl px-5 font-semibold shadow-sm">
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </div>
            ) : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

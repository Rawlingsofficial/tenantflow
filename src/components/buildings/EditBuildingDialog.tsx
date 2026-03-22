"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Building2, MapPin, Image, Pencil } from "lucide-react";

function val<T>(v: T): never { return v as never; }

interface EditBuildingDialogProps {
  open: boolean;
  building: {
    id: string;
    name: string;
    address: string | null;
    status: string;
    photo_url: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function EditBuildingDialog({ open, building, onClose, onSuccess }: EditBuildingDialogProps) {
  const supabase = createBrowserClient();
  const [form, setForm] = useState({
    name: building.name,
    address: building.address || "",
    status: building.status,
    photo_url: building.photo_url || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: building.name,
        address: building.address || "",
        status: building.status,
        photo_url: building.photo_url || "",
      });
    }
  }, [open, building]);

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error("Building name is required."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("buildings").update(val({
        name: form.name.trim(),
        address: form.address.trim() || null,
        status: form.status,
        photo_url: form.photo_url.trim() || null,
      })).eq("id", building.id);
      if (error) throw error;
      toast.success("Building updated.");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update building.");
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
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1B3B6F] shadow-sm">
              <Pencil className="h-4 w-4 text-[#14b8a6]" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-900">Edit Building</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">{building.name}</p>
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
              Building Name <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="h-9 text-sm pl-9 rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"
                disabled={saving} />
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="e.g. 4 Seaview Rd, Miami, FL"
                className="h-9 text-sm pl-9 rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"
                disabled={saving} />
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</Label>
            <Select value={form.status}
              // @ts-ignore
              onValueChange={(v: string) => setForm((p) => ({ ...p, status: v }))} disabled={saving}>
              <SelectTrigger className="h-9 text-sm rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-teal-500" /> Active</div>
                </SelectItem>
                <SelectItem value="inactive">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400" /> Inactive</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Photo URL <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </Label>
            <div className="relative">
              <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input value={form.photo_url} onChange={(e) => setForm((p) => ({ ...p, photo_url: e.target.value }))}
                placeholder="https://…"
                className="h-9 text-sm pl-9 rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"
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

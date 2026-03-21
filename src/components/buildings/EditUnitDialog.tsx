"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { X } from "lucide-react";

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

export function EditUnitDialog({
  open,
  unit,
  onClose,
  onSuccess,
}: EditUnitDialogProps) {
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
    if (!form.unit_code.trim()) {
      toast.error("Unit code is required.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("units")
        .update(val({
          unit_code: form.unit_code.trim().toUpperCase(),
          unit_type: form.unit_type || null,
          bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
          bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
          default_rent: form.default_rent ? parseFloat(form.default_rent) : null,
          status: form.status,
        }))
        .eq("id", unit.id);
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
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <DialogTitle className="text-sm font-semibold text-gray-900">
            Edit Unit
          </DialogTitle>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Unit Code <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.unit_code}
              onChange={(e) => setForm((p) => ({ ...p, unit_code: e.target.value }))}
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Bedrooms</Label>
              <Input
                type="number"
                min={0}
                value={form.bedrooms}
                onChange={(e) => setForm((p) => ({ ...p, bedrooms: e.target.value }))}
                className="h-9 text-sm rounded-lg border-gray-200"
                disabled={saving}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Bathrooms</Label>
              <Input
                type="number"
                min={0}
                value={form.bathrooms}
                onChange={(e) => setForm((p) => ({ ...p, bathrooms: e.target.value }))}
                className="h-9 text-sm rounded-lg border-gray-200"
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Unit Type</Label>
              <Select
                value={form.unit_type}
                // @ts-ignore
                onValueChange={(v: string) => setForm((p) => ({ ...p, unit_type: v }))}
                disabled={saving}
              >
                <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200">
                  <SelectValue />
                </SelectTrigger>
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
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Status</Label>
              <Select
                value={form.status}
                // @ts-ignore
                onValueChange={(v: string) => setForm((p) => ({ ...p, status: v }))}
                disabled={saving}
              >
                <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Default Rent ($/mo)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
              <Input
                type="number"
                min={0}
                value={form.default_rent}
                onChange={(e) => setForm((p) => ({ ...p, default_rent: e.target.value }))}
                className="h-9 text-sm rounded-lg border-gray-200 pl-6"
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving} className="h-9 text-sm rounded-lg">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg px-5"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

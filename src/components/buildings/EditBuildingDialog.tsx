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

export function EditBuildingDialog({
  open,
  building,
  onClose,
  onSuccess,
}: EditBuildingDialogProps) {
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
    if (!form.name.trim()) {
      toast.error("Building name is required.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("buildings")
        .update(val({
          name: form.name.trim(),
          address: form.address.trim() || null,
          status: form.status,
          photo_url: form.photo_url.trim() || null,
        }))
        .eq("id", building.id);
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
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <DialogTitle className="text-sm font-semibold text-gray-900">
            Edit Building
          </DialogTitle>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Building Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="e.g. 4 Seeview Rd, Miami, FL 33199"
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Photo URL <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              value={form.photo_url}
              onChange={(e) => setForm((p) => ({ ...p, photo_url: e.target.value }))}
              placeholder="https://..."
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
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



"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/useOrg";
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

interface AddBuildingDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddBuildingDialog({
  open,
  onClose,
  onSuccess,
}: AddBuildingDialogProps) {
  const { orgId } = useOrg();
  const supabase = createBrowserClient();

  const [form, setForm] = useState({
    name: "",
    address: "",
    status: "active",
    photo_url: "",
  });
  const [saving, setSaving] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Building name is required.");
      return;
    }
    if (!orgId) {
      toast.error("No organization selected.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("buildings").insert({
        organization_id: orgId,
        name: form.name.trim(),
        address: form.address.trim() || null,
        status: form.status,
        photo_url: form.photo_url.trim() || null,
      });
      if (error) throw error;
      toast.success("Building created successfully.");
      setForm({ name: "", address: "", status: "active", photo_url: "" });
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create building.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (!saving) {
      setForm({ name: "", address: "", status: "active", photo_url: "" });
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900">
            Add New Building
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Building Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Palm Grove Apartments"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Address
            </Label>
            <Input
              placeholder="e.g. 4 Seeview Rd, Miami, FL 33199"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Status
            </Label>
            <Select
              value={form.status}
              onValueChange={(v) => updateField("status", v)}
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
              Photo URL{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              placeholder="https://..."
              value={form.photo_url}
              onChange={(e) => updateField("photo_url", e.target.value)}
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-50 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={saving}
            className="h-9 text-sm rounded-lg"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg px-5"
          >
            {saving ? "Saving..." : "Save Building"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { usePropertyType } from "@/hooks/usePropertyType";
import { useMixedModeStore } from "@/store/mixedModeStore";
import { Home, Briefcase } from "lucide-react";

interface AddBuildingDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddBuildingDialog({ open, onClose, onSuccess }: AddBuildingDialogProps) {
  const { orgId } = useAuth();
  const supabase = createBrowserClient();
  const { type } = usePropertyType();
  const { mode } = useMixedModeStore();

  // Determine the default building_type based on portfolio type
  const defaultBuildingType =
    type === "commercial" ? "commercial" :
    type === "mixed" ? mode :
    "residential";

  const [form, setForm] = useState({
    name: "",
    address: "",
    status: "active",
    photo_url: "",
    building_type: defaultBuildingType,
  });
  const [saving, setSaving] = useState(false);

  const isMixed = type === "mixed";

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error("Building name is required."); return; }
    if (!orgId) { toast.error("No organization selected."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("buildings").insert({
        organization_id: orgId,
        name: form.name.trim(),
        address: form.address.trim() || null,
        status: form.status as "active" | "inactive",
        photo_url: form.photo_url.trim() || null,
        building_type: form.building_type,
      } as any);
      if (error) throw error;
      toast.success("Building created successfully.");
      setForm({ name: "", address: "", status: "active", photo_url: "", building_type: defaultBuildingType });
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to create building.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (!saving) {
      setForm({ name: "", address: "", status: "active", photo_url: "", building_type: defaultBuildingType });
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

          {/* Building type — only shown for mixed portfolios */}
          {isMixed && (
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-2 block">
                Portfolio Type <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField("building_type", "residential")}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.building_type === "residential"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}>
                  <Home className="h-4 w-4" />
                  Residential
                </button>
                <button
                  type="button"
                  onClick={() => updateField("building_type", "commercial")}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.building_type === "commercial"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}>
                  <Briefcase className="h-4 w-4" />
                  Commercial
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                This determines which portfolio the building belongs to.
              </p>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Building Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder={form.building_type === "commercial" ? "e.g. Acme Business Centre" : "e.g. Palm Grove Apartments"}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Address</Label>
            <Input
              placeholder="e.g. 4 Seeview Rd, Miami, FL 33199"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((prev) => ({ ...prev, status: v as "active" | "inactive" }))}
              disabled={saving}>
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
              placeholder="https://..."
              value={form.photo_url}
              onChange={(e) => updateField("photo_url", e.target.value)}
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-50 mt-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={saving} className="h-9 text-sm rounded-lg">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
            className={`h-9 text-white text-sm rounded-lg px-5 ${
              form.building_type === "commercial"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}>
            {saving ? "Saving..." : "Save Building"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



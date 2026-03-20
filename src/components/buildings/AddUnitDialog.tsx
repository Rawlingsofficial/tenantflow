"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
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

interface AddUnitDialogProps {
  open: boolean;
  buildingId?: string;
  buildingName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Building {
  id: string;
  name: string;
}

export function AddUnitDialog({
  open,
  buildingId,
  buildingName,
  onClose,
  onSuccess,
}: AddUnitDialogProps) {
  const { orgId } = useAuth();
  const supabase = createBrowserClient();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [form, setForm] = useState({
    building_id: buildingId || "",
    unit_code: "",
    unit_type: "",
    bedrooms: "",
    bathrooms: "",
    default_rent: "",
    status: "vacant",
    average_rent: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && orgId) {
      loadBuildings();
    }
  }, [open, orgId]);

  useEffect(() => {
    if (buildingId) {
      setForm((prev) => ({ ...prev, building_id: buildingId }));
    }
  }, [buildingId]);

  async function loadBuildings() {
    const { data } = await supabase
      .from("buildings")
      .select("id, name")
      .eq("organization_id", orgId!)
      .eq("status", "active")
      .order("name");
    setBuildings(data || []);
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.building_id) {
      toast.error("Please select a building.");
      return;
    }
    if (!form.unit_code.trim()) {
      toast.error("Unit code is required.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("units").insert({
        building_id: form.building_id,
        unit_code: form.unit_code.trim().toUpperCase(),
        unit_type: form.unit_type || null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        default_rent: form.default_rent ? parseFloat(form.default_rent) : null,
        status: form.status,
      });
      if (error) throw error;
      toast.success("Unit added successfully.");
      resetForm();
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add unit.");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm({
      building_id: buildingId || "",
      unit_code: "",
      unit_type: "",
      bedrooms: "",
      bathrooms: "",
      default_rent: "",
      status: "vacant",
      average_rent: "",
    });
  }

  function handleClose() {
    if (!saving) {
      resetForm();
      onClose();
    }
  }

  const selectedBuildingName =
    buildingName ||
    buildings.find((b) => b.id === form.building_id)?.name ||
    "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <DialogTitle className="text-sm font-semibold text-gray-900">
            Add New Unit
          </DialogTitle>
          <button
            onClick={handleClose}
            disabled={saving}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Building select */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Building Name
            </Label>
            {buildingId ? (
              <div className="h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 flex items-center text-sm text-gray-700">
                {selectedBuildingName}
              </div>
            ) : (
              <Select
                value={form.building_id}
                onValueChange={(v) => updateField("building_id", v)}
                disabled={saving}
              >
                <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200">
                  <SelectValue placeholder="Select building..." />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Unit code */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Unit Code <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. APT 101"
              value={form.unit_code}
              onChange={(e) => updateField("unit_code", e.target.value)}
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
          </div>

          {/* Bedrooms + Bathrooms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Bedrooms
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="2"
                value={form.bedrooms}
                onChange={(e) => updateField("bedrooms", e.target.value)}
                className="h-9 text-sm rounded-lg border-gray-200"
                disabled={saving}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Bathrooms
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="2"
                value={form.bathrooms}
                onChange={(e) => updateField("bathrooms", e.target.value)}
                className="h-9 text-sm rounded-lg border-gray-200"
                disabled={saving}
              />
            </div>
          </div>

          {/* Unit type + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Add Units
              </Label>
              <Select
                value={form.unit_type || "flat"}
                onValueChange={(v) => updateField("unit_type", v)}
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
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rent */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Rent Date
              </Label>
              <div className="h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 flex items-center text-sm text-gray-400">
                $1,00/me
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Default Rent
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={form.default_rent}
                  onChange={(e) => updateField("default_rent", e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200 pl-6"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Purpose / notes */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Purpose{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              placeholder="e.g. Residential"
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
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
            {saving ? "Saving..." : "Save Unit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



//çcdddjdj
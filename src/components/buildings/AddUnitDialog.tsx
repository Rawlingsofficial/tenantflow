"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  building_type: string;
}

export function AddUnitDialog({ open, buildingId, buildingName, onClose, onSuccess }: AddUnitDialogProps) {
  const { orgId } = useAuth();
  const supabase = createBrowserClient();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingType, setSelectedBuildingType] = useState<string>("residential");
  const [form, setForm] = useState({
    building_id: buildingId || "",
    unit_code: "",
    unit_type: "",
    bedrooms: "",
    bathrooms: "",
    default_rent: "",
    status: "vacant",
    // Commercial fields
    unit_purpose: "",
    area_sqm: "",
    floor_number: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && orgId) loadBuildings();
  }, [open, orgId]);

  useEffect(() => {
    if (buildingId) {
      setForm((prev) => ({ ...prev, building_id: buildingId }));
      // Find building type from list
      const b = buildings.find((b) => b.id === buildingId);
      if (b) setSelectedBuildingType(b.building_type ?? "residential");
    }
  }, [buildingId, buildings]);

  async function loadBuildings() {
    const { data } = await supabase
      .from("buildings")
      .select("id, name, building_type")
      .eq("organization_id", orgId!)
      .eq("status", "active")
      .order("name");
    const buildings = (data as any[]) || [];
    setBuildings(buildings);
    // Auto-set building type if buildingId is provided
    if (buildingId) {
      const b = buildings.find((b: any) => b.id === buildingId);
      if (b) setSelectedBuildingType(b.building_type ?? "residential");
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBuildingChange(id: string | null) {
  if (!id) return
  setForm((prev) => ({ ...prev, building_id: id }));
  const b = buildings.find((b) => b.id === id);
  setSelectedBuildingType(b?.building_type ?? "residential");
}

  const isCommercial = selectedBuildingType === "commercial";

  async function handleSubmit() {
    if (!form.building_id) { toast.error("Please select a building."); return; }
    if (!form.unit_code.trim()) { toast.error("Unit code is required."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("units").insert({
        building_id: form.building_id,
        unit_code: form.unit_code.trim().toUpperCase(),
        unit_type: form.unit_type || null,
        bedrooms: (!isCommercial && form.bedrooms) ? parseInt(form.bedrooms) : null,
        bathrooms: (!isCommercial && form.bathrooms) ? parseInt(form.bathrooms) : null,
        default_rent: form.default_rent ? parseFloat(form.default_rent) : null,
        status: form.status as "vacant" | "occupied" | "maintenance",
        // Commercial fields
        unit_purpose: isCommercial ? (form.unit_purpose || null) : null,
        area_sqm: isCommercial && form.area_sqm ? parseFloat(form.area_sqm) : null,
        floor_number: isCommercial && form.floor_number ? parseInt(form.floor_number) : null,
      } as any);
      if (error) throw error;
      toast.success("Unit added successfully.");
      resetForm();
      onSuccess();
    } catch (err: any) {
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
      unit_purpose: "",
      area_sqm: "",
      floor_number: "",
    });
  }

  function handleClose() {
    if (!saving) { resetForm(); onClose(); }
  }

  const displayBuildingName =
    buildingName || buildings.find((b) => b.id === form.building_id)?.name || "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <DialogTitle className="text-sm font-semibold text-gray-900">
            Add New {isCommercial ? "Space" : "Unit"}
          </DialogTitle>
          <button onClick={handleClose} disabled={saving}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Building select */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Building</Label>
            {buildingId ? (
              <div className="h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between text-sm text-gray-700">
                <span>{displayBuildingName}</span>
                {isCommercial && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Commercial</span>
                )}
              </div>
            ) : (
              <Select value={form.building_id} onValueChange={handleBuildingChange} disabled={saving}>
                <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200">
                  <SelectValue placeholder="Select building..." />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      {b.building_type === "commercial" && " 🏢"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Commercial type indicator */}
          {isCommercial && (
            <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700 font-medium">
                🏢 Commercial space — filling in office/retail fields
              </p>
            </div>
          )}

          {/* Unit / Space code */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
              {isCommercial ? "Space Code" : "Unit Code"} <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder={isCommercial ? "e.g. OFFICE-3A" : "e.g. APT 101"}
              value={form.unit_code}
              onChange={(e) => updateField("unit_code", e.target.value)}
              className="h-9 text-sm rounded-lg border-gray-200"
              disabled={saving}
            />
          </div>

          {/* RESIDENTIAL fields */}
          {!isCommercial && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Bedrooms</Label>
                <Input type="number" min={0} placeholder="2" value={form.bedrooms}
                  onChange={(e) => updateField("bedrooms", e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" disabled={saving} />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Bathrooms</Label>
                <Input type="number" min={0} placeholder="1" value={form.bathrooms}
                  onChange={(e) => updateField("bathrooms", e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" disabled={saving} />
              </div>
            </div>
          )}

          {/* COMMERCIAL fields */}
          {isCommercial && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Area (m²)</Label>
                  <Input type="number" min={0} placeholder="120" value={form.area_sqm}
                    onChange={(e) => updateField("area_sqm", e.target.value)}
                    className="h-9 text-sm rounded-lg border-gray-200" disabled={saving} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Floor Number</Label>
                  <Input type="number" min={0} placeholder="3" value={form.floor_number}
                    onChange={(e) => updateField("floor_number", e.target.value)}
                    className="h-9 text-sm rounded-lg border-gray-200" disabled={saving} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Space Purpose</Label>
                <Select value={form.unit_purpose || "office"}
                  onValueChange={(v) => updateField("unit_purpose", v)} disabled={saving}>
                  <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="retail">Retail / Shop</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="coworking">Co-working</SelectItem>
                    <SelectItem value="showroom">Showroom</SelectItem>
                    <SelectItem value="medical">Medical / Clinic</SelectItem>
                    <SelectItem value="restaurant">Restaurant / F&B</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Unit type + Status — both modes */}
          <div className="grid grid-cols-2 gap-3">
            {!isCommercial && (
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Unit Type</Label>
                <Select value={form.unit_type || "flat"}
                  onValueChange={(v) => updateField("unit_type", v)} disabled={saving}>
                  <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="duplex">Duplex</SelectItem>
                    <SelectItem value="penthouse">Penthouse</SelectItem>
                    <SelectItem value="house">House / Villa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className={isCommercial ? "col-span-2" : ""}>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Status</Label>
              <Select value={form.status}
                onValueChange={(v) => setForm((prev) => ({ ...prev, status: v as "vacant" | "occupied" | "maintenance" }))}
                disabled={saving}>
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

          {/* Default rent — both modes */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
              {isCommercial ? "Base Rent ($/mo)" : "Default Rent ($/mo)"}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
              <Input type="number" min={0} placeholder="0.00" value={form.default_rent}
                onChange={(e) => updateField("default_rent", e.target.value)}
                className="h-9 text-sm rounded-lg border-gray-200 pl-6" disabled={saving} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={saving} className="h-9 text-sm rounded-lg">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}
            className={`h-9 text-white text-sm rounded-lg px-5 ${
              isCommercial ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}>
            {saving ? "Saving..." : `Save ${isCommercial ? "Space" : "Unit"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

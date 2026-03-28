// src/components/buildings/AddUnitDialog.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Building2, Hash, DollarSign, Layers, Maximize2 } from "lucide-react";

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
    const list = (data as any[]) || [];
    setBuildings(list);
    if (buildingId) {
      const b = list.find((b: any) => b.id === buildingId);
      if (b) setSelectedBuildingType(b.building_type ?? "residential");
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBuildingChange(id: string | null) {
    if (!id) return;
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

  const displayBuildingName = buildingName || buildings.find((b) => b.id === form.building_id)?.name || "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-xl shadow-sm ${isCommercial ? 'bg-[#1B3B6F]' : 'bg-teal-600'}`}>
              <Layers className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-900">
                Add New {isCommercial ? "Space" : "Unit"}
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {displayBuildingName || "Select a building below"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} disabled={saving}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Building selector */}
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Building</Label>
            {buildingId ? (
              <div className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>{displayBuildingName}</span>
                </div>
                {isCommercial && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/15">
                    Commercial
                  </span>
                )}
              </div>
            ) : (
              <Select value={form.building_id} onValueChange={handleBuildingChange} disabled={saving}>
                <SelectTrigger className="h-9 text-sm rounded-xl border-slate-200">
                  <SelectValue placeholder="Select building…" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex items-center gap-2">
                        {b.name}
                        {b.building_type === "commercial" && (
                          <span className="text-[10px] text-[#1B3B6F] font-semibold">🏢</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Commercial indicator */}
          {isCommercial && (
            <div className="px-3 py-2.5 bg-[#1B3B6F]/5 rounded-xl border border-[#1B3B6F]/10">
              <p className="text-xs text-[#1B3B6F] font-medium">🏢 Commercial space — office/retail fields below</p>
            </div>
          )}

          {/* Unit/Space code */}
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              {isCommercial ? "Space Code" : "Unit Code"} <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder={isCommercial ? "e.g. OFFICE-3A" : "e.g. APT 101"}
                value={form.unit_code}
                onChange={(e) => updateField("unit_code", e.target.value)}
                className="h-9 text-sm pl-9 rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"
                disabled={saving}
              />
            </div>
          </div>

          {/* Residential fields */}
          {!isCommercial && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Bedrooms</Label>
                <Input type="number" min={0} placeholder="2" value={form.bedrooms}
                  onChange={(e) => updateField("bedrooms", e.target.value)}
                  className="h-9 text-sm rounded-xl border-slate-200" disabled={saving} />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Bathrooms</Label>
                <Input type="number" min={0} placeholder="1" value={form.bathrooms}
                  onChange={(e) => updateField("bathrooms", e.target.value)}
                  className="h-9 text-sm rounded-xl border-slate-200" disabled={saving} />
              </div>
            </div>
          )}

          {/* Commercial fields */}
          {isCommercial && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    <div className="flex items-center gap-1"><Maximize2 className="h-3 w-3" /> Area (m²)</div>
                  </Label>
                  <Input type="number" min={0} placeholder="120" value={form.area_sqm}
                    onChange={(e) => updateField("area_sqm", e.target.value)}
                    className="h-9 text-sm rounded-xl border-slate-200" disabled={saving} />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Floor</Label>
                  <Input type="number" min={0} placeholder="3" value={form.floor_number}
                    onChange={(e) => updateField("floor_number", e.target.value)}
                    className="h-9 text-sm rounded-xl border-slate-200" disabled={saving} />
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Space Purpose</Label>
                <Select value={form.unit_purpose || "office"} onValueChange={(v) => updateField("unit_purpose", v ?? "")} disabled={saving}>
                  <SelectTrigger className="h-9 text-sm rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
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

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-3">
            {!isCommercial && (
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Unit Type</Label>
                <Select value={form.unit_type || "flat"} onValueChange={(v) => updateField("unit_type", v ?? "")} disabled={saving}>
                  <SelectTrigger className="h-9 text-sm rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
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
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</Label>
              <Select value={form.status}
                onValueChange={(v) => setForm((prev) => ({ ...prev, status: v as "vacant" | "occupied" | "maintenance" }))}
                disabled={saving}>
                <SelectTrigger className="h-9 text-sm rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Default rent */}
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              {isCommercial ? "Base Rent ($/mo)" : "Default Rent ($/mo)"}
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input type="number" min={0} placeholder="0.00" value={form.default_rent}
                onChange={(e) => updateField("default_rent", e.target.value)}
                className="h-9 text-sm rounded-xl border-slate-200 pl-9 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"
                disabled={saving} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={saving}
            className="h-9 text-sm rounded-xl border-slate-200 text-slate-600">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}
            className={`h-9 text-white text-sm rounded-xl px-5 font-semibold shadow-sm ${
              isCommercial ? "bg-[#1B3B6F] hover:bg-[#162d52]" : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </div>
            ) : `Save ${isCommercial ? "Space" : "Unit"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



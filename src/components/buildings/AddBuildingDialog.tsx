"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSupabaseWithAuth } from "@/lib/supabase/client";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { usePropertyType } from "@/hooks/usePropertyType";
import { CAMEROON_LOCATIONS, type Region, type Division } from "@/lib/data/cameroon-locations";

import { Building2, MapPin, Image, X, Map } from "lucide-react";

interface AddBuildingDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddBuildingDialog({ open, onClose, onSuccess }: AddBuildingDialogProps) {
  const { orgId } = useAuth();
  const supabase = useSupabaseWithAuth();
  const { propertyType } = usePropertyType();

  const defaultBuildingType: "residential" | "commercial" =
    propertyType === "commercial" ? "commercial" : "residential";

  const [form, setForm] = useState({
    name: "",
    address: "",
    status: "active" as "active" | "inactive",
    photo_url: "",
    building_type: defaultBuildingType,
  });

  // 🔥 Fully updated to use 'division'
  const [region, setRegion] = useState<Region | "">("");
  const [division, setDivision] = useState<string>("");
  const [city, setCity] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const isCommercial = form.building_type === "commercial";

  const regions = Object.keys(CAMEROON_LOCATIONS) as Region[];
  const divisions = region ? Object.keys(CAMEROON_LOCATIONS[region]) : [];
  const cities = region && division 
    ? CAMEROON_LOCATIONS[region][division as keyof typeof CAMEROON_LOCATIONS[Region]] 
    : [];

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return toast.error("Building name is required.");
    if (!region || !division || !city) return toast.error("Please complete the location details.");
    if (!orgId) return toast.error("No organization selected.");

    setSaving(true);

    try {
      const { error } = await (supabase.from("buildings") as any).insert({
        organization_id: orgId,
        name: form.name.trim(),
        address: form.address.trim() || null,
        region,
        division, // 🔥 Now perfectly matches your Supabase DB
        city,
        status: form.status,
        photo_url: form.photo_url.trim() || null,
        building_type: form.building_type,
      });

      if (error) throw error;

      toast.success("Building created successfully.");
      handleClose(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create building.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose(success = false) {
    if (saving && !success) return;
    setForm({ name: "", address: "", status: "active", photo_url: "", building_type: defaultBuildingType });
    setRegion(""); setDivision(""); setCity("");
    if (success) onSuccess(); else onClose();
  }

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl max-h-[90vh] flex flex-col">
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-xl shadow-sm ${isCommercial ? "bg-[#1B3B6F]" : "bg-teal-600"}`}>
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-900">Add New Building</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Register a property in your portfolio</p>
            </div>
          </div>
          <button onClick={() => handleClose()} disabled={saving} className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Building Name <span className="text-red-400">*</span></Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder={isCommercial ? "e.g. Acme Business Centre" : "e.g. Palm Grove Apartments"} value={form.name} onChange={(e) => updateField("name", e.target.value)} className="h-9 text-sm pl-9 rounded-xl border-slate-200" disabled={saving} />
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Map className="w-4 h-4 text-slate-400" />
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Standardized Location</h4>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Region <span className="text-red-400">*</span></Label>
                <Select value={region} onValueChange={(val) => { if (val) { setRegion(val as Region); setDivision(""); setCity(""); } }} disabled={saving}>
                  <SelectTrigger className="h-9 text-sm bg-white rounded-xl"><SelectValue placeholder="Select Region" /></SelectTrigger>
                  <SelectContent>{regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Division <span className="text-red-400">*</span></Label>
                  <Select disabled={!region || saving} value={division} onValueChange={(val) => { if (val) { setDivision(val); setCity(""); } }}>
                    <SelectTrigger className="h-9 text-sm bg-white rounded-xl"><SelectValue placeholder="Select Division" /></SelectTrigger>
                    <SelectContent>{divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">City/Council <span className="text-red-400">*</span></Label>
                  <Select disabled={!division || saving} value={city} onValueChange={(val) => { if (val) setCity(val); }}>
                    <SelectTrigger className="h-9 text-sm bg-white rounded-xl"><SelectValue placeholder="Select City" /></SelectTrigger>
                    <SelectContent>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Street Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="e.g. 4 Seaview Rd" value={form.address} onChange={(e) => updateField("address", e.target.value)} className="h-9 text-sm pl-9 rounded-xl border-slate-200" disabled={saving} />
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Photo URL</Label>
            <div className="relative">
              <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="https://..." value={form.photo_url} onChange={(e) => updateField("photo_url", e.target.value)} className="h-9 text-sm pl-9 rounded-xl border-slate-200" disabled={saving} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <Button variant="outline" size="sm" onClick={() => handleClose()} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving} className={`text-white ${isCommercial ? "bg-[#1B3B6F] hover:bg-[#162d52]" : "bg-teal-600 hover:bg-teal-700"}`}>
            {saving ? "Saving..." : "Save Building"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
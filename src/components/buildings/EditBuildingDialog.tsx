"use client";

import { useEffect, useState } from "react";
import { useSupabaseWithAuth } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Building2, MapPin, Image, Pencil, Map } from "lucide-react";
import { CAMEROON_LOCATIONS, type Region } from "@/lib/data/cameroon-locations";

function val<T>(v: T): never { return v as never; }

interface EditBuildingDialogProps {
  open: boolean;
  building: {
    id: string;
    name: string;
    address: string | null;
    status: string;
    photo_url: string | null;
    region?: string | null;
    division?: string | null;
    city?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function EditBuildingDialog({ open, building, onClose, onSuccess }: EditBuildingDialogProps) {
  const supabase = useSupabaseWithAuth();
  const [form, setForm] = useState({
    name: building.name,
    address: building.address || "",
    status: building.status,
    photo_url: building.photo_url || "",
  });

  const [region, setRegion] = useState<Region | "">((building.region as Region) || "");
  const [division, setDivision] = useState<string>(building.division || "");
  const [city, setCity] = useState<string>(building.city || "");

  const [saving, setSaving] = useState(false);

  const regions = Object.keys(CAMEROON_LOCATIONS) as Region[];
  const divisions = region ? Object.keys(CAMEROON_LOCATIONS[region]) : [];
  const cities = region && division 
    ? CAMEROON_LOCATIONS[region][division as keyof typeof CAMEROON_LOCATIONS[Region]] 
    : [];

  useEffect(() => {
    if (open) {
      setForm({
        name: building.name,
        address: building.address || "",
        status: building.status,
        photo_url: building.photo_url || "",
      });
      setRegion((building.region as Region) || "");
      setDivision(building.division || "");
      setCity(building.city || "");
    }
  }, [open, building]);

  async function handleSubmit() {
    if (!form.name.trim()) return toast.error("Building name is required.");
    if (!region || !division || !city) return toast.error("Please complete the location details.");
    
    setSaving(true);
    try {
      const { error } = await supabase.from("buildings").update(val({
        name: form.name.trim(),
        address: form.address.trim() || null,
        region,
        division,
        city,
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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl max-h-[90vh] flex flex-col">
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
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
          <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Building Name <span className="text-red-400">*</span></Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-9 text-sm pl-9 rounded-xl border-slate-200" disabled={saving} />
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
              <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="e.g. 4 Seaview Rd" className="h-9 text-sm pl-9 rounded-xl border-slate-200" disabled={saving} />
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</Label>
            <Select value={form.status} onValueChange={(v) => { if (v) setForm((p) => ({ ...p, status: v })) }} disabled={saving}>
              <SelectTrigger className="h-9 text-sm rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-teal-500" /> Active</div></SelectItem>
                <SelectItem value="inactive"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400" /> Inactive</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving} className="h-9 text-sm rounded-xl border-slate-200 text-slate-600">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving} className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-xl px-5 font-semibold shadow-sm">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
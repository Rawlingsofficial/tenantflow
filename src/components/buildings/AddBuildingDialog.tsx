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
import { Home, Briefcase, Building2, MapPin, Image, X } from "lucide-react";

interface AddBuildingDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddBuildingDialog({ open, onClose, onSuccess }: AddBuildingDialogProps) {
  const { orgId } = useAuth();
  const supabase = createBrowserClient();

  // FIX: hook returns `propertyType`, not `type`
  const { propertyType } = usePropertyType();
  const { mode } = useMixedModeStore();

  // Derive the default building type from org context
  const defaultBuildingType: "residential" | "commercial" =
    propertyType === "commercial" ? "commercial" :
    propertyType === "mixed" ? mode :
    "residential";

  const [form, setForm] = useState({
    name: "",
    address: "",
    status: "active" as "active" | "inactive",
    photo_url: "",
    building_type: defaultBuildingType,
  });
  const [saving, setSaving] = useState(false);

  // For mixed orgs, user must explicitly choose.
  // For pure residential/commercial, the type is locked to their org type
  // but we still show a read-only indicator so they understand the context.
  const isMixed = propertyType === "mixed";
  const isLockedCommercial = propertyType === "commercial";
  const isLockedResidential = propertyType === "residential";
  const isCommercial = form.building_type === "commercial";

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error("Building name is required."); return; }
    if (!orgId) { toast.error("No organization selected."); return; }
    setSaving(true);
    try {
      const { error } = await (supabase.from("buildings") as any).insert({
        organization_id: orgId,
        name: form.name.trim(),
        address: form.address.trim() || null,
        status: form.status,
        photo_url: form.photo_url.trim() || null,
        building_type: form.building_type,
      });
      if (error) throw error;
      toast.success("Building created successfully.");
      handleClose(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to create building.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose(success = false) {
    if (saving && !success) return;
    setForm({
      name: "",
      address: "",
      status: "active",
      photo_url: "",
      building_type: defaultBuildingType,
    });
    if (success) onSuccess();
    else onClose();
  }

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100">
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
          <button onClick={() => handleClose()} disabled={saving}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Portfolio type selector */}
          {isMixed ? (
            // Mixed: user must choose
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                Portfolio Type <span className="text-red-400">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField("building_type", "residential")}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.building_type === "residential"
                      ? "border-teal-500 bg-teal-50/80 text-teal-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <Home className="h-4 w-4" /> Residential
                </button>
                <button
                  type="button"
                  onClick={() => updateField("building_type", "commercial")}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.building_type === "commercial"
                      ? "border-[#1B3B6F] bg-[#1B3B6F]/5 text-[#1B3B6F] shadow-sm"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <Briefcase className="h-4 w-4" /> Commercial
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Determines which segment this building belongs to.
              </p>
            </div>
          ) : (
            // Non-mixed: show a locked read-only indicator
            <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${
              isLockedCommercial
                ? "bg-[#1B3B6F]/5 border-[#1B3B6F]/15"
                : "bg-teal-50/80 border-teal-200/60"
            }`}>
              {isLockedCommercial
                ? <Briefcase className="h-4 w-4 text-[#1B3B6F]" />
                : <Home className="h-4 w-4 text-teal-600" />
              }
              <div>
                <p className={`text-xs font-semibold ${isLockedCommercial ? "text-[#1B3B6F]" : "text-teal-700"}`}>
                  {isLockedCommercial ? "Commercial Building" : "Residential Building"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  This is set by your organization type.
                </p>
              </div>
            </div>
          )}

          {/* Building name */}
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Building Name <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder={isCommercial ? "e.g. Acme Business Centre" : "e.g. Palm Grove Apartments"}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="h-9 text-sm pl-9 rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"
                disabled={saving}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="e.g. 4 Seaview Rd, Miami, FL"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="h-9 text-sm pl-9 rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"
                disabled={saving}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((prev) => ({ ...prev, status: v as "active" | "inactive" }))}
              disabled={saving}
            >
              <SelectTrigger className="h-9 text-sm rounded-xl border-slate-200">
                <SelectValue />
              </SelectTrigger>
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

          {/* Photo URL */}
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Photo URL <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </Label>
            <div className="relative">
              <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="https://…"
                value={form.photo_url}
                onChange={(e) => updateField("photo_url", e.target.value)}
                className="h-9 text-sm pl-9 rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button variant="outline" size="sm" onClick={() => handleClose()} disabled={saving}
            className="h-9 text-sm rounded-xl border-slate-200 text-slate-600">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
            className={`h-9 text-white text-sm rounded-xl px-5 font-semibold shadow-sm ${
              isCommercial ? "bg-[#1B3B6F] hover:bg-[#162d52]" : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </div>
            ) : "Save Building"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";
import { AddUnitDialog } from "@/components/buildings/AddUnitDialog";
import { UnitHistoryDialog } from "@/components/buildings/UnitHistoryDialog";
import { EditBuildingDialog } from "@/components/buildings/EditBuildingDialog";
import { EditUnitDialog } from "@/components/buildings/EditUnitDialog";
import { Button } from "@/components/ui/button";
import { usePropertyType } from "@/hooks/usePropertyType";
import { ArrowLeft, Plus, Briefcase, Home, MapPin, Pencil, Building2, Layers, Hash, Clock } from "lucide-react";

// 🔥 1. Added region, division, and city to the interface
interface Building {
  id: string;
  name: string;
  address: string | null;
  status: string;
  photo_url: string | null;
  organization_id: string;
  building_type?: string;
  region?: string | null;
  division?: string | null;
  city?: string | null;
}

interface Unit {
  id: string;
  unit_code: string;
  unit_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  default_rent: number | null;
  status: string;
  building_id: string;
  area_sqm?: number | null;
  unit_purpose?: string | null;
}

// ── Segment badge ──────────────────────────────────────────────
function SegmentBadge({ buildingType }: { buildingType: string }) {
  return buildingType === "commercial" ? (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase tracking-wide">
      <Briefcase className="h-2.5 w-2.5" /> Commercial
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-600 border border-teal-200 uppercase tracking-wide">
      <Home className="h-2.5 w-2.5" /> Residential
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { orgId, getToken } = useAuth();
  const { propertyType } = usePropertyType();

  const isCommercial = propertyType === "commercial";

  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog States
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [editBuildingOpen, setEditBuildingOpen] = useState(false);
  const [historyUnit, setHistoryUnit] = useState<Unit | null>(null);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = await getToken({ template: 'supabase' });
      const supabase = createBrowserClient(token ?? undefined);

      const { data: bData } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", id)
        .single();
      setBuilding(bData || null);

      const { data: uData } = await supabase
        .from("units")
        .select(
          "id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status, building_id, area_sqm, unit_purpose"
        )
        .eq("building_id", id)
        .order("unit_code");

      setUnits(uData || []);
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/70 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2BBE9A]"></div>
      </div>
    );
  }

  if (!building) return <div className="p-8 text-center text-slate-500">Building not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-12">
      {/* 1. Header Hero Section */}
      <div className="bg-white border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button 
            onClick={() => router.push("/buildings")} 
            className="flex items-center text-sm font-medium text-slate-400 hover:text-slate-800 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Portfolio
          </button>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Building Image */}
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-100 shrink-0 shadow-sm group">
              {building.photo_url ? (
                <img src={building.photo_url} alt={building.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200">
                  <Building2 className="h-10 w-10 text-slate-300" />
                </div>
              )}
              {/* Hover Edit Overlay */}
              <div 
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                onClick={() => setEditBuildingOpen(true)}
              >
                <Pencil className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Building Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-extrabold text-[#1F3A5F] tracking-tight">{building.name}</h1>
                <SegmentBadge buildingType={propertyType ?? "residential"} />
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  building.status === 'active' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {building.status}
                </span>
              </div>
              
              {/* 🔥 2. Updated Location Display Area */}
              <div className="flex flex-col gap-1 mt-2">
                <p className="text-slate-500 flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  {building.address || 'No street address provided'}
                </p>
                
                {/* Only render this sub-line if they've provided standard location data */}
                {(building.city || building.division || building.region) && (
                  <div className="flex items-center gap-1.5 ml-5.5 pl-[22px] text-xs text-slate-400 font-medium">
                    {building.city && <span className="text-slate-600">{building.city}</span>}
                    {building.city && (building.division || building.region) && <span>•</span>}
                    {building.division && <span>{building.division}</span>}
                    {building.division && building.region && <span>•</span>}
                    {building.region && <span>{building.region}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
              <Button 
                variant="outline" 
                onClick={() => setEditBuildingOpen(true)} 
                className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 h-11 px-5"
              >
                <Pencil className="w-4 h-4 mr-2" /> Edit Profile
              </Button>
              <Button 
                onClick={() => setAddUnitOpen(true)} 
                className={`rounded-xl text-white h-11 px-6 shadow-sm transition-transform active:scale-95 ${
                  isCommercial ? 'bg-[#1B3B6F] hover:bg-[#162d52]' : 'bg-[#2BBE9A] hover:bg-[#239B7D]'
                }`}
              >
                <Plus className="w-4 h-4 mr-2" /> Add {isCommercial ? 'Space' : 'Unit'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Content Section (Units List) */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#1F3A5F]">
            {isCommercial ? 'Commercial Spaces' : 'Residential Units'} ({units.length})
          </h2>
        </div>

        {units.length === 0 ? (
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Layers className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-[#1F3A5F] mb-1">No {isCommercial ? 'spaces' : 'units'} added yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Start building your portfolio by adding the individual units or spaces inside this property.
            </p>
            <Button 
              onClick={() => setAddUnitOpen(true)} 
              className={`rounded-xl text-white ${isCommercial ? 'bg-[#1B3B6F] hover:bg-[#162d52]' : 'bg-[#2BBE9A] hover:bg-[#239B7D]'}`}
            >
              <Plus className="w-4 h-4 mr-2" /> Add First {isCommercial ? 'Space' : 'Unit'}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map(unit => (
              <UnitCard 
                key={unit.id} 
                unit={unit} 
                isCommercial={isCommercial} 
                onEdit={() => setEditUnit(unit)} 
                onHistory={() => setHistoryUnit(unit)} 
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. The Dialogs (Now fully functional and injected into the DOM) */}
      <AddUnitDialog open={addUnitOpen} onClose={() => setAddUnitOpen(false)} buildingId={building.id} buildingName={building.name} onSuccess={() => { setAddUnitOpen(false); setRefreshKey(k=>k+1); }} />
      {/* Typecasted 'building' as 'any' safely for EditBuildingDialog compatibility if strictly checked */}
      <EditBuildingDialog open={editBuildingOpen} onClose={() => setEditBuildingOpen(false)} building={building as any} onSuccess={() => { setEditBuildingOpen(false); setRefreshKey(k=>k+1); }} />
      {editUnit && <EditUnitDialog open={!!editUnit} onClose={() => setEditUnit(null)} unit={editUnit} onSuccess={() => { setEditUnit(null); setRefreshKey(k=>k+1); }} />}
      {historyUnit && <UnitHistoryDialog open={!!historyUnit} onClose={() => setHistoryUnit(null)} unit={historyUnit} buildingName={building.name} />}
    </div>
  );
}

// ── Unit Card Sub-Component ──────────────────────────────────────
function UnitCard({ unit, isCommercial, onEdit, onHistory }: { unit: Unit, isCommercial: boolean, onEdit: () => void, onHistory: () => void }) {
  const statusColors = {
    vacant: "bg-teal-50 text-teal-700 border-teal-200",
    occupied: "bg-indigo-50 text-indigo-700 border-indigo-200",
    maintenance: "bg-amber-50 text-amber-700 border-amber-200"
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCommercial ? 'bg-[#1B3B6F]/10' : 'bg-[#2BBE9A]/10'}`}>
            <Hash className={`w-5 h-5 ${isCommercial ? 'text-[#1B3B6F]' : 'text-[#2BBE9A]'}`} />
          </div>
          <div>
            <h3 className="font-bold text-[#1F3A5F] text-lg leading-tight truncate max-w-[120px]">{unit.unit_code}</h3>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">{unit.unit_type || 'Unit'}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[unit.status as keyof typeof statusColors] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
          {unit.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Rent</p>
          <p className="font-semibold text-[#1F3A5F] text-sm">${unit.default_rent?.toLocaleString() || '0'}<span className="text-slate-400 font-normal">/mo</span></p>
        </div>
        {isCommercial ? (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Area</p>
            <p className="font-semibold text-[#1F3A5F] text-sm">{unit.area_sqm || 0} sqm</p>
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Layout</p>
            <p className="font-semibold text-[#1F3A5F] text-sm">{unit.bedrooms || 0}B / {unit.bathrooms || 0}Ba</p>
          </div>
        )}
      </div>

      {/* Hover Actions */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 h-8 text-xs rounded-lg text-slate-600 border-slate-200 hover:bg-slate-100">
          <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onHistory} className="flex-1 h-8 text-xs rounded-lg text-slate-600 border-slate-200 hover:bg-slate-100">
          <Clock className="w-3.5 h-3.5 mr-1.5" /> History
        </Button>
      </div>
    </div>
  );
}

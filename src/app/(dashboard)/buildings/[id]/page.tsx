"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { AddUnitDialog } from "@/components/buildings/AddUnitDialog";
import { UnitHistoryDialog } from "@/components/buildings/UnitHistoryDialog";
import { EditBuildingDialog } from "@/components/buildings/EditBuildingDialog";
import { EditUnitDialog } from "@/components/buildings/EditUnitDialog";
import { Button } from "@/components/ui/button";
import { usePropertyType } from "@/hooks/usePropertyType";
import {
  ArrowLeft, Plus, Building2, ChevronRight, MoreHorizontal,
  Search, Pencil, Trash2, AlertTriangle, MapPin, Home,
  DollarSign, FileText, CheckCircle2, Wrench, Briefcase,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";

function val<T>(v: T): never { return v as never; }

type UnitView = "all" | "occupied" | "vacant" | "unavailable";

interface Building {
  id: string; name: string; address: string | null;
  status: string; photo_url: string | null; organization_id: string;
  building_type?: string;
}
interface Unit {
  id: string; unit_code: string; unit_type: string | null;
  bedrooms: number | null; bathrooms: number | null;
  default_rent: number | null; status: string; building_id: string;
  area_sqm?: number | null; unit_purpose?: string | null;
  activeLease?: {
    id: string; tenant_id: string; lease_start: string;
    lease_end: string | null; rent_amount: number; status: string;
    tenant: {
      id: string; first_name: string | null; last_name: string | null;
      primary_phone: string | null; photo_url: string | null;
    } | null;
  };
}

// ── Segment badge ──────────────────────────────────────────────
function SegmentBadge({ buildingType }: { buildingType: string }) {
  if (buildingType === "commercial") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase tracking-wide">
        <Briefcase className="h-2.5 w-2.5" /> Commercial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-600 border border-teal-200 uppercase tracking-wide">
      <Home className="h-2.5 w-2.5" /> Residential
    </span>
  );
}

// ── Status badge ───────────────────────────────────────────────
function UnitStatusBadge({ status }: { status: string }) {
  if (status === "occupied") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Occupied
    </span>
  );
  if (status === "vacant") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Vacant
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Maintenance
    </span>
  );
}

// ── Mini stat card ─────────────────────────────────────────────
function MiniStat({ label, value, color = "text-slate-800", icon: Icon, bg = "bg-slate-50" }: {
  label: string; value: number | string; color?: string; icon?: any; bg?: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-3.5 border border-slate-100`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-300" />}
      </div>
      <p className={`text-2xl font-bold ${color} tabular-nums`}>{value}</p>
    </div>
  );
}

export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { orgId } = useAuth();
  const supabase = createBrowserClient();
  // FIX: correct destructure from usePropertyType
  const { propertyType } = usePropertyType();
  const isMixed = propertyType === "mixed";

  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitView, setUnitView] = useState<UnitView>("all");
  const [search, setSearch] = useState("");
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [editBuildingOpen, setEditBuildingOpen] = useState(false);
  const [historyUnit, setHistoryUnit] = useState<Unit | null>(null);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [activeTab, setActiveTab] = useState<"units" | "overview" | "settings">("units");
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletingBuilding, setDeletingBuilding] = useState(false);
  const [confirmDeleteBuilding, setConfirmDeleteBuilding] = useState(false);
  const [recentTenant, setRecentTenant] = useState<{
    name: string; date: string; photo_url?: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: bData } = await supabase.from("buildings").select("*").eq("id", id).single();
      setBuilding(bData || null);

      const { data: uData } = await supabase
        .from("units")
        .select(`id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status, building_id, area_sqm, unit_purpose,
          leases(id, tenant_id, lease_start, lease_end, rent_amount, status,
            tenants(id, first_name, last_name, primary_phone, photo_url))`)
        .eq("building_id", id).order("unit_code");

      const enriched: Unit[] = (uData || []).map((u: any) => {
        const activeLease = (u.leases || []).find((l: any) => l.status === "active");
        return {
          id: u.id, unit_code: u.unit_code, unit_type: u.unit_type,
          bedrooms: u.bedrooms, bathrooms: u.bathrooms,
          default_rent: u.default_rent, status: u.status, building_id: u.building_id,
          area_sqm: u.area_sqm, unit_purpose: u.unit_purpose,
          activeLease: activeLease ? {
            id: activeLease.id, tenant_id: activeLease.tenant_id,
            lease_start: activeLease.lease_start, lease_end: activeLease.lease_end,
            rent_amount: activeLease.rent_amount, status: activeLease.status,
            tenant: activeLease.tenants || null,
          } : undefined,
        };
      });
      setUnits(enriched);

      // Show the most recently started active lease tenant
      const withTenant = enriched
        .filter((u) => u.activeLease?.tenant)
        .sort((a, b) =>
          new Date(b.activeLease!.lease_start).getTime() -
          new Date(a.activeLease!.lease_start).getTime()
        );
      if (withTenant.length > 0) {
        const t = withTenant[0].activeLease!.tenant!;
        setRecentTenant({
          name: `${t.first_name || ""} ${t.last_name || ""}`.trim(),
          date: format(new Date(withTenant[0].activeLease!.lease_start), "MMM d, yyyy"),
          photo_url: t.photo_url || undefined,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  async function handleDeleteUnit(unit: Unit) {
    if (unit.activeLease) { toast.error("Cannot delete a unit with an active lease."); return; }
    if (!confirm(`Delete unit ${unit.unit_code}? This cannot be undone.`)) return;
    const { error } = await supabase.from("units").delete().eq("id", unit.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Unit ${unit.unit_code} deleted.`);
    setRefreshKey((k) => k + 1);
  }

  async function handleDeleteBuilding() {
    if (units.some((u) => u.activeLease)) {
      toast.error("Cannot delete a building with active leases.");
      setConfirmDeleteBuilding(false); return;
    }
    setDeletingBuilding(true);
    try {
      await supabase.from("units").delete().eq("building_id", id);
      const { error } = await supabase.from("buildings").delete().eq("id", id);
      if (error) throw error;
      toast.success("Building deleted.");
      router.push("/buildings");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete building.");
    } finally {
      setDeletingBuilding(false);
      setConfirmDeleteBuilding(false);
    }
  }

  async function handleMarkUnitStatus(unit: Unit, status: string) {
    const { error } = await supabase.from("units").update(val({ status })).eq("id", unit.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Unit ${unit.unit_code} marked as ${status}.`);
    setRefreshKey((k) => k + 1);
  }

  const filteredUnits = units.filter((u) => {
    const matchSearch = !search ||
      u.unit_code.toLowerCase().includes(search.toLowerCase()) ||
      (u.activeLease?.tenant?.first_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.activeLease?.tenant?.last_name || "").toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (unitView === "occupied") return u.status === "occupied";
    if (unitView === "vacant") return u.status === "vacant";
    if (unitView === "unavailable") return u.status === "maintenance";
    return true;
  });

  const occupied    = units.filter((u) => u.status === "occupied").length;
  const vacant      = units.filter((u) => u.status === "vacant").length;
  const maintenance = units.filter((u) => u.status === "maintenance").length;
  const totalMonthlyRevenue = units.filter((u) => u.activeLease).reduce((sum, u) => sum + (u.activeLease?.rent_amount || 0), 0);
  const occupancyRate = units.length > 0 ? Math.round((occupied / units.length) * 100) : 0;

  const isCommercialBuilding = building?.building_type === "commercial";

  if (loading) return (
    <div className="min-h-screen bg-slate-50/70 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading building…</p>
      </div>
    </div>
  );

  if (!building) return (
    <div className="min-h-screen bg-slate-50/70 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500 text-sm">Building not found.</p>
        <Button variant="outline" className="mt-3 rounded-xl" onClick={() => router.push("/buildings")}>
          Back to Buildings
        </Button>
      </div>
    </div>
  );

  const activeColor = isCommercialBuilding ? "border-[#1B3B6F] text-[#1B3B6F]" : "border-teal-600 text-teal-700";
  const activeCountBg = isCommercialBuilding ? "bg-[#1B3B6F]/10 text-[#1B3B6F]" : "bg-teal-100 text-teal-700";

  const tabs = [
    { key: "units" as const, label: isCommercialBuilding ? "Spaces" : "Units", count: units.length },
    { key: "overview" as const, label: "Overview" },
    { key: "settings" as const, label: "Settings" },
  ];

  const unitViewTabs = [
    { label: "All", value: "all" as UnitView, count: units.length },
    { label: "Occupied", value: "occupied" as UnitView, count: occupied },
    { label: "Vacant", value: "vacant" as UnitView, count: vacant },
    { label: "Maintenance", value: "unavailable" as UnitView, count: maintenance },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/70">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-6 pt-5 pb-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => router.push("/buildings")} className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="hover:text-slate-800 cursor-pointer" onClick={() => router.push("/buildings")}>Buildings</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-800 font-semibold">{building.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditBuildingOpen(true)}
            className="h-8 text-slate-500 hover:text-slate-700 gap-1.5 rounded-xl">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" onClick={() => setAddUnitOpen(true)}
            className={`h-8 text-white text-xs font-semibold px-3 rounded-xl shadow-sm flex items-center gap-1.5 ${
              isCommercialBuilding ? "bg-[#1B3B6F] hover:bg-[#162d52]" : "bg-teal-600 hover:bg-teal-700"
            }`}>
            <Plus className="h-3.5 w-3.5" /> Add {isCommercialBuilding ? "Space" : "Unit"}
          </Button>
        </div>
      </motion.div>

      {/* Building header */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-xl font-bold text-slate-900">{building.name}</h1>
              {/* Always show segment badge so context is clear */}
              <SegmentBadge buildingType={building.building_type ?? "residential"} />
            </div>
            {building.address && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {building.address}
              </p>
            )}
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
            building.status === "active"
              ? isCommercialBuilding
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-teal-50 text-teal-700 border-teal-200"
              : "bg-slate-100 text-slate-500 border-slate-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              building.status === "active"
                ? isCommercialBuilding ? "bg-indigo-500 animate-pulse" : "bg-teal-500 animate-pulse"
                : "bg-slate-400"
            }`} />
            {building.status}
          </span>
        </div>
      </div>

      <div className="px-6 flex gap-5 flex-1">
        {/* Main panel */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex items-center border-b border-slate-200 mb-0">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.key ? activeColor : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? activeCountBg : "bg-slate-100 text-slate-500"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* UNITS TAB */}
          {activeTab === "units" && (
            <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-4 pt-3 pb-0 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-0.5">
                  {unitViewTabs.map((tab) => (
                    <button key={tab.value} onClick={() => setUnitView(tab.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                        unitView === tab.value ? activeColor : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {tab.label}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        unitView === tab.value ? activeCountBg : "bg-slate-100 text-slate-500"
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                  <Input placeholder={`Search ${isCommercialBuilding ? "spaces" : "units"}…`} value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-7 h-7 w-44 text-xs bg-slate-50 border-slate-200 rounded-lg" />
                </div>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/40">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {isCommercialBuilding ? "Space" : "Unit"}
                    </th>
                    {isCommercialBuilding ? (
                      <>
                        <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Purpose</th>
                        <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Area m²</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Bed/Bath</th>
                      </>
                    )}
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rent</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lease End</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">
                        No {isCommercialBuilding ? "spaces" : "units"} match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((unit, i) => (
                      <UnitRow
                        key={unit.id} unit={unit} index={i}
                        isCommercial={isCommercialBuilding}
                        onHistory={() => setHistoryUnit(unit)}
                        onEdit={() => setEditUnit(unit)}
                        onDelete={() => handleDeleteUnit(unit)}
                        onMarkStatus={(status) => handleMarkUnitStatus(unit, status)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label={isCommercialBuilding ? "Spaces" : "Total Units"} value={units.length} icon={Home} />
                <MiniStat label="Occupied" value={occupied} color="text-teal-600" icon={CheckCircle2} bg="bg-teal-50" />
                <MiniStat label="Vacant" value={vacant} color="text-blue-600" icon={Home} bg="bg-blue-50" />
                <MiniStat label="Maintenance" value={maintenance} color="text-amber-600" icon={Wrench} bg="bg-amber-50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-2xl p-4 border ${
                  isCommercialBuilding
                    ? "bg-gradient-to-br from-[#1B3B6F]/8 to-[#1B3B6F]/3 border-[#1B3B6F]/15"
                    : "bg-gradient-to-br from-teal-500/8 to-teal-500/3 border-teal-200/60"
                }`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${isCommercialBuilding ? "text-[#1B3B6F]" : "text-teal-600"}`}>
                    Monthly Revenue
                  </p>
                  <p className={`text-2xl font-bold mt-1 tabular-nums ${isCommercialBuilding ? "text-[#1B3B6F]" : "text-teal-700"}`}>
                    ${totalMonthlyRevenue.toLocaleString()}
                  </p>
                  <p className={`text-xs mt-0.5 ${isCommercialBuilding ? "text-[#1B3B6F]/70" : "text-teal-500"}`}>
                    from {occupied} active lease{occupied !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Occupancy Rate</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1 tabular-nums">{occupancyRate}%</p>
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${isCommercialBuilding ? "bg-indigo-500" : "bg-teal-500"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${occupancyRate}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              </div>

              {building.address && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Address</p>
                  <p className="text-sm text-slate-700 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" /> {building.address}
                  </p>
                </div>
              )}

              {isCommercialBuilding ? (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Space Breakdown</p>
                  <div className="space-y-2">
                    {["office", "retail", "warehouse", "coworking", "showroom", "medical", "restaurant", "other"].map((purpose) => {
                      const count = units.filter((u) => u.unit_purpose === purpose).length;
                      if (count === 0) return null;
                      return (
                        <div key={purpose} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 capitalize">{purpose}</span>
                          <span className="font-semibold text-slate-700">{count} space{count > 1 ? "s" : ""}</span>
                        </div>
                      );
                    })}
                    {units.filter((u) => !u.unit_purpose).length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Unspecified</span>
                        <span className="font-semibold text-slate-700">{units.filter((u) => !u.unit_purpose).length} spaces</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Unit Breakdown</p>
                  <div className="space-y-2">
                    {["flat", "studio", "duplex", "penthouse", "house"].map((type) => {
                      const count = units.filter((u) => u.unit_type === type).length;
                      if (count === 0) return null;
                      return (
                        <div key={type} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 capitalize">{type}</span>
                          <span className="font-semibold text-slate-700">{count} unit{count > 1 ? "s" : ""}</span>
                        </div>
                      );
                    })}
                    {units.filter((u) => !u.unit_type).length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Unspecified</span>
                        <span className="font-semibold text-slate-700">{units.filter((u) => !u.unit_type).length} units</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 shadow-sm divide-y divide-slate-100">
              <div className="p-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Building Information</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: "Name", value: building.name },
                    { label: "Address", value: building.address || "—" },
                    { label: "Type", value: building.building_type === "commercial" ? "Commercial" : "Residential" },
                    { label: "Total Units", value: String(units.length) },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center">
                      <span className="text-slate-500 text-xs">{row.label}</span>
                      <span className="font-medium text-slate-800 text-xs">{row.value}</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditBuildingOpen(true)}
                  className="mt-4 h-8 text-xs rounded-xl gap-1.5 border-slate-200">
                  <Pencil className="h-3.5 w-3.5" /> Edit Building Info
                </Button>
              </div>

              <div className="p-6">
                <h3 className="text-sm font-semibold text-red-600 mb-1">Danger Zone</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Permanently deletes the building and all its {isCommercialBuilding ? "spaces" : "units"}. Buildings with active leases cannot be deleted.
                </p>
                {!confirmDeleteBuilding ? (
                  <Button size="sm" variant="outline" onClick={() => setConfirmDeleteBuilding(true)}
                    className="h-8 text-xs rounded-xl border-red-200 text-red-600 hover:bg-red-50 gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" /> Delete Building
                  </Button>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-red-700">
                        This will permanently delete "{building.name}" and all its {isCommercialBuilding ? "spaces" : "units"}.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setConfirmDeleteBuilding(false)} className="h-7 text-xs rounded-lg">Cancel</Button>
                      <Button size="sm" onClick={handleDeleteBuilding} disabled={deletingBuilding}
                        className="h-7 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg gap-1.5">
                        <Trash2 className="h-3 w-3" />
                        {deletingBuilding ? "Deleting…" : "Yes, Delete"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-56 flex-shrink-0 space-y-3">
          {recentTenant && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {isCommercialBuilding ? "Active Tenant" : "Active Tenant"}
              </p>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] flex items-center justify-center">
                  {recentTenant.photo_url ? (
                    <img src={recentTenant.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#14b8a6] font-bold text-sm">{recentTenant.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{recentTenant.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{recentTenant.date}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-2.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Summary</p>
            {[
              { label: "Occupied", value: occupied, color: "text-teal-700" },
              { label: "Vacant", value: vacant, color: "text-slate-700" },
              { label: "Maintenance", value: maintenance, color: "text-amber-600" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center text-xs">
                <span className="text-slate-500">{row.label}</span>
                <span className={`font-bold tabular-nums ${row.color}`}>{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-500">Revenue/mo</span>
              <span className="font-bold text-slate-800 tabular-nums">${totalMonthlyRevenue.toLocaleString()}</span>
            </div>
            <div className="pt-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                <span>Occupancy</span>
                <span className={`font-bold ${isCommercialBuilding ? "text-indigo-600" : "text-teal-600"}`}>{occupancyRate}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${isCommercialBuilding ? "bg-indigo-500" : "bg-teal-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${occupancyRate}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddUnitDialog open={addUnitOpen} buildingId={building.id} buildingName={building.name}
        onClose={() => setAddUnitOpen(false)}
        onSuccess={() => { setAddUnitOpen(false); setRefreshKey((k) => k + 1); }} />
      <EditBuildingDialog open={editBuildingOpen} building={building}
        onClose={() => setEditBuildingOpen(false)}
        onSuccess={() => { setEditBuildingOpen(false); setRefreshKey((k) => k + 1); }} />
      {historyUnit && (
        <UnitHistoryDialog open={!!historyUnit} unit={historyUnit} buildingName={building.name} onClose={() => setHistoryUnit(null)} />
      )}
      {editUnit && (
        <EditUnitDialog open={!!editUnit} unit={editUnit}
          onClose={() => setEditUnit(null)}
          onSuccess={() => { setEditUnit(null); setRefreshKey((k) => k + 1); }} />
      )}
    </div>
  );
}

// ─── Unit row ──────────────────────────────────────────────────

function UnitRow({ unit, index, isCommercial, onHistory, onEdit, onDelete, onMarkStatus }: {
  unit: Unit; index: number; isCommercial: boolean;
  onHistory: () => void; onEdit: () => void; onDelete: () => void;
  onMarkStatus: (status: string) => void;
}) {
  const router = useRouter();
  const tenant = unit.activeLease?.tenant;
  const leaseEnd = unit.activeLease?.lease_end;
  const leaseEndFormatted = leaseEnd
    ? new Date(leaseEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const isPastDue = leaseEnd ? new Date(leaseEnd) < new Date() : false;
  const isDueSoon = leaseEnd && !isPastDue && new Date(leaseEnd) < new Date(Date.now() + 30 * 86400000);

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1B3B6F]/8 to-teal-500/8 flex items-center justify-center shrink-0 border border-slate-200/60">
            {isCommercial ? <Briefcase className="h-3 w-3 text-slate-400" /> : <Building2 className="h-3 w-3 text-slate-400" />}
          </div>
          <div>
            <p className="font-mono font-semibold text-slate-800">{unit.unit_code}</p>
            {tenant && <p className="text-slate-400 text-[10px]">{tenant.first_name} {tenant.last_name}</p>}
          </div>
        </div>
      </td>
      {isCommercial ? (
        <>
          <td className="px-3 py-3 text-slate-500 capitalize text-xs">{unit.unit_purpose || "—"}</td>
          <td className="px-3 py-3 text-slate-500 text-xs">{unit.area_sqm ? `${unit.area_sqm} m²` : "—"}</td>
        </>
      ) : (
        <>
          <td className="px-3 py-3 text-slate-500 capitalize text-xs">{unit.unit_type || "—"}</td>
          <td className="px-3 py-3 text-slate-500 text-xs tabular-nums">{unit.bedrooms ?? "—"}bd / {unit.bathrooms ?? "—"}ba</td>
        </>
      )}
      <td className="px-3 py-3 text-xs">
        <span className="font-semibold text-slate-800 tabular-nums">
          {unit.activeLease?.rent_amount
            ? `$${unit.activeLease.rent_amount.toLocaleString()}`
            : unit.default_rent ? `$${unit.default_rent.toLocaleString()}` : "—"}
        </span>
      </td>
      <td className="px-3 py-3 text-xs">
        {leaseEndFormatted ? (
          <span className={isPastDue ? "text-red-600 font-semibold" : isDueSoon ? "text-amber-600 font-medium" : "text-slate-500"}>
            {leaseEndFormatted}
            {isPastDue && <span className="ml-1.5 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">OVERDUE</span>}
            {isDueSoon && !isPastDue && <span className="ml-1.5 text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">SOON</span>}
          </span>
        ) : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-3 py-3"><UnitStatusBadge status={unit.status} /></td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-100">
            <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs w-44 rounded-xl border-slate-200 shadow-lg">
            <DropdownMenuItem onClick={onEdit} className="rounded-lg cursor-pointer">
              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit {isCommercial ? "Space" : "Unit"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onHistory} className="rounded-lg cursor-pointer">View History</DropdownMenuItem>
            {tenant && (
              <DropdownMenuItem onClick={() => router.push(`/tenants/${tenant.id}`)} className="rounded-lg cursor-pointer">
                View Tenant
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {unit.status !== "vacant" && (
              <DropdownMenuItem onClick={() => onMarkStatus("vacant")} className="rounded-lg cursor-pointer">Mark as Vacant</DropdownMenuItem>
            )}
            {unit.status !== "maintenance" && (
              <DropdownMenuItem onClick={() => onMarkStatus("maintenance")} className="rounded-lg cursor-pointer">Mark as Maintenance</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg cursor-pointer">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete {isCommercial ? "Space" : "Unit"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  );
}



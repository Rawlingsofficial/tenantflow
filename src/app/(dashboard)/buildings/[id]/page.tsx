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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, Building2, ChevronRight, MoreHorizontal,
  Search, Pencil, Trash2, AlertTriangle, MapPin, Home,
  BedDouble, Bath, DollarSign, Settings, FileText,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function val<T>(v: T): never { return v as never; }

type UnitView = "all" | "occupied" | "vacant" | "unavailable";

interface Building {
  id: string;
  name: string;
  address: string | null;
  status: string;
  photo_url: string | null;
  organization_id: string;
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
  activeLease?: {
    id: string;
    tenant_id: string;
    lease_start: string;
    lease_end: string | null;
    rent_amount: number;
    status: string;
    tenant: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      primary_phone: string | null;
      photo_url: string | null;
    } | null;
  };
}

export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { orgId } = useAuth();
  const supabase = createBrowserClient();

  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitView, setUnitView] = useState<UnitView>("all");
  const [search, setSearch] = useState("");
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [editBuildingOpen, setEditBuildingOpen] = useState(false);
  const [historyUnit, setHistoryUnit] = useState<Unit | null>(null);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [activeTab, setActiveTab] = useState<"units" | "overview" | "files" | "settings">("units");
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletingBuilding, setDeletingBuilding] = useState(false);
  const [confirmDeleteBuilding, setConfirmDeleteBuilding] = useState(false);

  const [recentTenant, setRecentTenant] = useState<{
    name: string; date: string; photo_url?: string; units?: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: bData } = await supabase
        .from("buildings").select("*").eq("id", id).single();
      setBuilding(bData || null);

      const { data: uData } = await supabase
        .from("units")
        .select(`id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status, building_id,
          leases(id, tenant_id, lease_start, lease_end, rent_amount, status,
            tenants(id, first_name, last_name, primary_phone, photo_url))`)
        .eq("building_id", id).order("unit_code");

      const enriched: Unit[] = (uData || []).map((u: any) => {
        const activeLease = (u.leases || []).find((l: any) => l.status === "active");
        return {
          id: u.id, unit_code: u.unit_code, unit_type: u.unit_type,
          bedrooms: u.bedrooms, bathrooms: u.bathrooms,
          default_rent: u.default_rent, status: u.status, building_id: u.building_id,
          activeLease: activeLease ? {
            id: activeLease.id, tenant_id: activeLease.tenant_id,
            lease_start: activeLease.lease_start, lease_end: activeLease.lease_end,
            rent_amount: activeLease.rent_amount, status: activeLease.status,
            tenant: activeLease.tenants || null,
          } : undefined,
        };
      });
      setUnits(enriched);

      const withTenant = enriched.filter((u) => u.activeLease?.tenant);
      if (withTenant.length > 0) {
        const t = withTenant[0].activeLease!.tenant!;
        setRecentTenant({
          name: `${t.first_name || ""} ${t.last_name || ""}`.trim(),
          date: new Date(withTenant[0].activeLease!.lease_start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          photo_url: t.photo_url || undefined,
          units: withTenant.length,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  async function handleDeleteUnit(unit: Unit) {
    if (unit.activeLease) {
      toast.error("Cannot delete a unit with an active lease. End the lease first.");
      return;
    }
    if (!confirm(`Delete unit ${unit.unit_code}? This cannot be undone.`)) return;
    const { error } = await supabase.from("units").delete().eq("id", unit.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Unit ${unit.unit_code} deleted.`);
    setRefreshKey((k) => k + 1);
  }

  async function handleDeleteBuilding() {
    const hasActiveLeases = units.some((u) => u.activeLease);
    if (hasActiveLeases) {
      toast.error("Cannot delete a building with active leases. End all leases first.");
      setConfirmDeleteBuilding(false);
      return;
    }
    setDeletingBuilding(true);
    try {
      // Delete all units first, then the building
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
    const { error } = await supabase
      .from("units").update(val({ status })).eq("id", unit.id);
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

  const occupied = units.filter((u) => u.status === "occupied").length;
  const vacant = units.filter((u) => u.status === "vacant").length;
  const maintenance = units.filter((u) => u.status === "maintenance").length;
  const totalMonthlyRevenue = units
    .filter((u) => u.activeLease)
    .reduce((sum, u) => sum + (u.activeLease?.rent_amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading building...</div>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Building not found.</p>
          <Button variant="outline" className="mt-3" onClick={() => router.push("/buildings")}>
            Back to Buildings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => router.push("/buildings")} className="flex items-center gap-1 hover:text-gray-800 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <span className="hover:text-gray-800 cursor-pointer" onClick={() => router.push("/buildings")}>
            Buildings
          </span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-800 font-medium">{building.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditBuildingOpen(true)}
            className="h-8 text-gray-500 hover:text-gray-700 gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" onClick={() => setAddUnitOpen(true)}
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 rounded-lg flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Add New Unit
          </Button>
        </div>
      </div>

      <div className="px-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">{building.name}</h1>
          {building.address && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {building.address}
            </p>
          )}
        </div>
      </div>

      <div className="px-6 flex gap-5 flex-1">
        {/* Main panel */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex items-center border-b border-gray-200 mb-0">
            {(["units", "overview", "files", "settings"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
                  activeTab === tab ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {tab}
              </button>
            ))}
          </div>

          {/* ── UNITS TAB ── */}
          {activeTab === "units" && (
            <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm">
              <div className="px-4 pt-3 pb-0 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-1">
                  {([
                    { label: "All", value: "all" },
                    { label: "Occupied", value: "occupied" },
                    { label: "Vacant", value: "vacant" },
                    { label: "Maintenance", value: "unavailable" },
                  ] as { label: string; value: UnitView }[]).map((tab) => (
                    <button key={tab.value} onClick={() => setUnitView(tab.value)}
                      className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                        unitView === tab.value ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}>
                      {tab.label}
                      <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                        unitView === tab.value ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {tab.value === "all" ? units.length :
                          tab.value === "occupied" ? occupied :
                          tab.value === "vacant" ? vacant : maintenance}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input placeholder="Search units..." value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-7 w-44 text-xs bg-gray-50 border-gray-200 rounded-md" />
                </div>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/30">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Unit</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Beds/Bath</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Rent</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Lease End</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                        No units match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((unit) => (
                      <UnitRow
                        key={unit.id}
                        unit={unit}
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

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Total Units" value={units.length} icon={<Home className="h-4 w-4" />} />
                <StatCard label="Occupied" value={occupied} color="text-emerald-600" icon={<Home className="h-4 w-4 text-emerald-500" />} />
                <StatCard label="Vacant" value={vacant} color="text-blue-600" icon={<Home className="h-4 w-4 text-blue-500" />} />
                <StatCard label="Maintenance" value={maintenance} color="text-amber-600" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">
                    ${totalMonthlyRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-emerald-500 mt-0.5">from {occupied} active leases</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Occupancy Rate</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {units.length > 0 ? Math.round((occupied / units.length) * 100) : 0}%
                  </p>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${units.length > 0 ? Math.round((occupied / units.length) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>

              {building.address && (
                <div className="pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Address</p>
                  <p className="text-sm text-gray-700 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" /> {building.address}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-50">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Unit Breakdown</p>
                <div className="space-y-2">
                  {["flat", "studio", "duplex", "penthouse", "commercial"].map((type) => {
                    const count = units.filter((u) => u.unit_type === type).length;
                    if (count === 0) return null;
                    return (
                      <div key={type} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 capitalize">{type}</span>
                        <span className="font-medium text-gray-700">{count} unit{count > 1 ? "s" : ""}</span>
                      </div>
                    );
                  })}
                  {units.filter((u) => !u.unit_type).length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Unspecified</span>
                      <span className="font-medium text-gray-700">{units.filter((u) => !u.unit_type).length} units</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── FILES TAB ── */}
          {activeTab === "files" && (
            <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm p-10 text-center">
              <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No files uploaded yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload lease agreements, inspection reports, or insurance documents</p>
              <Button size="sm" variant="outline" className="mt-4 text-xs h-8 rounded-lg">
                Upload File
              </Button>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === "settings" && (
            <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm divide-y divide-gray-50">
              {/* Building Info */}
              <div className="p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Building Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="font-medium text-gray-800">{building.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Address</span>
                    <span className="font-medium text-gray-800">{building.address || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <Badge variant="outline" className={`text-xs ${
                      building.status === "active"
                        ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                        : "border-gray-200 text-gray-500"
                    }`}>
                      {building.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Units</span>
                    <span className="font-medium text-gray-800">{units.length}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditBuildingOpen(true)}
                  className="mt-4 h-8 text-xs rounded-lg gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit Building Info
                </Button>
              </div>

              {/* Danger Zone */}
              <div className="p-6">
                <h3 className="text-sm font-semibold text-red-600 mb-1">Danger Zone</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Deleting a building is permanent and cannot be undone. All units will also be deleted.
                  Buildings with active leases cannot be deleted.
                </p>
                {!confirmDeleteBuilding ? (
                  <Button size="sm" variant="outline"
                    onClick={() => setConfirmDeleteBuilding(true)}
                    className="h-8 text-xs rounded-lg border-red-200 text-red-600 hover:bg-red-50 gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" /> Delete Building
                  </Button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <p className="text-xs font-semibold text-red-700">
                        Are you sure? This will permanently delete "{building.name}" and all its units.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline"
                        onClick={() => setConfirmDeleteBuilding(false)}
                        className="h-7 text-xs rounded-lg">
                        Cancel
                      </Button>
                      <Button size="sm"
                        onClick={handleDeleteBuilding}
                        disabled={deletingBuilding}
                        className="h-7 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg gap-1.5">
                        <Trash2 className="h-3 w-3" />
                        {deletingBuilding ? "Deleting..." : "Yes, Delete Building"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {recentTenant && (
          <div className="w-60 flex-shrink-0 space-y-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-3">Active Tenant</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex-shrink-0 overflow-hidden">
                  {recentTenant.photo_url ? (
                    <img src={recentTenant.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-700 font-semibold text-sm">
                      {recentTenant.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{recentTenant.name}</p>
                  <p className="text-[10px] text-gray-400">{recentTenant.date}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Summary</p>
              {[
                { label: "Occupied", value: occupied, color: "text-emerald-700" },
                { label: "Vacant", value: vacant, color: "text-gray-700" },
                { label: "Maintenance", value: maintenance, color: "text-amber-600" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{row.label}</span>
                  <span className={`font-semibold ${row.color}`}>{row.value}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-2 border-t border-gray-50">
                <span className="text-gray-500">Revenue/mo</span>
                <span className="font-semibold text-gray-800">${totalMonthlyRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddUnitDialog open={addUnitOpen} buildingId={building.id} buildingName={building.name}
        onClose={() => setAddUnitOpen(false)}
        onSuccess={() => { setAddUnitOpen(false); setRefreshKey((k) => k + 1); }} />

      <EditBuildingDialog open={editBuildingOpen} building={building}
        onClose={() => setEditBuildingOpen(false)}
        onSuccess={() => { setEditBuildingOpen(false); setRefreshKey((k) => k + 1); }} />

      {historyUnit && (
        <UnitHistoryDialog open={!!historyUnit} unit={historyUnit}
          buildingName={building.name} onClose={() => setHistoryUnit(null)} />
      )}

      {editUnit && (
        <EditUnitDialog open={!!editUnit} unit={editUnit}
          onClose={() => setEditUnit(null)}
          onSuccess={() => { setEditUnit(null); setRefreshKey((k) => k + 1); }} />
      )}
    </div>
  );
}

function StatCard({ label, value, color = "text-gray-800", icon }: {
  label: string; value: number | string; color?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
        {icon && <span className="text-gray-300">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function UnitRow({ unit, onHistory, onEdit, onDelete, onMarkStatus }: {
  unit: Unit;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMarkStatus: (status: string) => void;
}) {
  const router = useRouter();
  const tenant = unit.activeLease?.tenant;
  const leaseEnd = unit.activeLease?.lease_end;

  const leaseEndFormatted = leaseEnd
    ? new Date(leaseEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const isPastDue = leaseEnd ? new Date(leaseEnd) < new Date() : false;
  const isDueSoon = leaseEnd && !isPastDue &&
    new Date(leaseEnd) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const statusBadge = () => {
    if (unit.status === "occupied")
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Occupied
        </span>
      );
    if (unit.status === "vacant")
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Vacant
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Maintenance
      </span>
    );
  };

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-3 w-3 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{unit.unit_code}</p>
            {tenant && (
              <p className="text-gray-500 text-[10px]">{tenant.first_name} {tenant.last_name}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-gray-500 capitalize">{unit.unit_type || "—"}</td>
      <td className="px-3 py-3 text-gray-500">
        {unit.bedrooms ?? "—"}bd / {unit.bathrooms ?? "—"}ba
      </td>
      <td className="px-3 py-3 text-gray-700 font-medium">
        {unit.activeLease?.rent_amount
          ? `$${unit.activeLease.rent_amount.toLocaleString()}`
          : unit.default_rent
          ? `$${unit.default_rent.toLocaleString()}`
          : "—"}
      </td>
      <td className="px-3 py-3">
        {leaseEndFormatted ? (
          <span className={`text-[11px] ${isPastDue ? "text-red-600 font-medium" : isDueSoon ? "text-amber-600" : "text-gray-500"}`}>
            {leaseEndFormatted}
            {isPastDue && <span className="ml-1 text-[9px] bg-red-100 text-red-600 px-1 rounded">OVERDUE</span>}
            {isDueSoon && !isPastDue && <span className="ml-1 text-[9px] bg-amber-100 text-amber-600 px-1 rounded">SOON</span>}
          </span>
        ) : (
          <span className="text-gray-400 text-[11px]">—</span>
        )}
      </td>
      <td className="px-3 py-3">{statusBadge()}</td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100">
            <MoreHorizontal className="h-3.5 w-3.5 text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs w-44">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Unit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onHistory}>
              View History
            </DropdownMenuItem>
            {tenant && (
              <DropdownMenuItem onClick={() => router.push(`/tenants/${tenant.id}`)}>
                View Tenant
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {unit.status !== "vacant" && (
              <DropdownMenuItem onClick={() => onMarkStatus("vacant")}>
                Mark as Vacant
              </DropdownMenuItem>
            )}
            {unit.status !== "maintenance" && (
              <DropdownMenuItem onClick={() => onMarkStatus("maintenance")}>
                Mark as Maintenance
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Unit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

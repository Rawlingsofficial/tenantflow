"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { AddBuildingDialog } from "@/components/buildings/AddBuildingDialog";
import { BuildingsTable } from "@/components/buildings/BuildingsTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Building2 } from "lucide-react";

type UnitStatus = "all" | "occupied" | "vacant" | "maintenance";

interface BuildingWithStats {
  id: string;
  name: string;
  address: string | null;
  status: string;
  photo_url: string | null;
  organization_id: string;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  maintenance_units: number;
  occupancy_rate: number;
}

export default function BuildingsPage() {
  const { orgId } = useOrg();
  const supabase = createBrowserClient();

  const [buildings, setBuildings] = useState<BuildingWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UnitStatus>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    fetchBuildings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, refreshKey]);

  async function fetchBuildings() {
    setLoading(true);
    try {
      const { data: buildingsData, error } = await supabase
        .from("buildings")
        .select(
          `
          id, name, address, status, photo_url, organization_id,
          units(id, status)
        `
        )
        .eq("organization_id", orgId!)
        .order("name");

      if (error) throw error;

      const enriched: BuildingWithStats[] = (buildingsData || []).map((b) => {
        const units: { id: string; status: string }[] = (b.units as any) || [];
        const total = units.length;
        const occupied = units.filter((u) => u.status === "occupied").length;
        const vacant = units.filter((u) => u.status === "vacant").length;
        const maintenance = units.filter(
          (u) => u.status === "maintenance"
        ).length;
        return {
          id: b.id,
          name: b.name,
          address: b.address,
          status: b.status,
          photo_url: b.photo_url,
          organization_id: b.organization_id,
          total_units: total,
          occupied_units: occupied,
          vacant_units: vacant,
          maintenance_units: maintenance,
          occupancy_rate: total > 0 ? Math.round((occupied / total) * 100) : 0,
        };
      });

      setBuildings(enriched);
    } catch (err) {
      console.error("Failed to fetch buildings:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = buildings.filter((b) => {
    const matchesSearch =
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.address || "").toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "occupied") return b.occupied_units > 0;
    if (statusFilter === "vacant") return b.vacant_units > 0;
    if (statusFilter === "maintenance") return b.maintenance_units > 0;
    return true;
  });

  const tabs: { label: string; value: UnitStatus }[] = [
    { label: "All Units", value: "all" },
    { label: "Occupied", value: "occupied" },
    { label: "Vacant", value: "vacant" },
    { label: "Unavailable", value: "maintenance" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F8F9FB] min-h-screen">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Buildings &amp; Units
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search buildings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 w-60 bg-white border-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 px-4"
          >
            <Plus className="h-4 w-4" />
            Add New Unit
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-1 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                statusFilter === tab.value
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Buildings List */}
      <div className="px-6 flex-1 space-y-4 pb-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 bg-white rounded-xl border border-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No buildings found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search ? "Try a different search" : "Add your first building to get started"}
            </p>
          </div>
        ) : (
          filtered.map((building) => (
            <BuildingCard
              key={building.id}
              building={building}
              onRefresh={() => setRefreshKey((k) => k + 1)}
            />
          ))
        )}
      </div>

      <AddBuildingDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}

// ─── Building Card ───────────────────────────────────────────────────────────

import { useRouter } from "next/navigation";
import { AddUnitDialog } from "@/components/buildings/AddUnitDialog";

function BuildingCard({
  building,
  onRefresh,
}: {
  building: BuildingWithStats;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [unitsExpanded, setUnitsExpanded] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const supabase = createBrowserClient();

  async function fetchUnits() {
    setLoadingUnits(true);
    const { data } = await supabase
      .from("units")
      .select(
        `
        id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status,
        leases(id, tenant_id, lease_start, lease_end, status,
          tenants(id, first_name, last_name, primary_phone))
      `
      )
      .eq("building_id", building.id)
      .order("unit_code");
    setUnits(data || []);
    setLoadingUnits(false);
  }

  function toggleUnits() {
    if (!unitsExpanded) fetchUnits();
    setUnitsExpanded((v) => !v);
  }

  const occupancyColor =
    building.occupancy_rate >= 80
      ? "text-emerald-600"
      : building.occupancy_rate >= 50
      ? "text-amber-500"
      : "text-red-500";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top section */}
      <div className="p-5 flex gap-5">
        {/* Photo */}
        <div
          className="w-36 h-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer"
          onClick={() => router.push(`/buildings/${building.id}`)}
        >
          {building.photo_url ? (
            <img
              src={building.photo_url}
              alt={building.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="h-10 w-10 text-gray-300" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h2
                className="text-base font-semibold text-gray-900 hover:text-emerald-700 cursor-pointer"
                onClick={() => router.push(`/buildings/${building.id}`)}
              >
                {building.name}
              </h2>
              {building.address && (
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <span>📍</span> {building.address}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                building.status === "active"
                  ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              {building.status}
            </Badge>
          </div>

          {/* Stats row */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span>
              <span className="font-medium text-gray-700">
                {building.total_units}
              </span>{" "}
              units
            </span>
            <span>•</span>
            <span>
              <span className="font-medium text-gray-700">
                {building.occupied_units}
              </span>{" "}
              tenants
            </span>
          </div>

          {/* Metric cards */}
          <div className="mt-3 flex items-center gap-3">
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center min-w-[80px]">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                Occupied
              </p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">
                {building.occupied_units} / {building.total_units}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center min-w-[80px]">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                Vacant
              </p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">
                {building.vacant_units} / {building.total_units}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center min-w-[80px]">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                Occupancy
              </p>
              <p className={`text-sm font-semibold mt-0.5 ${occupancyColor}`}>
                {building.occupancy_rate}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center min-w-[80px]">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                Maintenance
              </p>
              <p className="text-sm font-semibold text-amber-600 mt-0.5">
                {building.maintenance_units}
              </p>
            </div>

            {/* Add Unit button */}
            <Button
              size="sm"
              onClick={() => setAddUnitOpen(true)}
              className="ml-auto h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 rounded-lg"
            >
              + Add Unit
            </Button>
          </div>
        </div>
      </div>

      {/* Units table toggle */}
      <div className="border-t border-gray-50">
        <button
          onClick={toggleUnits}
          className="w-full px-5 py-2.5 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <span className="flex-1 text-left font-medium text-gray-600">
            Units ({building.total_units})
          </span>
          <span className="text-gray-400">{unitsExpanded ? "▲" : "▼"}</span>
        </button>

        {unitsExpanded && (
          <div className="border-t border-gray-50">
            {loadingUnits ? (
              <div className="px-5 py-4 text-sm text-gray-400 animate-pulse">
                Loading units...
              </div>
            ) : (
              <UnitsMiniTable units={units} />
            )}
          </div>
        )}
      </div>

      <AddUnitDialog
        open={addUnitOpen}
        buildingId={building.id}
        buildingName={building.name}
        onClose={() => setAddUnitOpen(false)}
        onSuccess={() => {
          setAddUnitOpen(false);
          onRefresh();
          if (unitsExpanded) fetchUnits();
        }}
      />
    </div>
  );
}

function UnitsMiniTable({ units }: { units: any[] }) {
  const router = useRouter();

  const statusBadge = (status: string) => {
    if (status === "occupied")
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      );
    if (status === "vacant")
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          Vacant
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Maintenance
      </span>
    );
  };

  if (units.length === 0) {
    return (
      <div className="px-5 py-4 text-sm text-gray-400 text-center">
        No units added yet.
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-50 bg-gray-50/50">
          <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Unit
          </th>
          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Bedrooms
          </th>
          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Bathrooms
          </th>
          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Tenant
          </th>
          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Lease End Date
          </th>
          <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {units.map((unit) => {
          const activeLease = (unit.leases || []).find(
            (l: any) => l.status === "active"
          );
          const tenant = activeLease?.tenants;
          const leaseEnd = activeLease?.lease_end;

          return (
            <tr
              key={unit.id}
              className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
              onClick={() => router.push(`/buildings/${unit.building_id || ""}?unit=${unit.id}`)}
            >
              <td className="px-5 py-3 font-medium text-gray-800">
                {unit.unit_code}
              </td>
              <td className="px-3 py-3 text-gray-500">{unit.bedrooms ?? "—"} B</td>
              <td className="px-3 py-3 text-gray-500">{unit.bathrooms ?? "—"} B</td>
              <td className="px-3 py-3 text-gray-700">
                {tenant
                  ? `${tenant.first_name} ${tenant.last_name}`
                  : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-3 py-3 text-gray-500">
                {leaseEnd
                  ? new Date(leaseEnd).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-5 py-3">{statusBadge(unit.status)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}



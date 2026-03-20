"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Building2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BuildingRow {
  id: string;
  name: string;
  address: string | null;
  status: string;
  photo_url: string | null;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  occupancy_rate: number;
}

interface BuildingsTableProps {
  buildings: BuildingRow[];
  onRefresh?: () => void;
}

export function BuildingsTable({ buildings, onRefresh }: BuildingsTableProps) {
  const router = useRouter();

  if (buildings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
        <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm font-medium">No buildings found</p>
        <p className="text-gray-400 text-xs mt-1">
          Add your first building to get started
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Building
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Address
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Units
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Occupied
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Occupancy
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Status
            </th>
            <th className="px-4 py-3.5 w-10" />
          </tr>
        </thead>
        <tbody>
          {buildings.map((b) => (
            <tr
              key={b.id}
              className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors group"
              onClick={() => router.push(`/buildings/${b.id}`)}
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {b.photo_url ? (
                      <img
                        src={b.photo_url}
                        alt={b.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-gray-800 hover:text-emerald-700">
                    {b.name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-gray-500 text-xs">
                {b.address || "—"}
              </td>
              <td className="px-4 py-3.5 text-gray-700">{b.total_units}</td>
              <td className="px-4 py-3.5 text-gray-700">{b.occupied_units}</td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        b.occupancy_rate >= 80
                          ? "bg-emerald-500"
                          : b.occupancy_rate >= 50
                          ? "bg-amber-400"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${b.occupancy_rate}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      b.occupancy_rate >= 80
                        ? "text-emerald-600"
                        : b.occupancy_rate >= 50
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {b.occupancy_rate}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    b.status === "active"
                      ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                      : "border-gray-200 text-gray-500"
                  }`}
                >
                  {b.status}
                </Badge>
              </td>
              <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger>
  <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition-all">
    <MoreHorizontal className="h-4 w-4 text-gray-400" />
  </button>
</DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs">
                    <DropdownMenuItem
                      onClick={() => router.push(`/buildings/${b.id}`)}
                    >
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>Edit Building</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



// src/components/buildings/BuildingsTable.tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, MoreHorizontal, ArrowUpRight, MapPin } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
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

function OccupancyBar({ rate }: { rate: number }) {
  const color =
    rate >= 80 ? "bg-teal-500" :
    rate >= 50 ? "bg-amber-400" :
    "bg-red-400";
  const textColor =
    rate >= 80 ? "text-teal-600" :
    rate >= 50 ? "text-amber-600" :
    "text-red-500";

  return (
    <div className="flex items-center gap-2.5">
      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums ${textColor}`}>{rate}%</span>
    </div>
  );
}

export function BuildingsTable({ buildings, onRefresh }: BuildingsTableProps) {
  const router = useRouter();

  if (buildings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm py-16 text-center">
        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Building2 className="h-5 w-5 text-slate-300" />
        </div>
        <p className="text-slate-500 text-sm font-medium">No buildings found</p>
        <p className="text-slate-400 text-xs mt-1">Add your first building to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Building</th>
            <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Address</th>
            <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Units</th>
            <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Occupied</th>
            <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Occupancy</th>
            <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3.5 w-10" />
          </tr>
        </thead>
        <tbody>
          {buildings.map((b, i) => (
            <motion.tr
              key={b.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 cursor-pointer transition-colors group"
              onClick={() => router.push(`/buildings/${b.id}`)}
            >
              {/* Building name + photo */}
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200/60">
                    {b.photo_url ? (
                      <img src={b.photo_url} alt={b.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1B3B6F]/8 to-teal-500/8">
                        <Building2 className="h-4 w-4 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 group-hover:text-teal-700 transition-colors text-sm">
                      {b.name}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <ArrowUpRight className="h-3 w-3 text-slate-300 group-hover:text-teal-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </td>

              {/* Address */}
              <td className="px-4 py-3.5">
                {b.address ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[160px]">{b.address}</span>
                  </div>
                ) : (
                  <span className="text-slate-300 text-xs">—</span>
                )}
              </td>

              {/* Total units */}
              <td className="px-4 py-3.5">
                <span className="text-sm font-semibold text-slate-700 tabular-nums">{b.total_units}</span>
              </td>

              {/* Occupied */}
              <td className="px-4 py-3.5">
                <span className="text-sm font-semibold text-slate-700 tabular-nums">{b.occupied_units}</span>
                <span className="text-xs text-slate-400 ml-1">/ {b.total_units}</span>
              </td>

              {/* Occupancy bar */}
              <td className="px-4 py-3.5">
                <OccupancyBar rate={b.occupancy_rate} />
              </td>

              {/* Status badge */}
              <td className="px-4 py-3.5">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  b.status === "active"
                    ? "bg-teal-50 text-teal-700 border border-teal-200"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${b.status === "active" ? "bg-teal-500" : "bg-slate-400"}`} />
                  {b.status}
                </span>
              </td>

              {/* Actions */}
              <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs w-44 rounded-xl border-slate-200 shadow-lg">
                    <DropdownMenuItem onClick={() => router.push(`/buildings/${b.id}`)}
                      className="rounded-lg cursor-pointer">
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-lg cursor-pointer">Edit Building</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

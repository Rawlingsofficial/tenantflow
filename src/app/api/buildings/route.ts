// src/app/api/buildings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/buildings?org_id=xxx
export async function GET(req: NextRequest) {
  const supabase = await createServerClient(); // Note: added await for Next 15
  const orgId = req.nextUrl.searchParams.get("org_id");

  if (!orgId) {
    return NextResponse.json({ error: "org_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("buildings")
    .select(`
      id, name, address, status, photo_url, organization_id, building_type,
      region, division, city,  /* 🔥 FETCH NEW ANALYTICS COLUMNS */
      units(id, status)
    `)
    .eq("organization_id", orgId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = (data || []).map((b: any) => {
    const units: { id: string; status: string }[] = b.units || [];
    const total = units.length;
    const occupied = units.filter((u) => u.status === "occupied").length;
    const vacant = units.filter((u) => u.status === "vacant").length;
    const maintenance = units.filter((u) => u.status === "maintenance").length;
    return {
      id: b.id,
      name: b.name,
      address: b.address,
      status: b.status,
      photo_url: b.photo_url,
      organization_id: b.organization_id,
      building_type: b.building_type,
      region: b.region,         // 🔥 RETURN TO UI
      division: b.division,     // 🔥 RETURN TO UI
      city: b.city,             // 🔥 RETURN TO UI
      total_units: total,
      occupied_units: occupied,
      vacant_units: vacant,
      maintenance_units: maintenance,
      occupancy_rate: total > 0 ? Math.round((occupied / total) * 100) : 0,
    };
  });

  return NextResponse.json({ buildings: enriched });
}

// POST /api/buildings
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const body = await req.json();

  const { organization_id, name, address, status, photo_url, building_type, region, division, city } = body;

  if (!organization_id || !name) {
    return NextResponse.json(
      { error: "organization_id and name are required" },
      { status: 400 }
    );
  }

  const payload = {
    organization_id,
    name,
    address: address ?? null,
    status: status ?? "active",
    photo_url: photo_url ?? null,
    building_type: building_type ?? "residential",
    region: region ?? null,       // 🔥 INSERT TO DB
    division: division ?? null,   // 🔥 INSERT TO DB
    city: city ?? null            // 🔥 INSERT TO DB
  };

  const { data, error } = await supabase
    .from("buildings")
    .insert(payload as any)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ building: data }, { status: 201 });
}
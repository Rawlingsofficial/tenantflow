import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/buildings/[id]/units
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const buildingId = params.id;

  const { data, error } = await supabase
    .from("units")
    .select(`
      id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status, building_id,
      leases(
        id, tenant_id, lease_start, lease_end, rent_amount, status,
        tenants(id, first_name, last_name, primary_phone, photo_url)
      )
    `)
    .eq("building_id", buildingId)
    .order("unit_code");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = (data || []).map((u: any) => {
    const activeLease = (u.leases || []).find((l: any) => l.status === "active");
    return {
      id: u.id,
      unit_code: u.unit_code,
      unit_type: u.unit_type,
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
      default_rent: u.default_rent,
      status: u.status,
      building_id: u.building_id,
      activeLease: activeLease || null,
    };
  });

  return NextResponse.json({ units: enriched });
}

// POST /api/buildings/[id]/units
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const buildingId = params.id;
  const body = await req.json();

  const { unit_code, unit_type, bedrooms, bathrooms, default_rent, status } = body;

  if (!unit_code) {
    return NextResponse.json(
      { error: "unit_code is required" },
      { status: 400 }
    );
  }

  const payload = {
    building_id: buildingId,
    unit_code: (unit_code as string).toUpperCase(),
    unit_type: unit_type ?? null,
    bedrooms: bedrooms ?? null,
    bathrooms: bathrooms ?? null,
    default_rent: default_rent ?? null,
    status: status ?? "vacant",
  };

  const { data, error } = await supabase
    .from("units")
    .insert(payload as any)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ unit: data }, { status: 201 });
}

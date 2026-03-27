import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';

/* ================= TYPES ================= */
type User = {
  id: string;
};

type Membership = {
  organization_id: string;
};

/* ================= HELPERS ================= */
async function getAuthorizedOrgIds(): Promise<string[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createServerClient();

  // Explicit type for Supabase response
  const { data: userData } = await supabase
    .from<User>('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (!userData) return [];

  const { data: memberships } = await supabase
    .from<Membership>('organization_memberships')
    .select('organization_id')
    .eq('user_id', userData.id)
    .eq('status', 'active');

  return (memberships ?? []).map((m) => m.organization_id);
}

/* ================= GET ================= */
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const orgId = req.nextUrl.searchParams.get('org_id');
  const status = req.nextUrl.searchParams.get('status');
  const unitId = req.nextUrl.searchParams.get('unit_id');

  if (!orgId) {
    return NextResponse.json({ error: 'org_id is required' }, { status: 400 });
  }

  const authorizedOrgs = await getAuthorizedOrgIds();
  if (!authorizedOrgs.includes(orgId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let query = supabase
    .from('listings')
    .select(`
      *,
      unit:units(
        *,
        buildings(id, name, address)
      ),
      images:listing_images(*)
    `)
    .eq('organization_id', orgId);

  if (status) query = query.eq('status', status);
  if (unitId) query = query.eq('unit_id', unitId);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listings: data });
}

/* ================= POST ================= */
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();

  const {
    organization_id,
    unit_id,
    title,
    description,
    price,
    city,
    area,
    contact_phone,
    status,
  } = body;

  if (!organization_id || !unit_id || !title || !price || !city || !contact_phone) {
    return NextResponse.json(
      { error: 'Missing required fields: organization_id, unit_id, title, price, city, contact_phone' },
      { status: 400 }
    );
  }

  const authorizedOrgs = await getAuthorizedOrgIds();
  if (!authorizedOrgs.includes(organization_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify unit exists
  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select('id, building_id, status')
    .eq('id', unit_id)
    .single();

  if (unitError || !unit) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  }

  // Verify building belongs to the organization
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id')
    .eq('id', unit.building_id)
    .eq('organization_id', organization_id)
    .single();

  if (buildingError || !building) {
    return NextResponse.json({ error: 'Unit does not belong to this organization' }, { status: 400 });
  }

  if (unit.status !== 'vacant') {
    return NextResponse.json({ error: 'Unit must be vacant to create a listing' }, { status: 400 });
  }

  const { data: listing, error: insertError } = await supabase
    .from('listings')
    .insert({
      organization_id,
      unit_id,
      title,
      description: description || null,
      price,
      city,
      area: area || null,
      contact_phone,
      status: status || 'draft',
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ listing }, { status: 201 });
}
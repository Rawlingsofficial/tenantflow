// src/app/api/listings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';

async function getAuthorizedOrgIds(): Promise<string[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createServerClient();

  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle() as { data: { id: string } | null };

  if (!userData) return [];

  const { data: memberships } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', userData.id)
    .eq('status', 'active') as { data: Array<{ organization_id: string }> | null };

  return (memberships ?? []).map(m => m.organization_id);
}

/* ================= GET ================= */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient();
  const { id } = await context.params;

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      unit:units(*, buildings(id, name, address)),
      images:listing_images(*)
    `)
    .eq('id', id)
    .single() as { data: { id: string; organization_id: string; [key: string]: any } | null; error: any };

  if (error || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const authorizedOrgs = await getAuthorizedOrgIds();
  if (!authorizedOrgs.includes(listing.organization_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ listing });
}

/* ================= PATCH ================= */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient();
  const { id } = await context.params;
  const body = await req.json();

  const { data: existingListing, error: fetchError } = await supabase
    .from('listings')
    .select('organization_id')
    .eq('id', id)
    .single() as { data: { organization_id: string } | null; error: any };

  if (fetchError || !existingListing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const authorizedOrgs = await getAuthorizedOrgIds();
  if (!authorizedOrgs.includes(existingListing.organization_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const allowedUpdates = [
    'title',
    'description',
    'price',
    'city',
    'area',
    'contact_phone',
    'status'
  ];

  const updateData: Record<string, any> = {};
  for (const field of allowedUpdates) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('listings')
    .update(updateData as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listing: data });
}

/* ================= DELETE ================= */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient();
  const { id } = await context.params;

  const { data: listing, error: fetchError } = await supabase
    .from('listings')
    .select('organization_id')
    .eq('id', id)
    .single() as any;

  if (fetchError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const authorizedOrgs = await getAuthorizedOrgIds();
  if (!authorizedOrgs.includes(listing.organization_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete images first (FK constraint)
  await supabase.from('listing_images').delete().eq('listing_id', id);

  const { error } = await supabase.from('listings').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}


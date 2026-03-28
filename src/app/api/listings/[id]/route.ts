// src/app/api/listings/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

/* ================= TYPES ================= */
type User = {
  id: string;
};

type Membership = {
  organization_id: string;
};

/* ================= HELPERS ================= */
// Reusing your excellent security helper to ensure strict access control
async function getAuthorizedOrgIds(): Promise<string[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createServerClient();

  const { data: userData } = (await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle()) as { data: User | null };

  if (!userData) return [];

  const { data: memberships } = (await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', userData.id)
    .eq('status', 'active')) as { data: Membership[] | null };

  return (memberships ?? []).map((m) => m.organization_id);
}

/* ================= PATCH (Update Status/Data) ================= */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const listingId = resolvedParams.id;
    
    const body = await req.json();
    
    // We use the Admin client to bypass RLS, BUT we manually enforce security below
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch the listing to see who owns it
    const { data: existingListing } = await supabaseAdmin
      .from('listings')
      .select('organization_id')
      .eq('id', listingId)
      .single();

    if (!existingListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // 2. Enforce your security rules
    const authorizedOrgs = await getAuthorizedOrgIds();
    if (!authorizedOrgs.includes(existingListing.organization_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Perform the update
    const { error } = await supabaseAdmin
      .from('listings')
      .update(body)
      .eq('id', listingId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[LISTING_PATCH_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/* ================= DELETE (Remove Listing) ================= */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const listingId = resolvedParams.id;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch the listing to see who owns it
    const { data: existingListing } = await supabaseAdmin
      .from('listings')
      .select('organization_id')
      .eq('id', listingId)
      .single();

    if (!existingListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // 2. Enforce your security rules
    const authorizedOrgs = await getAuthorizedOrgIds();
    if (!authorizedOrgs.includes(existingListing.organization_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Clean up related images first
    await supabaseAdmin
      .from('listing_images')
      .delete()
      .eq('listing_id', listingId);

    // 4. Delete the actual listing
    const { error } = await supabaseAdmin
      .from('listings')
      .delete()
      .eq('id', listingId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[LISTING_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


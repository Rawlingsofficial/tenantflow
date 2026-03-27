// src/app/api/listings/[id]/images/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';

type ListingImage = {
  listing_id: string;
  url: string;
  display_order: number;
};

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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const { id: listingId } = params;
  const body = await req.json();
  const { images } = body; // Array<{ url: string; order: number }>

  if (!images || !Array.isArray(images)) {
    return NextResponse.json({ error: 'images array required' }, { status: 400 });
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('organization_id')
    .eq('id', listingId)
    .single() as { data: { organization_id: string } | null; error: any };

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const authorizedOrgs = await getAuthorizedOrgIds();
  if (!authorizedOrgs.includes(listing.organization_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Replace all images for this listing
  await supabase.from('listing_images').delete().eq('listing_id', listingId);

  const imagesToInsert: ListingImage[] = images.map((img: { url: string; order: number }) => ({
    listing_id: listingId,
    url: img.url,
    display_order: img.order,
  }));

  const { data, error } = await supabase
    .from('listing_images')
    .insert(imagesToInsert as never)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ images: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const { id: listingId } = params;

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('organization_id')
    .eq('id', listingId)
    .single() as { data: { organization_id: string } | null; error: any };

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const authorizedOrgs = await getAuthorizedOrgIds();
  if (!authorizedOrgs.includes(listing.organization_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('listing_images')
    .delete()
    .eq('listing_id', listingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

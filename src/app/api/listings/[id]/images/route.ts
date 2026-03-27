// src/app/api/listings/[id]/images/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';

type ListingImage = {
  listing_id: string;
  url: string;
  display_order: number;
};

type ImageInput = {
  url: string;
  order: number;
};

async function getAuthorizedOrgIds(): Promise<string[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createServerClient();

  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (!userData) return [];

  const { data: memberships } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', userData.id)
    .eq('status', 'active');

  return (memberships ?? []).map((m) => m.organization_id);
}

// ✅ POST - Replace all images
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id: listingId } = await context.params;

    const body: { images: ImageInput[] } = await req.json();
    const { images } = body;

    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'images array required' },
        { status: 400 }
      );
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('organization_id')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    const authorizedOrgs = await getAuthorizedOrgIds();

    if (!authorizedOrgs.includes(listing.organization_id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 🔥 Delete old images
    const { error: deleteError } = await supabase
      .from('listing_images')
      .delete()
      .eq('listing_id', listingId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // 🔥 Insert new images
    const imagesToInsert: ListingImage[] = images.map((img) => ({
      listing_id: listingId,
      url: img.url,
      display_order: img.order,
    }));

    const { data, error } = await supabase
      .from('listing_images')
      .insert(imagesToInsert)
      .select();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ images: data });
  } catch (err) {
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Remove all images
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id: listingId } = await context.params;

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('organization_id')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    const authorizedOrgs = await getAuthorizedOrgIds();

    if (!authorizedOrgs.includes(listing.organization_id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('listing_images')
      .delete()
      .eq('listing_id', listingId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}


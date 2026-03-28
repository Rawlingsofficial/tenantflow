// src/app/(dashboard)/listings/[id]/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import EditListingForm from '@/components/listings/EditListingForm';

export default async function EditListingPage({ params }: { params: { id: string } }) {
  // 1. Authenticate user
  const { orgId } = await auth();
  if (!orgId) redirect('/onboarding');

  // 2. Safely unwrap the ID parameter
  const resolvedParams = await params;
  const listingId = resolvedParams.id;

  if (!listingId || listingId === 'undefined') {
    redirect('/listings');
  }

  // 3. Fetch data directly with Admin Client
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Grab the listing, its images, and the parent unit details
  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select(`
      *,
      images:listing_images(url, display_order),
      unit:units(unit_code, buildings(name))
    `)
    .eq('id', listingId)
    .single();

  // Security Check: Make sure it exists and belongs to this landlord
  if (error || !listing || listing.organization_id !== orgId) {
    redirect('/listings');
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-12 pt-8">
       <EditListingForm listing={listing} organizationId={orgId} />
    </div>
  );
}


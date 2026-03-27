// src/app/(dashboard)/listings/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { ListingForm } from '@/components/listings/ListingForm';
import { createServerClient } from '@/lib/supabase/server';

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const { orgId } = await auth();
  if (!orgId) redirect('/onboarding');

  const supabase = createServerClient();
  const { id } = params;

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      unit:units(*, buildings(id, name, address)),
      images:listing_images(*)
    `)
    .eq('id', id)
    .single();

  if (error || !listing) {
    notFound();
  }

  // Verify user's current org has access to this listing
  if (listing.organization_id !== orgId) {
    redirect('/dashboard/listings');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Listing</h1>
      <ListingForm
        initialData={listing}
        organizationId={listing.organization_id}
      />
    </div>
  );
}

// src/app/(dashboard)/listings/new/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import ListingForm from '@/components/listings/ListingForm';

export default async function NewListingPage() {
  const { orgId } = await auth();

  if (!orgId) redirect('/onboarding');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Listing</h1>
      <ListingForm organizationId={orgId} />
    </div>
  );
}

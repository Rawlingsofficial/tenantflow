import { redirect } from 'next/navigation';

type Listing = {
  id: string;
  organization_id: string;
  title?: string;
  [key: string]: any;
};

async function getListing(id: string): Promise<Listing | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/listings/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const data: { listing: Listing } = await res.json();
  return data.listing;
}

export default async function ListingPage({
  params,
}: {
  params: { id: string };
}) {
  const listing = await getListing(params.id);

  if (!listing) {
    redirect('/dashboard/listings');
  }

  const orgId = 'your-current-org-id'; // 🔥 replace with your real org logic

  // ✅ FIXED (no more "never")
  if (listing.organization_id !== orgId) {
    redirect('/dashboard/listings');
  }

  return (
    <div>
      <h1>{listing.title}</h1>
    </div>
  );
}
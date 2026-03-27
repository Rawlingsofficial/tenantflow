// listings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgStore } from '@/hooks/useOrg';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { ListingCard } from '@/components/listings/ListingCard';
import type { ListingWithDetails } from '@/types';

export default function ListingsPage() {
  const { currentOrg } = useOrgStore();
  const router = useRouter();
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'published' | 'unavailable'>('all');
  const [loading, setLoading] = useState(true);

  const fetchListings = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);
    const status = activeTab === 'all' ? undefined : activeTab;
    const url = `/api/listings?org_id=${currentOrg.id}${status ? `&status=${status}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    setListings(data.listings || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchListings();
  }, [currentOrg?.id, activeTab]);

  const handleDelete = () => fetchListings();
  const handleStatusChange = () => fetchListings();

  if (!currentOrg) return <div>Loading organization...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Listings</h1>
        <Button onClick={() => router.push('/dashboard/listings/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Listing
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="unavailable">Unavailable</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No listings found. Create your first listing!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}


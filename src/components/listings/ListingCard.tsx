// src/components/listings/ListingCard.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ListingWithDetails } from '@/types';

interface ListingCardProps {
  listing: ListingWithDetails;
  onDelete?: () => void;
  onStatusChange?: () => void;
}

export function ListingCard({ listing, onDelete, onStatusChange }: ListingCardProps) {
  const firstImage = listing.images?.[0]?.url;

  const getStatusBadge = () => {
    switch (listing.status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Published</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'unavailable':
        return <Badge variant="destructive">Unavailable</Badge>;
      default:
        return null;
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this listing?')) {
      const res = await fetch(`/api/listings/${listing.id}`, { method: 'DELETE' });
      if (res.ok) onDelete?.();
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = listing.status === 'published' ? 'draft' : 'published';
    const res = await fetch(`/api/listings/${listing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) onStatusChange?.();
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative h-48 bg-gray-100">
        {firstImage ? (
          <img src={firstImage} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">No image</div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          {/* 🔥 FIX: Wrapped Button in Link and removed asChild */}
          <Link href={`/dashboard/listings/${listing.id}`}>
            <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          {listing.status !== 'unavailable' && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={handleToggleStatus}
            >
              {listing.status === 'published' ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">{listing.title}</h3>
            <p className="text-sm text-gray-500">
              {listing.unit?.buildings?.name} - {listing.unit?.unit_code}
            </p>
          </div>
          {getStatusBadge()}
        </div>
        <p className="text-2xl font-bold mt-2">${listing.price}/mo</p>
        <p className="text-sm text-gray-500 mt-1">
          {listing.city} {listing.area && `· ${listing.area}`}
        </p>
        <div className="flex justify-between items-center mt-4 text-sm">
          <span className="text-gray-500">{listing.contact_phone}</span>
          <Link
            href={`/dashboard/listings/${listing.id}`}
            className="text-primary hover:underline"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}


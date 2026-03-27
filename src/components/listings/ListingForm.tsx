// src/components/listings/ListingForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from './ImageUpload';
import type { Listing, Unit, Building } from '@/types';

interface UnitOption extends Unit {
  buildings: Pick<Building, 'id' | 'name' | 'address'>;
}

interface ListingFormProps {
  initialData?: Listing & { images?: any[]; unit?: UnitOption };
  organizationId: string;
  onSuccess?: () => void;
}

export function ListingForm({ initialData, organizationId, onSuccess }: ListingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [formData, setFormData] = useState({
    unit_id: initialData?.unit_id || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    price: initialData?.price?.toString() || '',
    city: initialData?.city || '',
    area: initialData?.area || '',
    contact_phone: initialData?.contact_phone || '',
    status: initialData?.status || 'draft',
  });
  const [images, setImages] = useState<any[]>(
    initialData?.images?.map((img, idx) => ({ url: img.url, order: idx })) || []
  );

  // Fetch vacant units for this org
  useEffect(() => {
    const fetchUnits = async () => {
      const res = await fetch(`/api/units?org_id=${organizationId}&status=vacant`);
      const data = await res.json();
      setUnits(data.units || []);
    };
    fetchUnits();
  }, [organizationId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let listingId = initialData?.id;
      let listingData: any = {
        organization_id: organizationId,
        ...formData,
        price: parseFloat(String(formData.price)),
      };

      if (initialData) {
        // Update existing
        const res = await fetch(`/api/listings/${listingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(listingData),
        });
        if (!res.ok) throw new Error('Failed to update listing');
      } else {
        // Create new
        const res = await fetch('/api/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(listingData),
        });
        if (!res.ok) throw new Error('Failed to create listing');
        const data = await res.json();
        listingId = data.listing.id;
      }

      // Save images
      if (listingId && images.length) {
        const res = await fetch(`/api/listings/${listingId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: images.map((img, idx) => ({ url: img.url, order: idx })) }),
        });
        if (!res.ok) throw new Error('Failed to save images');
      }

      toast.success(initialData ? 'Listing updated' : 'Listing created');
      if (onSuccess) onSuccess();
      else router.push('/dashboard/listings');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-2">
        <Label htmlFor="unit_id">Unit</Label>
        <Select
          value={formData.unit_id}
          // 🔥 FIX 1: Explicitly typed val as string
          onValueChange={((val: any) => handleSelectChange('unit_id', val)) as any}
          disabled={!!initialData} // Can't change unit after creation
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a vacant unit" />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.buildings.name} - {unit.unit_code} ({unit.bedrooms} beds, {unit.area_sqm} m²)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Listing Title *</Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price (monthly) *</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="area">Area (e.g., Downtown)</Label>
          <Input
            id="area"
            name="area"
            value={formData.area}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Contact Phone *</Label>
          <Input
            id="contact_phone"
            name="contact_phone"
            value={formData.contact_phone}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          // 🔥 FIX 2: Explicitly typed val as string
          onValueChange={((val: any) => handleSelectChange('status', val)) as any}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Photos</Label>
        <ImageUpload
          value={images}
          onChange={setImages}
          maxImages={10}
          listingId={initialData?.id}
          organizationId={organizationId}
        />
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : initialData ? 'Update Listing' : 'Create Listing'}
        </Button>
      </div>
    </form>
  );
}
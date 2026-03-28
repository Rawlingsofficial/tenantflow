'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { usePropertyType } from '@/hooks/usePropertyType';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from './ImageUpload';
import { toast } from 'sonner';
import { Briefcase, Home, Save, ArrowLeft } from 'lucide-react';

interface EditListingFormProps {
  listing: any;
  organizationId: string;
}

export default function EditListingForm({ listing, organizationId }: EditListingFormProps) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { propertyType } = usePropertyType();
  const isCommercial = propertyType === 'commercial';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<any[]>(
    listing.images?.sort((a: any, b: any) => a.display_order - b.display_order) || []
  );

  const [formData, setFormData] = useState({
    title: listing.title || '',
    description: listing.description || '',
    price: listing.price?.toString() || '',
    deposit_amount: listing.deposit_amount?.toString() || '',
    city: listing.city || '',
    area: listing.area || '',
    full_address: listing.full_address || '',
    contact_phone: listing.contact_phone || '',
    bedrooms: listing.bedrooms?.toString() || '',
    bathrooms: listing.bathrooms?.toString() || '',
    square_footage: listing.square_footage?.toString() || '',
    pet_policy: listing.pet_policy || '',
    lease_terms: listing.lease_terms || '12_months',
    status: listing.status || 'draft',
    features: listing.features_amenities?.items || [] as string[],
  });

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature) ? prev.features.filter((f: string) => f !== feature) : [...prev.features, feature]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unit_id) return toast.error('Please select a vacant unit.');
    setIsSubmitting(true);
    
    const payload = {
      organization_id: organizationId, 
      unit_id: formData.unit_id, 
      title: formData.title,
      description: formData.description, 
      price: parseFloat(formData.price) || 0,
      deposit_amount: parseFloat(formData.deposit_amount) || 0, 
      city: formData.city, 
      area: formData.area,
      full_address: formData.full_address, 
      contact_phone: formData.contact_phone, 
      property_type: propertyType,
      bedrooms: isCommercial ? null : parseInt(formData.bedrooms) || null,
      bathrooms: isCommercial ? null : parseFloat(formData.bathrooms) || null,
      square_footage: parseFloat(formData.square_footage) || null, 
      pet_policy: isCommercial ? null : formData.pet_policy,
      lease_terms: formData.lease_terms, 
      available_date: formData.available_date || null,
      features_amenities: { items: formData.features }, 
      status: 'published'
    };

    try {
      // 🔥 FIX: Cast the table selector to 'any' to bypass the 'never' parameter error
      const { data: listingData, error } = await (supabase.from('listings') as any)
        .insert(payload)
        .select('id')
        .single();
        
      if (error) throw error;
      
      if (images.length > 0) {
        // 🔥 FIX: Cast the listing_images table selector to 'any' as well
        await (supabase.from('listing_images') as any).insert(images.map((img, idx) => ({
          listing_id: listingData.id, 
          url: img.url, 
          display_order: idx
        })));
      }
      
      toast.success('Listing Published to Tenant App!');
      router.push('/listings');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally { 
      setIsSubmitting(false); 
    }
  };
  const activeFeatures = isCommercial 
    ? ['Loading Dock', 'Freight Elevator', '24/7 Security', 'High-Voltage Power', 'HVAC Included', 'Conference Rooms']
    : ['Water Included', 'Electricity Included', 'High-Speed Internet', 'In-Unit Washer/Dryer', 'Dishwasher', 'Balcony/Patio', 'Gym Access', 'Pool Access'];

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-8">
      <button type="button" onClick={() => router.push('/listings')} className="flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Listings
      </button>

      <Card className="rounded-[2rem] shadow-xl border-none bg-white">
        <CardHeader className="border-b border-gray-100 pb-6 px-8 pt-8 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isCommercial ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'}`}>
              {isCommercial ? <Briefcase className="w-6 h-6" /> : <Home className="w-6 h-6" />}
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-[#1F3A5F]">Edit Listing</CardTitle>
              <p className="text-gray-500 mt-1">
                {listing.unit?.buildings?.name} - {listing.unit?.unit_code}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Select value={formData.status} onValueChange={(val) => setFormData(p => ({...p, status: val}))}>
                <SelectTrigger className="w-36 rounded-xl font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-gray-50 rounded-xl p-1 mb-8">
              <TabsTrigger value="basic" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-sm">Basic Info</TabsTrigger>
              <TabsTrigger value="location" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-sm">Location</TabsTrigger>
              <TabsTrigger value="financial" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-sm">Financials</TabsTrigger>
              <TabsTrigger value="features" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-sm">Features</TabsTrigger>
              <TabsTrigger value="media" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-sm">Media</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#1F3A5F] font-semibold">Locked Unit</Label>
                  <Input disabled value={`${listing.unit?.buildings?.name} - ${listing.unit?.unit_code}`} className="rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed" />
                  <p className="text-[10px] text-slate-400">The unit tied to a listing cannot be changed.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1F3A5F] font-semibold">Public Title</Label>
                  <Input required className="rounded-xl" value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} />
                </div>
                <div className="grid grid-cols-3 gap-4 md:col-span-2">
                  {!isCommercial && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[#1F3A5F] font-semibold">Beds</Label>
                        <Input type="number" className="rounded-xl" value={formData.bedrooms} onChange={e => setFormData(p => ({...p, bedrooms: e.target.value}))} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#1F3A5F] font-semibold">Baths</Label>
                        <Input type="number" step="0.5" className="rounded-xl" value={formData.bathrooms} onChange={e => setFormData(p => ({...p, bathrooms: e.target.value}))} />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label className="text-[#1F3A5F] font-semibold">{isCommercial ? 'Area (Sq Ft/Sqm)' : 'Sq Ft'}</Label>
                    <Input type="number" className="rounded-xl" value={formData.square_footage} onChange={e => setFormData(p => ({...p, square_footage: e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#1F3A5F] font-semibold">Description</Label>
                <Textarea className="h-32 rounded-xl" value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} />
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[#1F3A5F] font-semibold">Full Address</Label>
                  <Input className="rounded-xl" value={formData.full_address} onChange={e => setFormData(p => ({...p, full_address: e.target.value}))}/>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1F3A5F] font-semibold">City *</Label>
                  <Input required className="rounded-xl" value={formData.city} onChange={e => setFormData(p => ({...p, city: e.target.value}))}/>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1F3A5F] font-semibold">Neighborhood / Area</Label>
                  <Input className="rounded-xl" value={formData.area} onChange={e => setFormData(p => ({...p, area: e.target.value}))}/>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#1F3A5F] font-semibold">Monthly Rent / Price *</Label>
                  <Input required type="number" className="rounded-xl" value={formData.price} onChange={e => setFormData(p => ({...p, price: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1F3A5F] font-semibold">Security Deposit</Label>
                  <Input type="number" className="rounded-xl" value={formData.deposit_amount} onChange={e => setFormData(p => ({...p, deposit_amount: e.target.value}))}/>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1F3A5F] font-semibold">Lease Terms</Label>
                  <Select value={formData.lease_terms} onValueChange={(val) => setFormData(p => ({...p, lease_terms: val}))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select terms..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12_months">12 Months</SelectItem>
                      <SelectItem value="6_months">6 Months</SelectItem>
                      <SelectItem value="negotiable">Negotiable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1F3A5F] font-semibold">Contact Phone *</Label>
                  <Input required className="rounded-xl" value={formData.contact_phone} onChange={e => setFormData(p => ({...p, contact_phone: e.target.value}))} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {activeFeatures.map((feature) => (
                  <div key={feature} className="flex items-center space-x-2">
                    <Checkbox id={feature} checked={formData.features.includes(feature)} onCheckedChange={() => handleFeatureToggle(feature)} className="data-[state=checked]:bg-[#2BBE9A]" />
                    <label htmlFor={feature} className="text-sm font-medium text-gray-700">{feature}</label>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[#1F3A5F] font-semibold">Property Images</Label>
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                  {/* 🔥 FIX 3: Proper image upload props */}
                  <ImageUpload 
                    value={images} 
                    onChange={setImages} 
                    organizationId={organizationId} 
                  />
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-gray-100 px-8 py-6 bg-slate-50/30 rounded-b-[2rem]">
          <Button type="button" variant="outline" onClick={() => router.push('/listings')} className="rounded-xl px-6">Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-[#2BBE9A] hover:bg-[#239B7D] text-white rounded-xl px-8 shadow-md flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving Changes...' : 'Update Listing'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

//----------------------------------------testing snippets----------------------------------------
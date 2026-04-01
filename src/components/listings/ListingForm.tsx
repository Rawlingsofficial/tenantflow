// src/components/listings/ListingForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseWithAuth } from '@/lib/supabase/client';
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
import { Briefcase, Home, Sparkles, Map } from 'lucide-react';

interface ListingFormProps { organizationId: string; }

export default function ListingForm({ organizationId }: ListingFormProps) {
  const router = useRouter();
  const supabase = useSupabaseWithAuth();
  const { propertyType } = usePropertyType();
  const isCommercial = propertyType === 'commercial';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vacantUnits, setVacantUnits] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    unit_id: '', title: '', description: '', price: '', deposit_amount: '',
    region: '', division: '', city: '', area: '', full_address: '', contact_phone: '',
    bedrooms: '', bathrooms: '', square_footage: '', pet_policy: '',
    lease_terms: '', available_date: '', features: [] as string[],
  });

  // 1. Fetch Units WITH all their details including the building's location
  useEffect(() => {
    async function fetchVacantUnits() {
      if (!organizationId) return;
      const { data } = await supabase
        .from('units')
        .select(`id, unit_code, bedrooms, bathrooms, default_rent, area_sqm, buildings!inner(name, address, organization_id, region, division, city)`)
        .eq('status', 'vacant')
        .eq('buildings.organization_id', organizationId);
      if (data) setVacantUnits(data);
    }
    fetchVacantUnits();
  }, [organizationId, supabase]);

  // 2. AUTO-POPULATE MAGIC
  const handleUnitSelect = (unitId: any) => {
    if (!unitId) return;

    const unit = vacantUnits.find(u => u.id === unitId);
    if (!unit) return;

    setFormData(prev => ({
      ...prev,
      unit_id: unitId,
      price: unit.default_rent?.toString() || '',
      bedrooms: unit.bedrooms?.toString() || '',
      bathrooms: unit.bathrooms?.toString() || '',
      square_footage: unit.area_sqm?.toString() || '',
      full_address: unit.buildings.address || '',
      region: unit.buildings.region || '',
      division: unit.buildings.division || '',
      city: unit.buildings.city || '',
    }));
    toast.success(
      <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500"/> Auto-filled property details!</div>
    );
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature) ? prev.features.filter(f => f !== feature) : [...prev.features, feature]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unit_id) return toast.error('Please select a vacant unit.');
    setIsSubmitting(true);
    
    const db = supabase as any;

    const payload = {
      organization_id: organizationId, 
      unit_id: formData.unit_id, 
      title: formData.title,
      description: formData.description, 
      price: parseFloat(formData.price) || 0,
      deposit_amount: parseFloat(formData.deposit_amount) || 0, 
      region: formData.region,
      division: formData.division,
      city: formData.city, 
      area: formData.area, // This is the user-typed Quarter/Neighborhood
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
      const { data: listingData, error } = await db
        .from('listings')
        .insert(payload as any)
        .select('id')
        .single();
        
      if (error) throw error;
      
      if (images.length > 0) {
        const imagePayload = images.map((img, idx) => ({
          listing_id: listingData.id, 
          url: img.url, 
          display_order: idx
        }));
        await db.from('listing_images').insert(imagePayload as any);
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
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
      <Card className="rounded-[2rem] shadow-xl border-none bg-white">
        <CardHeader className="border-b border-gray-100 pb-6 px-8 pt-8">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isCommercial ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'}`}>
              {isCommercial ? <Briefcase className="w-6 h-6" /> : <Home className="w-6 h-6" />}
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-[#1F3A5F]">Create Public Listing</CardTitle>
              <p className="text-gray-500 mt-1">Publish details to the Tenant Marketplace.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-gray-50 rounded-xl p-1 mb-8">
              <TabsTrigger value="basic" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Basic Info</TabsTrigger>
              <TabsTrigger value="location" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Location</TabsTrigger>
              <TabsTrigger value="financial" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Financials</TabsTrigger>
              <TabsTrigger value="features" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Features</TabsTrigger>
              <TabsTrigger value="media" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Media</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab remains the same */}
            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#1F3A5F] font-semibold">Select Vacant Unit</Label>
                  <Select onValueChange={handleUnitSelect}>
                    <SelectTrigger className="focus:ring-[#2BBE9A] rounded-xl"><SelectValue placeholder="Choose a vacant unit..." /></SelectTrigger>
                    <SelectContent>
                      {vacantUnits.length === 0 ? <SelectItem value="none" disabled>No vacant units</SelectItem>
                      : vacantUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.buildings.name} - {u.unit_code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1F3A5F] font-semibold">Public Title</Label>
                  <Input required placeholder={isCommercial ? "e.g., Premium Retail Space" : "e.g., Modern 2BR in Downtown"} className="rounded-xl" value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} />
                </div>
                <div className="grid grid-cols-3 gap-4 md:col-span-2">
                  {!isCommercial && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[#1F3A5F] font-semibold">Beds</Label>
                        <Input type="number" className="rounded-xl bg-slate-50 border-slate-200" value={formData.bedrooms} onChange={e => setFormData(p => ({...p, bedrooms: e.target.value}))} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#1F3A5F] font-semibold">Baths</Label>
                        <Input type="number" step="0.5" className="rounded-xl bg-slate-50 border-slate-200" value={formData.bathrooms} onChange={e => setFormData(p => ({...p, bathrooms: e.target.value}))} />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label className="text-[#1F3A5F] font-semibold">{isCommercial ? 'Area (Sq Ft/Sqm)' : 'Sq Ft'}</Label>
                    <Input type="number" className="rounded-xl bg-slate-50 border-slate-200" value={formData.square_footage} onChange={e => setFormData(p => ({...p, square_footage: e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#1F3A5F] font-semibold">Description</Label>
                <Textarea placeholder="Highlight the best features..." className="h-32 rounded-xl" value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} />
              </div>
            </TabsContent>

            {/* 🔥 UPDATED Location Tab */}
            <TabsContent value="location" className="space-y-6">
              
              <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl space-y-4 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Map className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Building Location (Read Only)</h4>
                </div>
                <p className="text-[10px] text-slate-400 -mt-3">This data is automatically synced from the building profile.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#1F3A5F] font-semibold text-xs">Region</Label>
                    <Input disabled className="rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed" value={formData.region} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#1F3A5F] font-semibold text-xs">Division</Label>
                    <Input disabled className="rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed" value={formData.division} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#1F3A5F] font-semibold text-xs">City</Label>
                    <Input disabled className="rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed" value={formData.city} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-[#1F3A5F] font-semibold">Quarter / Neighborhood</Label>
                  <Input placeholder="e.g. Bonapriso, Bastos" className="rounded-xl" value={formData.area} onChange={e => setFormData(p => ({...p, area: e.target.value}))}/>
                  <p className="text-[10px] text-slate-400">Specify the exact neighborhood for search filters.</p>
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-[#1F3A5F] font-semibold">Street Address</Label>
                  <Input className="rounded-xl bg-slate-50 border-slate-200" value={formData.full_address} onChange={e => setFormData(p => ({...p, full_address: e.target.value}))}/>
                </div>
              </div>
            </TabsContent>

            {/* Financial Tab remains the same */}
            <TabsContent value="financial" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#1F3A5F] font-semibold">Monthly Rent / Price *</Label>
                  <Input required type="number" className="rounded-xl bg-slate-50 border-slate-200" value={formData.price} onChange={e => setFormData(p => ({...p, price: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1F3A5F] font-semibold">Security Deposit</Label>
                  <Input type="number" className="rounded-xl" value={formData.deposit_amount} onChange={e => setFormData(p => ({...p, deposit_amount: e.target.value}))}/>
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
                  <ImageUpload value={images} onChange={setImages} organizationId={organizationId} />
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-gray-100 px-8 py-6 bg-slate-50/30 rounded-b-[2rem]">
          <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-xl px-6">Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-[#2BBE9A] hover:bg-[#239B7D] text-white rounded-xl px-8 shadow-md">
            {isSubmitting ? 'Publishing...' : 'Publish Listing'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
// src/app/(dashboard)/listings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgStore } from '@/hooks/useOrg';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Megaphone } from 'lucide-react';
import { ListingsTable } from '@/components/listings/ListingsTable';
import type { ListingWithDetails } from '@/types';

type Tab = 'all' | 'published' | 'draft' | 'unavailable';

export default function ListingsPage() {
  const { currentOrg } = useOrgStore();
  const router = useRouter();
  
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');

  const fetchListings = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/listings?org_id=${currentOrg.id}`);
      const data = await res.json();
      setListings(data.listings || []);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [currentOrg?.id]);

  const filteredListings = listings.filter((listing) => {
    const matchesSearch = search === '' || 
      listing.title.toLowerCase().includes(search.toLowerCase()) ||
      listing.unit?.buildings?.name.toLowerCase().includes(search.toLowerCase()) ||
      listing.unit?.unit_code.toLowerCase().includes(search.toLowerCase());
      
    if (!matchesSearch) return false;
    if (activeTab !== 'all' && listing.status !== activeTab) return false;
    
    return true;
  });

  const counts = {
    all: listings.length,
    published: listings.filter(l => l.status === 'published').length,
    draft: listings.filter(l => l.status === 'draft').length,
    unavailable: listings.filter(l => l.status === 'unavailable').length,
  };

  if (!currentOrg) return (
    <div className="min-h-screen bg-slate-50/70 p-8 space-y-6">
      <Skeleton className="h-12 w-64 rounded-xl" />
      <Skeleton className="h-[400px] rounded-[2rem]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -8 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.3 }}
        className="px-8 pt-8 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/60 flex items-center justify-center shadow-sm">
              <Megaphone className="w-5 h-5 text-[#2BBE9A]" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#1F3A5F] tracking-tight">Listing Management</h1>
          </div>
          <p className="text-slate-500 text-sm ml-[3.25rem]">
            Manage your public property listings, pricing, and availability.
          </p>
        </div>
        <Button 
          onClick={() => router.push('/listings/new')}
          className="bg-[#2BBE9A] hover:bg-[#25a586] text-white rounded-2xl h-12 px-6 font-bold shadow-lg shadow-teal-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Listing
        </Button>
      </motion.div>

      {/* Navigation Tabs & Search */}
      <div className="px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-1">
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {(['all', 'published', 'draft', 'unavailable'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all capitalize -mb-[1px] whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-[#2BBE9A] text-[#1F3A5F]' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
            >
              {tab}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeTab === tab 
                  ? 'bg-[#2BBE9A]/10 text-[#2BBE9A]' 
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative mb-2 sm:mb-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search listings..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 w-full sm:w-64 bg-white border-slate-200 rounded-xl focus:ring-[#2BBE9A]/20 focus:border-[#2BBE9A] text-sm transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-8 py-8 flex-1">
        {loading ? (
          <div className="bg-white rounded-[2rem] border border-slate-200/60 p-6 space-y-4 shadow-sm">
             {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
             ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ListingsTable listings={filteredListings} onRefresh={fetchListings} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

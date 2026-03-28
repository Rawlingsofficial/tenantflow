'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  Image as ImageIcon,
  ExternalLink,
  MapPin,
  Building2,
  CheckCircle,
  FileEdit,
  Ban
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ListingWithDetails, ListingStatus } from '@/types';

interface ListingsTableProps {
  listings: ListingWithDetails[];
  onRefresh?: () => void;
}

export function ListingsTable({ listings, onRefresh }: ListingsTableProps) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete listing');

      toast.success('Listing deleted');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // 🔥 NEW: Function to instantly toggle statuses
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      toast.success(`Listing marked as ${newStatus}`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getStatusBadge = (status: ListingStatus) => {
    const styles = {
      published: "bg-teal-50 text-teal-700 border-teal-200 ring-teal-500/10",
      draft: "bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/10",
      unavailable: "bg-red-50 text-red-700 border-red-200 ring-red-500/10",
    };

    const dots = {
      published: "bg-teal-500",
      draft: "bg-slate-400",
      unavailable: "bg-red-500",
    };

    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ring-1 ring-inset",
        styles[status] || styles.draft
      )}>
        <span className={cn("w-1.5 h-1.5 rounded-full", dots[status] || dots.draft)} />
        {status}
      </span>
    );
  };

  if (listings.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm py-20 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <Building2 className="h-8 w-8 text-slate-300" />
        </div>
        <h3 className="text-[#1F3A5F] font-bold text-lg">No listings yet</h3>
        <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
          Get started by creating your first public property listing.
        </p>
        <Button 
          onClick={() => router.push('/listings/new')}
          className="mt-6 bg-[#2BBE9A] hover:bg-[#25a586] rounded-xl px-6"
        >
          Create Listing
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-blue-900/5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/50">
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Property</th>
              <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Rent</th>
              <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {listings.map((listing, idx) => (
              <motion.tr
                key={listing.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/listings/${listing.id}`)}
              >
                {/* Property Column */}
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60 shrink-0 shadow-sm">
                      {listing.images?.[0]?.url ? (
                        <img 
                          src={listing.images[0].url} 
                          alt={listing.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-[#1F3A5F] truncate group-hover:text-[#2BBE9A] transition-colors">
                        {listing.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {listing.unit?.buildings?.name} • {listing.unit?.unit_code}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {listing.city}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Status Column */}
                <td className="px-6 py-5">
                  {getStatusBadge(listing.status)}
                </td>

                {/* Price Column */}
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-[#1F3A5F] font-bold">
                      ${listing.price.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Per Month</span>
                  </div>
                </td>

                {/* Actions Column */}
                <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl hover:bg-[#2BBE9A]/10 hover:text-[#2BBE9A] text-slate-400"
                      onClick={() => router.push(`/listings/${listing.id}`)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    
                    <DropdownMenu>
                      {/* 🔥 FIX: Styled the trigger directly instead of using asChild with Button */}
                      <DropdownMenuTrigger className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus:outline-none">
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-xl border-slate-100">
                        <DropdownMenuItem 
                          className="rounded-xl gap-2 font-medium text-slate-600 focus:text-[#1F3A5F] focus:bg-slate-50 cursor-pointer"
                          onClick={() => window.open(`/listings/${listing.id}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Public Page
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator className="my-1 bg-slate-50" />
                        
                        {/* 🔥 NEW: Status Toggles */}
                        {listing.status !== 'published' && (
                          <DropdownMenuItem 
                            className="rounded-xl gap-2 font-medium text-teal-600 focus:text-teal-700 focus:bg-teal-50 cursor-pointer"
                            onClick={() => handleStatusChange(listing.id, 'published')}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Publish Listing
                          </DropdownMenuItem>
                        )}
                        
                        {listing.status !== 'draft' && (
                          <DropdownMenuItem 
                            className="rounded-xl gap-2 font-medium text-slate-600 focus:text-slate-900 focus:bg-slate-100 cursor-pointer"
                            onClick={() => handleStatusChange(listing.id, 'draft')}
                          >
                            <FileEdit className="w-4 h-4" />
                            Mark as Draft
                          </DropdownMenuItem>
                        )}
                        
                        {listing.status !== 'unavailable' && (
                          <DropdownMenuItem 
                            className="rounded-xl gap-2 font-medium text-amber-600 focus:text-amber-700 focus:bg-amber-50 cursor-pointer"
                            onClick={() => handleStatusChange(listing.id, 'unavailable')}
                          >
                            <Ban className="w-4 h-4" />
                            Mark Unavailable
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator className="my-1 bg-slate-50" />
                        
                        <DropdownMenuItem 
                          className="rounded-xl gap-2 font-medium text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                          onClick={() => handleDelete(listing.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Listing
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

//----------------------------------------testing snippets----------------------------------------
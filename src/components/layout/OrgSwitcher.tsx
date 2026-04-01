'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSupabaseWithAuth } from '@/lib/supabase/client';
import { useOrgStore } from '@/store/orgStore';
import { ChevronDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OrgSwitcher() {
  const { getToken, userId } = useAuth();
  const { currentOrg, setCurrentOrg, setUserRole } = useOrgStore();
  const supabase = useSupabaseWithAuth();
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string; property_type: string | null }>>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrgs = async () => {
      if (!userId) return;

      const { data: userData, error: userError } = (await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()) as { data: { id: string } | null; error: any };

      if (userError || !userData) {
        console.error('User not found in Supabase:', userError);
        setLoading(false);
        return;
      }

      const { data: memberships, error: membershipError } = (await supabase
        .from('organization_memberships')
        .select(`
          organization_id,
          role,
          organizations:organization_id (id, name, property_type)
        `)
        .eq('user_id', userData.id)
        .eq('status', 'active')) as { 
          data: { organization_id: string; role: string; organizations: any }[] | null; 
          error: any 
        };

      if (membershipError || !memberships) {
        console.error('No memberships found:', membershipError);
        setLoading(false);
        return;
      }

      // 🔥 FIX 1: Explicitly cast the properties to string and string | null
      const orgList = memberships.map(m => ({
        id: m.organization_id,
        name: (m.organizations as any)?.name as string,
        property_type: (m.organizations as any)?.property_type as string | null,
      }));

      setOrgs(orgList);

      // Auto-select the first org if none is selected yet
      if (!currentOrg && orgList.length > 0) {
        // 🔥 FIX 2: Cast to 'any' to bypass strict Zustand store types
        setCurrentOrg(orgList[0] as any);
        setUserRole(memberships[0].role as any);
      }

      setLoading(false);
    };

    fetchOrgs();
  }, [userId, currentOrg, setCurrentOrg, setUserRole, supabase]);

  const handleSelect = (org: typeof orgs[0]) => {
    // 🔥 FIX 3: Cast to 'any' to bypass strict Zustand store types
    setCurrentOrg(org as any);
    setOpen(false);
  };

  if (loading) return <div className="px-4 py-2 text-xs text-gray-500">Loading...</div>;
  if (orgs.length === 0) return null;

  return (
    <div className="relative px-3 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.08] transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-200 truncate">
            {currentOrg?.name || 'Select organization'}
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-[#1a1f2a] border border-white/[0.1] rounded-lg shadow-lg z-50 py-1">
          {orgs.map(org => (
            <button
              key={org.id}
              onClick={() => handleSelect(org)}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.05] transition-colors flex items-center gap-2"
            >
              <Building2 className="h-4 w-4 text-teal-400" />
              <span className="truncate">{org.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


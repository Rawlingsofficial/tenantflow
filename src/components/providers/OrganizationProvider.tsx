'use client';

import { useEffect, useState } from 'react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { useOrgStore } from '@/store/orgStore';
import { createServerClient } from '@/lib/supabase/server';

// We fetch org data via an API route so we can use the service role key server-side
// This avoids RLS issues entirely on the client
export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { setCurrentOrg, setCurrentRole } = useOrgStore();
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userLoaded || !orgLoaded) return;

    // If no user or no org in Clerk, nothing to load
    if (!user || !organization) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 5;

    const fetchOrg = async () => {
      attempts++;
      console.log(`[Provider] Attempt ${attempts}/${maxAttempts} for org ${organization.id}`);

      try {
        const res = await fetch(`/api/org-context`);
        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const data = await res.json();

        if (cancelled) return;

        if (data.org && data.role) {
          setCurrentOrg(data.org);
          setCurrentRole(data.role);
          setIsLoading(false);
          return;
        }

        // Data not ready yet (webhook may not have fired) — retry
        if (attempts < maxAttempts) {
          console.log(`[Provider] Org data not ready, retrying in 1s...`);
          setTimeout(fetchOrg, 1000);
        } else {
          // Last resort: use Clerk data directly so UI doesn't hang
          console.warn('[Provider] Falling back to Clerk org data');
          setCurrentOrg({
            id: organization.id,
            name: organization.name ?? 'My Organization',
            property_type: undefined,
          });
          setCurrentRole('owner');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[Provider] fetch error:', err);
        if (!cancelled && attempts < maxAttempts) {
          setTimeout(fetchOrg, 1000);
        } else if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchOrg();
    return () => { cancelled = true; };
  }, [userLoaded, orgLoaded, user, organization, setCurrentOrg, setCurrentRole]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground text-sm">Loading organization...</p>
      </div>
    );
  }

  return <>{children}</>;
}

import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { SetupForm } from './setup-form';

export default async function OnboardingPage() {
  const { userId, orgId } = await auth();

  if (!userId) redirect('/sign-in');
  if (!orgId) {
    // No org yet — Clerk org creation UI handles this
    // This page only handles property_type setup after org exists
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-muted-foreground text-sm">
          Please create an organization first.
        </p>
      </div>
    );
  }

  const supabase = createServerClient();

  // 🔥 FIX: Explicitly type the org response so TS knows about name and property_type
  const { data: org } = (await supabase
    .from('organizations')
    .select('name, property_type')
    .eq('id', orgId)
    .maybeSingle()) as { data: { name: string; property_type: string | null } | null };

  // Already completed onboarding
  if (org?.property_type) {
    redirect('/dashboard');
  }

  const orgName = org?.name || 'My Organization';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SetupForm orgId={orgId} orgName={orgName} />
    </div>
  );
}


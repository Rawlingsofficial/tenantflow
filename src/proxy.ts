import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
])

const isOnboardingRoute = createRouteMatcher([
  '/onboarding',
  '/onboarding/setup',
])

// Helper to get Supabase client with service role key for server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId } = await auth()

  // 1. Not logged in → redirect to sign-in
  if (!userId) {
    if (!isPublicRoute(req)) {
      return (await auth()).redirectToSignIn()
    }
    return NextResponse.next()
  }

  // 2. Logged in, no org yet → must create one at /onboarding
  if (!orgId && !isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // 3. Has org → check if property_type is set
  if (orgId && !isOnboardingRoute(req)) {
    // Query Supabase to get the organization's property_type
    const { data: org, error } = await supabase
      .from('organizations')
      .select('property_type')
      .eq('id', orgId)
      .single()

    // If error or property_type is null, redirect to onboarding setup
    if (error || !org?.property_type) {
      return NextResponse.redirect(new URL('/onboarding/setup', req.url))
    }
  }

  // 4. Has org but trying to access /onboarding (create org step) → go to dashboard
  if (orgId && req.nextUrl.pathname === '/onboarding') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
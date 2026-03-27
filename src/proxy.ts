import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
  '/api/org-context',
])

// Only /onboarding — no /onboarding/setup, that folder is deleted
const isOnboardingRoute = createRouteMatcher([
  '/onboarding',
])

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId } = await auth()

  // Not logged in → redirect to sign-in
  if (!userId) {
    if (!isPublicRoute(req)) {
      return (await auth()).redirectToSignIn()
    }
    return NextResponse.next()
  }

  // Logged in but no org yet → send to /onboarding so Clerk can create one
  if (!orgId) {
    if (!isOnboardingRoute(req) && !isPublicRoute(req)) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
    return NextResponse.next()
  }

  // Has org → check if property_type is set in Supabase
  const { data: org, error } = await supabase
    .from('organizations')
    .select('property_type')
    .eq('id', orgId)
    .maybeSingle()

  console.log('Middleware check', orgId, org?.property_type, error)

  // Org exists in Clerk but not yet in Supabase (webhook delay), or property_type missing
  if ((!org || !org.property_type) && !isOnboardingRoute(req) && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // Onboarding complete — don't let them back to /onboarding
  if (org?.property_type && isOnboardingRoute(req)) {
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

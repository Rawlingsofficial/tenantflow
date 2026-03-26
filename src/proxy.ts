// src/proxy.ts
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

  // Logged in, no org yet → redirect to /onboarding (org creation)
  if (!orgId && !isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // Has org → check property_type
 if (orgId) {
  const { data: org, error } = await supabase
    .from('organizations')
    .select('property_type')
    .eq('id', orgId)
    .maybeSingle()
  console.log('Middleware check', orgId, org?.property_type, error)

    // If property_type is missing and not already on onboarding setup route, redirect
    if ((!org || !org.property_type) && !isOnboardingRoute(req)) {
  return NextResponse.redirect(new URL('/onboarding/setup', req.url))
}

    // If property_type exists and user tries to access onboarding routes, redirect to dashboard
    if (org?.property_type && isOnboardingRoute(req)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}



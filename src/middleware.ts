// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
  '/api/org-context',
])

const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId } = await auth()

  if (isPublicRoute(req)) return NextResponse.next()
  if (!userId) return (await auth()).redirectToSignIn()

  const isOnboarding = isOnboardingRoute(req)

  if (!orgId) {
    if (!isOnboarding) return NextResponse.redirect(new URL('/onboarding', req.url))
    return NextResponse.next()
  }

  // ✅ FIX: Create client INSIDE the handler, and read env vars here
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // ✅ FIX: If key is missing, don't block the user — just let them through
  if (!supabaseUrl || !supabaseKey) {
    console.error('[middleware] Missing Supabase env vars')
    return NextResponse.next()
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: org } = await supabase
    .from('organizations')
    .select('property_type')
    .eq('id', orgId)
    .maybeSingle()

  const needsOnboarding = !org || !org.property_type

  if (needsOnboarding) {
    if (!isOnboarding) return NextResponse.redirect(new URL('/onboarding', req.url))
    return NextResponse.next()
  }

  if (isOnboarding) return NextResponse.redirect(new URL('/dashboard', req.url))

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
])

const isOnboardingRoute = createRouteMatcher([
  '/onboarding',
  '/onboarding/setup',
])

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

  // 3. Has org but trying to access /onboarding (create org step) → go to dashboard
  //    Note: /onboarding/setup is allowed even with an org (for property_type config)
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

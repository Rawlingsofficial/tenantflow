import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
])

const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId } = await auth()

  // 1. Not logged in → redirect to sign-in (except public routes)
  if (!userId) {
    if (!isPublicRoute(req)) {
      return (await auth()).redirectToSignIn()
    }
    return NextResponse.next()
  }

  // 2. Logged in but NO org → always redirect to onboarding
  //    (unless already there)
  if (!orgId && !isOnboardingRoute(req)) {
    const onboardingUrl = new URL('/onboarding', req.url)
    return NextResponse.redirect(onboardingUrl)
  }

  // 3. Logged in WITH org, but trying to access onboarding → send to dashboard
  if (orgId && isOnboardingRoute(req)) {
    const dashboardUrl = new URL('/dashboard', req.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // 4. All good
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'

export default async function RootPage() {
  const { userId, orgId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  if (!orgId) {
    redirect('/onboarding')
  }

  redirect('/dashboard')
}

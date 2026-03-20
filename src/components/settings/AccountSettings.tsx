'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import {
  User, Mail, Phone, Shield,
  LogOut, ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function AccountSettings() {
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const router = useRouter()

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile */}
      <Card className="border border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            My profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-slate-200 shrink-0">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName ?? ''}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700">
                  {initials}
                </div>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {user?.fullName ?? 'No name set'}
              </p>
              <p className="text-sm text-slate-400">
                {user?.primaryEmailAddress?.emailAddress ?? '—'}
              </p>
              <Badge className="mt-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">
                Active
              </Badge>
            </div>
          </div>

          {/* Profile fields */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-sm font-medium text-slate-800">
                  {user?.primaryEmailAddress?.emailAddress ?? '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Phone className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Phone</p>
                <p className="text-sm font-medium text-slate-800">
                  {user?.primaryPhoneNumber?.phoneNumber ?? 'Not set'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Shield className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Authentication</p>
                <p className="text-sm font-medium text-slate-800">
                  Managed by Clerk
                </p>
              </div>
            </div>
          </div>

          {/* Edit via Clerk */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => openUserProfile()}
          >
            <ExternalLink className="h-4 w-4" />
            Edit profile, password & security
          </Button>

          <p className="text-xs text-slate-400">
            Profile changes, password updates and two-factor authentication are managed through Clerk's secure profile portal.
          </p>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border border-red-100 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-red-600">
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50">
            <div>
              <p className="text-sm font-medium text-slate-800">Sign out</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Sign out of your account on this device
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:border-red-200 shrink-0"
              onClick={() => signOut({ redirectUrl: '/sign-in' })}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


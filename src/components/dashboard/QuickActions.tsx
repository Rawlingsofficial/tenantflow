'use client'

import { useRouter } from 'next/navigation'
import { UserPlus, Home, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function QuickActions() {
  const router = useRouter()

  const actions = [
    {
      label: 'Add tenant',
      icon: UserPlus,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 hover:bg-indigo-100',
      onClick: () => router.push('/tenants?action=new'),
    },
    {
      label: 'Add unit',
      icon: Home,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 hover:bg-emerald-100',
      onClick: () => router.push('/buildings?action=new-unit'),
    },
    {
      label: 'Create lease',
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50 hover:bg-blue-100',
      onClick: () => router.push('/leases?action=new'),
    },
  ]

  return (
    <Card className="border border-slate-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900">
          Quick actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            className={`w-full justify-start gap-3 h-11 px-3 ${action.bg}`}
            onClick={action.onClick}
          >
            <div className={`p-1.5 rounded ${action.bg}`}>
              <action.icon className={`h-4 w-4 ${action.color}`} />
            </div>
            <span className="text-sm font-medium text-slate-700">{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}


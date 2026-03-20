'use client'

import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

interface Props {
  expectedMonthly: number
  collectedThisMonth: number
  outstandingBalance: number
}

export default function RevenueCard({
  expectedMonthly,
  collectedThisMonth,
  outstandingBalance,
}: Props) {
  const router = useRouter()
  const rate = expectedMonthly > 0
    ? Math.round((collectedThisMonth / expectedMonthly) * 100)
    : 0

  return (
    <Card className="border border-slate-200 shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">
            Revenue this month
          </CardTitle>
          <button
            onClick={() => router.push('/payments')}
            className="text-xs text-indigo-600 hover:underline"
          >
            View all payments →
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-slate-400" />
              <p className="text-xs text-slate-400">Expected</p>
            </div>
            <p className="text-xl font-bold text-slate-900">
              {expectedMonthly.toLocaleString()}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <p className="text-xs text-slate-400">Collected</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">
              {collectedThisMonth.toLocaleString()}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <AlertCircle className="h-3 w-3 text-red-400" />
              <p className="text-xs text-slate-400">Outstanding</p>
            </div>
            <p className={`text-xl font-bold ${
              outstandingBalance > 0 ? 'text-red-500' : 'text-slate-400'
            }`}>
              {outstandingBalance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Collection rate</span>
            <span className={
              rate >= 100 ? 'text-emerald-600 font-medium'
              : rate >= 50 ? 'text-amber-600 font-medium'
              : 'text-red-500 font-medium'
            }>
              {rate}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                rate >= 100 ? 'bg-emerald-500'
                : rate >= 50 ? 'bg-amber-500'
                : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(rate, 100)}%` }}
            />
          </div>
          {outstandingBalance > 0 && (
            <p className="text-xs text-red-500 mt-1">
              {outstandingBalance.toLocaleString()} still outstanding —{' '}
              <button
                onClick={() => router.push('/payments')}
                className="underline hover:text-red-600"
              >
                view unpaid tenants
              </button>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


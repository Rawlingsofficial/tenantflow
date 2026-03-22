'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { TrendingUp, AlertCircle, CheckCircle2, ArrowUpRight } from 'lucide-react'

// ── Animated number ticker ────────────────────────────────────
function Ticker({ value, prefix = '', duration = 1000 }: { value: number; prefix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number | null>(null)
  const start = useRef<number | null>(null)

  useEffect(() => {
    start.current = null
    const from = 0
    const to = value
    function step(ts: number) {
      if (!start.current) start.current = ts
      const elapsed = ts - start.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value])

  return <>{prefix}{display.toLocaleString()}</>
}

interface Props {
  expectedMonthly: number
  collectedThisMonth: number
  outstandingBalance: number
}

export default function RevenueCard({ expectedMonthly, collectedThisMonth, outstandingBalance }: Props) {
  const router = useRouter()
  const rate = expectedMonthly > 0 ? Math.round((collectedThisMonth / expectedMonthly) * 100) : 0

  const rateColor =
    rate >= 100 ? { bar: 'from-teal-400 to-teal-500', text: 'text-teal-600', bg: 'bg-teal-50' } :
    rate >= 70  ? { bar: 'from-amber-400 to-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' } :
                  { bar: 'from-red-400 to-red-500', text: 'text-red-500', bg: 'bg-red-50' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Top gradient accent */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />

      {/* Decorative circle */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-teal-500/4 pointer-events-none" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Revenue</p>
            <h3 className="text-base font-semibold text-slate-900 mt-0.5">This Month</h3>
          </div>
          <button
            onClick={() => router.push('/payments')}
            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors group"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

        {/* Three metrics */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {/* Expected */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Expected</span>
            </div>
            <p className="text-lg font-bold text-slate-800 tabular-nums leading-tight">
              <Ticker value={expectedMonthly} prefix="$" />
            </p>
          </div>

          {/* Collected */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-teal-500" />
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Collected</span>
            </div>
            <p className="text-lg font-bold text-teal-600 tabular-nums leading-tight">
              <Ticker value={collectedThisMonth} prefix="$" />
            </p>
          </div>

          {/* Outstanding */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <AlertCircle className={`h-3 w-3 ${outstandingBalance > 0 ? 'text-red-400' : 'text-slate-300'}`} />
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Outstanding</span>
            </div>
            <p className={`text-lg font-bold tabular-nums leading-tight ${outstandingBalance > 0 ? 'text-red-500' : 'text-slate-300'}`}>
              <Ticker value={outstandingBalance} prefix="$" />
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 mb-4" />

        {/* Progress section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Collection rate</span>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${rateColor.bg} ${rateColor.text}`}>
              <span className="tabular-nums">{rate}%</span>
            </div>
          </div>

          {/* Animated progress bar */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${rateColor.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(rate, 100)}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            />
          </div>

          {/* Outstanding call to action */}
          {outstandingBalance > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs text-red-500 pt-0.5"
            >
              ${outstandingBalance.toLocaleString()} still outstanding —{' '}
              <button
                onClick={() => router.push('/payments')}
                className="underline hover:text-red-600 font-medium transition-colors"
              >
                view unpaid
              </button>
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

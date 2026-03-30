//src/components/shared/DateRangePicker.tsx
'use client'

import * as React from 'react'
import { format, subDays, subMonths, startOfYear, endOfYear, subYears } from 'date-fns'
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DateRangePreset, DateRangeState } from '@/types/reports'

interface DateRangePickerProps {
  className?: string
  onRangeChange: (range: DateRangeState) => void
  initialRange?: DateRangeState
  minimal?: boolean
}

const PRESETS: { label: string; value: DateRangePreset }[] = [
  { label: 'Last 30 days', value: 'last_30_days' },
  { label: 'Last 3 months', value: 'last_3_months' },
  { label: 'Last 6 months', value: 'last_6_months' },
  { label: 'Last 12 months', value: 'last_12_months' },
  { label: 'This year', value: 'this_year' },
  { label: 'Last year', value: 'last_year' },
  { label: 'All time', value: 'all_time' },
  { label: 'Custom range', value: 'custom' },
]

export function DateRangePicker({
  className,
  onRangeChange,
  initialRange,
  minimal = false,
}: DateRangePickerProps) {
  const [range, setRange] = React.useState<DateRangeState>(
    initialRange || {
      preset: 'last_12_months',
      startDate: subMonths(new Date(), 12).toISOString(),
      endDate: new Date().toISOString(),
    }
  )

  const [isOpen, setIsOpen] = React.useState(false)

  const handlePresetSelect = (preset: DateRangePreset) => {
    let startDate = new Date()
    let endDate = new Date()

    switch (preset) {
      case 'last_30_days':
        startDate = subDays(endDate, 30)
        break
      case 'last_3_months':
        startDate = subMonths(endDate, 3)
        break
      case 'last_6_months':
        startDate = subMonths(endDate, 6)
        break
      case 'last_12_months':
        startDate = subMonths(endDate, 12)
        break
      case 'this_year':
        startDate = startOfYear(endDate)
        break
      case 'last_year':
        const lastYear = subYears(endDate, 1)
        startDate = startOfYear(lastYear)
        endDate = endOfYear(lastYear)
        break
      case 'all_time':
        startDate = new Date(2000, 0, 1) // Default to a long time ago
        break
      case 'custom':
        if (minimal) return
        setRange((prev) => ({ ...prev, preset: 'custom' }))
        return
    }

    const newRange = {
      preset,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }
    setRange(newRange)
    onRangeChange(newRange)
    setIsOpen(false)
  }

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setRange((prev) => ({
      ...prev,
      [field]: new Date(value).toISOString(),
      preset: 'custom'
    }))
  }

  const handleApplyCustom = () => {
    onRangeChange(range)
    setIsOpen(false)
  }

  const activePresets = minimal ? PRESETS.filter(p => p.value !== 'custom') : PRESETS

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={
            <Button
              id="date"
              variant="outline"
              className={cn(
                'w-fit justify-start text-left font-normal bg-white border-slate-200 shadow-sm hover:bg-slate-50 rounded-xl px-4 py-2 h-10',
                !range && 'text-slate-500'
              )}
            />
          }
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
          <span className="flex-1 truncate">
            {range.preset === 'custom' ? (
              <>
                {format(new Date(range.startDate), 'LLL dd, y')} -{' '}
                {format(new Date(range.endDate), 'LLL dd, y')}
              </>
            ) : (
              PRESETS.find((p) => p.value === range.preset)?.label
            )}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 text-slate-400 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200 shadow-xl overflow-hidden" align="end">
          <div className="flex">
            {/* Presets List */}
            <div className={cn("w-[180px] border-r border-slate-100 bg-slate-50/50 p-2 overflow-y-auto", minimal && "w-[200px] border-r-0")}>
              {activePresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 flex items-center justify-between group',
                    range.preset === preset.value
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  )}
                >
                  {preset.label}
                  {range.preset === preset.value && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>

            {/* Custom Picker Panel */}
            {!minimal && (
              <div className="p-5 flex flex-col justify-between w-[280px] bg-white">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={format(new Date(range.startDate), 'yyyy-MM-dd')}
                      onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={format(new Date(range.endDate), 'yyyy-MM-dd')}
                      onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Button 
                    onClick={handleApplyCustom}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md h-10 transition-all active:scale-[0.98]"
                  >
                    Apply Range
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

//----------------- test-------



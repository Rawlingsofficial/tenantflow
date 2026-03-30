//src/components/shared/CompareToggle.tsx
'use client'

import * as React from 'react'
import { format, subYears, differenceInDays, subDays } from 'date-fns'
import { BarChart2, Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ComparisonState, ComparisonType } from '@/types/reports'

interface CompareToggleProps {
  currentRange: { startDate: string; endDate: string }
  onCompareChange: (state: ComparisonState) => void
  initialState?: ComparisonState
}

const COMPARISON_TYPES: { label: string; value: ComparisonType }[] = [
  { label: 'Previous period', value: 'previous_period' },
  { label: 'Same period last year', value: 'same_period_last_year' },
  { label: 'Custom range', value: 'custom' },
]

export function CompareToggle({
  currentRange,
  onCompareChange,
  initialState,
}: CompareToggleProps) {
  const [state, setState] = React.useState<ComparisonState>(
    initialState || {
      enabled: false,
      type: 'previous_period',
    }
  )

  const [isOpen, setIsOpen] = React.useState(false)

  const calculateComparisonRange = (type: ComparisonType, customDates?: { start: string; end: string }) => {
    let startDate = ''
    let endDate = ''

    if (type === 'previous_period') {
      const currentStart = new Date(currentRange.startDate)
      const currentEnd = new Date(currentRange.endDate)
      const daysDiff = differenceInDays(currentEnd, currentStart) + 1
      
      const compEnd = subDays(currentStart, 1)
      const compStart = subDays(compEnd, daysDiff - 1)
      
      startDate = compStart.toISOString()
      endDate = compEnd.toISOString()
    } else if (type === 'same_period_last_year') {
      startDate = subYears(new Date(currentRange.startDate), 1).toISOString()
      endDate = subYears(new Date(currentRange.endDate), 1).toISOString()
    } else if (type === 'custom' && customDates) {
      startDate = new Date(customDates.start).toISOString()
      endDate = new Date(customDates.end).toISOString()
    }

    return { startDate, endDate }
  }

  const handleToggle = () => {
    const newState = {
      ...state,
      enabled: !state.enabled,
    }
    
    if (newState.enabled) {
      const range = calculateComparisonRange(newState.type)
      newState.startDate = range.startDate
      newState.endDate = range.endDate
    }

    setState(newState)
    onCompareChange(newState)
  }

  const handleTypeSelect = (type: ComparisonType) => {
    const newState = {
      ...state,
      type,
    }
    
    const range = calculateComparisonRange(type)
    newState.startDate = range.startDate
    newState.endDate = range.endDate
    
    setState(newState)
    onCompareChange(newState)
    if (type !== 'custom') setIsOpen(false)
  }

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    const currentCustom = {
      start: state.startDate || currentRange.startDate,
      end: state.endDate || currentRange.endDate,
    }
    
    if (field === 'start') currentCustom.start = value
    else currentCustom.end = value

    const range = calculateComparisonRange('custom', currentCustom)
    const newState = {
      ...state,
      startDate: range.startDate,
      endDate: range.endDate,
    }
    
    setState(newState)
    onCompareChange(newState)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={handleToggle}
        className={cn(
          "h-10 px-4 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm active:scale-[0.98]",
          state.enabled 
            ? "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100" 
            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
        )}
      >
        <BarChart2 className={cn("h-4 w-4", state.enabled ? "text-teal-600" : "text-slate-400")} />
        Compare
      </Button>

      {state.enabled && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="h-10 px-3 rounded-xl border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 shadow-sm"
              />
            }
          >
            {COMPARISON_TYPES.find(t => t.value === state.type)?.label}
            <ChevronDown className="ml-2 h-4 w-4 text-slate-400 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 rounded-2xl border-slate-200 shadow-xl" align="start">
            <div className="space-y-1">
              {COMPARISON_TYPES.map((type) => (
                <div key={type.value} className="space-y-1">
                  <button
                    onClick={() => handleTypeSelect(type.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group",
                      state.type === type.value
                        ? "bg-teal-50 text-teal-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {type.label}
                    {state.type === type.value && <Check className="h-3.5 w-3.5" />}
                  </button>
                  
                  {state.type === 'custom' && type.value === 'custom' && (
                    <div className="px-3 py-2 space-y-3 border-t border-slate-100 mt-1">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start</label>
                        <input
                          type="date"
                          value={state.startDate ? format(new Date(state.startDate), 'yyyy-MM-dd') : ''}
                          onChange={(e) => handleCustomDateChange('start', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End</label>
                        <input
                          type="date"
                          value={state.endDate ? format(new Date(state.endDate), 'yyyy-MM-dd') : ''}
                          onChange={(e) => handleCustomDateChange('end', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

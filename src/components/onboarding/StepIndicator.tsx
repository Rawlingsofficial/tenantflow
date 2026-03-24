'use client'

import { Check } from 'lucide-react'

interface Props {
  steps: number[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: Props) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step) => {
        const isCompleted = step < currentStep
        const isActive = step === currentStep
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="relative">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${isCompleted ? 'bg-[#2BBE9A] text-white' : isActive ? 'bg-[#1F3A5F] text-white ring-4 ring-[#1F3A5F]/20' : 'bg-slate-100 text-slate-400'}`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : step}
              </div>
            </div>
            {step !== steps.length && (
              <div className={`flex-1 h-0.5 mx-2 ${step < currentStep ? 'bg-[#2BBE9A]' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}


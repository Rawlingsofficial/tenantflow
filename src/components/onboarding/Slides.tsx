'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SlideCard } from './SlideCard'
import { SlideIndicator } from './SlideIndicator'
import { ArrowRight } from 'lucide-react'

const slides = [
  {
    title: 'Manage All Your Properties',
    description: 'Track residential, commercial, and mixed properties in one place.',
    image: '/mockups/dashboard.png',
  },
  {
    title: 'Automate Rent & Invoices',
    description: 'Generate invoices and track payments with ease.',
    image: '/mockups/invoices.png',
  },
  {
    title: 'Powerful Reports',
    description: 'Get real-time insights on occupancy and revenue.',
    image: '/mockups/reports.png',
  },
]

export function Slides({ onFinish }: { onFinish: () => void }) {
  const [current, setCurrent] = useState(0)

  const next = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1)
    } else {
      onFinish()
    }
  }

  const skip = () => onFinish()

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8">
      <SlideCard slide={slides[current]} />

      <SlideIndicator total={slides.length} current={current} />

      <div className="flex items-center gap-4">
        <button onClick={skip} className="text-sm text-slate-400 hover:text-slate-600">
          Skip
        </button>

        <Button
          onClick={next}
          className="bg-[#1F3A5F] hover:bg-[#152e56] text-white rounded-xl px-6"
        >
          {current === slides.length - 1 ? 'Get Started' : 'Next'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
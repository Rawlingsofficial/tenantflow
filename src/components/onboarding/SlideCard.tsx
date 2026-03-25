import Image from 'next/image'
import { Card } from '@/components/ui/card'

export function SlideCard({ slide }: any) {
  return (
    <Card className="w-full max-w-xl p-8 rounded-2xl shadow-sm border border-slate-200 bg-white text-center space-y-6">
      
      <div className="relative w-full h-56 rounded-xl overflow-hidden bg-slate-100">
        <Image
          src={slide.image}
          alt={slide.title}
          fill
          className="object-cover"
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold text-[#1F3A5F]">
          {slide.title}
        </h2>
        <p className="text-slate-500 mt-2 text-sm">
          {slide.description}
        </p>
      </div>

    </Card>
  )
}
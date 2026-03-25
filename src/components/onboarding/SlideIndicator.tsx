export function SlideIndicator({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i === current
              ? 'w-6 bg-[#2BBE9A]'
              : 'w-2 bg-slate-300'
          }`}
        />
      ))}
    </div>
  )
}
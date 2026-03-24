'use client'

import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  illustration?: ReactNode
}

export function OnboardingLayout({ children, illustration }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Illustration side */}
          <div className="hidden lg:block">
            {illustration || (
              <div className="relative w-full aspect-square max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#1F3A5F]/5 to-[#2BBE9A]/5 rounded-3xl blur-2xl" />
                <div className="relative bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#1F3A5F] flex items-center justify-center">
                        <span className="text-white text-xs font-bold">TF</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">TenantFlow</p>
                        <p className="text-[10px] text-slate-400">Dashboard</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-slate-200" />
                      <div className="w-2 h-2 rounded-full bg-slate-200" />
                      <div className="w-2 h-2 rounded-full bg-slate-200" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                      <p className="text-[10px] text-slate-400">Occupancy</p>
                      <p className="text-lg font-bold text-[#1F3A5F]">92%</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                      <p className="text-[10px] text-slate-400">Revenue</p>
                      <p className="text-lg font-bold text-[#2BBE9A]">$24.5k</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2BBE9A]" />
                      <span>Active leases</span>
                      <span className="ml-auto font-semibold">12</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="w-3/4 h-full bg-[#2BBE9A] rounded-full" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1F3A5F]" />
                      <span>Due soon</span>
                      <span className="ml-auto font-semibold">3</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="w-1/4 h-full bg-[#1F3A5F] rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Content side */}
          <div className="w-full max-w-md mx-auto lg:max-w-none">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}